/**
 * memory diag — read-only diagnostic command.
 * Prints memory roots, file counts, token estimates, top-5 lists.
 * Zero writes, zero side-effects.
 */

import { statSync } from "node:fs"
import { join } from "node:path"

import { scanMemoryRoots, type MemoryEntry } from "./registry"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScopeStats {
  scope: "global" | "project"
  root: string
  fileCount: number
  totalBytes: number
  estimatedTokens: number
}

export interface DiagReport {
  roots: { global: string; project: string }
  scopes: ScopeStats[]
  totalFiles: number
  totalBytes: number
  totalEstimatedTokens: number
  top5ByUsageCount: MemoryEntry[]
  top5ByUpdatedAt: MemoryEntry[]
  autoWriteEvents: string
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface DiagOpts {
  /** Convenience: sets both globalRoot and projectRoot to <root>/global and <root>/project/.opencode/memory */
  root?: string
  globalRoot?: string
  projectRoot?: string
}

function resolveRoots(opts: DiagOpts): { globalDir: string; projectDir: string } {
  if (opts.root) {
    return {
      globalDir: join(opts.root, "global"),
      projectDir: join(opts.root, "project", ".opencode", "memory"),
    }
  }
  return {
    globalDir: opts.globalRoot ?? "",
    projectDir: opts.projectRoot ?? "",
  }
}

// ── File size helper ──────────────────────────────────────────────────────────

function fileSizeBytes(absPath: string): number {
  try {
    return statSync(absPath).size
  } catch {
    return 0
  }
}

// ── Core diagnostics ──────────────────────────────────────────────────────────

/**
 * Run diagnostics. Read-only: never writes, never mutates usage_count.
 * Throws if both roots are unreachable (empty string) and exits with code 1 from CLI.
 */
export async function runDiag(opts: DiagOpts): Promise<DiagReport> {
  const { globalDir, projectDir } = resolveRoots(opts)

  // Re-derive per-scope counts using the scope field on each merged entry.
  const allEntries = scanMemoryRoots(globalDir, projectDir)

  // For per-scope stats, we re-scan separately (scanMemoryRoots merges, so
  // we use the scope field on each entry after full merge).
  const globalEntries = allEntries.filter((e) => e.scope === "global")
  const projectEntries = allEntries.filter((e) => e.scope === "project")

  function scopeStats(entries: MemoryEntry[], scope: "global" | "project", root: string): ScopeStats {
    const totalBytes = entries.reduce((s, e) => s + fileSizeBytes(e.absPath), 0)
    const estimatedTokens = entries.reduce((s, e) => s + e.tokenEstimate, 0)
    return { scope, root, fileCount: entries.length, totalBytes, estimatedTokens }
  }

  const scopes: ScopeStats[] = [
    scopeStats(globalEntries, "global", globalDir),
    scopeStats(projectEntries, "project", projectDir),
  ]

  const totalBytes = scopes.reduce((s, sc) => s + sc.totalBytes, 0)
  const totalEstimatedTokens = scopes.reduce((s, sc) => s + sc.estimatedTokens, 0)

  // top 5 by usage_count desc (missing → 0)
  const top5ByUsageCount = [...allEntries]
    .sort((a, b) => (b.meta.usage_count ?? 0) - (a.meta.usage_count ?? 0))
    .slice(0, 5)

  // top 5 by updated_at desc (lexicographic on ISO strings is correct)
  const top5ByUpdatedAt = [...allEntries]
    .sort((a, b) => (b.meta.updated_at ?? "").localeCompare(a.meta.updated_at ?? ""))
    .slice(0, 5)

  return {
    roots: { global: globalDir, project: projectDir },
    scopes,
    totalFiles: allEntries.length,
    totalBytes,
    totalEstimatedTokens,
    top5ByUsageCount,
    top5ByUpdatedAt,
    autoWriteEvents: "no buffer in this session",
  }
}

// ── Print formatter ───────────────────────────────────────────────────────────

export function formatDiagReport(report: DiagReport): string {
  const lines: string[] = []

  lines.push("=== memory diag ===")
  lines.push("")
  lines.push("memory roots:")
  lines.push(`  global:  ${report.roots.global}`)
  lines.push(`  project: ${report.roots.project}`)
  lines.push("")

  lines.push("file count per scope:")
  for (const sc of report.scopes) {
    lines.push(
      `  ${sc.scope.padEnd(8)} root=${sc.root}  files=${sc.fileCount}  bytes=${sc.totalBytes}  estimated tokens=${sc.estimatedTokens}`,
    )
  }
  lines.push(`  total    files=${report.totalFiles}  bytes=${report.totalBytes}  estimated tokens=${report.totalEstimatedTokens}`)
  lines.push("")

  lines.push("estimated tokens (total): " + report.totalEstimatedTokens)
  lines.push("")

  lines.push("top 5 by usage_count (desc):")
  if (report.top5ByUsageCount.length === 0) {
    lines.push("  (none)")
  } else {
    for (const e of report.top5ByUsageCount) {
      lines.push(
        `  [${e.scope}] ${e.meta.id || e.absPath}  usage_count=${e.meta.usage_count ?? 0}  updated_at=${e.meta.updated_at}`,
      )
    }
  }
  lines.push("")

  lines.push("top 5 by updated_at (desc):")
  if (report.top5ByUpdatedAt.length === 0) {
    lines.push("  (none)")
  } else {
    for (const e of report.top5ByUpdatedAt) {
      lines.push(
        `  [${e.scope}] ${e.meta.id || e.absPath}  updated_at=${e.meta.updated_at}  usage_count=${e.meta.usage_count ?? 0}`,
      )
    }
  }
  lines.push("")

  lines.push("auto-write events: " + report.autoWriteEvents)

  return lines.join("\n")
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const args = process.argv.slice(2)
  const rootIdx = args.indexOf("--root")
  const globalIdx = args.indexOf("--global-root")
  const projectIdx = args.indexOf("--project-root")

  const opts: DiagOpts = {}
  if (rootIdx !== -1 && args[rootIdx + 1]) {
    opts.root = args[rootIdx + 1]
  }
  if (globalIdx !== -1 && args[globalIdx + 1]) {
    opts.globalRoot = args[globalIdx + 1]
  }
  if (projectIdx !== -1 && args[projectIdx + 1]) {
    opts.projectRoot = args[projectIdx + 1]
  }

  if (!opts.root && !opts.globalRoot && !opts.projectRoot) {
    process.stderr.write("error: must provide --root, --global-root, or --project-root\n")
    process.exit(1)
  }

  runDiag(opts)
    .then((report) => {
      process.stdout.write(formatDiagReport(report) + "\n")
      process.exit(0)
    })
    .catch((err: unknown) => {
      process.stderr.write("error: " + String(err) + "\n")
      process.exit(1)
    })
}
