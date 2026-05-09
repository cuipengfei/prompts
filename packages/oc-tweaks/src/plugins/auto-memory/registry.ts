/**
 * Memory registry: scan memory root directories and produce MemoryEntry[].
 * V1: non-recursive, root .md files only.
 * Does NOT read full body into memory — reads at most 2 KB per file.
 */

import { closeSync, openSync, readdirSync, readSync } from "node:fs"
import { join } from "node:path"

import { type MemoryMeta, parseFrontmatter } from "./frontmatter"

// ── Types ────────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  meta: MemoryMeta
  absPath: string
  scope: "global" | "project"
  tokenEstimate: number
  summary: string
}

// ── Skip rules ───────────────────────────────────────────────────────────────

/** Files to skip — editor artifacts, lock files, README variants. */
const SKIP_PATTERNS: RegExp[] = [
  /^readme/i, // README.md, README.en.md, README.guwen.md, …
  /^\.ds_store$/i,
  /\.swp$/,
  /\.lock$/,
  /^\.gitignore$/,
  /^\.gitkeep$/,
]

function shouldSkip(filename: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(filename))
}

// ── Partial file read ────────────────────────────────────────────────────────

/** 2 KB is more than enough for frontmatter + first paragraph. */
const MAX_READ_BYTES = 2048

function readPartial(absPath: string): string {
  const fd = openSync(absPath, "r")
  try {
    const buf = Buffer.alloc(MAX_READ_BYTES)
    const bytesRead = readSync(fd, buf, 0, MAX_READ_BYTES, 0)
    return buf.subarray(0, bytesRead).toString("utf8")
  } finally {
    closeSync(fd)
  }
}

// ── Summary extraction ───────────────────────────────────────────────────────

const MAX_SUMMARY_CHARS = 240
const MAX_SUMMARY_LINES = 5

function extractSummary(meta: MemoryMeta, body: string): string {
  if (meta.summary) {
    return meta.summary.slice(0, MAX_SUMMARY_CHARS)
  }

  // Body first paragraph: ≤5 non-empty lines until blank line
  const lines = body.split("\n")
  const collected: string[] = []
  for (const line of lines) {
    if (collected.length >= MAX_SUMMARY_LINES) break
    // Stop at blank line only after we have at least one line
    if (collected.length > 0 && line.trim() === "") break
    collected.push(line)
  }

  return collected.join("\n").slice(0, MAX_SUMMARY_CHARS)
}

// ── Directory scanner ────────────────────────────────────────────────────────

function scanDir(
  dir: string,
  scope: "global" | "project",
): Map<string, MemoryEntry> {
  const map = new Map<string, MemoryEntry>()

  let filenames: string[]
  try {
    filenames = readdirSync(dir, { withFileTypes: false }) as string[]
  } catch {
    // Directory does not exist or is not readable → treat as empty
    return map
  }

  for (const filename of filenames) {
    if (typeof filename !== "string") continue
    if (!filename.endsWith(".md")) continue
    if (shouldSkip(filename)) continue

    const absPath = join(dir, filename)
    let partial: string
    try {
      partial = readPartial(absPath)
    } catch {
      continue
    }

    const { meta, body } = parseFrontmatter(partial)
    if (meta.disabled === true) continue
    const summary = extractSummary(meta, body)
    const tokenEstimate = Math.ceil(
      (summary.length + JSON.stringify(meta).length) / 4,
    )

    const entry: MemoryEntry = {
      meta,
      absPath,
      scope,
      tokenEstimate,
      summary,
    }

    // Use meta.id when present, fall back to filename to avoid collisions
    const key = meta.id || filename
    map.set(key, entry)
  }

  return map
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Scan both memory root directories and return a merged list of MemoryEntry.
 * - Only `.md` files at root level (no recursion).
 * - Same `id`: project entry wins over global.
 * - Empty or missing directories produce no entries.
 */
export function scanMemoryRoots(
  globalDir: string,
  projectDir: string,
): MemoryEntry[] {
  const globalMap = scanDir(globalDir, "global")
  const projectMap = scanDir(projectDir, "project")

  // Merge: project overrides global for matching keys
  const merged = new Map([...globalMap, ...projectMap])

  return Array.from(merged.values())
}
