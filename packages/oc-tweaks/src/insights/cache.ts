declare const Bun: any
import { Database } from "bun:sqlite"
import { stat } from "node:fs/promises"

import type { SessionFacets } from "./types"

const REPORT_TTL_MS = 24 * 60 * 60 * 1000

function getHomeDir(): string {
  return Bun.env?.HOME ?? ""
}

function getDefaultDbPath(): string {
  return `${getHomeDir()}/.local/share/opencode/opencode.db`
}

export function getFacetsDir(): string {
  return `${getHomeDir()}/.local/share/opencode/insights/facets`
}

export function getReportDir(): string {
  return `${getHomeDir()}/.local/share/opencode/insights`
}

export function getReportPath(): string {
  return `${getReportDir()}/report.html`
}

export function isValidSessionFacets(obj: unknown): obj is SessionFacets {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false
  const o = obj as Record<string, unknown>
  return (
    typeof o.session_id === "string" &&
    typeof o.underlying_goal === "string" &&
    typeof o.outcome === "string" &&
    typeof o.brief_summary === "string" &&
    typeof o.claude_helpfulness === "string" &&
    typeof o.session_type === "string" &&
    typeof o.primary_success === "string" &&
    typeof o.friction_detail === "string" &&
    o.goal_categories !== null &&
    typeof o.goal_categories === "object" &&
    !Array.isArray(o.goal_categories) &&
    o.user_satisfaction_counts !== null &&
    typeof o.user_satisfaction_counts === "object" &&
    !Array.isArray(o.user_satisfaction_counts) &&
    o.friction_counts !== null &&
    typeof o.friction_counts === "object" &&
    !Array.isArray(o.friction_counts)
  )
}

export async function loadCachedFacets(
  sessionId: string,
): Promise<SessionFacets | null> {
  const facetPath = `${getFacetsDir()}/${sessionId}.json`
  try {
    const file = Bun.file(facetPath)
    if (!(await file.exists())) return null
    const parsed = await file.json()
    return isValidSessionFacets(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function saveFacets(facets: SessionFacets): Promise<void> {
  try {
    await Bun.write(
      `${getFacetsDir()}/${facets.session_id}.json`,
      JSON.stringify(facets, null, 2),
    )
  } catch {
    return
  }
}

async function getFileMtimeMs(path: string): Promise<number | null> {
  try {
    const info = await stat(path)
    return Number.isFinite(info.mtimeMs) ? info.mtimeMs : null
  } catch {
    return null
  }
}

function getLatestDbUpdate(dbPath: string): number | null {
  try {
    const db = new Database(dbPath, { readonly: true })
    const result = db.query("SELECT MAX(time_updated) AS max_time_updated FROM session").get() as
      | { max_time_updated?: number | string | null }
      | null
    db.close()
    const value = result?.max_time_updated
    return typeof value === "number" ? value : value ? Number(value) : null
  } catch {
    return null
  }
}

export async function isReportFresh(dbPath?: string): Promise<boolean> {
  const reportPath = getReportPath()
  const reportMtime = await getFileMtimeMs(reportPath)
  if (reportMtime === null) return false
  if (Date.now() - reportMtime > REPORT_TTL_MS) return false
  const latestDbUpdate = getLatestDbUpdate(dbPath ?? getDefaultDbPath())
  if (latestDbUpdate === null) return false
  return latestDbUpdate <= reportMtime
}

export type InsightsCache = Record<string, unknown>
