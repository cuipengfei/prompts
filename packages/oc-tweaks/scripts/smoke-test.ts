// @ts-nocheck
/**
 * Standalone smoke test for oc-tweaks plugins.
 * Run: bun scripts/smoke-test.ts
 *
 * Verifies all 5 plugins load, register expected hooks, and handle events
 * without throwing. No test framework — uses if/throw assertions.
 */

// ─── Preserve originals ───
const originalBunFile = Bun.file
const originalHome = Bun.env?.HOME
const originalBunWrite = (globalThis as any).Bun.write

// ─── Mock constants ───
const MOCK_HOME = "/tmp/oc-tweaks-smoke"
const CONFIG_PATH = `${MOCK_HOME}/.config/opencode/oc-tweaks.json`
const LEADERBOARD_CONFIG_PATH = `${MOCK_HOME}/.claude/leaderboard.json`

const mockConfig = {
  notify: { enabled: true, notifyOnIdle: true, notifyOnError: true },
  compaction: { enabled: true },
  autoMemory: { enabled: true },
  backgroundSubagent: { enabled: true },
  leaderboard: { enabled: true, configPath: LEADERBOARD_CONFIG_PATH },
  logging: { enabled: false, maxLines: 200 },
}

const mockLeaderboard = {
  twitter_handle: "smoke_test_user",
  twitter_user_id: "smoke_000",
}

const mockFiles: Record<string, any> = {
  [CONFIG_PATH]: mockConfig,
  [LEADERBOARD_CONFIG_PATH]: mockLeaderboard,
}

// ─── Apply mocks before plugin calls ───

// Mock Bun.file (following notify.test.ts mockBunFile pattern)
;(globalThis as any).Bun.file = (path: string) => ({
  exists: async () => path in mockFiles,
  json: async () => {
    if (!(path in mockFiles)) throw new Error("ENOENT")
    return mockFiles[path]
  },
  text: async () => JSON.stringify(mockFiles[path] ?? ""),
})

// Mock Bun.env.HOME
;(globalThis as any).Bun.env.HOME = MOCK_HOME

// Mock Bun.write (logger may attempt file writes)
;(globalThis as any).Bun.write = async () => {}

