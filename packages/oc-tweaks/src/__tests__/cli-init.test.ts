// @ts-nocheck

import { describe, test, expect, afterEach } from "bun:test"

const originalBunFile = Bun.file
const originalBunWrite = Bun.write
const originalHome = Bun.env?.HOME

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  ;(globalThis as any).Bun.write = originalBunWrite
  if (originalHome === undefined) {
    delete (Bun.env as any).HOME
  } else {
    ;(Bun.env as any).HOME = originalHome
  }
})

describe("CLI init", () => {
  test("creates config file when it does not exist", async () => {
    const written: Record<string, string> = {}
    ;(globalThis as any).Bun.write = async (path: string, content: string) => {
      written[path] = content
      return 0
    }
    ;(globalThis as any).Bun.file = (path: string) => ({
      exists: async () => path in written,
      json: async () => JSON.parse(written[path] ?? "{}"),
    })
    ;(Bun.env as any).HOME = "/tmp/oc-init-create"

    const { initConfig } = await import("../cli/init")
    const result = await initConfig()

    expect(result.created).toBe(true)
    expect(result.path).toContain("oc-tweaks.json")

    const configPath = "/tmp/oc-init-create/.config/opencode/oc-tweaks.json"
    const content = JSON.parse(written[configPath] ?? "{}")
    expect(content.notify?.enabled).toBe(true)
    expect(content.leaderboard?.enabled).toBe(false)
    expect(content.logging?.maxLines).toBe(200)
  })

  test("does not overwrite when config already exists", async () => {
    const existingContent = JSON.stringify({ notify: { enabled: false } })
    const written: Record<string, string> = {}
    const configPath = "/tmp/oc-init-exists/.config/opencode/oc-tweaks.json"
    written[configPath] = existingContent

    let writeCount = 0
    ;(globalThis as any).Bun.write = async (path: string, content: string) => {
      writeCount++
      written[path] = content
      return 0
    }
    ;(globalThis as any).Bun.file = (path: string) => ({
      exists: async () => path in written,
      json: async () => JSON.parse(written[path] ?? "{}"),
    })
    ;(Bun.env as any).HOME = "/tmp/oc-init-exists"

    const { initConfig } = await import("../cli/init")
    const result = await initConfig()

    expect(result.created).toBe(false)
    expect(writeCount).toBe(0)
    expect(written[configPath]).toBe(existingContent) // unchanged
  })
})
