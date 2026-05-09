import { mkdir, open, readFile, rename, unlink } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"

import { DEFAULT_CONFIG, loadOcTweaksConfig } from "../../utils/config"
import { notifyWrite, type NotifyMode } from "./notify"
import { assertDiffLines, assertFilenameSafe, assertInsideRoot, assertSize } from "./path-guard"
import { sanitizeForWrite } from "./sanitize"

export type WriteAction = "created" | "updated" | "forgotten"

export type WriteResult =
  | { skipped: false; absPath: string; action: WriteAction; bytesWritten: number }
  | { skipped: true; reason: "off" | "throttled" | "unchanged" }

export type RewriteResult =
  | { skipped: false; absPath: string; bytesWritten: number }
  | { skipped: true; reason: "throttled" | "unchanged" }

export class MemoryWriteError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "MemoryWriteError"
  }
}

const MARKER = "<!-- auto-memory:v1 -->\n"
const MIN_FILE_INTERVAL_MS = 30_000

const lastWriteByPath = new Map<string, number>()
let writesThisSession = 0

export function __resetThrottleForTesting(): void {
  lastWriteByPath.clear()
  writesThisSession = 0
}

export async function writeMemory(
  target: { scope: "global" | "project"; relPath: string; root: string },
  payload: { action: WriteAction; content: string },
): Promise<WriteResult> {
  const config = await loadOcTweaksConfig()
  const autoMemory = config?.autoMemory ?? DEFAULT_CONFIG.autoMemory
  const autoWrite = autoMemory?.autoWrite ?? DEFAULT_CONFIG.autoMemory?.autoWrite ?? "notify"

  if (autoWrite === "off") {
    logAutoWriteOff(target)
    return { skipped: true, reason: "off" }
  }

  await ensureParentInsideRoot(target.root, target.relPath)

  const joinedPath = join(target.root, target.relPath)
  const absPath = await assertInsideRoot(target.root, joinedPath)
  assertFilenameSafe(target.relPath)

  const sanitized = sanitizeForWrite(payload.content)
  const maxBytesPerFile = autoMemory?.maxBytesPerFile ?? DEFAULT_CONFIG.autoMemory?.maxBytesPerFile ?? 32_768
  assertSize(Buffer.from(sanitized, "utf8"), maxBytesPerFile)

  if (isThrottled(absPath, autoMemory?.maxWritesPerSession ?? DEFAULT_CONFIG.autoMemory?.maxWritesPerSession ?? 5)) {
    return { skipped: true, reason: "throttled" }
  }

  const existing = await readExisting(absPath)
  const finalContent = applyMarker(payload.action, existing, sanitized)

  if (existing === finalContent) {
    return { skipped: true, reason: "unchanged" }
  }

  const diffStr = computeDiffStr(existing, finalContent)
  const maxDiffLines = autoMemory?.maxDiffLines ?? DEFAULT_CONFIG.autoMemory?.maxDiffLines ?? 500
  assertDiffLines(diffStr, maxDiffLines)

  await atomicRewrite(absPath, finalContent)

  recordWrite(absPath)
  notifyWrite(
    {
      scope: target.scope,
      relPath: target.relPath,
      action: payload.action,
      willAffectRecall: payload.action !== "forgotten",
    },
    { mode: autoWrite as NotifyMode },
  )

  return {
    skipped: false,
    absPath,
    action: payload.action,
    bytesWritten: Buffer.byteLength(finalContent, "utf8"),
  }
}

export async function rewriteMemoryFileWithGuards(
  absPath: string,
  finalContent: string,
): Promise<RewriteResult> {
  const config = await loadOcTweaksConfig()
  const autoMemory = config?.autoMemory ?? DEFAULT_CONFIG.autoMemory

  if (isThrottled(absPath, autoMemory?.maxWritesPerSession ?? DEFAULT_CONFIG.autoMemory?.maxWritesPerSession ?? 5)) {
    return { skipped: true, reason: "throttled" }
  }

  const existing = await readExisting(absPath)
  if (existing === finalContent) {
    return { skipped: true, reason: "unchanged" }
  }

  const diffStr = computeDiffStr(existing, finalContent)
  const maxDiffLines = autoMemory?.maxDiffLines ?? DEFAULT_CONFIG.autoMemory?.maxDiffLines ?? 500
  assertDiffLines(diffStr, maxDiffLines)

  await atomicRewrite(absPath, finalContent)
  recordWrite(absPath)

  return {
    skipped: false,
    absPath,
    bytesWritten: Buffer.byteLength(finalContent, "utf8"),
  }
}

async function ensureParentInsideRoot(root: string, relPath: string): Promise<void> {
  const resolvedRoot = resolve(root)
  const parent = resolve(root, dirname(relPath))
  const parentRelative = relative(resolvedRoot, parent)
  if (parentRelative === "" || (!parentRelative.startsWith("..") && !parentRelative.startsWith(sep))) {
    await mkdir(parent, { recursive: true })
  }
}

function logAutoWriteOff(target: { scope: "global" | "project"; relPath: string }): void {
  try {
    process.stderr.write(`oc-tweaks auto-memory autoWrite=off ${target.scope}/${target.relPath}\n`)
  } catch {
    // best-effort diagnostic only
  }
}

function isThrottled(absPath: string, maxWritesPerSession: number): boolean {
  if (writesThisSession >= maxWritesPerSession) return true

  const lastWrite = lastWriteByPath.get(absPath)
  if (lastWrite !== undefined && Date.now() - lastWrite < MIN_FILE_INTERVAL_MS) {
    return true
  }

  return false
}

function recordWrite(absPath: string): void {
  writesThisSession += 1
  lastWriteByPath.set(absPath, Date.now())
}

async function readExisting(absPath: string): Promise<string | null> {
  try {
    return await readFile(absPath, "utf8")
  } catch (err: any) {
    if (err?.code === "ENOENT") return null
    throw err
  }
}

function applyMarker(action: WriteAction, existing: string | null, content: string): string {
  if (content.startsWith(MARKER)) return content
  if (existing === null || action === "created" || existing.startsWith(MARKER)) return MARKER + content
  return content
}

function computeDiffStr(existing: string | null, finalContent: string): string {
  if (existing === null) return finalContent
  const existingLines = new Set(existing.split("\n"))
  const finalLines = new Set(finalContent.split("\n"))
  const added: string[] = []
  const removed: string[] = []
  for (const line of finalContent.split("\n")) {
    if (!existingLines.has(line)) added.push("+" + line)
  }
  for (const line of existing.split("\n")) {
    if (!finalLines.has(line)) removed.push("-" + line)
  }
  return [...added, ...removed].join("\n")
}

async function atomicRewrite(absPath: string, finalContent: string): Promise<void> {
  const tmpfile = `${absPath}.tmp.${randomSuffix()}`
  let tmpfileCreated = false
  try {
    await mkdir(dirname(absPath), { recursive: true })
    await writeAndFsync(tmpfile, finalContent)
    tmpfileCreated = true
    await rename(tmpfile, absPath)
    tmpfileCreated = false
  } catch (err) {
    throw new MemoryWriteError(`Failed to write memory file: ${absPath}`, { cause: err })
  } finally {
    if (tmpfileCreated) {
      await unlink(tmpfile).catch(() => {})
    }
  }
}

async function writeAndFsync(path: string, content: string): Promise<void> {
  const handle = await open(path, "w")
  try {
    await handle.writeFile(content, "utf8")
    await handle.sync()
  } finally {
    await handle.close()
  }
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
