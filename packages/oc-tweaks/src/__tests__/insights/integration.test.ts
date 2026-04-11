// @ts-nocheck

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"

import { generateUsageReport } from "../../insights/handler"

const createdDbPaths = new Set<string>()

function makeDbPath(name: string) {
  const dbPath = `/tmp/oc-insights-${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.sqlite`
  createdDbPaths.add(dbPath)
  return dbPath
}

function cleanupSqliteArtifacts(dbPath: string) {
  rmSync(dbPath, { force: true })
  rmSync(`${dbPath}-wal`, { force: true })
  rmSync(`${dbPath}-shm`, { force: true })
  rmSync(`${dbPath}-journal`, { force: true })
}
const SECTION_IDS = [
  "section-glance",
  "section-projects",
  "section-style",
  "section-wins",
  "section-friction",
  "section-features",
  "section-patterns",
  "section-horizon",
  "section-fun",
]

const originalHome = Bun.env?.HOME
let tempDir: string

function setHome(dir: string) {
  ;(Bun.env as any).HOME = dir
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function createTestDb(dbUri: string) {
  const db = new Database(dbUri)
  db.exec(`
    CREATE TABLE session (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      slug TEXT NOT NULL,
      directory TEXT NOT NULL,
      title TEXT NOT NULL,
      version TEXT NOT NULL,
      share_url TEXT,
      summary_additions INTEGER NOT NULL DEFAULT 0,
      summary_deletions INTEGER NOT NULL DEFAULT 0,
      summary_files INTEGER NOT NULL DEFAULT 0,
      summary_diffs TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      time_compacting INTEGER,
      time_archived INTEGER,
      workspace_id TEXT
    );
    CREATE TABLE message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      time_created INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE part (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      session_id TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `)
  return db
}

function insertSession(db: any, s: Record<string, unknown>) {
  db.query(`INSERT INTO session (id, project_id, parent_id, slug, directory, title, version,
    share_url, summary_additions, summary_deletions, summary_files, summary_diffs,
    time_created, time_updated, time_compacting, time_archived, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    s.id, s.project_id, s.parent_id ?? null, s.slug ?? s.id, s.directory ?? "/repo",
    s.title ?? "Test session", s.version ?? "0.7.1", s.share_url ?? null,
    s.summary_additions ?? 0, s.summary_deletions ?? 0, s.summary_files ?? 0,
    s.summary_diffs ?? null, s.time_created, s.time_updated,
    s.time_compacting ?? null, s.time_archived ?? null, s.workspace_id ?? null,
  )
}

function insertMessage(db: any, m: Record<string, unknown>) {
  db.query("INSERT INTO message (id, session_id, time_created, data) VALUES (?, ?, ?, ?)").run(
    m.id, m.session_id, m.time_created, JSON.stringify(m.data),
  )
}

function insertPart(db: any, p: Record<string, unknown>) {
  db.query("INSERT INTO part (id, message_id, session_id, data) VALUES (?, ?, ?, ?)").run(
    p.id, p.message_id ?? null, p.session_id, JSON.stringify(p.data),
  )
}

/**
 * Insert a substantive session (≥2 user msgs, ≥60s duration) with messages and tool parts.
 * This guarantees `isSubstantiveSession` returns true.
 */
function seedSubstantiveSession(
  db: any,
  sessionId: string,
  opts: { projectId?: string; title?: string; baseTime?: number } = {},
) {
  const now = Date.now()
  const base = opts.baseTime ?? now - 3 * 60 * 60 * 1000
  const projectId = opts.projectId ?? "project-a"
  const title = opts.title ?? `Session ${sessionId}`

  insertSession(db, {
    id: sessionId,
    project_id: projectId,
    slug: sessionId,
    directory: "/repo",
    title,
    version: "0.7.1",
    time_created: base,
    time_updated: base + 120_000, // 2 min → exceeds 60s substantive threshold
  })

  insertMessage(db, {
    id: `${sessionId}-msg-a1`,
    session_id: sessionId,
    time_created: base + 1_000,
    data: {
      role: "assistant",
      tokens: { input: 100, output: 50 },
      time: { created: base + 1_000, completed: base + 2_000 },
    },
  })

  insertMessage(db, {
    id: `${sessionId}-msg-u1`,
    session_id: sessionId,
    time_created: base + 5_000,
    data: {
      role: "user",
      content: "Please fix the bug in auth module",
      time: { created: base + 5_000 },
    },
  })

  insertMessage(db, {
    id: `${sessionId}-msg-a2`,
    session_id: sessionId,
    time_created: base + 10_000,
    data: {
      role: "assistant",
      tokens: { input: 200, output: 100 },
      time: { created: base + 10_000, completed: base + 12_000 },
    },
  })

  insertMessage(db, {
    id: `${sessionId}-msg-u2`,
    session_id: sessionId,
    time_created: base + 20_000,
    data: {
      role: "user",
      content: "Now add tests for it",
      time: { created: base + 20_000 },
    },
  })

  insertPart(db, {
    id: `${sessionId}-part-edit`,
    session_id: sessionId,
    message_id: `${sessionId}-msg-a1`,
    data: {
      type: "tool",
      tool: "Edit",
      state: {
        input: {
          file_path: "/repo/src/auth.ts",
          old_string: "old code",
          new_string: "new code\nline2",
        },
        output: "Applied edit",
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Mock client – routes prompt calls via session title set at create time
// ---------------------------------------------------------------------------

function makeMockFacets(sessionId: string) {
  return {
    session_id: sessionId,
    underlying_goal: "build a feature",
    goal_categories: { feature_development: 2 },
    outcome: "fully_achieved",
    user_satisfaction_counts: { satisfied: 1 },
    claude_helpfulness: "very_helpful",
    session_type: "single_task",
    friction_counts: {},
    friction_detail: "none",
    primary_success: "correct_code_edits",
    brief_summary: "User built a feature.",
  }
}

function makeMockSectionResponse(sectionName: string): Record<string, unknown> {
  const responses: Record<string, Record<string, unknown>> = {
    project_areas: {
      areas: [{ name: "Test Project", session_count: 2, description: "A test project" }],
    },
    interaction_style: {
      narrative: "Test narrative about interaction.",
      key_pattern: "Test pattern",
    },
    what_works: {
      intro: "Good stuff",
      impressive_workflows: [{ title: "Workflow", description: "Description" }],
    },
    friction_analysis: {
      intro: "Issues found",
      categories: [{ category: "Cat", description: "Desc", examples: ["ex1"] }],
    },
    suggestions: {
      claude_md_additions: [{ addition: "Add this", why: "Because" }],
      features_to_try: [{ feature: "F1", one_liner: "Do it", why_for_you: "Good", example_code: "code" }],
      usage_patterns: [{ title: "P1", suggestion: "Try this", detail: "D", copyable_prompt: "prompt" }],
    },
    on_the_horizon: {
      intro: "Future work",
      opportunities: [{ title: "Opp", whats_possible: "Possible", how_to_try: "Try" }],
    },
    fun_ending: { headline: "Fun headline", detail: "Fun detail" },
    at_a_glance: {
      whats_working: "Code edits work well",
      whats_hindering: "Nothing major",
      quick_wins: "Try MCP tools",
      ambitious_workflows: "Multi-agent orchestration",
    },
  }
  return responses[sectionName] ?? {}
}

function createMockClient() {
  let createCount = 0
  const titleBySessionId = new Map<string, string>()
  const allTitles: string[] = []

  return {
    client: {
      session: {
        create: async ({ body }: { body: { title: string } }) => {
          createCount++
          const id = `mock-prompt-${createCount}`
          titleBySessionId.set(id, body.title)
          allTitles.push(body.title)
          return { data: { id } }
        },
        prompt: async ({ path, body }: any) => {
          const title = titleBySessionId.get(path.id) ?? ""
          const promptText = body.parts?.[0]?.text ?? ""

          // Facet extraction: title contains "facets"
          if (title.includes("facets")) {
            const sessionMatch = promptText.match(/Session: ([\w-]+)/)
            const sid = sessionMatch?.[1] ?? "unknown"
            return {
              data: { parts: [{ type: "text", text: JSON.stringify(makeMockFacets(sid)) }] },
            }
          }

          // Section-based insight generation: title contains "section <name>"
          for (const name of [
            "project_areas",
            "interaction_style",
            "what_works",
            "friction_analysis",
            "suggestions",
            "on_the_horizon",
            "fun_ending",
            "at_a_glance",
          ]) {
            if (title.includes(`section ${name}`)) {
              return {
                data: { parts: [{ type: "text", text: JSON.stringify(makeMockSectionResponse(name)) }] },
              }
            }
          }

          // Fallback
          return { data: { parts: [{ type: "text", text: "{}" }] } }
        },
      },
    },
    getTitles: () => allTitles,
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  tempDir = `/tmp/oc-integration-${uid()}`
  mkdirSync(tempDir, { recursive: true })
  setHome(tempDir)
})

afterEach(() => {
  setHome(originalHome)
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  for (const dbPath of createdDbPaths) {
    cleanupSqliteArtifacts(dbPath)
  }
  createdDbPaths.clear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("insights integration: handler pipeline E2E", () => {
  test("full pipeline returns insights/htmlPath/data/facets with 9 section ids", async () => {
    const dbUri = makeDbPath("full")
    const db = createTestDb(dbUri)

    seedSubstantiveSession(db, "ses-1")
    seedSubstantiveSession(db, "ses-2")

    // Meta session that must be excluded
    insertSession(db, {
      id: "ses-meta",
      project_id: "project-a",
      slug: "ses-meta",
      directory: "/repo",
      title: "[insights-internal] summarize report",
      version: "0.7.1",
      time_created: Date.now() - 60_000,
      time_updated: Date.now(),
    })

    db.close()

    const { client } = createMockClient()
    const result = await generateUsageReport(client, { dbPath: dbUri })

    // 1. Return value shape
    expect(result).toHaveProperty("insights")
    expect(result).toHaveProperty("htmlPath")
    expect(result).toHaveProperty("data")
    expect(result).toHaveProperty("facets")
    expect(result.facets).toBeInstanceOf(Map)

    // 2. HTML report file exists
    expect(existsSync(result.htmlPath)).toBe(true)

    // 3. HTML contains all 9 section ids
    const html = readFileSync(result.htmlPath, "utf-8")
    for (const sectionId of SECTION_IDS) {
      expect(html).toContain(`id="${sectionId}"`)
    }

    // 4. Meta session excluded from AggregatedData
    expect(result.data.session_summaries.some((s: any) => s.id === "ses-meta")).toBe(false)
    expect(result.data.total_sessions).toBeGreaterThan(0)
  })

  test("[insights-internal] sessions do not pollute AggregatedData", async () => {
    const dbUri = makeDbPath("meta")
    const db = createTestDb(dbUri)

    seedSubstantiveSession(db, "ses-normal")

    // Internal session with enough messages to be substantive
    const base = Date.now() - 120_000
    insertSession(db, {
      id: "ses-internal",
      project_id: "project-a",
      slug: "ses-internal",
      directory: "/repo",
      title: "[insights-internal] facets extraction",
      version: "0.7.1",
      time_created: base,
      time_updated: base + 120_000,
    })
    insertMessage(db, {
      id: "ses-internal-msg-u1",
      session_id: "ses-internal",
      time_created: base + 5_000,
      data: { role: "user", content: "test msg", time: { created: base + 5_000 } },
    })
    insertMessage(db, {
      id: "ses-internal-msg-u2",
      session_id: "ses-internal",
      time_created: base + 50_000,
      data: { role: "user", content: "test msg 2", time: { created: base + 50_000 } },
    })

    db.close()

    const { client } = createMockClient()
    const result = await generateUsageReport(client, { dbPath: dbUri })

    const sessionIds = result.data.session_summaries.map((s: any) => s.id)
    expect(sessionIds).not.toContain("ses-internal")
    expect(sessionIds).toContain("ses-normal")
  })

  test("days=1 filters out sessions older than 1 day", async () => {
    const dbUri = makeDbPath("days")
    const db = createTestDb(dbUri)
    const now = Date.now()

    seedSubstantiveSession(db, "ses-recent", { baseTime: now - 3 * 60 * 60 * 1000 })
    seedSubstantiveSession(db, "ses-old", { baseTime: now - 3 * 24 * 60 * 60 * 1000 })

    db.close()

    const { client } = createMockClient()
    const result = await generateUsageReport(client, { dbPath: dbUri, days: 1 })

    const sessionIds = result.data.session_summaries.map((s: any) => s.id)
    expect(sessionIds).toContain("ses-recent")
    expect(sessionIds).not.toContain("ses-old")
  })

  test("project filter limits results to matching project_id", async () => {
    const dbUri = makeDbPath("project")
    const db = createTestDb(dbUri)

    seedSubstantiveSession(db, "ses-proj-a", { projectId: "project-a" })
    seedSubstantiveSession(db, "ses-proj-b", { projectId: "project-b" })

    db.close()

    const { client } = createMockClient()
    const result = await generateUsageReport(client, { dbPath: dbUri, project: "project-a" })

    const sessionIds = result.data.session_summaries.map((s: any) => s.id)
    expect(sessionIds).toContain("ses-proj-a")
    expect(sessionIds).not.toContain("ses-proj-b")
  })

  test("non-substantive sessions are excluded before aggregateData", async () => {
    const dbUri = makeDbPath("substantive")
    const db = createTestDb(dbUri)

    seedSubstantiveSession(db, "ses-substantive")

    const base = Date.now() - 60_000
    insertSession(db, {
      id: "ses-non-substantive",
      project_id: "project-a",
      slug: "ses-non-substantive",
      directory: "/repo",
      title: "Non substantive quick ping",
      version: "0.7.1",
      time_created: base,
      time_updated: base + 30_000, // < 60s duration
    })
    insertMessage(db, {
      id: "ses-non-substantive-msg-u1",
      session_id: "ses-non-substantive",
      time_created: base + 5_000,
      data: {
        role: "user",
        content: "quick question",
        time: { created: base + 5_000 },
      },
    })

    db.close()

    const { client } = createMockClient()
    const result = await generateUsageReport(client, { dbPath: dbUri })

    const sessionIds = result.data.session_summaries.map((s: any) => s.id)
    expect(sessionIds).toContain("ses-substantive")
    expect(sessionIds).not.toContain("ses-non-substantive")
  })

  test("facets cache files are created on disk", async () => {
    const dbUri = makeDbPath("cache")
    const db = createTestDb(dbUri)

    seedSubstantiveSession(db, "ses-cached")

    db.close()

    const { client } = createMockClient()
    const result = await generateUsageReport(client, { dbPath: dbUri })

    // Facets returned in result
    expect(result.facets.size).toBeGreaterThan(0)

    // Facets cache file written to disk
    const facetsDir = `${tempDir}/.local/share/opencode/insights/facets`
    expect(existsSync(`${facetsDir}/ses-cached.json`)).toBe(true)

    // Validate cached content roundtrips correctly
    const cached = JSON.parse(readFileSync(`${facetsDir}/ses-cached.json`, "utf-8"))
    expect(cached.session_id).toBe("ses-cached")
    expect(cached.outcome).toBe("fully_achieved")
  })
})
