declare const Bun: any

import { mkdir, readdir } from "node:fs/promises"
import { dirname } from "node:path"

import { aggregateData } from "./aggregator"
import {
  getFacetsDir,
  getReportDir,
  getReportPath,
  isReportFresh,
  isValidSessionFacets,
} from "./cache"
import {
  collectMessages,
  collectParts,
  collectSessions,
  type MessageData,
  type PartData,
} from "./collector"
import { MAX_SESSIONS } from "./constants"
import { buildExportData, buildPromptForCommand } from "./export"
import { extractAllFacets, isMinimalSession, isSubstantiveSession } from "./facets"
import { generateParallelInsights } from "./generator"
import { generateHtmlReport } from "./renderer"
import type { AggregatedData, InsightResults, SessionFacets, SessionMeta } from "./types"

const DEFAULT_DB_PATH = `${Bun.env?.HOME ?? ""}/.local/share/opencode/opencode.db`
const MAX_SESSION_SUMMARIES = 50

type CachedReportPayload = {
  insights: InsightResults
  data: AggregatedData
  facets: SessionFacets[]
}

export type GenerateUsageReportOptions = {
  dbPath?: string
  days?: number
  project?: string
}

export type GenerateUsageReportResult = {
  insights: InsightResults
  htmlPath: string
  data: AggregatedData
  facets: Map<string, SessionFacets>
}

function dedupSessionsById(sessions: SessionMeta[]): SessionMeta[] {
  const bestById = new Map<string, SessionMeta>()

  for (const session of sessions) {
    const existing = bestById.get(session.id)
    if (!existing || session.user_message_count > existing.user_message_count) {
      bestById.set(session.id, session)
    }
  }

  return Array.from(bestById.values()).sort((a, b) => b.time_updated - a.time_updated)
}

function getReportSnapshotPath(): string {
  return `${getReportDir()}/report-cache.json`
}

function incrementCounter(record: Record<string, number>, key: string, amount = 1): void {
  record[key] = (record[key] || 0) + amount
}

function incrementEntries(target: Record<string, number>, source: Record<string, number>): void {
  for (const [key, count] of Object.entries(source)) {
    if (count > 0) {
      incrementCounter(target, key, count)
    }
  }
}

function parseNumber(text: string | undefined): number | null {
  if (!text) return null
  const parsed = Number(text.replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
}

function parseSummaryFromReportHtml(html: string): {
  totalMessages: number | null
  totalSessions: number | null
  totalSessionsScanned: number | null
} {
  const match = html.match(
    /([\d,]+)\s+messages\s+across\s+([\d,]+)\s+sessions(?:\s+\(([\d,]+)\s+total\))?/i,
  )

  return {
    totalMessages: parseNumber(match?.[1]),
    totalSessions: parseNumber(match?.[2]),
    totalSessionsScanned: parseNumber(match?.[3]),
  }
}

function parseDateRangeFromReportHtml(html: string): { start: string; end: string } | null {
  const match = html.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/)
  if (!match) return null

  const start = match[1]
  const end = match[2]
  if (!start || !end) return null
  return { start, end }
}

function recoverAtAGlanceFromReportHtml(html: string): InsightResults {
  const extractLine = (label: string, sectionId: string): string => {
    const pattern = new RegExp(
      `<strong>${label}:<\\/strong>\\s*([\\s\\S]*?)\\s*<a href="#${sectionId}"`,
      "i",
    )
    const match = html.match(pattern)
    return stripHtml(match?.[1] ?? "")
  }

  const whatsWorking = extractLine("What's working", "section-wins")
  const whatsHindering = extractLine("What's hindering you", "section-friction")
  const quickWins = extractLine("Quick wins to try", "section-features")
  const ambitiousWorkflows = extractLine("Ambitious workflows", "section-horizon")

  if (!whatsWorking && !whatsHindering && !quickWins && !ambitiousWorkflows) {
    return {}
  }

  return {
    at_a_glance: {
      ...(whatsWorking ? { whats_working: whatsWorking } : {}),
      ...(whatsHindering ? { whats_hindering: whatsHindering } : {}),
      ...(quickWins ? { quick_wins: quickWins } : {}),
      ...(ambitiousWorkflows ? { ambitious_workflows: ambitiousWorkflows } : {}),
    },
  }
}

