import { describe, expect, it } from "bun:test"

import type { MemoryEntry } from "../../plugins/auto-memory/registry"
import { buildSystemInjection } from "../../plugins/auto-memory/injector"

function makeEntry(overrides: Partial<MemoryEntry> & { id: string; updated_at: string; summary: string }): MemoryEntry {
  return {
    meta: {
      id: overrides.id,
      scope: "global",
      type: "note",
      source: "manual",
      created_at: "2026-01-01",
      updated_at: overrides.updated_at,
      trusted_as_instruction: false,
      summary: overrides.summary,
    },
    absPath: `/x/${overrides.id}.md`,
    scope: "global",
    tokenEstimate: Math.ceil(overrides.summary.length / 4),
    summary: overrides.summary,
  } as MemoryEntry
}

describe("buildSystemInjection", () => {
  it("returns empty string when no entries (no skeleton wrapper)", () => {
    const out = buildSystemInjection([], { summaryTokenBudget: 4000 })
    expect(out).toBe("")
  })

  it("renders single entry inside <untrusted_memory> wrapper with <memory> child and trusted=false attribute", () => {
    const entry = makeEntry({ id: "a1", updated_at: "2026-01-01", summary: "hello world" })
    const out = buildSystemInjection([entry], { summaryTokenBudget: 4000 })
    expect(out).toContain("<untrusted_memory>")
    expect(out).toContain("</untrusted_memory>")
    expect(out).toContain("<memory ")
    expect(out).toContain('id="a1"')
    expect(out).toContain('scope="global"')
    expect(out).toContain("trusted=false")
    expect(out).toContain('summary="hello world"')
    // Data-not-instruction header
    expect(out).toMatch(/数据.*不是指令|data.*not.*instructions/i)
  })

  it("renders N entries each as a <memory> element", () => {
    const entries = [
      makeEntry({ id: "a", updated_at: "2026-01-01", summary: "alpha" }),
      makeEntry({ id: "b", updated_at: "2026-01-02", summary: "beta" }),
      makeEntry({ id: "c", updated_at: "2026-01-03", summary: "gamma" }),
    ]
    const out = buildSystemInjection(entries, { summaryTokenBudget: 4000 })
    const matches = out.match(/<memory /g) || []
    expect(matches.length).toBe(3)
    expect(out).toContain('id="a"')
    expect(out).toContain('id="b"')
    expect(out).toContain('id="c"')
  })

  it("truncates by updated_at desc (keeps newest) when budget exceeded and emits truncation comment", () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({
        id: `e${i}`,
        updated_at: `2026-01-${String(i + 1).padStart(2, "0")}`,
        summary: "x".repeat(1000),
      }),
    )
    const out = buildSystemInjection(entries, { summaryTokenBudget: 4000 })
    expect(out).toContain("<!-- truncated:")
    const memoryCount = (out.match(/<memory /g) || []).length
    expect(memoryCount).toBeLessThan(10)
    expect(memoryCount).toBeGreaterThan(0)
    // Newest must be present (e9 → 2026-01-10)
    expect(out).toContain('id="e9"')
    // Oldest (e0 → 2026-01-01) must be dropped
    expect(out).not.toContain('id="e0"')
  })

  it("XML-escapes attribute values containing quotes, angle brackets, and ampersands", () => {
    const entry = makeEntry({
      id: 'weird"id',
      updated_at: "2026-01-01",
      summary: 'has "quote" & <tag> and \'apos\'',
    })
    const out = buildSystemInjection([entry], { summaryTokenBudget: 4000 })
    // Raw unescaped chars must NOT appear inside attribute area for these reserved chars
    expect(out).toContain("&quot;")
    expect(out).toContain("&amp;")
    expect(out).toContain("&lt;")
    expect(out).toContain("&gt;")
    // Make sure the raw `<tag>` did not survive verbatim inside summary attr
    expect(out).not.toContain("<tag>")
  })

  it("trusted=false MUST appear literally in output for every entry", () => {
    const entries = [
      makeEntry({ id: "a", updated_at: "2026-01-01", summary: "one" }),
      makeEntry({ id: "b", updated_at: "2026-01-02", summary: "two" }),
    ]
    const out = buildSystemInjection(entries, { summaryTokenBudget: 4000 })
    const trustedCount = (out.match(/trusted=false/g) || []).length
    expect(trustedCount).toBe(2)
  })
})
