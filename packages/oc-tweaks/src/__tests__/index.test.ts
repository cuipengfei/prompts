// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"

import {
  autoMemoryPlugin,
  backgroundSubagentPlugin,
  compactionPlugin,
  leaderboardPlugin,
  notifyPlugin,
  toolCallNotifyPlugin,
} from "../index"

const originalBunFile = Bun.file
const originalBunWrite = Bun.write
const originalFetch = globalThis.fetch
const originalHome = Bun.env?.HOME

function mockBunFile(mockData: Record<string, any>) {
  ;(globalThis as any).Bun.file = (path: string) => ({
    exists: async () => path in mockData,
    json: async () => {
      if (!(path in mockData)) throw new Error("ENOENT")
      const data = mockData[path]
      if (data instanceof Error) throw data
      return data
    },
    text: async () => JSON.stringify(mockData[path] ?? ""),
  })
}

function createShellMock(options?: { availableCommands?: string[] }) {
  const available = new Set(options?.availableCommands ?? [])
  const calls: Array<{ command: string }> = []

  const $ = async (strings: TemplateStringsArray, ...values: any[]) => {
    const segments = Array.from(strings)
    const command = segments.reduce(
      (acc, segment, index) =>
        acc + segment + (index < values.length ? String(values[index]) : ""),
      "",
    )
    calls.push({ command })

    if (command.startsWith("which ")) {
      const bin = String(values[0] ?? command.slice("which ".length).trim())
      if (available.has(bin)) return { stdout: `${bin}\n` }
      throw new Error(`missing ${bin}`)
    }

    return { stdout: "" }
  }

  return { $, calls }
}

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

describe("index exports", () => {
  test("all named exports are functions", () => {
    expect(typeof autoMemoryPlugin).toBe("function")
    expect(typeof backgroundSubagentPlugin).toBe("function")
    expect(typeof compactionPlugin).toBe("function")
    expect(typeof leaderboardPlugin).toBe("function")
    expect(typeof notifyPlugin).toBe("function")
    expect(typeof toolCallNotifyPlugin).toBe("function")
  })

  test("leaderboardPlugin with default config returns object with event hook", async () => {
    const home = "/tmp/oc-index-lb-default"
    ;(Bun.env as any).HOME = home
    ;(globalThis as any).Bun.write = async () => {}
    const ocTweaksPath = `${home}/.config/opencode/oc-tweaks.json`
    const leaderboardPath = `${home}/.claude/leaderboard.json`

    mockBunFile({
      [ocTweaksPath]: { leaderboard: { enabled: true } },
      [leaderboardPath]: { twitter_handle: "test", twitter_user_id: "u1" },
    })

    const hooks = await leaderboardPlugin()
    expect(typeof hooks).toBe("object")
    expect(typeof hooks.event === "function" || Object.keys(hooks).length === 0).toBe(true)
  })

  test("leaderboardPlugin with enabled:false still registers hooks (hot-reload)", async () => {
    const home = "/tmp/oc-index-lb-disabled"
    ;(Bun.env as any).HOME = home
    const ocTweaksPath = `${home}/.config/opencode/oc-tweaks.json`
    const leaderboardPath = `${home}/.claude/leaderboard.json`

    mockBunFile({
      [ocTweaksPath]: { leaderboard: { enabled: false } },
      [leaderboardPath]: { twitter_handle: "test", twitter_user_id: "u1" },
    })

    const hooks = await leaderboardPlugin()
    expect(typeof hooks.event).toBe("function")
  })

  test("notifyPlugin with default config returns object with event hook", async () => {
    const home = "/tmp/oc-index-notify-default"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [path]: { notify: { enabled: true } } })

    const { $ } = createShellMock({ availableCommands: ["notify-send"] })
    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client: {} })
    expect(typeof hooks).toBe("object")
    expect(typeof hooks.event).toBe("function")
  })

  test("notifyPlugin with enabled:false still registers hooks (hot-reload)", async () => {
    const home = "/tmp/oc-index-notify-disabled"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [path]: { notify: { enabled: false } } })

    const { $ } = createShellMock({ availableCommands: ["notify-send"] })
    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client: {} })
    expect(typeof hooks.event).toBe("function")
  })

  test("leaderboard and notify event handlers coexist without interference", async () => {
    const home = "/tmp/oc-index-coexist"
    ;(Bun.env as any).HOME = home
    ;(globalThis as any).Bun.write = async () => {}
    const ocTweaksPath = `${home}/.config/opencode/oc-tweaks.json`
    const leaderboardPath = `${home}/.claude/leaderboard.json`

    mockBunFile({
      [ocTweaksPath]: { leaderboard: { enabled: true }, notify: { enabled: true } },
      [leaderboardPath]: { twitter_handle: "coexist", twitter_user_id: "ux" },
    })

    globalThis.fetch = async () =>
      ({ ok: true, status: 200, text: async () => "" }) as any

    const lbHooks = await leaderboardPlugin()

    const { $ } = createShellMock({ availableCommands: ["notify-send"] })
    const notifyHooks = await notifyPlugin({ $, directory: "/tmp/coexist", client: {} })

    expect(typeof lbHooks.event === "function" || Object.keys(lbHooks).length === 0).toBe(true)
    expect(typeof notifyHooks.event).toBe("function")

    // leaderboard event
    if (typeof lbHooks.event === "function") {
      await expect(
        lbHooks.event({
          event: {
            type: "message.updated",
            properties: {
              info: {
                id: "msg-coexist",
                sessionID: "session-coexist",
                role: "assistant",
                time: { created: 1730000000000, completed: 1730000001000 },
                modelID: "gpt-5.1-codex",
                providerID: "provider",
                cost: 0,
                tokens: { input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
              },
            },
          },
        }),
      ).resolves.toBeUndefined()
    }

    // notify event (session.error does not require client.session.messages)
    await expect(
      notifyHooks.event({ event: { type: "session.error", properties: {} } }),
    ).resolves.toBeUndefined()
  })
})
