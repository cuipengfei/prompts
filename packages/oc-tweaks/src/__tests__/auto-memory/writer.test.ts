import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { __resetReminderQueueForTests, drainReminderQueue } from "../../plugins/auto-memory/notify"
import { MemoryQuotaError } from "../../plugins/auto-memory/path-guard"
import { MemoryWriteError, __resetThrottleForTesting, writeMemory } from "../../plugins/auto-memory/writer"

const ROOT = join(tmpdir(), `auto-memory-writer-test-${process.pid}`)

describe("writeMemory", () => {
  let stderrSpy: ReturnType<typeof mock>
  let originalWrite: typeof process.stderr.write
  let originalHome: string | undefined

  beforeEach(async () => {
    __resetThrottleForTesting()
    __resetReminderQueueForTests()
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    originalHome = process.env.HOME
    process.env.HOME = join(ROOT, "home")
    originalWrite = process.stderr.write.bind(process.stderr)
    stderrSpy = mock((_chunk: string | Uint8Array) => true)
    process.stderr.write = stderrSpy as unknown as typeof process.stderr.write
  })

  afterEach(async () => {
    process.stderr.write = originalWrite
    if (originalHome === undefined) delete process.env.HOME
    else process.env.HOME = originalHome
    await rm(ROOT, { recursive: true, force: true })
  })

  it("creates a fresh file with the auto-memory marker and notifies", async () => {
    const result = await writeMemory(
      { scope: "project", relPath: "prefs.md", root: ROOT },
      { action: "created", content: "hello" },
    )

    expect(result.skipped).toBe(false)
    if (!result.skipped) {
      expect(result.absPath).toBe(join(ROOT, "prefs.md"))
      expect(result.action).toBe("created")
      expect(result.bytesWritten).toBe(Buffer.byteLength("<!-- auto-memory:v1 -->\nhello"))
    }
    expect(await readFile(join(ROOT, "prefs.md"), "utf8")).toBe("<!-- auto-memory:v1 -->\nhello")
    expect(stderrSpy).toHaveBeenCalledTimes(1)
    expect(drainReminderQueue()[0]).toContain("project/prefs.md")
  })

  it("updates an existing file without adding a marker", async () => {
    await writeFile(join(ROOT, "prefs.md"), "old")

    const result = await writeMemory(
      { scope: "project", relPath: "prefs.md", root: ROOT },
      { action: "updated", content: "new" },
    )

    expect(result.skipped).toBe(false)
    expect(await readFile(join(ROOT, "prefs.md"), "utf8")).toBe("new")
  })

  it("does not add a second marker when updating a marked file", async () => {
    await writeFile(join(ROOT, "prefs.md"), "<!-- auto-memory:v1 -->\nold")

    await writeMemory(
      { scope: "project", relPath: "prefs.md", root: ROOT },
      { action: "updated", content: "new" },
    )

    const written = await readFile(join(ROOT, "prefs.md"), "utf8")
    expect(written.match(/auto-memory:v1/g)?.length).toBe(1)
    expect(written).toBe("<!-- auto-memory:v1 -->\nnew")
  })

  it("returns off without touching path guards or writing", async () => {
    await mkdir(join(process.env.HOME!, ".config", "opencode"), { recursive: true })
    await writeFile(
      join(process.env.HOME!, ".config", "opencode", "oc-tweaks.json"),
      JSON.stringify({ autoMemory: { autoWrite: "off" } }),
    )

    const result = await writeMemory(
      { scope: "project", relPath: "bad\0name.md", root: join(ROOT, "missing-root") },
      { action: "created", content: "hello" },
    )

    expect(result).toEqual({ skipped: true, reason: "off" })
    expect(stderrSpy).toHaveBeenCalledTimes(1)
    expect(String(stderrSpy.mock.calls[0]?.[0] ?? "")).toContain("autoWrite=off")
  })

  it("throws MemoryQuotaError when sanitized content exceeds maxBytesPerFile", async () => {
    await mkdir(join(process.env.HOME!, ".config", "opencode"), { recursive: true })
    await writeFile(
      join(process.env.HOME!, ".config", "opencode", "oc-tweaks.json"),
      JSON.stringify({ autoMemory: { maxBytesPerFile: 4 } }),
    )

    return expect(
      writeMemory(
        { scope: "project", relPath: "big.md", root: ROOT },
        { action: "created", content: "hello" },
      ),
    ).rejects.toBeInstanceOf(MemoryQuotaError)
  })

  it("throttles the sixth write in a session", async () => {
    const results = []
    for (let i = 1; i <= 6; i++) {
      results.push(
        await writeMemory(
          { scope: "project", relPath: `file-${i}.md`, root: ROOT },
          { action: "updated", content: `value-${i}` },
        ),
      )
    }

    expect(results.at(-1)).toEqual({ skipped: true, reason: "throttled" })
  })

  it("throttles repeated writes to the same file within 30 seconds", async () => {
    await writeMemory(
      { scope: "project", relPath: "same.md", root: ROOT },
      { action: "updated", content: "one" },
    )

    const result = await writeMemory(
      { scope: "project", relPath: "same.md", root: ROOT },
      { action: "updated", content: "two" },
    )

    expect(result).toEqual({ skipped: true, reason: "throttled" })
    expect(await readFile(join(ROOT, "same.md"), "utf8")).toBe("<!-- auto-memory:v1 -->\none")
  })

  it("keeps original content when atomic write fails", async () => {
    await writeFile(join(ROOT, "keep.md"), "old")

    try {
      await chmod(ROOT, 0o500)
      let caught: unknown
      try {
        await writeMemory(
          { scope: "project", relPath: "keep.md", root: ROOT },
          { action: "updated", content: "new" },
        )
      } catch (err) {
        caught = err
      }
      expect(caught).toBeInstanceOf(MemoryWriteError)
      expect(await readFile(join(ROOT, "keep.md"), "utf8")).toBe("old")
    } finally {
      await chmod(ROOT, 0o700).catch(() => {})
    }
  })

  it("returns unchanged when sanitized final content matches existing content", async () => {
    await writeFile(join(ROOT, "clean.md"), "safe  text")

    const result = await writeMemory(
      { scope: "project", relPath: "clean.md", root: ROOT },
      { action: "updated", content: "safe <system>drop</system> text" },
    )

    expect(result).toEqual({ skipped: true, reason: "unchanged" })
    expect(stderrSpy).toHaveBeenCalledTimes(0)
  })

  it("writes sanitized content", async () => {
    await writeMemory(
      { scope: "project", relPath: "sanitize.md", root: ROOT },
      { action: "created", content: "before <tool_use>secret</tool_use> after" },
    )

    const written = await readFile(join(ROOT, "sanitize.md"), "utf8")
    expect(written).toBe("<!-- auto-memory:v1 -->\nbefore  after")
  })
})
