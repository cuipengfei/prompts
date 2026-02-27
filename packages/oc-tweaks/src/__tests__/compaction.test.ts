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
    expect(prompt).toContain("Language Preference")
    expect(prompt).toContain("preferred language")
  })

  test("prompt includes preferred language phrasing", async () => {
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
    expect(prompt.toLowerCase()).toContain("preferred language")
  })

  test("returns empty hooks when compaction is disabled", async () => {
    const home = "/tmp/oc-home-compaction-disabled"
    const path = `${home}/.config/opencode/oc-tweaks.json`

    setHome(home)
    mockBunFile({
      [path]: {
        compaction: { enabled: false },
      },
    })

    const plugin = await compactionPlugin()

    expect(plugin).toEqual({})
  })

  test("returns empty hooks when config file is missing", async () => {
    const home = "/tmp/oc-home-compaction-missing"

    setHome(home)
    mockBunFile({})

    const plugin = await compactionPlugin()

    expect(plugin).toEqual({})
  })
})