function rebuildAggregatedDataFromCachedArtifacts(
  facets: Map<string, SessionFacets>,
  reportHtml: string,
): AggregatedData {
  const data = aggregateData([], new Map<string, SessionFacets>())
  data.total_sessions = facets.size
  data.sessions_with_facets = facets.size
  data.total_sessions_scanned = facets.size

  for (const facet of facets.values()) {
    incrementEntries(data.goal_categories, facet.goal_categories)
    incrementCounter(data.outcomes, facet.outcome)
    incrementEntries(data.satisfaction, facet.user_satisfaction_counts)
    incrementCounter(data.helpfulness, facet.claude_helpfulness)
    incrementCounter(data.session_types, facet.session_type)
    incrementEntries(data.friction, facet.friction_counts)
    if (facet.primary_success !== "none") {
      incrementCounter(data.success, facet.primary_success)
    }

    if (data.session_summaries.length < MAX_SESSION_SUMMARIES) {
      data.session_summaries.push({
        id: facet.session_id,
        date: "",
        summary: facet.brief_summary,
        goal: facet.underlying_goal,
      })
    }
  }

  const parsedSummary = parseSummaryFromReportHtml(reportHtml)
  if (parsedSummary.totalMessages !== null) {
    data.total_messages = parsedSummary.totalMessages
  }
  if (parsedSummary.totalSessions !== null) {
    data.total_sessions = parsedSummary.totalSessions
  }
  if (parsedSummary.totalSessionsScanned !== null) {
    data.total_sessions_scanned = parsedSummary.totalSessionsScanned
  }

  const parsedRange = parseDateRangeFromReportHtml(reportHtml)
  if (parsedRange) {
    data.date_range = parsedRange
  }

  return data
}

