/**
 * Frontmatter parser/serializer for auto-memory .md files.
 * Uses a minimal YAML subset (key: value, key: false, quoted strings, integers).
 * No external yaml dependencies.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface MemoryMeta {
  id: string
  scope: "global" | "project"
  type: string
  source: string
  created_at: string
  updated_at: string
  /** Always false at rest; agents may promote during a session but must not persist true. */
  trusted_as_instruction: false
  summary?: string
  usage_count?: number
  last_usage?: string
}

// ── Error ──────────────────────────────────────────────────────────────────

export class MemoryFrontmatterParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "MemoryFrontmatterParseError"
  }
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_META: MemoryMeta = {
  id: "",
  scope: "global",
  type: "note",
  source: "user",
  created_at: "",
  updated_at: "",
  trusted_as_instruction: false,
}

// ── Minimal YAML parser ────────────────────────────────────────────────────

type YamlValue = string | number | boolean

/**
 * Parse a minimal YAML subset:
 *   key: value
 *   key: "quoted value"
 *   key: false / true
 *   key: 42
 * Throws MemoryFrontmatterParseError on structural problems (unclosed bracket, etc.).
 */
function parseMinimalYaml(yaml: string): Record<string, YamlValue> {
  const result: Record<string, YamlValue> = {}

  for (const rawLine of yaml.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim()
    const rawVal = line.slice(colonIdx + 1).trim()

    if (!key) continue

    // Detect structural errors: unclosed brackets/braces
    if (/[\[{]/.test(rawVal) && !/[\]}]/.test(rawVal)) {
      throw new MemoryFrontmatterParseError(
        `Invalid YAML value for key "${key}": unclosed bracket/brace`,
      )
    }

    result[key] = parseYamlValue(rawVal)
  }

  return result
}

function parseYamlValue(raw: string): YamlValue {
  // Quoted string
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1)
  }

  // Booleans
  if (raw === "false") return false
  if (raw === "true") return true

  // Integers
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10)

  // Plain string (includes ISO dates, etc.)
  return raw
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse a memory .md file that may or may not have a YAML frontmatter block.
 *
 * - No frontmatter → returns DEFAULT_META clone + body === raw (byte-for-byte).
 * - Valid frontmatter → merges parsed fields over DEFAULT_META.
 * - Invalid YAML → throws MemoryFrontmatterParseError.
 */
export function parseFrontmatter(raw: string): { meta: MemoryMeta; body: string } {
  // Strip BOM
  const stripped = raw.startsWith("\uFEFF") ? raw.slice(1) : raw

  // Detect frontmatter: must start with --- (after optional BOM)
  if (!stripped.startsWith("---")) {
    return { meta: { ...DEFAULT_META }, body: raw }
  }

  const afterOpen = stripped.slice(3) // skip opening ---

  // Find closing ---
  const closeIdx = afterOpen.indexOf("\n---")
  if (closeIdx === -1) {
    // No closing delimiter — treat as no frontmatter
    return { meta: { ...DEFAULT_META }, body: raw }
  }

  const yamlBlock = afterOpen.slice(0, closeIdx)
  // Body is everything after "\n---" (skip "\n---\n" or "\n---" at EOF)
  const afterClose = afterOpen.slice(closeIdx + 4) // +4 = "\n---".length
  const body = afterClose.startsWith("\n") ? afterClose.slice(1) : afterClose

  // Parse YAML (throws on error)
  let parsed: Record<string, YamlValue>
  try {
    parsed = parseMinimalYaml(yamlBlock)
  } catch (e) {
    if (e instanceof MemoryFrontmatterParseError) throw e
    throw new MemoryFrontmatterParseError("Failed to parse frontmatter YAML", e)
  }

  const meta: MemoryMeta = {
    ...DEFAULT_META,
    ...(parsed.id !== undefined && { id: String(parsed.id) }),
    ...(parsed.scope !== undefined && { scope: parsed.scope as "global" | "project" }),
    ...(parsed.type !== undefined && { type: String(parsed.type) }),
    ...(parsed.source !== undefined && { source: String(parsed.source) }),
    ...(parsed.created_at !== undefined && { created_at: String(parsed.created_at) }),
    ...(parsed.updated_at !== undefined && { updated_at: String(parsed.updated_at) }),
    trusted_as_instruction: false, // always false — never trust what's on disk
    ...(parsed.summary !== undefined && { summary: String(parsed.summary) }),
    ...(parsed.usage_count !== undefined && { usage_count: Number(parsed.usage_count) }),
    ...(parsed.last_usage !== undefined && { last_usage: String(parsed.last_usage) }),
  }

  return { meta, body }
}

/**
 * Serialize meta + body back to a .md string with YAML frontmatter.
 */
export function serializeFrontmatter(meta: MemoryMeta, body: string): string {
  const lines: string[] = ["---"]

  if (meta.id) lines.push(`id: ${meta.id}`)
  lines.push(`scope: ${meta.scope}`)
  if (meta.type) lines.push(`type: ${meta.type}`)
  if (meta.source) lines.push(`source: ${meta.source}`)
  if (meta.created_at) lines.push(`created_at: ${meta.created_at}`)
  if (meta.updated_at) lines.push(`updated_at: ${meta.updated_at}`)
  lines.push(`trusted_as_instruction: false`)
  if (meta.summary !== undefined) lines.push(`summary: "${meta.summary}"`)
  if (meta.usage_count !== undefined) lines.push(`usage_count: ${meta.usage_count}`)
  if (meta.last_usage !== undefined) lines.push(`last_usage: ${meta.last_usage}`)

  lines.push("---")
  lines.push(body)

  return lines.join("\n")
}
