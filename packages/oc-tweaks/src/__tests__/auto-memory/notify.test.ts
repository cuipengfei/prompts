import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"

import {
  __resetReminderQueueForTests,
  drainReminderQueue,
  notifyWrite,
} from "../../plugins/auto-memory/notify"

describe("notifyWrite", () => {
  let stderrSpy: ReturnType<typeof mock>
  let originalWrite: typeof process.stderr.write

  beforeEach(() => {
    __resetReminderQueueForTests()
    originalWrite = process.stderr.write.bind(process.stderr)
    stderrSpy = mock((_chunk: string | Uint8Array) => true)
    process.stderr.write = stderrSpy as unknown as typeof process.stderr.write
  })

  afterEach(() => {
    process.stderr.write = originalWrite
  })

  const sampleEvent = {
    scope: "project",
    relPath: "preferences.md",
    action: "created" as const,
    willAffectRecall: true,
  }

  it("mode=notify writes stderr line containing all 4 fields and queues reminder", () => {
    notifyWrite(sampleEvent, { mode: "notify" })

    expect(stderrSpy).toHaveBeenCalledTimes(1)
    const written = String(stderrSpy.mock.calls[0]?.[0] ?? "")
    expect(written).toContain("scope")
    expect(written).toContain("relPath")
    expect(written).toContain("action")
    expect(written).toContain("willAffectRecall")
    expect(written).toContain("project")
    expect(written).toContain("preferences.md")
    expect(written).toContain("created")
    expect(written.endsWith("\n")).toBe(true)

    const queue = drainReminderQueue()
    expect(queue.length).toBe(1)
    expect(queue[0]).toContain("preferences.md")
  })

  it("mode=silent writes stderr but does NOT queue reminder", () => {
    notifyWrite(sampleEvent, { mode: "silent" })

    expect(stderrSpy).toHaveBeenCalledTimes(1)
    const written = String(stderrSpy.mock.calls[0]?.[0] ?? "")
    expect(written).toContain("scope")
    expect(written).toContain("relPath")
    expect(written).toContain("action")
    expect(written).toContain("willAffectRecall")

    expect(drainReminderQueue().length).toBe(0)
  })

  it("mode=off is a no-op (defensive)", () => {
    notifyWrite(sampleEvent, { mode: "off" })

    expect(stderrSpy).toHaveBeenCalledTimes(0)
    expect(drainReminderQueue().length).toBe(0)
  })

  it("default mode is 'notify' when opts omitted", () => {
    notifyWrite(sampleEvent)
    expect(stderrSpy).toHaveBeenCalledTimes(1)
    const written = String(stderrSpy.mock.calls[0]?.[0] ?? "")
    expect(written).toContain("willAffectRecall")
    expect(drainReminderQueue().length).toBe(1)
  })

  it("stderr line is structured JSON parseable with all 4 fields", () => {
    notifyWrite(
      {
        scope: "global",
        relPath: "patterns.md",
        action: "updated",
        willAffectRecall: false,
      },
      { mode: "silent" },
    )
    const written = String(stderrSpy.mock.calls[0]?.[0] ?? "").trim()
    // Strip optional prefix before JSON
    const jsonStart = written.indexOf("{")
    expect(jsonStart).toBeGreaterThanOrEqual(0)
    const parsed = JSON.parse(written.slice(jsonStart))
    expect(parsed.scope).toBe("global")
    expect(parsed.relPath).toBe("patterns.md")
    expect(parsed.action).toBe("updated")
    expect(parsed.willAffectRecall).toBe(false)
  })

  it("does not throw when toast layer unavailable (degrades to stderr)", () => {
    expect(() =>
      notifyWrite({ ...sampleEvent, action: "forgotten" }, { mode: "notify" }),
    ).not.toThrow()
    expect(stderrSpy).toHaveBeenCalledTimes(1)
  })
})
