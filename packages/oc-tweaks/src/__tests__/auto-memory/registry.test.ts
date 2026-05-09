import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { scanMemoryRoots } from "../../plugins/auto-memory/registry"

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFrontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`)
  return `---\n${lines.join("\n")}\n---\n`
}

function writeMd(dir: string, filename: string, content: string): string {
  const absPath = join(dir, filename)
  writeFileSync(absPath, content, "utf8")
  return absPath
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

let globalDir: string
let projectDir: string

beforeEach(() => {
  globalDir = mkdtempSync(join(tmpdir(), "reg-g-"))
  projectDir = mkdtempSync(join(tmpdir(), "reg-p-"))
})

afterEach(() => {
  rmSync(globalDir, { recursive: true, force: true })
  rmSync(projectDir, { recursive: true, force: true })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("scanMemoryRoots", () => {
  test("empty directories → returns []", () => {
    const result = scanMemoryRoots(globalDir, projectDir)
    expect(result).toEqual([])
  })

  test("non-existent directories → returns []", () => {
    const result = scanMemoryRoots("/tmp/__nonexistent_g__", "/tmp/__nonexistent_p__")
    expect(result).toEqual([])
  })

  test("only global entries → returns global entries with scope=global", () => {
    writeMd(
      globalDir,
      "prefs.md",
      makeFrontmatter({
        id: "prefs",
        scope: "global",
        type: "preference",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
        summary: "My preferences",
      }),
    )

    const result = scanMemoryRoots(globalDir, projectDir)

    expect(result).toHaveLength(1)
    expect(result[0].scope).toBe("global")
    expect(result[0].meta.id).toBe("prefs")
    expect(result[0].summary).toBe("My preferences")
    expect(result[0].tokenEstimate).toBeGreaterThan(0)
  })

  test("project entry overrides global entry with same id", () => {
    writeMd(
      globalDir,
      "x.md",
      makeFrontmatter({
        id: "x",
        scope: "global",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
        summary: "G",
      }),
    )
    writeMd(
      projectDir,
      "x.md",
      makeFrontmatter({
        id: "x",
        scope: "project",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
        summary: "P",
      }),
    )

    const result = scanMemoryRoots(globalDir, projectDir)

    // Only one entry for id "x"
    expect(result).toHaveLength(1)
    const entry = result.find((e) => e.meta.id === "x")
    expect(entry).toBeDefined()
    expect(entry!.scope).toBe("project")
    expect(entry!.summary).toBe("P")
  })

  test("skips README.md, README*.md, .swp, .lock files; only keeps valid .md", () => {
    writeMd(globalDir, "README.md", "# readme")
    writeMd(globalDir, "README.en.md", "# readme en")
    writeMd(globalDir, "notes.md.swp", "swap file")
    writeMd(globalDir, "pkg.lock", "lock file")
    writeMd(globalDir, "not-markdown.txt", "plain text")
    writeMd(
      globalDir,
      "valid.md",
      makeFrontmatter({
        id: "valid",
        scope: "global",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
        summary: "Valid entry",
      }),
    )

    const result = scanMemoryRoots(globalDir, projectDir)

    expect(result).toHaveLength(1)
    expect(result[0].meta.id).toBe("valid")
  })

  test("summary falls back to body first paragraph when frontmatter has no summary", () => {
    const body = "First line of body\nSecond line\n\nThis is a second paragraph"
    writeMd(
      globalDir,
      "nosummary.md",
      makeFrontmatter({
        id: "nosummary",
        scope: "global",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
      }) + body,
    )

    const result = scanMemoryRoots(globalDir, projectDir)

    expect(result).toHaveLength(1)
    // Summary should contain first paragraph, not second
    expect(result[0].summary).toContain("First line of body")
    expect(result[0].summary).not.toContain("second paragraph")
  })

  test("summary is truncated to 240 chars when body is long", () => {
    const longLine = "A".repeat(300)
    writeMd(
      globalDir,
      "long.md",
      makeFrontmatter({
        id: "long",
        scope: "global",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
      }) + longLine,
    )

    const result = scanMemoryRoots(globalDir, projectDir)

    expect(result).toHaveLength(1)
    expect(result[0].summary.length).toBeLessThanOrEqual(240)
  })

  test("global and project entries with different ids are both returned", () => {
    writeMd(
      globalDir,
      "g1.md",
      makeFrontmatter({
        id: "g1",
        scope: "global",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
        summary: "Global 1",
      }),
    )
    writeMd(
      projectDir,
      "p1.md",
      makeFrontmatter({
        id: "p1",
        scope: "project",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
        summary: "Project 1",
      }),
    )

    const result = scanMemoryRoots(globalDir, projectDir)

    expect(result).toHaveLength(2)
    const ids = result.map((e) => e.meta.id).sort()
    expect(ids).toEqual(["g1", "p1"])
  })

  test("does not recurse into subdirectories", () => {
    const subdir = join(globalDir, "subdir")
    mkdirSync(subdir)
    writeMd(
      subdir,
      "nested.md",
      makeFrontmatter({
        id: "nested",
        scope: "global",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
        summary: "Nested",
      }),
    )

    const result = scanMemoryRoots(globalDir, projectDir)

    expect(result).toEqual([])
  })

  test("tokenEstimate is Math.ceil((summary.length + JSON.stringify(meta).length) / 4)", () => {
    writeMd(
      globalDir,
      "tok.md",
      makeFrontmatter({
        id: "tok",
        scope: "global",
        type: "note",
        source: "user",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        trusted_as_instruction: "false",
        summary: "Token test",
      }),
    )

    const result = scanMemoryRoots(globalDir, projectDir)
    const entry = result[0]

    const expected = Math.ceil(
      (entry.summary.length + JSON.stringify(entry.meta).length) / 4,
    )
    expect(entry.tokenEstimate).toBe(expected)
  })
})
