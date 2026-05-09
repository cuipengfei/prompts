/**
 * Tests for the read-only memory diag command.
 */

import { join } from "node:path"
import { describe, expect, it } from "bun:test"

import { formatDiagReport, runDiag } from "../../plugins/auto-memory/diag"

const FIXTURE_ROOT = join(import.meta.dir, "../fixtures/diag-sample")

describe("runDiag", () => {
  it("returns correct multi-scope output structure", async () => {
    const report = await runDiag({ root: FIXTURE_ROOT })

    // Roots resolved correctly
    expect(report.roots.global).toBe(join(FIXTURE_ROOT, "global"))
    expect(report.roots.project).toBe(join(FIXTURE_ROOT, "project", ".opencode", "memory"))

    // Scope breakdown
    const globalScope = report.scopes.find((s) => s.scope === "global")
    const projectScope = report.scopes.find((s) => s.scope === "project")
    expect(globalScope).toBeDefined()
    expect(projectScope).toBeDefined()
    expect(globalScope!.fileCount).toBe(3)
    expect(projectScope!.fileCount).toBe(2)

    // Total
    expect(report.totalFiles).toBe(5)
    expect(report.totalBytes).toBeGreaterThan(0)

    // top5 arrays present
    expect(report.top5ByUsageCount.length).toBeLessThanOrEqual(5)
    expect(report.top5ByUpdatedAt.length).toBeLessThanOrEqual(5)

    // Ring buffer note
    expect(report.autoWriteEvents).toBe("no buffer in this session")
  })

  it("correctly estimates tokens as Math.ceil(chars/4)", async () => {
    const report = await runDiag({ root: FIXTURE_ROOT })

    // Each entry's tokenEstimate should be positive
    for (const e of report.top5ByUsageCount) {
      expect(e.tokenEstimate).toBeGreaterThan(0)
      // Verify formula: ceil((summary.length + JSON.stringify(meta).length) / 4)
      const expected = Math.ceil(
        (e.summary.length + JSON.stringify(e.meta).length) / 4,
      )
      expect(e.tokenEstimate).toBe(expected)
    }

    // totalEstimatedTokens matches sum
    const sumFromScopes = report.scopes.reduce((s, sc) => s + sc.estimatedTokens, 0)
    expect(report.totalEstimatedTokens).toBe(sumFromScopes)
  })

  it("top5ByUsageCount is sorted desc by usage_count", async () => {
    const report = await runDiag({ root: FIXTURE_ROOT })

    const counts = report.top5ByUsageCount.map((e) => e.meta.usage_count ?? 0)
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    }
  })

  it("top5ByUpdatedAt is sorted desc by updated_at", async () => {
    const report = await runDiag({ root: FIXTURE_ROOT })

    const dates = report.top5ByUpdatedAt.map((e) => e.meta.updated_at ?? "")
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i].localeCompare(dates[i - 1])).toBeLessThanOrEqual(0)
    }
  })

  it("is zero-write: runDiag does not mutate any file", async () => {
    const { readdirSync, readFileSync } = await import("node:fs")

    // Capture all file contents before
    function captureContents(dir: string): Map<string, string> {
      const map = new Map<string, string>()
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const fullPath = join(dir, entry.name)
          if (entry.isDirectory()) {
            for (const [k, v] of captureContents(fullPath)) map.set(k, v)
          } else {
            map.set(fullPath, readFileSync(fullPath, "utf8"))
          }
        }
      } catch {
        // ignore missing dirs
      }
      return map
    }

    const before = captureContents(FIXTURE_ROOT)
    await runDiag({ root: FIXTURE_ROOT })
    const after = captureContents(FIXTURE_ROOT)

    // Same keys
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort())
    // Same contents
    for (const [k, v] of before) {
      expect(after.get(k)).toBe(v)
    }
  })

  it("formats report containing all 4 required sections", async () => {
    const report = await runDiag({ root: FIXTURE_ROOT })
    const output = formatDiagReport(report)

    expect(output).toMatch(/memory roots/)
    expect(output).toMatch(/file count/)
    expect(output).toMatch(/estimated tokens/)
    expect(output).toMatch(/top 5/)
  })

  it("returns empty scopes gracefully when root does not exist", async () => {
    const report = await runDiag({ root: "/nonexistent-path-diag-test-xyz" })
    expect(report.totalFiles).toBe(0)
    expect(report.totalBytes).toBe(0)
    expect(report.totalEstimatedTokens).toBe(0)
  })
})
