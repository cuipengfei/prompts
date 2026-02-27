// @ts-nocheck

import { describe, test, expect, afterEach } from "bun:test"

const originalBunFile = Bun.file
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

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  if (originalHome === undefined) {
    delete (Bun.env as any).HOME
  } else {
    ;(Bun.env as any).HOME = originalHome
  }
})

describe("backgroundSubagentPlugin", () => {
  test("injects English system prompt", async () => {
    const home = "/tmp/oc-background-system"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: { backgroundSubagent: { enabled: true } },
    })

    const { backgroundSubagentPlugin } = await import("../plugins/background-subagent")
    const hooks = await backgroundSubagentPlugin()

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]({}, output)

    expect(output.system.length).toBe(1)
    expect(output.system[0]).toContain("Sub-Agent Dispatch Policy")
    expect(output.system[0]).not.toMatch(/[\u4e00-\u9fff]/)
  })

  test("does not append warning for non-task tools", async () => {
    const home = "/tmp/oc-background-non-task"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: { backgroundSubagent: { enabled: true } },
    })

    const { backgroundSubagentPlugin } = await import("../plugins/background-subagent")
    const hooks = await backgroundSubagentPlugin()

    const beforeOutput = { args: { run_in_background: false } }
    await hooks["tool.execute.before"]({ callID: "c1", tool: "other" }, beforeOutput)

    const afterOutput = { output: "ok" }
    await hooks["tool.execute.after"]({ callID: "c1" }, afterOutput)

    expect(afterOutput.output).toBe("ok")
  })

  test("tracks foreground task calls and appends violation warning", async () => {
    const home = "/tmp/oc-background-violation"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: { backgroundSubagent: { enabled: true } },
    })

    const { backgroundSubagentPlugin } = await import("../plugins/background-subagent")
    const hooks = await backgroundSubagentPlugin()

    const beforeOutput = { args: { run_in_background: false } }
    await hooks["tool.execute.before"]({ callID: "c2", tool: "task" }, beforeOutput)

    const afterOutput = { output: "result" }
    await hooks["tool.execute.after"]({ callID: "c2" }, afterOutput)

    expect(afterOutput.output).toContain("[Reminder]")
    expect(afterOutput.output).not.toMatch(/[\u4e00-\u9fff]/)
  })

  test("hooks are registered but disabled config makes them no-op", async () => {
    const home = "/tmp/oc-background-disabled"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        backgroundSubagent: { enabled: false },
      },
    })

    const { backgroundSubagentPlugin } = await import("../plugins/background-subagent")
    const hooks = await backgroundSubagentPlugin()

    // Hooks always registered (hot-reload), but disabled = no-op
    expect(typeof hooks["experimental.chat.system.transform"]).toBe("function")
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]({}, output)
    expect(output.system.length).toBe(0)
  })
})

