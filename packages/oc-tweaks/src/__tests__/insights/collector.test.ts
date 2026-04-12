// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { rm } from "node:fs/promises"

import {
  collectMessages,
  collectParts,
  collectSessions,
  extractToolStats,
  resolveProjectId,
} from "../../insights/collector"

const originalDatabaseQuery = Database.prototype.query

const createdDbPaths = new Set<string>()

function createTestDbPath(name: string) {
  const dbPath = `/tmp/oc-insights-${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.sqlite`
  createdDbPaths.add(dbPath)
  return dbPath
}

async function cleanupSqliteArtifacts(dbPath: string) {
  await rm(dbPath, { force: true }).catch(() => {})
  await rm(`${dbPath}-wal`, { force: true }).catch(() => {})
  await rm(`${dbPath}-shm`, { force: true }).catch(() => {})
  await rm(`${dbPath}-journal`, { force: true }).catch(() => {})
}

function createDatabase(dbUri: string) {
  const db = new Database(dbUri)
  db.exec(`
    CREATE TABLE project (
      id TEXT PRIMARY KEY,
      worktree TEXT NOT NULL
    );

    CREATE TABLE session (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      slug TEXT NOT NULL,
      directory TEXT NOT NULL,
      title TEXT NOT NULL,
      version TEXT NOT NULL,
      share_url TEXT,
      summary_additions INTEGER NOT NULL,
      summary_deletions INTEGER NOT NULL,
      summary_files INTEGER NOT NULL,
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

function insertProject(db: any, row: { id: string; worktree: string }) {
  db.query("INSERT INTO project (id, worktree) VALUES (?, ?)").run(row.id, row.worktree)
}

function insertSession(db: any, session: Record<string, unknown>) {
  db.query(
    `INSERT INTO session (
      id, project_id, parent_id, slug, directory, title, version, share_url,
      summary_additions, summary_deletions, summary_files, summary_diffs,
      time_created, time_updated, time_compacting, time_archived, workspace_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    session.id,
    session.project_id,
    session.parent_id ?? null,
    session.slug,
    session.directory,
    session.title,
    session.version,
    session.share_url ?? null,
    session.summary_additions ?? 0,
    session.summary_deletions ?? 0,
    session.summary_files ?? 0,
    session.summary_diffs ?? null,
    session.time_created,
    session.time_updated,
    session.time_compacting ?? null,
    session.time_archived ?? null,
    session.workspace_id ?? null,
  )
}

function insertMessage(db: any, row: Record<string, unknown>) {
  db.query(`INSERT INTO message (id, session_id, time_created, data) VALUES (?, ?, ?, ?)`).run(
    row.id,
    row.session_id,
    row.time_created,
    JSON.stringify(row.data),
  )
}

function insertPart(db: any, row: Record<string, unknown>) {
  db.query(`INSERT INTO part (id, message_id, session_id, data) VALUES (?, ?, ?, ?)`).run(
    row.id,
    row.message_id ?? null,
    row.session_id,
    JSON.stringify(row.data),
  )
}

afterEach(async () => {
  Database.prototype.query = originalDatabaseQuery
  await Promise.all(Array.from(createdDbPaths).map((dbPath) => cleanupSqliteArtifacts(dbPath)))
  createdDbPaths.clear()
})

describe("resolveProjectId", () => {
  test("maps project worktree path to id", () => {
    const db = new Database(":memory:")
    db.exec("CREATE TABLE project (id TEXT PRIMARY KEY, worktree TEXT NOT NULL)")
    db.query("INSERT INTO project (id, worktree) VALUES (?, ?)").run(
      "7a3e867d3f4463cfbaa9e0866ee3fd5d279668d0",
      "/some/path",
    )

    expect(resolveProjectId(db, "/some/path")).toBe("7a3e867d3f4463cfbaa9e0866ee3fd5d279668d0")

    db.close()
  })

  test("returns hash unchanged when project looks like id", () => {
    const db = new Database(":memory:")
    db.exec("CREATE TABLE project (id TEXT PRIMARY KEY, worktree TEXT NOT NULL)")

    const projectId = "7a3e867d3f4463cfbaa9e0866ee3fd5d279668d0"
    expect(resolveProjectId(db, projectId)).toBe(projectId)

    db.close()
  })

  test("falls back to original path when worktree has no match", () => {
    const db = new Database(":memory:")
    db.exec("CREATE TABLE project (id TEXT PRIMARY KEY, worktree TEXT NOT NULL)")

    expect(resolveProjectId(db, "/not/exist")).toBe("/not/exist")

    db.close()
  })
})

describe("collectSessions", () => {
  test("applies days filter and excludes internal insights sessions", async () => {
    const dbPath = createTestDbPath("sessions-days")
    const db = createDatabase(dbPath)
    const now = Date.now()

    insertSession(db, {
      id: "recent-a-newer",
      project_id: "project-a",
      slug: "recent-a-newer",
      directory: "/repo/a",
      title: "Recent A newer",
      version: "0.7.1",
      time_created: now - 2 * 60 * 60 * 1000,
      time_updated: now - 1_000,
    })
    insertSession(db, {
      id: "recent-a-older",
      project_id: "project-a",
      slug: "recent-a-older",
      directory: "/repo/a",
      title: "Recent A older",
      version: "0.7.1",
      time_created: now - 4 * 60 * 60 * 1000,
      time_updated: now - 5_000,
    })
    insertSession(db, {
      id: "recent-b",
      project_id: "project-b",
      slug: "recent-b",
      directory: "/repo/b",
      title: "Recent B",
      version: "0.7.1",
      time_created: now - 3 * 60 * 60 * 1000,
      time_updated: now - 2_000,
    })
    insertSession(db, {
      id: "old-a",
      project_id: "project-a",
      slug: "old-a",
      directory: "/repo/a",
      title: "Old A",
      version: "0.7.1",
      time_created: now - 3 * 24 * 60 * 60 * 1000,
      time_updated: now - 10_000,
    })
    insertSession(db, {
      id: "meta-a",
      project_id: "project-a",
      slug: "meta-a",
      directory: "/repo/a",
      title: "[insights-internal] summarize report",
      version: "0.7.1",
      time_created: now - 60 * 60 * 1000,
      time_updated: now - 500,
    })

    db.close()

    const sessions = await collectSessions({ dbPath, days: 1 })

    expect(sessions.map((session) => session.id)).toEqual([
      "recent-a-newer",
      "recent-b",
      "recent-a-older",
    ])
    expect(sessions.some((session) => session.title.includes("[insights-internal]"))).toBe(false)
  })

  test("fills SessionMeta stats from messages and parts", async () => {
    const dbPath = createTestDbPath("sessions-contract")
    const db = createDatabase(dbPath)
    const baseTime = Date.UTC(2026, 0, 2, 3, 4, 5)

    insertSession(db, {
      id: "ses-contract",
      project_id: "project-a",
      slug: "ses-contract",
      directory: "/repo/a",
      title: "Contract session",
      version: "0.7.1",
      summary_additions: 1,
      summary_deletions: 2,
      summary_files: 3,
      time_created: baseTime,
      time_updated: baseTime + 20_000,
    })

    insertMessage(db, {
      id: "msg-assistant-1",
      session_id: "ses-contract",
      time_created: baseTime,
      data: {
        role: "assistant",
        tokens: { input: 10, output: 5 },
        time: { created: baseTime, completed: baseTime + 500 },
      },
    })
    insertMessage(db, {
      id: "msg-user-1",
      session_id: "ses-contract",
      time_created: baseTime + 3_000,
      data: {
        role: "user",
        content: "Please update the file",
        time: { created: baseTime + 3_000 },
      },
    })
    insertMessage(db, {
      id: "msg-user-2",
      session_id: "ses-contract",
      time_created: baseTime + 8_000,
      data: {
        role: "user",
        content: [{ type: "text", text: "[Request interrupted by user] stop here" }],
        time: { created: baseTime + 8_000 },
      },
    })

    insertPart(db, {
      id: "part-edit",
      session_id: "ses-contract",
      message_id: "msg-assistant-1",
      data: {
        type: "tool",
        tool: "Edit",
        state: {
          input: {
            file_path: "/repo/src/example.ts",
            old_string: "old\nsame",
            new_string: "new\nsame\nextra",
          },
          output: "Applied edit",
        },
      },
    })
    insertPart(db, {
      id: "part-task",
      session_id: "ses-contract",
      message_id: "msg-assistant-1",
      data: {
        type: "tool",
        tool: "Task",
        state: { input: {}, output: "ok" },
      },
    })

    db.close()

    const [session] = await collectSessions({ dbPath, project: "project-a" })

    expect(session.id).toBe("ses-contract")
    expect(session.total_messages).toBe(3)
    expect(session.user_message_count).toBe(2)
    expect(session.duration_ms).toBe(20_000)
    expect(session.tool_counts).toEqual({ Edit: 1, Task: 1 })
    expect(session.languages).toEqual({ TypeScript: 1 })
    expect(session.input_tokens).toBe(10)
    expect(session.output_tokens).toBe(5)
    expect(session.user_interruptions).toBe(1)
    expect(session.user_response_times).toEqual([3, 8])
    expect(session.message_hours).toEqual([
      new Date(baseTime + 3_000).getHours(),
      new Date(baseTime + 8_000).getHours(),
    ])
    expect(session.lines_added).toBe(2)
    expect(session.lines_removed).toBe(1)
    expect(session.files_modified).toBe(1)
    expect(session.uses_task_agent).toBe(true)
    expect(session.uses_mcp).toBe(false)
    expect(session.uses_web_search).toBe(false)
    expect(session.uses_web_fetch).toBe(false)
    expect(session.user_message_timestamps).toEqual([baseTime + 3_000, baseTime + 8_000])
  })

  test("degrades gracefully when part table query is corrupt", async () => {
    const dbPath = createTestDbPath("sessions-corrupt-parts")
    const db = createDatabase(dbPath)
    const baseTime = Date.UTC(2026, 0, 2, 3, 4, 5)

    insertSession(db, {
      id: "ses-corrupt-parts",
      project_id: "project-a",
      slug: "ses-corrupt-parts",
      directory: "/repo/a",
      title: "Corrupt parts session",
      version: "0.7.1",
      time_created: baseTime,
      time_updated: baseTime + 20_000,
    })

    insertMessage(db, {
      id: "msg-assistant-corrupt",
      session_id: "ses-corrupt-parts",
      time_created: baseTime,
      data: {
        role: "assistant",
        tokens: { input: 11, output: 7 },
        time: { created: baseTime, completed: baseTime + 500 },
      },
    })
    insertMessage(db, {
      id: "msg-user-corrupt",
      session_id: "ses-corrupt-parts",
      time_created: baseTime + 8_000,
      data: {
        role: "user",
        content: "Please keep going",
        time: { created: baseTime + 8_000 },
      },
    })

    db.close()

    Database.prototype.query = function (sql: string) {
      if (sql === "SELECT data, message_id FROM part WHERE session_id = ? ORDER BY id ASC") {
        return {
          all() {
            const error = new Error("database disk image is malformed") as Error & { code?: string }
            error.code = "SQLITE_CORRUPT"
            throw error
          },
        }
      }

      return originalDatabaseQuery.call(this, sql)
    }

    const [session] = await collectSessions({ dbPath, project: "project-a" })

    expect(session.id).toBe("ses-corrupt-parts")
    expect(session.total_messages).toBe(2)
    expect(session.user_message_count).toBe(1)
    expect(session.duration_ms).toBe(20_000)
    expect(session.input_tokens).toBe(11)
    expect(session.output_tokens).toBe(7)
    expect(session.user_response_times).toEqual([8])
    expect(session.message_hours).toEqual([new Date(baseTime + 8_000).getHours()])
    expect(session.user_message_timestamps).toEqual([baseTime + 8_000])

    expect(session.tool_counts).toEqual({})
    expect(session.languages).toEqual({})
    expect(session.git_commits).toBe(0)
    expect(session.git_pushes).toBe(0)
    expect(session.tool_errors).toBe(0)
    expect(session.tool_error_categories).toEqual({})
    expect(session.lines_added).toBe(0)
    expect(session.lines_removed).toBe(0)
    expect(session.files_modified).toBe(0)
    expect(session.uses_task_agent).toBe(false)
    expect(session.uses_mcp).toBe(false)
    expect(session.uses_web_search).toBe(false)
    expect(session.uses_web_fetch).toBe(false)
  })

  test("degrades gracefully when message table query is corrupt", async () => {
    const dbPath = createTestDbPath("sessions-corrupt-messages")
    const db = createDatabase(dbPath)
    const baseTime = Date.UTC(2026, 0, 2, 3, 4, 5)

    insertSession(db, {
      id: "ses-corrupt-messages",
      project_id: "project-a",
      slug: "ses-corrupt-messages",
      directory: "/repo/a",
      title: "Corrupt messages session",
      version: "0.7.1",
      time_created: baseTime,
      time_updated: baseTime + 20_000,
    })

    insertPart(db, {
      id: "part-edit-corrupt-message",
      session_id: "ses-corrupt-messages",
      message_id: null,
      data: {
        type: "tool",
        tool: "Edit",
        state: {
          input: {
            file_path: "/repo/src/example.ts",
            old_string: "old\nsame",
            new_string: "new\nsame\nextra",
          },
          output: "Applied edit",
        },
      },
    })
    insertPart(db, {
      id: "part-task-corrupt-message",
      session_id: "ses-corrupt-messages",
      message_id: null,
      data: {
        type: "tool",
        tool: "Task",
        state: { input: {}, output: "ok" },
      },
    })

    db.close()

    Database.prototype.query = function (sql: string) {
      if (sql === "SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created ASC") {
        return {
          all() {
            const error = new Error("database disk image is malformed") as Error & { code?: string }
            error.code = "SQLITE_CORRUPT"
            throw error
          },
        }
      }

      return originalDatabaseQuery.call(this, sql)
    }

    const [session] = await collectSessions({ dbPath, project: "project-a" })

    expect(session.id).toBe("ses-corrupt-messages")
    expect(session.directory).toBe("/repo/a")
    expect(session.title).toBe("Corrupt messages session")
    expect(session.duration_ms).toBe(20_000)

    expect(session.total_messages).toBe(0)
    expect(session.user_message_count).toBe(0)
    expect(session.input_tokens).toBe(0)
    expect(session.output_tokens).toBe(0)
    expect(session.user_interruptions).toBe(0)
    expect(session.user_response_times).toEqual([])
    expect(session.message_hours).toEqual([])
    expect(session.user_message_timestamps).toEqual([])

    expect(session.tool_counts).toEqual({ Edit: 1, Task: 1 })
    expect(session.languages).toEqual({ TypeScript: 1 })
    expect(session.git_commits).toBe(0)
    expect(session.git_pushes).toBe(0)
    expect(session.tool_errors).toBe(0)
    expect(session.tool_error_categories).toEqual({})
    expect(session.lines_added).toBe(2)
    expect(session.lines_removed).toBe(1)
    expect(session.files_modified).toBe(1)
    expect(session.uses_task_agent).toBe(true)
    expect(session.uses_mcp).toBe(false)
    expect(session.uses_web_search).toBe(false)
    expect(session.uses_web_fetch).toBe(false)
  })

  test("applies project filter and combines it with days using AND semantics", async () => {
    const dbPath = createTestDbPath("sessions-project")
    const db = createDatabase(dbPath)
    const now = Date.now()

    insertSession(db, {
      id: "eligible-1",
      project_id: "project-a",
      slug: "eligible-1",
      directory: "/repo/a",
      title: "Eligible 1",
      version: "0.7.1",
      time_created: now - 6 * 60 * 60 * 1000,
      time_updated: now - 2_000,
    })
    insertSession(db, {
      id: "eligible-2",
      project_id: "project-a",
      slug: "eligible-2",
      directory: "/repo/a",
      title: "Eligible 2",
      version: "0.7.1",
      time_created: now - 7 * 60 * 60 * 1000,
      time_updated: now - 3_000,
    })
    insertSession(db, {
      id: "wrong-project",
      project_id: "project-b",
      slug: "wrong-project",
      directory: "/repo/b",
      title: "Wrong Project",
      version: "0.7.1",
      time_created: now - 5 * 60 * 60 * 1000,
      time_updated: now - 1_000,
    })
    insertSession(db, {
      id: "too-old",
      project_id: "project-a",
      slug: "too-old",
      directory: "/repo/a",
      title: "Too Old",
      version: "0.7.1",
      time_created: now - 4 * 24 * 60 * 60 * 1000,
      time_updated: now - 4_000,
    })

    db.close()

    const sessions = await collectSessions({ dbPath, days: 1, project: "project-a" })

    expect(sessions.map((session) => session.id)).toEqual(["eligible-1", "eligible-2"])
    expect(sessions.every((session) => session.project_id === "project-a")).toBe(true)
  })

  test("resolves project path to project_id before filtering sessions", async () => {
    const dbPath = `file:oc-insights-project-path-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}?mode=memory&cache=shared`
    const db = createDatabase(dbPath)
    const now = Date.now()
    const projectId = "7a3e867d3f4463cfbaa9e0866ee3fd5d279668d0"

    insertProject(db, { id: projectId, worktree: "/some/path" })

    insertSession(db, {
      id: "path-match",
      project_id: projectId,
      slug: "path-match",
      directory: "/repo/a",
      title: "Path Match",
      version: "0.7.1",
      time_created: now - 1_000,
      time_updated: now - 500,
    })
    insertSession(db, {
      id: "path-no-match",
      project_id: "another-project-hash",
      slug: "path-no-match",
      directory: "/repo/b",
      title: "Path No Match",
      version: "0.7.1",
      time_created: now - 2_000,
      time_updated: now - 100,
    })

    const sessions = await collectSessions({ dbPath, project: "/some/path" })

    expect(sessions.map((session) => session.id)).toEqual(["path-match"])
    expect(sessions[0]?.project_id).toBe(projectId)

    db.close()
  })

  test("excludes sub-agent sessions (those with parent_id)", async () => {
    const dbPath = createTestDbPath("sessions-subagent")
    const db = createDatabase(dbPath)
    const now = Date.now()

    // Main session — no parent_id
    insertSession(db, {
      id: "main-session",
      project_id: "project-a",
      slug: "main-session",
      directory: "/repo/a",
      title: "Main Session",
      version: "0.7.1",
      time_created: now - 2 * 60 * 60 * 1000,
      time_updated: now - 1_000,
    })

    // Sub-agent session — has parent_id
    insertSession(db, {
      id: "sub-session",
      project_id: "project-a",
      parent_id: "main-session",
      slug: "sub-session",
      directory: "/repo/a",
      title: "Find auth patterns (@explore subagent)",
      version: "0.7.1",
      time_created: now - 1.5 * 60 * 60 * 1000,
      time_updated: now - 500,
    })

    // Another sub-agent — parent_id set but title doesn't contain 'subagent'
    insertSession(db, {
      id: "sub-session-no-title",
      project_id: "project-a",
      parent_id: "main-session",
      slug: "sub-session-no-title",
      directory: "/repo/a",
      title: "look_at: Describe this file",
      version: "0.7.1",
      time_created: now - 1 * 60 * 60 * 1000,
      time_updated: now - 200,
    })

    db.close()

    const sessions = await collectSessions({ dbPath })

    expect(sessions.map((s) => s.id)).toEqual(["main-session"])
    expect(sessions.every((s) => s.parent_id === undefined)).toBe(true)
  })
})

describe("collectMessages and collectParts", () => {
  test("parses JSON blobs and preserves DB order", async () => {
    const dbPath = createTestDbPath("messages-parts")
    const db = createDatabase(dbPath)

    insertSession(db, {
      id: "ses-order",
      project_id: "project-a",
      slug: "ses-order",
      directory: "/repo/a",
      title: "Order test",
      version: "0.7.1",
      time_created: 1,
      time_updated: 2,
    })
    insertMessage(db, {
      id: "msg-2",
      session_id: "ses-order",
      time_created: 20,
      data: { role: "assistant", tokens: { input: 2, output: 3 } },
    })
    insertMessage(db, {
      id: "msg-1",
      session_id: "ses-order",
      time_created: 10,
      data: { role: "user", content: "first" },
    })
    insertPart(db, {
      id: "02",
      session_id: "ses-order",
      message_id: "msg-2",
      data: { type: "tool", tool: "Write", state: { input: { file_path: "/tmp/b.md" } } },
    })
    insertPart(db, {
      id: "01",
      session_id: "ses-order",
      message_id: "msg-2",
      data: { type: "tool", tool: "Read", state: { input: { file_path: "/tmp/a.ts" } } },
    })

    db.close()

    const messages = await collectMessages(dbPath, "ses-order")
    const parts = await collectParts(dbPath, "ses-order")

    expect(messages.map((message) => message.role)).toEqual(["user", "assistant"])
    expect(messages.map((message) => message._messageId)).toEqual(["msg-1", "msg-2"])
    expect(parts.map((part) => part.tool)).toEqual(["Read", "Write"])
    expect(parts.map((part) => part._messageId)).toEqual(["msg-2", "msg-2"])
  })
})

describe("extractToolStats", () => {
  test("extracts usage, error, token, timing, and file stats from mocked OpenCode data", () => {
    const baseTime = Date.UTC(2026, 0, 2, 3, 4, 5)
    const messages = [
      {
        role: "assistant",
        tokens: { input: 10, output: 5 },
        time: { created: baseTime, completed: baseTime + 500 },
      },
      {
        role: "user",
        content: "quick follow-up",
        time: { created: baseTime + 1_000 },
      },
      {
        role: "assistant",
        tokens: { input: 20, output: 30 },
        time: { created: baseTime + 10_000, completed: baseTime + 12_000 },
      },
      {
        role: "user",
        content: [{ type: "text", text: "[Request interrupted by user] stop here" }],
        time: { created: baseTime + 15_000 },
      },
    ]
    const parts = [
      {
        type: "tool",
        tool: "Edit",
        state: {
          input: {
            file_path: "/repo/src/example.ts",
            old_string: "old\nsame",
            new_string: "new\nsame\nextra",
          },
          output: "Applied edit",
        },
      },
      {
        type: "tool",
        tool: "Write",
        state: {
          input: {
            file_path: "/repo/README.md",
            content: "# Title\nbody",
          },
          output: "Wrote file",
        },
      },
      {
        type: "tool",
        tool: "Bash",
        state: {
          input: {
            command: "git commit -m 'test' && git push",
          },
          output: "exit code 1",
          error: true,
        },
      },
      {
        type: "tool",
        tool: "Edit",
        state: {
          input: {
            file_path: "/repo/missing.py",
            old_string: "",
            new_string: "",
          },
          output: "File not found",
        },
      },
      {
        type: "tool",
        tool: "Task",
        state: { input: {}, output: "ok" },
      },
      {
        type: "tool",
        tool: "mcp__github__issue_read",
        state: { input: {}, output: "ok" },
      },
      {
        type: "tool",
        tool: "WebSearch",
        state: { input: {}, output: "ok" },
      },
      {
        type: "tool",
        tool: "WebFetch",
        state: { input: {}, output: "ok" },
      },
    ]

    const stats = extractToolStats(messages, parts)

    expect(stats.toolCounts).toEqual({
      Edit: 2,
      Write: 1,
      Bash: 1,
      Task: 1,
      mcp__github__issue_read: 1,
      WebSearch: 1,
      WebFetch: 1,
    })
    expect(stats.languages).toEqual({ TypeScript: 1, Markdown: 1, Python: 1 })
    expect(stats.gitCommits).toBe(1)
    expect(stats.gitPushes).toBe(1)
    expect(stats.inputTokens).toBe(30)
    expect(stats.outputTokens).toBe(35)
    expect(stats.userInterruptions).toBe(1)
    expect(stats.userResponseTimes).toEqual([5])
    expect(stats.messageHours).toEqual([
      new Date(baseTime + 1_000).getHours(),
      new Date(baseTime + 15_000).getHours(),
    ])
    expect(stats.toolErrors).toBe(2)
    expect(stats.toolErrorCategories).toEqual({
      "Command Failed": 1,
      "File Not Found": 1,
    })
    expect(stats.linesAdded).toBe(4)
    expect(stats.linesRemoved).toBe(1)
    expect(Array.from(stats.filesModified).sort()).toEqual([
      "/repo/README.md",
      "/repo/missing.py",
      "/repo/src/example.ts",
    ])
    expect(stats.usesTaskAgent).toBe(true)
    expect(stats.usesMcp).toBe(true)
    expect(stats.usesWebSearch).toBe(true)
    expect(stats.usesWebFetch).toBe(true)
    expect(stats.userMessageTimestamps).toEqual([
      baseTime + 1_000,
      baseTime + 15_000,
    ])
  })
})
