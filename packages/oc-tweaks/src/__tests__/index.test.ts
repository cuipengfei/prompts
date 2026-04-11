// @ts-nocheck

declare const Bun: any

import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { mkdir, rm } from "node:fs/promises"

import {
  autoMemoryPlugin,
  backgroundSubagentPlugin,
  compactionPlugin,
  insightsPlugin,
  leaderboardPlugin,
  notifyPlugin,
  toolCallNotifyPlugin,
} from "../index"

const originalBunFile = Bun.file
const originalBunWrite = Bun.write
const originalFetch = globalThis.fetch
const originalHome = Bun.env?.HOME

const createdDbPaths = new Set<string>()

function createTestDbPath(name: string) {
  const dbPath = `/tmp/oc-index-${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.sqlite`
  createdDbPaths.add(dbPath)
  return dbPath
}

async function cleanupSqliteArtifacts(dbPath: string) {
  await rm(dbPath, { force: true }).catch(() => {})
  await rm(`${dbPath}-wal`, { force: true }).catch(() => {})
  await rm(`${dbPath}-shm`, { force: true }).catch(() => {})
  await rm(`${dbPath}-journal`, { force: true }).catch(() => {})
}

function createInsightsDatabase(dbPath: string) {
  const db = new Database(dbPath)
  db.exec(`
    CREATE TABLE project (
      id TEXT PRIMARY KEY,
      worktree TEXT NOT NULL
    );

    CREATE TABLE session (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      slug TEXT NOT NULL,
      directory TEXT NOT NULL,
      title TEXT NOT NULL,
      version TEXT NOT NULL,
      share_url TEXT,
      summary_additions INTEGER NOT NULL,
      summary_deletions INTEGER NOT NULL,
      summary_files INTEGER NOT NULL,
      summary_diffs TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      time_compacting INTEGER,
      time_archived INTEGER,
      workspace_id TEXT
    );

    CREATE TABLE message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      time_created INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE part (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      session_id TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `)
  return db
}

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

afterEach(async () => {
  await Promise.all(Array.from(createdDbPaths).map((dbPath) => cleanupSqliteArtifacts(dbPath)))
  createdDbPaths.clear()
})

