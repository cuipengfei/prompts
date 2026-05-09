import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { recallMemory } from "../../plugins/auto-memory/recall"
import type { MemoryEntry } from "../../plugins/auto-memory/registry"
import type { MemoryMeta } from "../../plugins/auto-memory/frontmatter"

let workDir: string

function makeMeta(overrides: Partial<MemoryMeta> = {}): MemoryMeta {
  return {
    id: "m1",
    scope: "global",
    type: "note",
    source: "user",
    created_at: "2026-05-09T00:00:00Z",
    updated_at: "2026-05-09T00:00:00Z",
    trusted_as_instruction: false,
    ...overrides,
  }
}

function writeEntry(
  filename: string,
  meta: MemoryMeta,
  body: string,
  scope: "global" | "project" = "global",
): MemoryEntry {
  const absPath = join(workDir, filename)
  // Frontmatter not strictly required for body read — recall reads body from disk
  writeFileSync(absPath, body, "utf8")
  return {
    meta,
    absPath,
    scope,
    tokenEstimate: Math.ceil(body.length / 4),
    summary: body.slice(0, 100),
  }
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "recall-"))
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe("recallMemory", () => {
  test("hit: literal substring match returns body wrapped as <untrusted_memory>", async () => {
    const entry = writeEntry(
      "a.md",
      makeMeta({ id: "alpha" }),
      "The quick brown fox jumps over the lazy dog.",
    )
    const results = await recallMemory("brown fox", [entry])
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("alpha")
    expect(results[0].content).toContain("<untrusted_memory")
    expect(results[0].content).toContain("brown fox")
    expect(results[0].content).toContain("</untrusted_memory>")
  })

  test("no-match: returns sentinel containing 'recall:no-match'", async () => {
    const entry = writeEntry("a.md", makeMeta(), "Some unrelated content.")
    const results = await recallMemory("nonexistent-token-xyz", [entry])
    expect(JSON.stringify(results).includes("recall:no-match")).toBe(true)
  })

  test("empty query → sentinel (treated as 0-match)", async () => {
    const entry = writeEntry("a.md", makeMeta(), "Some content.")
    const results = await recallMemory("", [entry])
    expect(JSON.stringify(results).includes("recall:no-match")).toBe(true)
  })

  test("regex metacharacters are matched literally, not interpreted", async () => {
    const entry = writeEntry(
      "a.md",
      makeMeta({ id: "literal" }),
      "Body with literal text: a.b*c(d) value",
    )
    // Query has regex metas — must match literally
    const results = await recallMemory("a.b*c(d)", [entry])
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("literal")
    // A regex-interpretation would also match "axbxxc(d)" — verify it does NOT match such a body
    const entry2 = writeEntry(
      "b.md",
      makeMeta({ id: "regex-only" }),
      "axbxxcXdY content",
    )
    const results2 = await recallMemory("a.b*c(d)", [entry2])
    expect(JSON.stringify(results2).includes("recall:no-match")).toBe(true)
  })

  test("usage update stub is invoked on hit (best-effort, non-blocking)", async () => {
    const entry = writeEntry("a.md", makeMeta({ id: "u1" }), "match-me here")
    const calls: string[] = []
    const results = await recallMemory("match-me", [entry], {
      onHit: (id) => {
        calls.push(id)
      },
    })
    expect(results).toHaveLength(1)
    expect(calls).toContain("u1")
  })

  test("filter by type: only entries whose meta.type matches are searched", async () => {
    const e1 = writeEntry(
      "a.md",
      makeMeta({ id: "tagged", type: "decision" }),
      "match-token here",
    )
    const e2 = writeEntry(
      "b.md",
      makeMeta({ id: "untagged", type: "note" }),
      "match-token also here",
    )
    const results = await recallMemory("match-token", [e1, e2], {
      filterType: "decision",
    })
    expect(results.map((r) => r.id)).toContain("tagged")
    expect(results.map((r) => r.id)).not.toContain("untagged")
  })

  test("filter by tags: OR overlap keeps tagged entries and entries without tags", async () => {
    const e1 = writeEntry(
      "a.md",
      makeMeta({ id: "matching-tag", tags: ["workflow", "decision"] }),
      "match-token here",
    )
    const e2 = writeEntry(
      "b.md",
      makeMeta({ id: "other-tag", tags: ["setup"] }),
      "match-token also here",
    )
    const e3 = writeEntry("c.md", makeMeta({ id: "no-tags" }), "match-token too")
    const results = await recallMemory("match-token", [e1, e2, e3], {
      filterTags: ["decision", "preference"],
    })

    expect(results.map((r) => r.id)).toContain("matching-tag")
    expect(results.map((r) => r.id)).toContain("no-tags")
    expect(results.map((r) => r.id)).not.toContain("other-tag")
  })

  test("body exceeding maxBytesPerFile is truncated with marker", async () => {
    const big = "x".repeat(100) + " match-here " + "y".repeat(100)
    const entry = writeEntry("a.md", makeMeta({ id: "big" }), big)
    const results = await recallMemory("match-here", [entry], {
      maxBytesPerFile: 50,
    })
    expect(results).toHaveLength(1)
    expect(results[0].content).toContain("<!-- truncated -->")
  })
})