// Shell mock (following createShellMock pattern from notify.test.ts)
function createShellMock(availableCommands: string[] = []) {
  const available = new Set(availableCommands)
  const calls: Array<{ command: string }> = []

  const $ = async (strings: TemplateStringsArray, ...values: any[]) => {
    const command = Array.from(strings).reduce(
      (acc, seg, i) => acc + seg + (i < values.length ? String(values[i]) : ""),
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

// ─── Import plugins (static — loadOcTweaksConfig executes at call time) ───
import {
  autoMemoryPlugin,
  backgroundSubagentPlugin,
  compactionPlugin,
  leaderboardPlugin,
  notifyPlugin,
} from "../src/index.ts"

// ─── Main ───
async function main() {
  const errors: string[] = []

  function assert(condition: boolean, message: string) {
    if (!condition) errors.push(message)
  }

  try {
    const { $ } = createShellMock(["pwsh"])

    // Load all 5 plugins
    const [autoPlugin, bgPlugin, compPlugin, lbPlugin, ntPlugin] = await Promise.all([
      autoMemoryPlugin({ directory: "/tmp/smoke-project" }),
      backgroundSubagentPlugin(),
      compactionPlugin(),
      leaderboardPlugin(),
      notifyPlugin({ $, directory: "/tmp/smoke-project", client: {} } as any),
    ])

    // ── 1. Verify hook registration ──
    const expectations = [
      {
        name: "autoMemory",
        plugin: autoPlugin,
        keys: ["experimental.chat.system.transform", "experimental.session.compacting", "tool"],
      },
      {
        name: "compaction",
        plugin: compPlugin,
        keys: ["experimental.session.compacting"],
      },
      {
        name: "backgroundSubagent",
        plugin: bgPlugin,
        keys: [
          "experimental.chat.system.transform",
          "tool.execute.before",
          "tool.execute.after",
        ],
      },
      { name: "leaderboard", plugin: lbPlugin, keys: ["event"] },
      { name: "notify", plugin: ntPlugin, keys: ["event"] },
    ]

    for (const { name, plugin, keys } of expectations) {
      const actual = Object.keys(plugin)
      assert(actual.length > 0, `${name}: returned empty {}`)
      for (const k of keys) {
        assert(actual.includes(k), `${name}: missing hook "${k}", got [${actual}]`)
      }
    }

    // ── 2. Trigger hook events ──

    // compaction: experimental.session.compacting
    const compOut = { context: [] as string[], prompt: "" }
    await compPlugin["experimental.session.compacting"](
      { sessionID: "smoke-s1" },
      compOut,
    )
    assert(compOut.context.length > 0, "compaction: did not push to context")

    // autoMemory: system transform + compacting + tool
    const autoSystemOut = { system: [] as string[] }
    await autoPlugin["experimental.chat.system.transform"]({}, autoSystemOut)
    assert(autoSystemOut.system.length > 0, "autoMemory: did not push memory guide to system")

    const autoContextOut = { context: [] as string[] }
    await autoPlugin["experimental.session.compacting"]({ sessionID: "smoke-auto-s1" }, autoContextOut)
    assert(autoContextOut.context.length > 0, "autoMemory: did not push compacting reminder")

    const rememberResult = await autoPlugin.tool.remember.execute(
      { content: "smoke memory", category: "smoke", scope: "project" },
      { directory: "/tmp/smoke-project", worktree: "/tmp/smoke-project" },
    )
    assert(String(rememberResult).includes("Saved to"), "autoMemory: remember tool did not return success")

    // backgroundSubagent: system transform
    const bgSysOut = { system: [] as string[] }
    await bgPlugin["experimental.chat.system.transform"]({}, bgSysOut)
    assert(bgSysOut.system.length > 0, "bgSubagent: did not push to system")

    // backgroundSubagent: tool.execute.before + after (foreground → violation warning)
    await bgPlugin["tool.execute.before"](
      { tool: "task", callID: "smoke-call-1" },
      { args: { run_in_background: false } },
    )
    const afterOut = { output: "original" }
    await bgPlugin["tool.execute.after"]({ callID: "smoke-call-1" }, afterOut)
    assert(
      afterOut.output.includes("Reminder"),
      "bgSubagent: violation warning not appended",
    )

    // leaderboard: event (message.updated) — fetch will fail; safeHook catches silently
    await lbPlugin["event"]({
      event: {
        type: "message.updated",
        properties: {
          info: {
            id: "smoke-msg-1",
            sessionID: "smoke-session",
            role: "assistant",
            time: { created: Date.now(), completed: Date.now() },
            modelID: "claude-opus-4.6",
            providerID: "test",
            cost: 0,
            tokens: {
              input: 100,
              output: 50,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
          },
        },
      },
    })

    // notify: event (session.idle) — $ mock handles the notification silently
    await ntPlugin["event"]({
      event: {
        type: "session.idle",
        properties: { sessionID: "smoke-session" },
      },
    })

    // notify: event (session.error)
    await ntPlugin["event"]({
      event: { type: "session.error", properties: {} },
    })

    // ── 3. Report ──
    if (errors.length > 0) {
      for (const e of errors) console.error(`  ✗ ${e}`)
      console.error(`SMOKE_RESULT: FAIL (${errors.length} assertion(s))`)
      process.exit(1)
    }

    console.log("SMOKE_RESULT: PASS")
    process.exit(0)
  } catch (error) {
    console.error("SMOKE_RESULT: FAIL", error)
    process.exit(1)
  } finally {
    ;(globalThis as any).Bun.file = originalBunFile
    ;(globalThis as any).Bun.env.HOME = originalHome
    ;(globalThis as any).Bun.write = originalBunWrite
  }
}

main()
