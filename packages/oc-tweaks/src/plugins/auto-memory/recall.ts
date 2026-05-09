/**
 * recall.ts — V1 literal-substring memory recall.
 *
 * Algorithm:
 *  1. Optional pre-filter by frontmatter `type` (and/or future `tags`).
 *  2. Read body of each candidate entry from disk (lazy).
 *  3. Literal substring match (regex metacharacters NOT interpreted).
 *  4. Wrap hits as <untrusted_memory id="...">body</untrusted_memory>.
 *  5. Truncate body bodies > maxBytesPerFile with `<!-- truncated -->` marker.
 *  6. 0 hits → single sentinel result whose content carries `recall:no-match`.
 *  7. Hit → fire-and-forget `onHit(id)` callback (best-effort; T11 writer wires here later).
 *
 * Out of scope (V1):
 *  - tokenization, stemming, fuzzy match
 *  - embedding / vector search
 *  - shelling out to ripgrep
 */

import { readFile } from "node:fs/promises"

import type { MemoryEntry } from "./registry"
import { wrapAsUntrusted } from "./sanitize"

// ── Types ────────────────────────────────────────────────────────────────────

export interface RecallResult {
  id: string
  content: string
}

export interface RecallOptions {
  /** Pre-filter: only search entries whose meta.type equals this value. */
  filterType?: string
  /** Pre-filter: keep entries whose meta.tags overlap with any of these tags. */
  filterTags?: string[]
  /** Cap per-entry body bytes; longer bodies are truncated with a marker. */
  maxBytesPerFile?: number
  /**
   * Fire-and-forget callback invoked per hit (id of the entry).
   * Used by T11 writer to bump usage_count / last_usage. Best-effort —
   * recall does NOT await this and swallows thrown errors to stderr.
   */
  onHit?: (id: string) => void | Promise<void>
}

const DEFAULT_MAX_BYTES_PER_FILE = 32_768
const TRUNCATION_MARKER = "<!-- truncated -->"
const NO_MATCH_SENTINEL_ID = "__none__"
const NO_MATCH_SENTINEL_CONTENT = "<!-- recall:no-match -->"

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncateBytes(body: string, maxBytes: number): string {
  const buf = Buffer.from(body, "utf8")
  if (buf.byteLength <= maxBytes) return body
  // Safe UTF-8 slice: Buffer.toString may produce a partial multi-byte codepoint
  // at the boundary; that's acceptable for V1 since we only display the result.
  return buf.subarray(0, maxBytes).toString("utf8") + ` ${TRUNCATION_MARKER}`
}

function fireOnHit(id: string, cb?: RecallOptions["onHit"]): void {
  if (!cb) return
  try {
    const r = cb(id)
    // If returns a promise, attach a .catch so unhandled rejections do not
    // crash the host process. We intentionally do NOT await.
    if (r && typeof (r as Promise<void>).catch === "function") {
      ;(r as Promise<void>).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[recall] onHit (async) failed:", err)
      })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[recall] onHit (sync) failed:", err)
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Recall memory entries by literal substring match against `query`.
 *
 * @param query   Literal search string. Empty → 0-match sentinel.
 * @param registry Pre-scanned MemoryEntry list (bodies NOT preloaded).
 * @param opts    Filtering / truncation / usage-callback options.
 */
export async function recallMemory(
  query: string,
  registry: MemoryEntry[],
  opts: RecallOptions = {},
): Promise<RecallResult[]> {
  const maxBytes = opts.maxBytesPerFile ?? DEFAULT_MAX_BYTES_PER_FILE

  // Empty query is treated as 0-match (avoids matching every entry).
  if (query.length === 0) {
    return [{ id: NO_MATCH_SENTINEL_ID, content: NO_MATCH_SENTINEL_CONTENT }]
  }

  // Pre-filter by type, then optional OR tag overlap.
  const typeCandidates = opts.filterType
    ? registry.filter((e) => e.meta.type === opts.filterType)
    : registry
  const candidates = opts.filterTags?.length
    ? typeCandidates.filter((entry) => {
        const tags = entry.meta.tags
        return !tags || tags.some((tag) => opts.filterTags?.includes(tag))
      })
    : typeCandidates

  const hits: RecallResult[] = []

  for (const entry of candidates) {
    let body: string
    try {
      body = await readFile(entry.absPath, "utf8")
    } catch {
      // Missing / unreadable file: skip silently — registry may be stale.
      continue
    }

    // Literal substring match — no regex compilation, so metacharacters
    // (`.`, `*`, `(`, etc.) are matched as themselves.
    if (!body.includes(query)) continue

    const truncated = truncateBytes(body, maxBytes)
    const id = entry.meta.id || entry.absPath
    hits.push({
      id,
      content: wrapAsUntrusted(id, truncated),
    })

    // Best-effort usage update; T11 writer will wire actual persistence.
    // TODO(T11): replace `opts.onHit` shim with direct writer.bumpUsage(id).
    fireOnHit(id, opts.onHit)
  }

  if (hits.length === 0) {
    return [{ id: NO_MATCH_SENTINEL_ID, content: NO_MATCH_SENTINEL_CONTENT }]
  }

  return hits
}
