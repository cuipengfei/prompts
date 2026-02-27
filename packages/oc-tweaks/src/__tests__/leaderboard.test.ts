// @ts-nocheck

import { afterEach, beforeEach, describe, expect, test } from "bun:test"

const TEST_HOME = "/tmp/oc-leaderboard"

const originalBunFile = Bun.file
const originalBunWrite = Bun.write
const originalFetch = globalThis.fetch
const originalHome = Bun.env?.HOME

function mockBunFile(mockData: Record<string, any>, existsCalls?: string[]) {
  ;(globalThis as any).Bun.file = (path: string) => ({
    exists: async () => {
      existsCalls?.push(path)
      return path in mockData
    },
    json: async () => {
      if (!(path in mockData)) throw new Error("ENOENT")
      const data = mockData[path]
      if (data instanceof Error) throw data
      return data
    },
    text: async () => {
      if (!(path in mockData)) return ""
      const value = mockData[path]
      return typeof value === "string" ? value : JSON.stringify(value)
    },
  })
}

function buildAssistantInfo(overrides: Record<string, any> = {}) {
  return {
    id: "msg-1",
    sessionID: "session-1",
    role: "assistant",
    time: { created: 1730000000000, completed: 1730000001000 },
    modelID: "gpt-5.1-codex",
    providerID: "provider",
    cost: 0,
    tokens: {
      input: 120,
      output: 80,
      reasoning: 0,
      cache: { read: 4, write: 2 },
    },
    ...overrides,
  }
}

function buildMessageUpdatedEvent(infoOverrides: Record<string, any> = {}) {
  return {
    event: {
      type: "message.updated",
      properties: {
        info: buildAssistantInfo(infoOverrides),
      },
    },
  }
}

async function loadPlugin() {
  const mod = await import("../plugins/leaderboard")
  return mod.leaderboardPlugin
}

beforeEach(() => {
  ;(Bun.env as any).HOME = TEST_HOME
  ;(globalThis as any).Bun.write = async () => {}
})

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  ;(globalThis as any).Bun.write = originalBunWrite
  globalThis.fetch = originalFetch

  if (originalHome === undefined) {
    delete (Bun.env as any).HOME
  } else {
    ;(Bun.env as any).HOME = originalHome
  }
})

describe("leaderboardPlugin", () => {
  test("mapModel covers direct, regex, and fallback branches", async () => {
    const ocTweaksPath = `${TEST_HOME}/.config/opencode/oc-tweaks.json`
    const leaderboardPath = `${TEST_HOME}/.claude/leaderboard.json`
    const postedPayloads: any[] = []

    mockBunFile({
      [ocTweaksPath]: { leaderboard: { enabled: true } },
      [leaderboardPath]: {
        twitter_handle: "alice",
        twitter_user_id: "u1",
      },
    })

    globalThis.fetch = (async (_url: string, init: any) => {
      postedPayloads.push(JSON.parse(init.body))
      return {
        ok: true,
        status: 200,
        text: async () => "",
      } as any
    }) as any

    const leaderboardPlugin = await loadPlugin()
    const hooks = await leaderboardPlugin()

    await hooks.event(
      buildMessageUpdatedEvent({
        id: "msg-direct",
        modelID: "gpt-5.1-codex",
      }),
    )
    await hooks.event(
      buildMessageUpdatedEvent({
        id: "msg-regex",
        modelID: "claude-opus-4-20260101",
      }),
    )
    await hooks.event(
      buildMessageUpdatedEvent({
        id: "msg-fallback",
        modelID: "totally-unknown-model",
      }),
    )

    expect(postedPayloads.length).toBe(3)
    expect(postedPayloads[0].model).toBe("claude-sonnet-4-20250514")
    expect(postedPayloads[1].model).toBe("claude-opus-4-20260101")
    expect(postedPayloads[2].model).toBe("claude-sonnet-4-20250514")
  })

  test("returns empty hooks when leaderboard is disabled", async () => {
    const ocTweaksPath = `${TEST_HOME}/.config/opencode/oc-tweaks.json`
    const leaderboardPath = `${TEST_HOME}/.claude/leaderboard.json`

    mockBunFile({
      [ocTweaksPath]: {
        leaderboard: { enabled: false },
      },
      [leaderboardPath]: {
        twitter_handle: "alice",
        twitter_user_id: "u1",
      },
    })

    const leaderboardPlugin = await loadPlugin()
    const hooks = await leaderboardPlugin()

    expect(hooks).toEqual({})
  })

  test("returns empty hooks when leaderboard config file is missing", async () => {
    const ocTweaksPath = `${TEST_HOME}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [ocTweaksPath]: { leaderboard: { enabled: true } },
    })

    const leaderboardPlugin = await loadPlugin()
    const hooks = await leaderboardPlugin()

    expect(hooks).toEqual({})
  })

  test("loads valid leaderboard config from default search paths", async () => {
    const ocTweaksPath = `${TEST_HOME}/.config/opencode/oc-tweaks.json`
    const secondPath = `${TEST_HOME}/.config/claude/leaderboard.json`

    mockBunFile({
      [ocTweaksPath]: { leaderboard: { enabled: true } },
      [secondPath]: {
        twitter_handle: "bob",
        twitter_user_id: "u2",
      },
    })

    const leaderboardPlugin = await loadPlugin()
    const hooks = await leaderboardPlugin()

    expect(typeof hooks.event).toBe("function")
  })

  test("configPath override short-circuits default search", async () => {
    const existsCalls: string[] = []
    const ocTweaksPath = `${TEST_HOME}/.config/opencode/oc-tweaks.json`
    const overridePath = "/tmp/custom/leaderboard.json"
    const defaultPath1 = `${TEST_HOME}/.claude/leaderboard.json`
    const defaultPath2 = `${TEST_HOME}/.config/claude/leaderboard.json`

    mockBunFile(
      {
        [ocTweaksPath]: {
          leaderboard: { enabled: true, configPath: overridePath },
        },
        [overridePath]: {
          twitter_handle: "override",
          twitter_user_id: "u3",
        },
      },
      existsCalls,
    )

    const leaderboardPlugin = await loadPlugin()
    const hooks = await leaderboardPlugin()

    expect(typeof hooks.event).toBe("function")
    expect(existsCalls).toContain(overridePath)
    expect(existsCalls).not.toContain(defaultPath1)
    expect(existsCalls).not.toContain(defaultPath2)
  })

  test("submit flow remains non-blocking and submitted set dedupes", async () => {
    const ocTweaksPath = `${TEST_HOME}/.config/opencode/oc-tweaks.json`
    const leaderboardPath = `${TEST_HOME}/.claude/leaderboard.json`
    const fetchCalls: any[] = []

    mockBunFile({
      [ocTweaksPath]: { leaderboard: { enabled: true } },
      [leaderboardPath]: {
        twitter_handle: "alice",
        twitter_user_id: "u1",
      },
    })

    globalThis.fetch = (async () => {
      fetchCalls.push(1)
      return {
        ok: false,
        status: 500,
        text: async () => "server error",
      } as any
    }) as any

    const leaderboardPlugin = await loadPlugin()
    const hooks = await leaderboardPlugin()
    const eventInput = buildMessageUpdatedEvent({ id: "msg-dedupe" })

    await expect(hooks.event(eventInput)).resolves.toBeUndefined()
    await expect(hooks.event(eventInput)).resolves.toBeUndefined()
    expect(fetchCalls.length).toBe(1)
  })
})
