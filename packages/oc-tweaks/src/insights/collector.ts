declare const Bun: any

import { Database } from "bun:sqlite"

import { EXTENSION_TO_LANGUAGE } from "./constants"
import type { SessionMeta } from "./types"

const REQUEST_INTERRUPTED_MARKER = "[Request interrupted by user"

type CollectSessionsOptions = {
  dbPath?: string
  days?: number
  project?: string
}

type MessageTokens = {
  input?: number
  output?: number
}

type MessageTime = {
  created?: number
  completed?: number
}

export type MessageData = {
  _messageId?: string
  role?: string
  content?: unknown
  tokens?: MessageTokens
  time?: MessageTime
}

type ToolState = {
  input?: Record<string, unknown>
  output?: unknown
  metadata?: Record<string, unknown>
  error?: unknown
}

export type PartData = {
  _messageId?: string
  type?: string
  text?: string
  reasoning?: string
  tool?: string
  callID?: string
  state?: ToolState
}

export type ToolStats = {
  toolCounts: Record<string, number>
  languages: Record<string, number>
  gitCommits: number
  gitPushes: number
  inputTokens: number
  outputTokens: number
  userInterruptions: number
  userResponseTimes: number[]
  toolErrors: number
  toolErrorCategories: Record<string, number>
  usesTaskAgent: boolean
  usesMcp: boolean
  usesWebSearch: boolean
  usesWebFetch: boolean
  linesAdded: number
  linesRemoved: number
  filesModified: Set<string>
  messageHours: number[]
  userMessageTimestamps: number[]
}

type SessionStatsFields = Pick<
  SessionMeta,
  | "user_message_count"
  | "total_messages"
  | "duration_ms"
  | "tool_counts"
  | "languages"
  | "git_commits"
  | "git_pushes"
  | "input_tokens"
  | "output_tokens"
  | "user_interruptions"
  | "tool_errors"
  | "tool_error_categories"
  | "user_response_times"
  | "message_hours"
  | "lines_added"
  | "lines_removed"
  | "files_modified"
  | "uses_task_agent"
  | "uses_mcp"
  | "uses_web_search"
  | "uses_web_fetch"
  | "user_message_timestamps"
>

type SessionBaseMeta = Omit<SessionMeta, keyof SessionStatsFields>

function getDefaultDbPath(): string {
  return `${Bun.env?.HOME ?? ""}/.local/share/opencode/opencode.db`
}

function openDatabase(dbPath: string) {
  return new Database(dbPath, { readonly: true })
}

function getDbPath(dbPath?: string): string {
  return dbPath || getDefaultDbPath()
}

export function resolveProjectId(db: Database, project: string): string {
  // If it looks like a path (contains /), look up the project table by worktree
  if (project.includes("/")) {
    const row = db.query("SELECT id FROM project WHERE worktree = ?").get(project) as { id: string } | null
    if (row) return row.id
  }
  // Otherwise assume it's already a project_id hash
  return project
}

function mapSessionRow(row: Record<string, unknown>): SessionBaseMeta {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    parent_id: row.parent_id ? String(row.parent_id) : undefined,
    slug: String(row.slug),
    directory: String(row.directory),
    title: String(row.title),
    version: String(row.version),
    share_url: row.share_url ? String(row.share_url) : undefined,
    summary_additions: toNumber(row.summary_additions),
    summary_deletions: toNumber(row.summary_deletions),
    summary_files: toNumber(row.summary_files),
    summary_diffs: row.summary_diffs ? String(row.summary_diffs) : undefined,
    time_created: toNumber(row.time_created),
    time_updated: toNumber(row.time_updated),
    time_compacting: row.time_compacting === null || row.time_compacting === undefined
      ? undefined
      : toNumber(row.time_compacting),
    time_archived: row.time_archived === null || row.time_archived === undefined
      ? undefined
      : toNumber(row.time_archived),
    workspace_id: row.workspace_id ? String(row.workspace_id) : undefined,
  }
}

