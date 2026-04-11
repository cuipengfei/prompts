// @ts-nocheck

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { dirname, join } from "node:path"
import { mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs"

import {
  getFacetsDir,
  getReportDir,
  getReportPath,
  isReportFresh,
  isValidSessionFacets,
  loadCachedFacets,
  saveFacets,
} from "../../insights/cache"

function createTempDbPath(name: string) {
  return `/tmp/oc-insights-${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.sqlite`
}

function cleanupSqliteArtifacts(dbPath: string) {
  rmSync(dbPath, { force: true })
  rmSync(`${dbPath}-wal`, { force: true })
  rmSync(`${dbPath}-shm`, { force: true })
  rmSync(`${dbPath}-journal`, { force: true })
}

const originalBunFile = Bun.file
const originalBunWrite = Bun.write
const originalHome = Bun.env?.HOME

const writtenFiles: Record<string, string> = {}
const fileMeta: Record<string, { exists?: boolean; mtime?: Date }> = {}
function setHome(home: string | undefined) {
  if (home === undefined) delete (Bun.env as any).HOME
  else (Bun.env as any).HOME = home
}

function mockBun() {
  ;(globalThis as any).Bun.file = (path: string) => ({
    exists: async () => fileMeta[path]?.exists ?? (path in writtenFiles),
    text: async () => {
      if (!(path in writtenFiles)) throw new Error("ENOENT")
      return writtenFiles[path]
    },
    json: async () => {
      if (!(path in writtenFiles)) throw new Error("ENOENT")
      return JSON.parse(writtenFiles[path])
    },
    mtime: async () => fileMeta[path]?.mtime ?? new Date("2025-01-01T00:00:00.000Z"),
  })

  ;(globalThis as any).Bun.write = async (path: string, content: string) => {
    writtenFiles[path] = typeof content === "string" ? content : String(content)
    fileMeta[path] = { exists: true, mtime: new Date("2025-01-02T00:00:00.000Z") }
  }
}


function writeReportFile(reportPath: string, timestampMs: number) {
  mkdirSync(dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, "<html></html>")
  const timestamp = new Date(timestampMs)
  utimesSync(reportPath, timestamp, timestamp)
  fileMeta[reportPath] = { exists: true, mtime: new Date(timestampMs) }
}

beforeEach(() => {
  setHome(originalHome)
  for (const key of Object.keys(writtenFiles)) delete writtenFiles[key]
  for (const key of Object.keys(fileMeta)) delete fileMeta[key]
  mockBun()
})

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  ;(globalThis as any).Bun.write = originalBunWrite
  setHome(originalHome)
  rmSync("/tmp/oc-home-insights-cache", { recursive: true, force: true })
  rmSync("/tmp/oc-home-insights-cache-missing", { recursive: true, force: true })
  rmSync("/tmp/oc-home-insights-report", { recursive: true, force: true })
  rmSync("/tmp/oc-home-insights-report-stale", { recursive: true, force: true })
  rmSync("/tmp/oc-home-insights-report-default-db", { recursive: true, force: true })
  rmSync("/tmp/oc-home-insights-report-table", { recursive: true, force: true })
  rmSync("/tmp/oc-home-insights-paths", { recursive: true, force: true })
})

