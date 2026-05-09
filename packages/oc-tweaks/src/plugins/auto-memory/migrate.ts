/**
 * Memory migration: additively backfill frontmatter on legacy .md files.
 *
 * - Scans `root` for `.md` files (non-recursive).
 * - Files that already have frontmatter (start with `---`) are SKIPPED untouched
 *   (even if YAML is malformed — log + skip).
 * - Files without frontmatter are atomically rewritten with a minimal frontmatter
 *   block prepended; body bytes are preserved.
 * - Idempotent: a second run finds no legacy files left.
 *
 * NOT auto-run by the plugin. Invoked via `/memory-migrate` slash command or
 * direct CLI: `bun run migrate.ts --root <dir> [--scope global|project]`.
 */

import { mkdir, open, readdir, readFile, rename, unlink } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

import { type MemoryMeta, serializeFrontmatter } from "./frontmatter"

export type MigrateScope = "global" | "project"

export interface MigrateOptions {
  root: string
  scope?: MigrateScope
}

export interface MigrateResult {
  migrated: string[]
  skipped: string[]
  errored: string[]
}

/**
 * Detect scope from absolute path when caller did not specify.
 * Path containing `.opencode/memory` → project; otherwise → global.
 */
function detectScope(absRoot: string, override?: MigrateScope): MigrateScope {
  if (override) return override
  return absRoot.includes(`.opencode${"/"}memory`) || absRoot.includes(`.opencode${"\\"}memory`)
    ? "project"
    : "global"
}

/** Filename slug: drop `.md`, lowercase, spaces/underscores → `-`. */
function slugifyFilename(filename: string): string {
  return filename
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
}

/** Atomic write: tmpfile + fsync + rename. Mirrors writer.ts primitive. */
async function atomicWrite(absPath: string, content: string): Promise<void> {
  const tmpfile = `${absPath}.tmp.${Date.now()}-${Math.random().toString(36).slice(2)}`
  let tmpfileCreated = false
  try {
    await mkdir(dirname(absPath), { recursive: true })
    const handle = await open(tmpfile, "w")
    try {
      await handle.writeFile(content, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    tmpfileCreated = true
    await rename(tmpfile, absPath)
    tmpfileCreated = false
  } finally {
    if (tmpfileCreated) {
      await unlink(tmpfile).catch(() => {})
    }
  }
}

export async function migrate(opts: MigrateOptions): Promise<MigrateResult> {
  const absRoot = resolve(opts.root)
  const scope = detectScope(absRoot, opts.scope)

  const result: MigrateResult = { migrated: [], skipped: [], errored: [] }

  let filenames: string[]
  try {
    filenames = await readdir(absRoot)
  } catch {
    return result
  }

  for (const filename of filenames) {
    if (!filename.endsWith(".md")) continue

    const absPath = join(absRoot, filename)
    let raw: string
    try {
      raw = await readFile(absPath, "utf8")
    } catch (err) {
      console.error(`[migrate] error reading ${filename}: ${(err as Error).message}`)
      result.errored.push(filename)
      continue
    }

    const stripped = raw.startsWith("\uFEFF") ? raw.slice(1) : raw
    if (stripped.startsWith("---")) {
      // Existing frontmatter (valid or malformed) — never touch.
      console.log(`[migrate] skip (has frontmatter): ${filename}`)
      result.skipped.push(filename)
      continue
    }

    const now = new Date().toISOString()
    const meta: MemoryMeta = {
      id: slugifyFilename(filename),
      scope,
      type: "note",
      source: "migrate",
      created_at: now,
      updated_at: now,
      trusted_as_instruction: false,
    }

    const newContent = serializeFrontmatter(meta, raw)

    try {
      await atomicWrite(absPath, newContent)
      console.log(`[migrate] migrated: ${filename}`)
      result.migrated.push(filename)
    } catch (err) {
      console.error(`[migrate] error writing ${filename}: ${(err as Error).message}`)
      result.errored.push(filename)
    }
  }

  return result
}

// ── CLI entry ────────────────────────────────────────────────────────────────

function parseArgv(argv: string[]): MigrateOptions {
  let root: string | undefined
  let scope: MigrateScope | undefined
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--root") root = argv[++i]
    else if (a === "--scope") {
      const v = argv[++i]
      if (v === "global" || v === "project") scope = v
    }
  }
  if (!root) {
    throw new Error("--root <dir> is required")
  }
  return { root, scope }
}

if (import.meta.main) {
  const opts = parseArgv(process.argv.slice(2))
  migrate(opts)
    .then((r) => {
      console.log(
        `\nSummary: migrated=${r.migrated.length}, skipped=${r.skipped.length}, errored=${r.errored.length}`,
      )
      if (r.migrated.length) console.log(`  migrated: ${r.migrated.join(", ")}`)
      if (r.skipped.length) console.log(`  skipped:  ${r.skipped.join(", ")}`)
      if (r.errored.length) console.log(`  errored:  ${r.errored.join(", ")}`)
    })
    .catch((err) => {
      console.error(`migrate failed: ${(err as Error).message}`)
      process.exit(1)
    })
}