async function loadFacetsFromDisk(): Promise<Map<string, SessionFacets>> {
  const facets = new Map<string, SessionFacets>()
  const facetsDir = getFacetsDir()

  try {
    const entries = await readdir(facetsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue

      const facetPath = `${facetsDir}/${entry.name}`
      try {
        const parsed = await Bun.file(facetPath).json()
        if (isValidSessionFacets(parsed)) {
          facets.set(parsed.session_id, parsed)
        }
      } catch {
        continue
      }
    }
  } catch {
    return facets
  }

  return facets
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isCachedReportPayload(value: unknown): value is CachedReportPayload {
  if (!isRecord(value)) return false
  if (!Array.isArray(value.facets)) return false
  if (!value.facets.every((facet) => isValidSessionFacets(facet))) return false
  if (!isRecord(value.insights)) return false
  if (!isRecord(value.data)) return false
  return true
}

async function loadCachedReportPayload(): Promise<{
  insights: InsightResults
  data: AggregatedData
  facets: Map<string, SessionFacets>
} | null> {
  const snapshotPath = getReportSnapshotPath()

  try {
    const file = Bun.file(snapshotPath)
    if (!(await file.exists())) return null

    const parsed = await file.json()
    if (!isCachedReportPayload(parsed)) return null

    const facets = new Map<string, SessionFacets>()
    for (const facet of parsed.facets) {
      facets.set(facet.session_id, facet)
    }

    return {
      insights: parsed.insights,
      data: parsed.data,
      facets,
    }
  } catch {
    return null
  }
}

async function saveCachedReportPayload(
  insights: InsightResults,
  data: AggregatedData,
  facets: Map<string, SessionFacets>,
): Promise<void> {
  const snapshotPath = getReportSnapshotPath()

  try {
    await mkdir(dirname(snapshotPath), { recursive: true })
    const payload: CachedReportPayload = {
      insights,
      data,
      facets: Array.from(facets.values()),
    }
    await Bun.write(snapshotPath, JSON.stringify(payload, null, 2))
  } catch {
    return
  }
}

async function restoreCachedResult(htmlPath: string): Promise<{
  insights: InsightResults
  data: AggregatedData
  facets: Map<string, SessionFacets>
}> {
  const snapshot = await loadCachedReportPayload()
  if (snapshot) {
    return snapshot
  }

  let reportHtml = ""
  try {
    reportHtml = await Bun.file(htmlPath).text()
  } catch {
    reportHtml = ""
  }

  const facets = await loadFacetsFromDisk()
  const insights = recoverAtAGlanceFromReportHtml(reportHtml)
  const data = rebuildAggregatedDataFromCachedArtifacts(facets, reportHtml)

  return { insights, data, facets }
}

function filterMinimalSessions(
  sessions: SessionMeta[],
  facets: Map<string, SessionFacets>,
): { sessions: SessionMeta[]; facets: Map<string, SessionFacets> } {
  const filteredFacets = new Map<string, SessionFacets>()
  for (const [sessionId, facet] of facets.entries()) {
    if (!isMinimalSession(facet)) {
      filteredFacets.set(sessionId, facet)
    }
  }

  const filteredSessions = sessions.filter((session) => {
    const facet = facets.get(session.id)
    if (!facet) return true
    return !isMinimalSession(facet)
  })

  return { sessions: filteredSessions, facets: filteredFacets }
}

async function collectSessionArtifacts(
  sessions: SessionMeta[],
  dbPath?: string,
): Promise<{ messages: Map<string, MessageData[]>; parts: Map<string, PartData[]> }> {
  const messages = new Map<string, MessageData[]>()
  const parts = new Map<string, PartData[]>()
  const path = dbPath ?? DEFAULT_DB_PATH

  await Promise.all(
    sessions.map(async (session) => {
      const [sessionMessages, sessionParts] = await Promise.all([
        collectMessages(path, session.id).catch(() => []),
        collectParts(path, session.id).catch(() => []),
      ])

      messages.set(session.id, sessionMessages)
      parts.set(session.id, sessionParts)
    }),
  )

  return { messages, parts }
}

export async function generateUsageReport(
  client: any,
  options: GenerateUsageReportOptions = {},
): Promise<GenerateUsageReportResult> {
  const htmlPath = getReportPath()

  if (await isReportFresh(options?.dbPath)) {
    const cached = await restoreCachedResult(htmlPath)

    // 保持 export/prompt contract 可复用，即使缓存命中也执行构建。
    buildExportData(cached.data, cached.insights, cached.facets)
    buildPromptForCommand(cached.insights, htmlPath, cached.data, getFacetsDir())

    return {
      insights: cached.insights,
      htmlPath,
      data: cached.data,
      facets: cached.facets,
    }
  }

  const sessions = await collectSessions({
    dbPath: options?.dbPath,
    days: options?.days,
    project: options?.project,
  })

  const dedupedSessions = dedupSessionsById(sessions)
  const substantiveSessions = dedupedSessions.filter(isSubstantiveSession)
  const analyzedSessions = substantiveSessions.slice(0, MAX_SESSIONS)

  const { messages, parts } = await collectSessionArtifacts(
    analyzedSessions,
    options?.dbPath,
  )

  const extractedFacets = await extractAllFacets(
    client,
    analyzedSessions,
    messages,
    parts,
    new Map<string, SessionFacets>(),
  )

  const filtered = filterMinimalSessions(analyzedSessions, extractedFacets)
  const data = aggregateData(filtered.sessions, filtered.facets)
  data.total_sessions_scanned = dedupedSessions.length

  const insights = await generateParallelInsights(client, data, filtered.facets)
  const html = generateHtmlReport(data, insights)

  await mkdir(dirname(htmlPath), { recursive: true })
  await Bun.write(htmlPath, html)

  await saveCachedReportPayload(insights, data, filtered.facets)
  buildExportData(data, insights, filtered.facets)
  buildPromptForCommand(insights, htmlPath, data, getFacetsDir())

  return {
    insights,
    htmlPath,
    data,
    facets: filtered.facets,
  }
}