function mapSessionStats(base: SessionBaseMeta, messages: MessageData[], parts: PartData[]): SessionMeta {
  const stats = extractToolStats(messages, parts)

  return {
    ...base,
    user_message_count: countHumanUserMessages(messages),
    total_messages: messages.length,
    duration_ms: Math.max(0, base.time_updated - base.time_created),
    tool_counts: stats.toolCounts,
    languages: stats.languages,
    git_commits: stats.gitCommits,
    git_pushes: stats.gitPushes,
    input_tokens: stats.inputTokens,
    output_tokens: stats.outputTokens,
    user_interruptions: stats.userInterruptions,
    tool_errors: stats.toolErrors,
    tool_error_categories: stats.toolErrorCategories,
    user_response_times: stats.userResponseTimes,
    message_hours: stats.messageHours,
    lines_added: stats.linesAdded,
    lines_removed: stats.linesRemoved,
    files_modified: stats.filesModified.size,
    uses_task_agent: stats.usesTaskAgent,
    uses_mcp: stats.usesMcp,
    uses_web_search: stats.usesWebSearch,
    uses_web_fetch: stats.usesWebFetch,
    user_message_timestamps: stats.userMessageTimestamps,
  }
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function incrementCounter(record: Record<string, number>, key: string, amount = 1) {
  record[key] = (record[key] || 0) + amount
}

function getLanguageFromPath(filePath: string): string | null {
  const lastDot = filePath.lastIndexOf(".")
  if (lastDot === -1) return null
  const extension = filePath.slice(lastDot).toLowerCase()
  return EXTENSION_TO_LANGUAGE[extension] ?? null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getTimeValue(message: MessageData): number | null {
  const created = message.time?.created
  if (typeof created === "number" && Number.isFinite(created)) return created
  return null
}

export function hasHumanTextContent(content: unknown): boolean {
  if (typeof content === "string") return content.trim().length > 0
  if (!Array.isArray(content)) return false
  return content.some((block) => isObject(block) && block.type === "text" && typeof block.text === "string" && block.text.trim().length > 0)
}

function hasInterruptedContent(content: unknown): boolean {
  if (typeof content === "string") return content.includes(REQUEST_INTERRUPTED_MARKER)
  if (!Array.isArray(content)) return false
  return content.some(
    (block) =>
      isObject(block) &&
      block.type === "text" &&
      typeof block.text === "string" &&
      block.text.includes(REQUEST_INTERRUPTED_MARKER),
  )
}

export function countHumanUserMessages(messages: MessageData[]): number {
  return messages.filter((message) => message.role === "user").length
}

function parseJsonBlob<T>(value: unknown): T {
  return JSON.parse(String(value)) as T
}

function queryMessages(db: Database, sessionId: string): MessageData[] {
  const rows = db
    .query("SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created ASC")
    .all(sessionId) as Array<{ id: string; data: string }>

  return rows.map((row) => {
    const parsed = parseJsonBlob<MessageData>(row.data)
    parsed._messageId = row.id
    return parsed
  })
}

function queryParts(db: Database, sessionId: string): PartData[] {
  const rows = db
    .query("SELECT data, message_id FROM part WHERE session_id = ? ORDER BY id ASC")
    .all(sessionId) as Array<{ data: string; message_id: string | null }>

  return rows.map((row) => {
    const parsed = parseJsonBlob<PartData>(row.data)
    if (row.message_id) parsed._messageId = row.message_id
    return parsed
  })
}

function isRecoverableBlobError(error: unknown): boolean {
  if (error instanceof SyntaxError) return true
  if (!(error instanceof Error)) return false

  const sqliteCode = isObject(error) && typeof error.code === "string" ? error.code : ""
  if (sqliteCode === "SQLITE_CORRUPT") return true

  const message = error.message.toLowerCase()
  return message.includes("malformed") || message.includes("corrupt")
}

function queryMessagesSafely(db: Database, sessionId: string): MessageData[] {
  try {
    return queryMessages(db, sessionId)
  } catch (error) {
    if (isRecoverableBlobError(error)) {
      return []
    }
    throw error
  }
}

function queryPartsSafely(db: Database, sessionId: string): PartData[] {
  try {
    return queryParts(db, sessionId)
  } catch (error) {
    if (isRecoverableBlobError(error)) {
      return []
    }
    throw error
  }
}

function detectToolError(output: unknown, explicitError: unknown): boolean {
  if (explicitError === true) return true
  if (typeof explicitError === "string" && explicitError.trim().length > 0) return true
  const outputText = typeof output === "string" ? output.toLowerCase() : ""
  if (!outputText) return false
  return (
    outputText.includes("exit code") ||
    outputText.includes("rejected") ||
    outputText.includes("doesn't want") ||
    outputText.includes("string to replace") ||
    outputText.includes("no changes") ||
    outputText.includes("modified since") ||
    outputText.includes("exceeds maximum") ||
    outputText.includes("too large") ||
    outputText.includes("file not found") ||
    outputText.includes("does not exist")
  )
}

function categorizeToolError(output: unknown, explicitError: unknown): string {
  if (typeof explicitError === "string" && explicitError.trim().length > 0) {
    output = explicitError
  }
  if (typeof output !== "string") return "Other"
  const lowerContent = output.toLowerCase()
  if (lowerContent.includes("exit code")) return "Command Failed"
  if (lowerContent.includes("rejected") || lowerContent.includes("doesn't want")) {
    return "User Rejected"
  }
  if (lowerContent.includes("string to replace") || lowerContent.includes("no changes")) {
    return "Edit Failed"
  }
  if (lowerContent.includes("modified since read")) return "File Changed"
  if (lowerContent.includes("exceeds maximum") || lowerContent.includes("too large")) {
    return "File Too Large"
  }
  if (lowerContent.includes("file not found") || lowerContent.includes("does not exist")) {
    return "File Not Found"
  }
  return "Other"
}

function countLines(text: string): number {
  if (!text) return 0
  return text.split("\n").length
}

function computeLineDiff(oldString: string, newString: string) {
  const oldLines = oldString ? oldString.split("\n") : []
  const newLines = newString ? newString.split("\n") : []

  const lcs: number[][] = Array.from({ length: oldLines.length + 1 }, () =>
    Array.from({ length: newLines.length + 1 }, () => 0),
  )

  for (let i = oldLines.length - 1; i >= 0; i -= 1) {
    for (let j = newLines.length - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1])
      }
    }
  }

  const common = lcs[0][0]
  return {
    added: newLines.length - common,
    removed: oldLines.length - common,
  }
}

