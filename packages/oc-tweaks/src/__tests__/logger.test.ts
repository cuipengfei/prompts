// @ts-nocheck

import { describe, test, expect, afterEach } from "bun:test"
import { log } from "../utils/logger"

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

describe("logger", () => {
  test("does not write when logging is disabled", async () => {
    let writeCount = 0
    ;(globalThis as any).Bun.write = async () => {
      writeCount++
      return 0
    }
    ;(globalThis as any).Bun.file = () => ({
      exists: async () => false,
      text: async () => ""
    })

    await log({ enabled: false }, "INFO", "test message")
    await log(undefined, "INFO", "test message")

    expect(writeCount).toBe(0)
  })

  test("writes log when enabled", async () => {
    const written: Record<string, string> = {}
    ;(globalThis as any).Bun.write = async (path: string, content: string) => {
      written[path] = content
      return 0
    }
    ;(globalThis as any).Bun.file = (path: string) => ({
      exists: async () => path in written,
      text: async () => written[path] ?? ""
    })
    ;(Bun.env as any).HOME = "/tmp/oc-logger-test"

    await log({ enabled: true }, "INFO", "hello world")

    const logPath = "/tmp/oc-logger-test/.config/opencode/plugins/oc-tweaks.log"
    expect(written[logPath]).toBeDefined()
    expect(written[logPath]).toContain("[INFO] hello world")
  })

  test("truncates to keep lines when max exceeded", async () => {
    const maxLines = 5
    const keepLines = Math.floor(maxLines / 2) // 2

    // Pre-fill with maxLines lines
    const existingLines = Array.from({ length: maxLines }, (_, i) => `line${i}`)
      .join("\n")
      .concat("\n")
    const written: Record<string, string> = {}
    ;(globalThis as any).Bun.write = async (path: string, content: string) => {
      written[path] = content
      return 0
    }
    ;(globalThis as any).Bun.file = (path: string) => ({
      exists: async () => true,
      text: async () => existingLines
    })
    ;(Bun.env as any).HOME = "/tmp/oc-logger-truncate"

    await log({ enabled: true, maxLines }, "INFO", "new line")

    const logPath = "/tmp/oc-logger-truncate/.config/opencode/plugins/oc-tweaks.log"
    const lines = (written[logPath] ?? "")
      .split("\n")
      .filter((l: string) => l.length > 0)
    expect(lines.length).toBeLessThanOrEqual(keepLines)
  })
})
