/**
 * sanitize.ts — strip control tags from text before writing to memory files.
 *
 * Design constraints:
 * - Remove control tags + their content, not general markdown
 * - Truncate lines > 1 KB to prevent huge memory entries
 * - Detect (but don't block) known prompt-injection patterns
 * - Wrap untrusted sources in a labeled element for downstream auditing
 */

const MAX_LINE_BYTES = 1024

/** Tags whose full pair (open + content + close) should be stripped. */
const CONTROL_TAG_PAIRS: RegExp[] = [
  /<system[\s>][\s\S]*?<\/system>/gi,
  /<system-reminder[\s>][\s\S]*?<\/system-reminder>/gi,
  /<tool_use[\s>][\s\S]*?<\/tool_use>/gi,
  /<tool_result[\s>][\s\S]*?<\/tool_result>/gi,
  /<assistant[\s>][\s\S]*?<\/assistant>/gi,
  /<user[\s>][\s\S]*?<\/user>/gi,
]

/** Standalone / dangling tags (open or close without matching pair). */
const DANGLING_TAG_PATTERNS: RegExp[] = [
  /<\/?system(?:\s[^>]*)?\/?>/gi,
  /<\/?system-reminder(?:\s[^>]*)?\/?>/gi,
  /<\/?tool_use(?:\s[^>]*)?\/?>/gi,
  /<\/?tool_result(?:\s[^>]*)?\/?>/gi,
  /<\/?assistant(?:\s[^>]*)?\/?>/gi,
  /<\/?user(?:\s[^>]*)?\/?>/gi,
]

/** Known prompt-injection phrases (case-insensitive). */
const INJECTION_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "ignore previous instructions", re: /ignore\s+previous\s+instructions/i },
  { label: "disregard above", re: /disregard\s+above/i },
  { label: "forget all instructions", re: /forget\s+all\s+instructions/i },
  { label: "new instructions", re: /new\s+instructions:/i },
  { label: "system prompt override", re: /system\s+prompt\s+override/i },
  { label: "you are now", re: /you\s+are\s+now\s+(a|an|the)\s/i },
]

/**
 * Strip control tags (and their inner content) from text, then truncate
 * any line that exceeds MAX_LINE_BYTES.
 */
export function sanitizeForWrite(text: string): string {
  let out = text

  // 1. Remove full tag pairs (greedy inner match, but bounded by outer tag)
  for (const re of CONTROL_TAG_PAIRS) {
    out = out.replace(re, "")
  }

  // 2. Remove remaining dangling open/close tags
  for (const re of DANGLING_TAG_PATTERNS) {
    out = out.replace(re, "")
  }

  // 3. Truncate lines > 1 KB
  out = out
    .split("\n")
    .map((line) => {
      const bytes = Buffer.byteLength(line, "utf8")
      if (bytes <= MAX_LINE_BYTES) return line
      // Truncate to <= MAX_LINE_BYTES bytes (safe UTF-8 slice)
      const buf = Buffer.from(line, "utf8").subarray(0, MAX_LINE_BYTES)
      return buf.toString("utf8") + " <!-- truncated -->"
    })
    .join("\n")

  return out
}

/**
 * Scan text for known prompt-injection patterns.
 * Returns a list of matched labels (empty if clean).
 * Does NOT block write — caller decides how to handle.
 */
export function detectInjectionPattern(text: string): string[] {
  return INJECTION_PATTERNS.filter(({ re }) => re.test(text)).map(({ label }) => label)
}

/**
 * Wrap body in an <untrusted_memory> element so downstream consumers
 * can distinguish agent-sourced vs user-sourced memory entries.
 */
export function wrapAsUntrusted(id: string, body: string): string {
  return `<untrusted_memory id="${id}">\n${body}\n</untrusted_memory>`
}