export async function collectSessions(options: CollectSessionsOptions = {}): Promise<SessionMeta[]> {
  const dbPath = getDbPath(options.dbPath)
  const db = openDatabase(dbPath)

  try {
    let sql = "SELECT * FROM session"
    const conditions: string[] = []
    const params: Array<string | number> = []

    if (typeof options.days === "number" && Number.isFinite(options.days)) {
      conditions.push("time_created > ?")
      params.push(Date.now() - options.days * 86400000)
    }

    if (options.project) {
      const projectId = resolveProjectId(db, options.project)
      conditions.push("project_id = ?")
      params.push(projectId)
    }

    conditions.push("title NOT LIKE ?")
    params.push("%[insights-internal]%")

    // Exclude sub-agent sessions (those spawned by a parent session)
    conditions.push("(parent_id IS NULL OR parent_id = '')")

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`
    }

    sql += " ORDER BY time_updated DESC"

    const rows = db.query(sql).all(...params) as Array<Record<string, unknown>>
    return rows.map((row) => {
      const base = mapSessionRow(row)
      const messages = queryMessagesSafely(db, base.id)
      const parts = queryPartsSafely(db, base.id)
      return mapSessionStats(base, messages, parts)
    })
  } finally {
    db.close()
  }
}

export async function collectMessages(dbPath: string, sessionId: string): Promise<MessageData[]> {
  const db = openDatabase(dbPath)

  try {
    return queryMessages(db, sessionId)
  } finally {
    db.close()
  }
}

export async function collectParts(dbPath: string, sessionId: string): Promise<PartData[]> {
  const db = openDatabase(dbPath)

  try {
    return queryPartsSafely(db, sessionId)
  } finally {
    db.close()
  }
}

export function extractToolStats(messages: MessageData[], parts: PartData[]): ToolStats {
  const toolCounts: Record<string, number> = {}
  const languages: Record<string, number> = {}
  let gitCommits = 0
  let gitPushes = 0
  let inputTokens = 0
  let outputTokens = 0
  let userInterruptions = 0
  const userResponseTimes: number[] = []
  let toolErrors = 0
  const toolErrorCategories: Record<string, number> = {}
  let usesTaskAgent = false
  let usesMcp = false
  let usesWebSearch = false
  let usesWebFetch = false
  let linesAdded = 0
  let linesRemoved = 0
  const filesModified = new Set<string>()
  const messageHours: number[] = []
  const userMessageTimestamps: number[] = []
  let lastAssistantTimestamp: number | null = null

  for (const message of messages) {
    if (message.role === "assistant") {
      inputTokens += toNumber(message.tokens?.input)
      outputTokens += toNumber(message.tokens?.output)
      const assistantTime = getTimeValue(message)
      if (assistantTime !== null) {
        lastAssistantTimestamp = assistantTime
      }
      continue
    }

    if (message.role !== "user") continue

    const messageTime = getTimeValue(message)

    if (messageTime !== null) {
      const createdAt = new Date(messageTime)
      messageHours.push(createdAt.getHours())
      userMessageTimestamps.push(messageTime)

      if (lastAssistantTimestamp !== null) {
        const responseTimeSec = (messageTime - lastAssistantTimestamp) / 1000
        if (responseTimeSec > 2 && responseTimeSec < 3600) {
          userResponseTimes.push(responseTimeSec)
        }
      }
    }

    if (hasInterruptedContent(message.content)) {
      userInterruptions += 1
    }
  }

  for (const part of parts) {
    if (part.type !== "tool" || !part.tool) continue

    const toolName = part.tool
    incrementCounter(toolCounts, toolName)

    if (toolName === "Task" || toolName === "Agent") usesTaskAgent = true
    if (toolName.startsWith("mcp__")) usesMcp = true
    if (toolName === "WebSearch") usesWebSearch = true
    if (toolName === "WebFetch") usesWebFetch = true

    const input = isObject(part.state?.input) ? part.state?.input : {}
    const filePath = typeof input.file_path === "string" ? input.file_path : ""
    const language = filePath ? getLanguageFromPath(filePath) : null
    if (language) {
      incrementCounter(languages, language)
    }

    if ((toolName === "Edit" || toolName === "Write") && filePath) {
      filesModified.add(filePath)
    }

    if (toolName === "Edit") {
      const oldString = typeof input.old_string === "string" ? input.old_string : ""
      const newString = typeof input.new_string === "string" ? input.new_string : ""
      const diff = computeLineDiff(oldString, newString)
      linesAdded += diff.added
      linesRemoved += diff.removed
    }

    if (toolName === "Write") {
      const writeContent = typeof input.content === "string" ? input.content : ""
      linesAdded += countLines(writeContent)
    }

    const command = typeof input.command === "string" ? input.command : ""
    if (command.includes("git commit")) gitCommits += 1
    if (command.includes("git push")) gitPushes += 1

    const output = part.state?.output
    const explicitError = part.state?.error
    if (detectToolError(output, explicitError)) {
      toolErrors += 1
      incrementCounter(toolErrorCategories, categorizeToolError(output, explicitError))
    }
  }

  return {
    toolCounts,
    languages,
    gitCommits,
    gitPushes,
    inputTokens,
    outputTokens,
    userInterruptions,
    userResponseTimes,
    toolErrors,
    toolErrorCategories,
    usesTaskAgent,
    usesMcp,
    usesWebSearch,
    usesWebFetch,
    linesAdded,
    linesRemoved,
    filesModified,
    messageHours,
    userMessageTimestamps,
  }
}
