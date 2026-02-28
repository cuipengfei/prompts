// @ts-nocheck

import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { compactionPlugin } from "../plugins/compaction"

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

function restoreBunFile() {
  ;(globalThis as any).Bun.file = originalBunFile
}

function setHome(home: string | undefined) {
  if (home === undefined) {
    delete (Bun.env as any).HOME
  } else {
    ;(Bun.env as any).HOME = home
  }
}

beforeEach(() => {
  setHome(originalHome)
})

afterEach(() => {
  restoreBunFile()
  setHome(originalHome)
})

describe("compactionPlugin", () => {
  test("pushes language preference prompt into context", async () => {
    const home = "/tmp/oc-home-compaction"
    const path = `${home}/.config/opencode/oc-tweaks.json`

    setHome(home)
    mockBunFile({
      [path]: { compaction: { enabled: true } },
    })

    const plugin = await compactionPlugin()
    const hook = plugin["experimental.session.compacting"]
    const output = { context: [] as string[] }

    await hook({ sessionID: "s-1" }, output)

    expect(output.context.length).toBe(1)
    const prompt = output.context[0]
    expect(prompt).toContain("MANDATORY: Language & Writing Style")
    expect(prompt).toContain("compaction summary")
  })

  test("uses configured language when provided", async () => {
    const home = "/tmp/oc-home-compaction-lang"
    const path = `${home}/.config/opencode/oc-tweaks.json`

    setHome(home)
    mockBunFile({
      [path]: {
        compaction: { enabled: true, language: "中文" },
      },
    })

    const plugin = await compactionPlugin()
    const hook = plugin["experimental.session.compacting"]
    const output = { context: [] as string[] }

    await hook({ sessionID: "s-lang" }, output)

    const prompt = output.context[0]
    expect(prompt).toContain("中文")
    expect(prompt).not.toContain("the language the user used most")
  })

  test("uses configured style when provided", async () => {
    const home = "/tmp/oc-home-compaction-style"
    const path = `${home}/.config/opencode/oc-tweaks.json`

    setHome(home)
    mockBunFile({
      [path]: {
        compaction: { enabled: true, style: "毛泽东语言风格" },
      },
    })

    const plugin = await compactionPlugin()
    const hook = plugin["experimental.session.compacting"]
    const output = { context: [] as string[] }

    await hook({ sessionID: "s-style" }, output)

    const prompt = output.context[0]
    expect(prompt).toContain("毛泽东语言风格")
    expect(prompt).toContain("writing style")
  })

  test("uses both language and style when provided", async () => {
    const home = "/tmp/oc-home-compaction-both"
    const path = `${home}/.config/opencode/oc-tweaks.json`

    setHome(home)
    mockBunFile({
      [path]: {
        compaction: { enabled: true, language: "繁体中文", style: "毛泽东语言风格" },
      },
    })

    const plugin = await compactionPlugin()
    const hook = plugin["experimental.session.compacting"]
    const output = { context: [] as string[] }

    await hook({ sessionID: "s-both" }, output)

    const prompt = output.context[0]
    expect(prompt).toContain("繁体中文")
    expect(prompt).toContain("毛泽东语言风格")
  })

  test("uses sensible defaults when neither language nor style provided", async () => {
    const home = "/tmp/oc-home-compaction-defaults"
    const path = `${home}/.config/opencode/oc-tweaks.json`

    setHome(home)
    mockBunFile({
      [path]: {
        compaction: { enabled: true },
      },
    })

    const plugin = await compactionPlugin()
    const hook = plugin["experimental.session.compacting"]
    const output = { context: [] as string[] }

    await hook({ sessionID: "s-defaults" }, output)

    const prompt = output.context[0]
    expect(prompt).toContain("the language the user used most in this session")
    expect(prompt).toContain("concise and well-organized")
  })

  test("falls back to session language when no language configured", async () => {
    const home = "/tmp/oc-home-compaction-phrase"
    const path = `${home}/.config/opencode/oc-tweaks.json`

    setHome(home)
    mockBunFile({
      [path]: {
        compaction: { enabled: true },
      },
    })

    const plugin = await compactionPlugin()
    const hook = plugin["experimental.session.compacting"]
    const output = { context: [] as string[] }

    await hook({ sessionID: "s-2" }, output)

    const prompt = output.context[0]
    expect(prompt).toContain("the language the user used most in this session")
  })

  test("hook is registered but disabled config makes it no-op", async () => {
    const home = "/tmp/oc-home-compaction-disabled"
    const path = `${home}/.config/opencode/oc-tweaks.json`

    setHome(home)
    mockBunFile({
      [path]: {
        compaction: { enabled: false },
      },
    })

    const plugin = await compactionPlugin()
    expect(typeof plugin["experimental.session.compacting"]).toBe("function")

    const output = { context: [] as string[] }
    await plugin["experimental.session.compacting"]({ sessionID: "s-disabled" }, output)
    expect(output.context.length).toBe(0)
  })

  test("hook is registered but missing config makes it no-op", async () => {
    const home = "/tmp/oc-home-compaction-missing"

    setHome(home)
    mockBunFile({})

    const plugin = await compactionPlugin()
    expect(typeof plugin["experimental.session.compacting"]).toBe("function")

    const output = { context: [] as string[] }
    await plugin["experimental.session.compacting"]({ sessionID: "s-missing" }, output)
    expect(output.context.length).toBe(0)
  })
})