describe("insights cache", () => {
  test("round-trips facets through disk", async () => {
    const home = "/tmp/oc-home-insights-cache"
    setHome(home)

    const facets = {
      session_id: "s-1",
      underlying_goal: "ship a fix",
      goal_categories: { bugfix: 2 },
      outcome: "fully_achieved",
      user_satisfaction_counts: { satisfied: 1 },
      claude_helpfulness: "very_helpful",
      session_type: "single_task",
      friction_counts: { buggy_code: 1 },
      friction_detail: "none",
      primary_success: "correct_code_edits",
      brief_summary: "User got the fix.",
    }

    await saveFacets(facets)
    const loaded = await loadCachedFacets("s-1")

    expect(loaded).toEqual(facets)
  })

  test("rejects invalid facets object", () => {
    expect(isValidSessionFacets(null)).toBe(false)
    expect(isValidSessionFacets({ underlying_goal: 1, outcome: "x", brief_summary: "x", goal_categories: {}, user_satisfaction_counts: {}, friction_counts: {} })).toBe(false)
    expect(isValidSessionFacets({ underlying_goal: "x", outcome: "x", brief_summary: "x", goal_categories: [], user_satisfaction_counts: {}, friction_counts: {} })).toBe(false)
    expect(isValidSessionFacets({
      session_id: "s-x",
      underlying_goal: "x",
      outcome: "x",
      brief_summary: "x",
      goal_categories: {},
      user_satisfaction_counts: {},
      friction_counts: {},
      claude_helpfulness: "very_helpful",
      session_type: "single_task",
      primary_success: "none",
      friction_detail: "",
    })).toBe(true)
    expect(isValidSessionFacets({
      underlying_goal: "x",
      outcome: "x",
      brief_summary: "x",
      goal_categories: {},
      user_satisfaction_counts: {},
      friction_counts: {},
      claude_helpfulness: "very_helpful",
      session_type: "single_task",
      primary_success: "none",
      friction_detail: "",
    })).toBe(false)
    expect(isValidSessionFacets({
      session_id: "s-x",
      underlying_goal: "x",
      outcome: "x",
      brief_summary: "x",
      goal_categories: {},
      user_satisfaction_counts: {},
      friction_counts: {},
      session_type: "single_task",
      primary_success: "none",
      friction_detail: "",
    })).toBe(false)
    expect(isValidSessionFacets({
      session_id: "s-x",
      underlying_goal: "x",
      outcome: "x",
      brief_summary: "x",
      goal_categories: {},
      user_satisfaction_counts: {},
      friction_counts: {},
      claude_helpfulness: "very_helpful",
      primary_success: "none",
      friction_detail: "",
    })).toBe(false)
    expect(isValidSessionFacets({
      session_id: "s-x",
      underlying_goal: "x",
      outcome: "x",
      brief_summary: "x",
      goal_categories: {},
      user_satisfaction_counts: {},
      friction_counts: {},
      claude_helpfulness: "very_helpful",
      session_type: "single_task",
      friction_detail: "",
    })).toBe(false)
  })

  test("returns null when cached facets file is missing", async () => {
    const home = "/tmp/oc-home-insights-cache-missing"
    setHome(home)

    const loaded = await loadCachedFacets("missing")
    expect(loaded).toBeNull()
  })

  test("reports fresh when html exists and db is older", async () => {
    const home = "/tmp/oc-home-insights-report"
    setHome(home)

    const reportPath = `${home}/.local/share/opencode/insights/report.html`
    fileMeta[reportPath] = { exists: true, mtime: new Date(Date.now() - 1000 * 60 * 60) }
    const dbPath = createTempDbPath("fresh")
    mkdirSync(dirname(dbPath), { recursive: true })
    const db = new Database(dbPath)
    db.run("CREATE TABLE session (time_updated INTEGER)")
    db.run("INSERT INTO session (time_updated) VALUES (?)", Date.now() - 1000 * 60 * 90)
    db.close()

    writeReportFile(reportPath, Date.now() - 1000 * 60 * 60)

    expect(await isReportFresh(dbPath)).toBe(true)
    cleanupSqliteArtifacts(dbPath)
  })

  test("reports stale when db is newer", async () => {
    const home = "/tmp/oc-home-insights-report-stale"
    setHome(home)

    const reportPath = `${home}/.local/share/opencode/insights/report.html`
    fileMeta[reportPath] = { exists: true, mtime: new Date(Date.now() - 1000 * 60 * 60) }
    const dbPath = createTempDbPath("stale")
    mkdirSync(dirname(dbPath), { recursive: true })
    const db = new Database(dbPath)
    db.run("CREATE TABLE session (time_updated INTEGER)")
    db.run("INSERT INTO session (time_updated) VALUES (?)", Date.now())
    db.close()

    writeReportFile(reportPath, Date.now() - 1000 * 60 * 60)

    expect(await isReportFresh(dbPath)).toBe(false)
    cleanupSqliteArtifacts(dbPath)
  })

  test("checks default db path when dbPath is omitted", async () => {
    const home = "/tmp/oc-home-insights-report-default-db"
    setHome(home)

    const reportPath = `${home}/.local/share/opencode/insights/report.html`
    fileMeta[reportPath] = { exists: true, mtime: new Date(Date.now() - 1000 * 60 * 15) }
    const defaultDbPath = join(home, ".local/share/opencode/opencode.db")
    mkdirSync(dirname(defaultDbPath), { recursive: true })
    writeFileSync(defaultDbPath, "")
    const db = new Database(defaultDbPath)
    db.run("CREATE TABLE session (time_updated INTEGER)")
    db.run("INSERT INTO session (time_updated) VALUES (?)", Date.now() - 1000 * 60 * 45)
    db.close()

    writeReportFile(reportPath, Date.now() - 1000 * 60 * 15)

    expect(await isReportFresh()).toBe(true)
    cleanupSqliteArtifacts(defaultDbPath)
  })

  test("queries the single session table for freshness", async () => {
    const home = "/tmp/oc-home-insights-report-table"
    setHome(home)

    const reportPath = `${home}/.local/share/opencode/insights/report.html`
    fileMeta[reportPath] = { exists: true, mtime: new Date(Date.now() - 1000 * 60 * 60) }
    const dbPath = createTempDbPath("table")
    mkdirSync(dirname(dbPath), { recursive: true })
    const db = new Database(dbPath)
    db.run("CREATE TABLE session (time_updated INTEGER)")
    db.run("INSERT INTO session (time_updated) VALUES (?)", Date.now() - 1000 * 60 * 90)
    db.close()

    writeReportFile(reportPath, Date.now() - 1000 * 60 * 60)

    expect(await isReportFresh(dbPath)).toBe(true)
    cleanupSqliteArtifacts(dbPath)
  })

  test("exposes report paths under opencode insights dir", () => {
    const home = "/tmp/oc-home-insights-paths"
    setHome(home)

    expect(getFacetsDir()).toBe(`${home}/.local/share/opencode/insights/facets`)
    expect(getReportDir()).toBe(`${home}/.local/share/opencode/insights`)
    expect(getReportPath()).toBe(`${home}/.local/share/opencode/insights/report.html`)
  })
})
