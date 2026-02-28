// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"

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
  test("registers hooks without remember tool", async () => {
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
    expect(hooks.tool).toBeUndefined()
    expect(writes.some((path) => path.endsWith("/commands/remember.md"))).toBe(true)
  })

  test("disabled config makes hooks no-op", async () => {
    const home = "/tmp/oc-auto-disabled"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [configPath]: { autoMemory: { enabled: false } } })
    const writes: string[] = []
    ;(globalThis as any).Bun.write = async (path: string) => {
      writes.push(path)
    }

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-disabled-project" })
    const systemOut = { system: [] as string[] }
    const contextOut = { context: [] as string[] }

    await hooks["experimental.chat.system.transform"]({}, systemOut)
    await hooks["experimental.session.compacting"]({ sessionID: "s-disabled" }, contextOut)

    expect(systemOut.system.length).toBe(0)
    expect(contextOut.context.length).toBe(0)
    expect(writes.length).toBe(0)
  })

  test("missing config makes hooks no-op", async () => {
    const home = "/tmp/oc-auto-missing"
    setHome(home)
    mockBunFile({})
    const writes: string[] = []
    ;(globalThis as any).Bun.write = async (path: string) => {
      writes.push(path)
    }

    const hooks = await autoMemoryPlugin({ directory: "/tmp/oc-auto-missing-project" })
    const systemOut = { system: [] as string[] }
    const contextOut = { context: [] as string[] }

    await hooks["experimental.chat.system.transform"]({}, systemOut)
    await hooks["experimental.session.compacting"]({ sessionID: "s-missing" }, contextOut)

    expect(systemOut.system.length).toBe(0)
    expect(contextOut.context.length).toBe(0)
    expect(writes.length).toBe(0)
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
    expect(output.system[0]).toContain("AGENTS.md")
    expect(output.system[0]).toContain("不要保存")
    expect(output.system[0]).toContain("Write")
    expect(output.system[0]).toContain("Edit")
    expect(output.system[0]).not.toContain("remember tool")
  })

  test("injects all memory files, not just preferences", async () => {
    const stamp = Date.now().toString(36)
    const home = `/tmp/oc-auto-multi-${stamp}`
    const projectDir = `/tmp/oc-auto-multi-project-${stamp}`
    setHome(home)

    const configDir = `${home}/.config/opencode`
    const configPath = `${configDir}/oc-tweaks.json`
    const globalDir = `${home}/.config/opencode/memory`
    const projectMemoryDir = `${projectDir}/.opencode/memory`

    await mkdir(configDir, { recursive: true })
    await mkdir(globalDir, { recursive: true })
    await mkdir(projectMemoryDir, { recursive: true })

    await originalBunWrite(configPath, JSON.stringify({ autoMemory: { enabled: true } }))
    await originalBunWrite(`${globalDir}/preferences.md`, "# Preferences\n- 使用 bun")
    await originalBunWrite(`${globalDir}/decisions.md`, "# Decisions\n- use persistent files")
    await originalBunWrite(`${projectMemoryDir}/setup.md`, "# Setup\n- run bun test")

    const hooks = await autoMemoryPlugin({ directory: projectDir })
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]({}, output)

    expect(output.system.length).toBe(1)
    const text = output.system[0]
    expect(text).toContain("Contents of")
    expect(text).toContain(`${globalDir}/preferences.md`)
    expect(text).toContain(`${globalDir}/decisions.md`)
    expect(text).toContain(`${projectMemoryDir}/setup.md`)
    expect(text).toContain("use persistent files")
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

  test("ensureRememberCommand overwrites when content differs", async () => {
    const home = "/tmp/oc-auto-command-overwrite"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    const commandPath = `${home}/.config/opencode/commands/remember.md`

    mockBunFile({
      [configPath]: { autoMemory: { enabled: true } },
      [commandPath]: "---\ndescription: old\n---\ncall remember tool",
    })

    const writes: Array<{ path: string; content: string }> = []
    ;(globalThis as any).Bun.write = async (path: string, content: unknown) => {
      writes.push({ path, content: String(content) })
    }

    await autoMemoryPlugin({ directory: "/tmp/oc-auto-command-overwrite-project" })

    const commandWrite = writes.find((entry) => entry.path === commandPath)
    expect(commandWrite).toBeDefined()
    expect(commandWrite?.content).toContain("Write 或 Edit 工具")
    expect(commandWrite?.content).not.toContain("remember tool")
  })

  test("ensureRememberCommand skips when content matches", async () => {
    const home = "/tmp/oc-auto-command-skip"
    const directory = "/tmp/oc-auto-command-skip-project"
    setHome(home)

    const configPath = `${home}/.config/opencode/oc-tweaks.json`
    const commandPath = `${home}/.config/opencode/commands/remember.md`

    let generatedCommand = ""
    mockBunFile({ [configPath]: { autoMemory: { enabled: true } } })
    ;(globalThis as any).Bun.write = async (path: string, content: unknown) => {
      if (path === commandPath) generatedCommand = String(content)
    }

    await autoMemoryPlugin({ directory })
    expect(generatedCommand.length).toBeGreaterThan(0)

    mockBunFile({
      [configPath]: { autoMemory: { enabled: true } },
      [commandPath]: generatedCommand,
    })

    const writes: string[] = []
    ;(globalThis as any).Bun.write = async (path: string) => {
      writes.push(path)
    }

    await autoMemoryPlugin({ directory })
    expect(writes.includes(commandPath)).toBe(false)
  })

})
