import type { Plugin } from "@opencode-ai/plugin"

import { CONCURRENCY, MAX_FACET_EXTRACTIONS } from "./constants"
import { isValidSessionFacets, loadCachedFacets, saveFacets } from "./cache"
import { FACET_EXTRACTION_PROMPT } from "./prompts/facets-extraction"
import type { PartData, MessageData } from "./collector"
import type { SessionFacets, SessionMeta } from "./types"

type InsightsClient = Parameters<Plugin>[0]["client"]

type SessionDataIndex<T> = Map<string, T[]> | Record<string, T[]> | null | undefined

const MIN_USER_MESSAGES = 2
const MIN_DURATION_MS = 60_000
const MAX_TRANSCRIPT_CHARS = 30_000
const TRANSCRIPT_CHUNK_SIZE = 25_000
const MAX_COMPRESSED_TRANSCRIPT_CHARS = 28_000

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toLimitedText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return ""
  const trimmed = value.replace(/\s+/g, " ").trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}…`
}

function safeStringify(value: unknown, maxChars: number): string {
  if (typeof value === "string") return toLimitedText(value, maxChars)
  try {
    return toLimitedText(JSON.stringify(value), maxChars)
  } catch {
    return ""
  }
}

function getMessageText(content: unknown, maxChars: number): string {
  if (typeof content === "string") {
    return toLimitedText(content, maxChars)
  }

  if (!Array.isArray(content)) return ""

  const pieces: string[] = []
  for (const block of content) {
    if (!isObject(block)) continue

    if (typeof block.text === "string") {
      pieces.push(block.text)
      continue
    }

    if (typeof block.type === "string" && block.type === "tool_use" && typeof block.name === "string") {
      pieces.push(`[ToolUse: ${block.name}]`)
    }
  }

  return toLimitedText(pieces.join("\n"), maxChars)
}

function formatTranscript(sessionId: string, messages: MessageData[], parts: PartData[]): string {
  const lines: string[] = []
  lines.push(`Session: ${sessionId}`)
  lines.push(`Messages: ${messages.length}`)
  lines.push(`Parts: ${parts.length}`)
  lines.push("")

  for (const message of messages) {
    const role = typeof message?.role === "string" ? message.role : "unknown"
    const text = getMessageText(message?.content, role === "assistant" ? 320 : 520)
    if (text) {
      lines.push(`[${role === "user" ? "User" : role === "assistant" ? "Assistant" : "Message"}] ${text}`)
    }
  }

  if (parts.length > 0) {
    lines.push("")
    lines.push("[Tool Parts]")
  }

  for (const part of parts) {
    if (part?.type !== "tool") continue
    const toolName = typeof part.tool === "string" ? part.tool : "unknown"
    const inputText = safeStringify(part.state?.input, 260)
    const outputText = safeStringify(part.state?.output, 260)
    const errorText = safeStringify(part.state?.error, 180)

    lines.push(`[Tool: ${toolName}]`)
    if (inputText) lines.push(`  input: ${inputText}`)
    if (outputText) lines.push(`  output: ${outputText}`)
    if (errorText) lines.push(`  error: ${errorText}`)
  }

  return lines.join("\n")
}

function summarizeChunk(chunk: string, index: number, total: number): string {
  const lines = chunk.split("\n")
  const userCount = lines.filter((line) => line.startsWith("[User]")).length
  const assistantCount = lines.filter((line) => line.startsWith("[Assistant]")).length
  const toolCount = lines.filter((line) => line.startsWith("[Tool:")).length

  const head = lines.slice(0, 24).join("\n")
  const tail = lines.slice(-12).join("\n")

  return [
    `[Chunk ${index + 1}/${total}] users=${userCount} assistants=${assistantCount} tools=${toolCount}`,
    "[Head]",
    toLimitedText(head, 1500),
    "[Tail]",
    toLimitedText(tail, 1000),
  ].join("\n")
}

function compressTranscriptIfNeeded(transcript: string): string {
  if (transcript.length <= MAX_TRANSCRIPT_CHARS) return transcript

  const chunks: string[] = []
  for (let i = 0; i < transcript.length; i += TRANSCRIPT_CHUNK_SIZE) {
    chunks.push(transcript.slice(i, i + TRANSCRIPT_CHUNK_SIZE))
  }

  const summarized = chunks.map((chunk, index) => summarizeChunk(chunk, index, chunks.length))
  const combined = [
    "[Long session transcript compressed for facet extraction]",
    `Chunk count: ${chunks.length}`,
    "",
    summarized.join("\n\n---\n\n"),
  ].join("\n")

  if (combined.length <= MAX_COMPRESSED_TRANSCRIPT_CHARS) return combined
  return `${combined.slice(0, MAX_COMPRESSED_TRANSCRIPT_CHARS)}\n[truncated]`
}

function getSessionItems<T>(index: SessionDataIndex<T>, sessionId: string): T[] {
  if (index instanceof Map) {
    const value = index.get(sessionId)
    return Array.isArray(value) ? value : []
  }

  if (isObject(index)) {
    const value = index[sessionId]
    return Array.isArray(value) ? value as T[] : []
  }

  return []
}

function extractTextFromPromptResponse(response: unknown): string {
  const payload = isObject(response) && "data" in response ? response.data : response
  if (!isObject(payload)) return ""

  const parts = payload.parts
  if (Array.isArray(parts)) {
    const texts = parts
      .filter((part) => isObject(part) && part.type === "text" && typeof part.text === "string")
      .map((part) => String(part.text))
    if (texts.length > 0) return texts.join("\n")
  }

  if (typeof payload.text === "string") return payload.text
  return ""
}

function getPromptSessionId(created: unknown): string | null {
  if (isObject(created)) {
    if (isObject(created.data) && typeof created.data.id === "string") return created.data.id
    if (typeof created.id === "string") return created.id
  }
  return null
}

export function isSubstantiveSession(meta: SessionMeta): boolean {
  const userMessageCount = typeof meta?.user_message_count === "number" ? meta.user_message_count : 0
  const durationMs = typeof meta?.duration_ms === "number" ? meta.duration_ms : 0
  if (userMessageCount < MIN_USER_MESSAGES) return false
  if (durationMs < MIN_DURATION_MS) return false
  return true
}

export function isMinimalSession(facets: SessionFacets): boolean {
  const categories = isObject(facets?.goal_categories)
    ? facets.goal_categories as Record<string, number>
    : {}
  const positive = Object.keys(categories).filter((key) => (categories[key] ?? 0) > 0)
  return positive.length === 1 && positive[0] === "warmup_minimal"
}

export async function extractFacetsFromAPI(
  client: InsightsClient,
  sessionId: string,
  messages: MessageData[],
  parts: PartData[],
): Promise<SessionFacets | null> {
  try {
    const transcript = compressTranscriptIfNeeded(
      formatTranscript(sessionId, messages, parts),
    )
    const promptText = FACET_EXTRACTION_PROMPT.replace("{transcript}", transcript)

    let promptSessionId = sessionId
    if (client?.session?.create) {
      const created = await client.session.create({
        body: {
          title: `[insights-internal] facets ${sessionId}`,
        },
      })
      promptSessionId = getPromptSessionId(created) ?? promptSessionId
    }

    const response = await client?.session?.prompt({
      path: { id: promptSessionId },
      body: {
        parts: [{ type: "text", text: promptText }],
      },
    })

    const text = extractTextFromPromptResponse(response)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as unknown
    if (!isValidSessionFacets(parsed)) return null

    const facets: SessionFacets = {
      ...parsed,
      session_id: sessionId,
    }

    await saveFacets(facets)
    return facets
  } catch {
    return null
  }
}

export async function extractAllFacets(
  client: InsightsClient,
  sessions: SessionMeta[],
  messages: SessionDataIndex<MessageData>,
  parts: SessionDataIndex<PartData>,
  cachedFacets: Map<string, SessionFacets>,
): Promise<Map<string, SessionFacets>> {
  const facets = new Map<string, SessionFacets>()

  for (const [sessionId, cached] of cachedFacets ?? new Map()) {
    facets.set(sessionId, cached)
  }

  const substantiveSessions = sessions.filter(isSubstantiveSession)
  const toExtract: string[] = []

  const cacheLookup = await Promise.all(
    substantiveSessions.map(async (meta) => {
      const sessionId = meta.id
      if (facets.has(sessionId)) {
        return { sessionId, cached: facets.get(sessionId) ?? null }
      }

      const cached = await loadCachedFacets(sessionId)
      return { sessionId, cached }
    }),
  )

  for (const item of cacheLookup) {
    if (item.cached) {
      facets.set(item.sessionId, item.cached)
      continue
    }

    if (toExtract.length < MAX_FACET_EXTRACTIONS) {
      toExtract.push(item.sessionId)
    }
  }

  for (let i = 0; i < toExtract.length; i += CONCURRENCY) {
    const batch = toExtract.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map(async (sessionId) => {
        const sessionMessages = getSessionItems(messages, sessionId)
        const sessionParts = getSessionItems(parts, sessionId)
        const extracted = await extractFacetsFromAPI(
          client,
          sessionId,
          sessionMessages,
          sessionParts,
        )
        return { sessionId, extracted }
      }),
    )

    for (const item of results) {
      if (item.extracted) {
        facets.set(item.sessionId, item.extracted)
      }
    }
  }

  return facets
}
