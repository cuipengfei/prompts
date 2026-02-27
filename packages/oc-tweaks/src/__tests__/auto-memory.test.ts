// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"

import { autoMemoryPlugin } from "../plugins/auto-memory"

const originalBunFile = Bun.file
const originalBunWrite = Bun.write
const originalHome = Bun.env?.HOME

function setHome(home: string | undefined) {
  if (home === undefined) {
    delete Bun.env.HOME
  } else {
    Bun.env.HOME = home
  }
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
    text: async () => {
      if (!(path in mockData)) throw new Error("ENOENT")
      const data = mockData[path]
      if (typeof data === "string") return data
      return JSON.stringify(data)
    },
  })
}

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  ;(globalThis as any).Bun.write = originalBunWrite
  setHome(originalHome)
})

describe("autoMemoryPlugin", () => {
  test("registers hooks and remember tool", async () => {
    const home = "/tmp/oc-auto-register"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    const prefsPath = `${home}/.config/opencode/memory/preferences.md`

    mockBunFile({
      [configPath]: { autoMemory: { enabled: true } },
      [prefsPath]: "# Preferences\n- 使用 bun",
    })

    const writes: string[] = []
    ;(globalThis as any).Bun.write = async (path: string) => {
      writes.push(path)
    }

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-register-project" })
    expect(typeof hooks["experimental.chat.system.transform"]).toBe("function")
    expect(typeof hooks["experimental.session.compacting"]).toBe("function")
    expect(typeof hooks.tool?.remember).toBe("object")
    expect(writes.some((path) => path.endsWith("/commands/remember.md"))).toBe(true)
  })

  test("disabled config makes hooks no-op", async () => {
    const home = "/tmp/oc-auto-disabled"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [configPath]: { autoMemory: { enabled: false } } })
    ;(globalThis as any).Bun.write = async () => {}

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-disabled-project" })
    const systemOut = { system: [] as string[] }
    const contextOut = { context: [] as string[] }

    await hooks["experimental.chat.system.transform"]({}, systemOut)
    await hooks["experimental.session.compacting"]({ sessionID: "s-disabled" }, contextOut)

    expect(systemOut.system.length).toBe(0)
    expect(contextOut.context.length).toBe(0)
  })

  test("missing config makes hooks no-op", async () => {
    const home = "/tmp/oc-auto-missing"
    setHome(home)
    mockBunFile({})
    ;(globalThis as any).Bun.write = async () => {}

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-missing-project" })
    const systemOut = { system: [] as string[] }
    const contextOut = { context: [] as string[] }

    await hooks["experimental.chat.system.transform"]({}, systemOut)
    await hooks["experimental.session.compacting"]({ sessionID: "s-missing" }, contextOut)

    expect(systemOut.system.length).toBe(0)
    expect(contextOut.context.length).toBe(0)
  })

  test("injects memory system guide with trigger words", async () => {
    const home = "/tmp/oc-auto-system"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    const prefsPath = `${home}/.config/opencode/memory/preferences.md`

    mockBunFile({
      [configPath]: { autoMemory: { enabled: true } },
      [prefsPath]: "# Memory: Preferences\n- 喜欢 apple",
    })
    ;(globalThis as any).Bun.write = async () => {}

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-system-project" })
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]({}, output)

    expect(output.system.length).toBe(1)
    expect(output.system[0]).toContain("Memory 系统指引")
    expect(output.system[0]).toContain("记住")
    expect(output.system[0]).toContain("remember")
  })

  test("injects compacting memory reminder", async () => {
    const home = "/tmp/oc-auto-compact"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [configPath]: { autoMemory: { enabled: true } } })
    ;(globalThis as any).Bun.write = async () => {}

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-compact-project" })
    const output = { context: [] as string[] }
    await hooks["experimental.session.compacting"]({ sessionID: "s-compact" }, output)

    expect(output.context.length).toBe(1)
    expect(output.context[0]).toContain("[MEMORY:")
  })

  test("remember tool writes to global memory path", async () => {
    const home = "/tmp/oc-auto-tool-global"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [configPath]: { autoMemory: { enabled: true } } })

    const writes: string[] = []
    ;(globalThis as any).Bun.write = async (path: string) => {
      writes.push(path)
    }

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-tool-global-project" })
    const result = await hooks.tool.remember.execute(
      { content: "记住这条全局偏好", category: "preferences", scope: "global" },
      { directory: "/tmp/ctx-project", worktree: "/tmp/ctx-project" },
    )

    expect(result).toContain("Saved to")
    expect(result).toContain("preferences.md")
    expect(writes.some((path) => path.includes("/memory/preferences.md"))).toBe(true)
  })

  test("remember tool writes to project memory path with default category", async () => {
    const home = "/tmp/oc-auto-tool-project"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [configPath]: { autoMemory: { enabled: true } } })

    const writes: string[] = []
    ;(globalThis as any).Bun.write = async (path: string) => {
      writes.push(path)
    }

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-tool-project-main" })
    const result = await hooks.tool.remember.execute(
      { content: "记录项目信息", scope: "project" },
      { directory: "/tmp/my-project", worktree: "/tmp/my-project" },
    )

    expect(result).toContain("Saved to")
    expect(result).toContain("/tmp/my-project/.opencode/memory/notes.md")
    expect(writes.some((path) => path.includes("/tmp/my-project/.opencode/memory/notes.md"))).toBe(true)
  })

  test("remember tool returns error message when write fails", async () => {
    const home = "/tmp/oc-auto-tool-fail"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [configPath]: { autoMemory: { enabled: true } } })

    ;(globalThis as any).Bun.write = async () => {
      throw new Error("disk full")
    }

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-tool-fail-project" })
    const result = await hooks.tool.remember.execute(
      { content: "this should fail", category: "notes", scope: "global" },
      { directory: "/tmp/ctx-project", worktree: "/tmp/ctx-project" },
    )

    expect(result).toContain("Failed to save memory")
    expect(result).toContain("disk full")
  })
})