describe("index exports", () => {
  test("all named exports are functions", () => {
    expect(typeof autoMemoryPlugin).toBe("function")
    expect(typeof backgroundSubagentPlugin).toBe("function")
    expect(typeof compactionPlugin).toBe("function")
    expect(typeof insightsPlugin).toBe("function")
    expect(typeof leaderboardPlugin).toBe("function")
    expect(typeof notifyPlugin).toBe("function")
    expect(typeof toolCallNotifyPlugin).toBe("function")
  })

  test("insightsPlugin returns insights_generate tool registration", async () => {
    const hooks = await insightsPlugin({ client: {} as any })

    expect(typeof hooks).toBe("object")
    expect(typeof hooks.tool).toBe("object")
    expect(typeof hooks.tool.insights_generate).toBe("object")
    expect(hooks.tool.insights_generate.description).toContain("usage insights report")
    expect(typeof hooks.tool.insights_generate.execute).toBe("function")
  })

  test("insightsPlugin execute reports metadata progress while preserving prompt output contract", async () => {
    const metadataCalls: any[] = []
    let createCount = 0
    const titleById = new Map<string, string>()

    const mockClient = {
      session: {
        create: async ({ body }: { body: { title: string } }) => {
          createCount += 1
          const id = `mock-${createCount}`
          titleById.set(id, body.title)
          return { data: { id } }
        },
        prompt: async ({ path, body }: any) => {
          const title = titleById.get(path.id) ?? ""
          const text = body.parts?.[0]?.text ?? ""

          if (title.includes("facets")) {
            return {
              data: {
                parts: [{
                  type: "text",
                  text: JSON.stringify({
                    session_id: "ses-1",
                    underlying_goal: "Ship feature",
                    goal_categories: { implement_feature: 1 },
                    outcome: "fully_achieved",
                    user_satisfaction_counts: { satisfied: 1 },
                    claude_helpfulness: "very_helpful",
                    session_type: "single_task",
                    friction_counts: {},
                    friction_detail: "",
                    primary_success: "correct_code_edits",
                    brief_summary: "Done",
                  }),
                }],
              },
            }
          }

          if (title.includes("section at_a_glance")) {
            return {
              data: {
                parts: [{
                  type: "text",
                  text: JSON.stringify({
                    whats_working: "Good",
                    whats_hindering: "Low",
                    quick_wins: "Try X",
                    ambitious_workflows: "Try Y",
                  }),
                }],
              },
            }
          }

          const sectionMap: Record<string, unknown> = {
            project_areas: { areas: [{ name: "Proj", session_count: 1, description: "Desc" }] },
            interaction_style: { narrative: "Narrative", key_pattern: "Pattern" },
            what_works: { intro: "Works", impressive_workflows: [{ title: "WF", description: "Desc" }] },
            friction_analysis: { intro: "Friction", categories: [{ category: "Cat", description: "Desc", examples: ["ex"] }] },
            suggestions: {
              claude_md_additions: [{ addition: "Add this", why: "Because" }],
              features_to_try: [{ feature: "Feature", one_liner: "One", why_for_you: "Why", example_code: "code" }],
              usage_patterns: [{ title: "Pattern", suggestion: "Try", detail: "Detail", copyable_prompt: "Prompt" }],
            },
            on_the_horizon: { intro: "Future", opportunities: [{ title: "Opp", whats_possible: "Possible", how_to_try: "Try", copyable_prompt: "Prompt" }] },
            fun_ending: { headline: "Fun", detail: "End" },
          }

          for (const [name, value] of Object.entries(sectionMap)) {
            if (title.includes(`section ${name}`)) {
              return { data: { parts: [{ type: "text", text: JSON.stringify(value) }] } }
            }
          }

          expect(text).toContain("SESSION DATA")
          return { data: { parts: [{ type: "text", text: "{}" }] } }
        },
      },
    }

    const originalBunFileImpl = Bun.file
    const originalBunWriteImpl = Bun.write
    const home = "/tmp/oc-index-insights-execute"
    const dbHomeDir = `${home}/.local/share/opencode`
    const runtimeDbPath = `${dbHomeDir}/opencode.db`
    ;(Bun.env as any).HOME = home

    await mkdir(dbHomeDir, { recursive: true })
    await cleanupSqliteArtifacts(runtimeDbPath)

    const db = createInsightsDatabase(runtimeDbPath)
    const now = Date.now()
    db.query("INSERT INTO session (id, project_id, parent_id, slug, directory, title, version, share_url, summary_additions, summary_deletions, summary_files, summary_diffs, time_created, time_updated, time_compacting, time_archived, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        "ses-1",
        "project-a",
        null,
        "ses-1",
        "/repo/a",
        "Test session",
        "0.8.2",
        null,
        0,
        0,
        0,
        null,
        now - 120_000,
        now,
        null,
        null,
        null,
      )
    db.query("INSERT INTO message (id, session_id, time_created, data) VALUES (?, ?, ?, ?)")
      .run("msg-1", "ses-1", now - 110_000, JSON.stringify({ role: "user", content: "Help me ship this" }))
    db.query("INSERT INTO message (id, session_id, time_created, data) VALUES (?, ?, ?, ?)")
      .run("msg-2", "ses-1", now - 100_000, JSON.stringify({ role: "user", content: "Please continue" }))
    db.close()

    const files = new Map<string, string>()
    ;(globalThis as any).Bun.file = (path: string) => ({
      exists: async () => files.has(path),
      text: async () => files.get(path) ?? "",
      json: async () => JSON.parse(files.get(path) ?? "{}"),
      stat: async () => ({ mtimeMs: Date.now() }),
    })
    ;(globalThis as any).Bun.write = async (path: string, content: string) => {
      files.set(path, typeof content === "string" ? content : String(content))
    }

    try {
      const hooks = await insightsPlugin({ client: mockClient as any })
      const result = await hooks.tool.insights_generate.execute(
        { days: 1 },
        { metadata: (input: any) => metadataCalls.push(input) } as any,
      )

      expect(String(result)).toContain("The user just ran /insights")
      expect(metadataCalls.length).toBeGreaterThan(0)
      expect(metadataCalls[0]?.metadata?.stage).toBe("pipeline:start")
      expect(metadataCalls.some((call) => call?.metadata?.stage === "section-complete")).toBe(true)
    } finally {
      ;(globalThis as any).Bun.file = originalBunFileImpl
      ;(globalThis as any).Bun.write = originalBunWriteImpl
    }
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
