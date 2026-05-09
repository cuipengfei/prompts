import { realpath } from "node:fs/promises"
import { dirname } from "node:path"

export class MemoryPathEscapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MemoryPathEscapeError"
  }
}

export class MemoryQuotaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MemoryQuotaError"
  }
}

/**
 * Resolve `target` with symlink expansion and verify it remains under `root`.
 * When `target` does not yet exist, resolves its closest existing ancestor instead.
 * Throws `MemoryPathEscapeError` on any escape.
 * Returns the realpath-resolved safe path.
 */
export async function assertInsideRoot(root: string, target: string): Promise<string> {
  const resolvedRoot = await realpath(root)

  // Try to resolve the target; fall back to resolving the parent directory when
  // the target file does not yet exist (ENOENT).
  let resolvedTarget: string
  try {
    resolvedTarget = await realpath(target)
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      // Resolve the parent directory (which must exist and be inside root)
      const parent = dirname(target)
      let resolvedParent: string
      try {
        resolvedParent = await realpath(parent)
      } catch {
        throw new MemoryPathEscapeError(`Cannot resolve parent directory: ${parent}`)
      }
      if (!resolvedParent.startsWith(resolvedRoot + "/") && resolvedParent !== resolvedRoot) {
        throw new MemoryPathEscapeError(
          `Path escapes memory root: parent ${resolvedParent} is outside ${resolvedRoot}`,
        )
      }
      // Return synthetic resolved path (parent resolved + filename)
      const filename = target.split("/").at(-1) ?? target.split("\\").at(-1) ?? target
      return resolvedParent + "/" + filename
    }
    throw err
  }

  if (!resolvedTarget.startsWith(resolvedRoot + "/") && resolvedTarget !== resolvedRoot) {
    throw new MemoryPathEscapeError(`Path escapes memory root: ${resolvedTarget} is outside ${resolvedRoot}`)
  }

  return resolvedTarget
}

/**
 * Asserts that a buffer or string does not exceed `max` bytes.
 */
export function assertSize(buf: Buffer | string, max: number): void {
  const size = typeof buf === "string" ? Buffer.byteLength(buf, "utf8") : buf.byteLength
  if (size > max) {
    throw new MemoryQuotaError(`Content size ${size} exceeds limit ${max} bytes`)
  }
}

/**
 * Asserts that a diff string does not exceed `max` lines.
 */
export function assertDiffLines(diff: string, max: number): void {
  const lines = diff.split("\n").length
  if (lines > max) {
    throw new MemoryQuotaError(`Diff has ${lines} lines, exceeds limit of ${max}`)
  }
}

/**
 * Asserts that a filename contains no null bytes or ASCII control characters.
 * Unicode (Chinese, emoji, etc.) is explicitly allowed.
 */
export function assertFilenameSafe(name: string): void {
  // Check for null byte
  if (name.includes("\0")) {
    throw new MemoryPathEscapeError(`Filename contains null byte: ${JSON.stringify(name)}`)
  }
  // Check for ASCII control characters (0x01–0x1f, 0x7f)
  // Using a simple loop to avoid regex issues with certain environments
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i)
    if ((code >= 0x01 && code <= 0x1f) || code === 0x7f) {
      throw new MemoryPathEscapeError(`Filename contains control character (code ${code}): ${JSON.stringify(name)}`)
    }
  }
}
