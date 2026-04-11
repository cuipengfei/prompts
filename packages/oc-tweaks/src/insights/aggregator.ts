import type { AggregatedData, SessionFacets, SessionMeta } from "./types"

const OVERLAP_WINDOW_MS = 30 * 60 * 1000
const MAX_SESSION_SUMMARIES = 50

function incrementCounter(record: Record<string, number>, key: string, amount = 1) {
  record[key] = (record[key] || 0) + amount
}

function incrementEntries(target: Record<string, number>, source: Record<string, number>) {
  for (const [key, count] of Object.entries(source)) {
    if (count > 0) {
      incrementCounter(target, key, count)
    }
  }
}

function toDateOnly(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ""
  return new Date(timestamp).toISOString().slice(0, 10)
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted[middle] ?? 0
}

function buildSessionSummary(session: SessionMeta, sessionFacets?: SessionFacets) {
  return {
    id: session.id,
    date: toDateOnly(session.time_created),
    summary: sessionFacets?.brief_summary || session.title,
    goal: sessionFacets?.underlying_goal,
  }
}

export function detectMultiClauding(
  sessions: Array<Pick<SessionMeta, "id" | "user_message_timestamps">>,
): AggregatedData["multi_clauding"] {
  const allSessionMessages: Array<{ ts: number; sessionId: string }> = []

  for (const session of sessions) {
    for (const timestamp of session.user_message_timestamps) {
      if (Number.isFinite(timestamp)) {
        allSessionMessages.push({ ts: timestamp, sessionId: session.id })
      }
    }
  }

  allSessionMessages.sort((a, b) => a.ts - b.ts)

  const multiClaudeSessionPairs = new Set<string>()
  const messagesDuringMulticlaude = new Set<string>()
  let windowStart = 0
  const sessionLastIndex = new Map<string, number>()

  for (let i = 0; i < allSessionMessages.length; i += 1) {
    const message = allSessionMessages[i]!

    while (
      windowStart < i &&
      message.ts - allSessionMessages[windowStart]!.ts > OVERLAP_WINDOW_MS
    ) {
      const expiring = allSessionMessages[windowStart]!
      if (sessionLastIndex.get(expiring.sessionId) === windowStart) {
        sessionLastIndex.delete(expiring.sessionId)
      }
      windowStart += 1
    }

    const previousIndex = sessionLastIndex.get(message.sessionId)
    if (previousIndex !== undefined) {
      for (let j = previousIndex + 1; j < i; j += 1) {
        const between = allSessionMessages[j]!
        if (between.sessionId !== message.sessionId) {
          const pair = [message.sessionId, between.sessionId].sort().join(":")
          multiClaudeSessionPairs.add(pair)
          messagesDuringMulticlaude.add(
            `${allSessionMessages[previousIndex]!.ts}:${message.sessionId}`,
          )
          messagesDuringMulticlaude.add(`${between.ts}:${between.sessionId}`)
          messagesDuringMulticlaude.add(`${message.ts}:${message.sessionId}`)
          break
        }
      }
    }

    sessionLastIndex.set(message.sessionId, i)
  }

  const sessionsWithOverlaps = new Set<string>()
  for (const pair of multiClaudeSessionPairs) {
    const [first, second] = pair.split(":")
    if (first) sessionsWithOverlaps.add(first)
    if (second) sessionsWithOverlaps.add(second)
  }

  return {
    overlap_events: multiClaudeSessionPairs.size,
    sessions_involved: sessionsWithOverlaps.size,
    user_messages_during: messagesDuringMulticlaude.size,
  }
}

export function aggregateData(
  sessions: SessionMeta[],
  facets: Map<string, SessionFacets>,
): AggregatedData {
  const result: AggregatedData = {
    total_sessions: sessions.length,
    sessions_with_facets: facets.size,
    date_range: { start: "", end: "" },
    total_messages: 0,
    total_duration_hours: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    tool_counts: {},
    languages: {},
    git_commits: 0,
    git_pushes: 0,
    projects: {},
    goal_categories: {},
    outcomes: {},
    satisfaction: {},
    helpfulness: {},
    session_types: {},
    friction: {},
    success: {},
    session_summaries: [],
    total_interruptions: 0,
    total_tool_errors: 0,
    tool_error_categories: {},
    user_response_times: [],
    median_response_time: 0,
    avg_response_time: 0,
    sessions_using_task_agent: 0,
    sessions_using_mcp: 0,
    sessions_using_web_search: 0,
    sessions_using_web_fetch: 0,
    total_lines_added: 0,
    total_lines_removed: 0,
    total_files_modified: 0,
    days_active: 0,
    messages_per_day: 0,
    message_hours: [],
    multi_clauding: {
      overlap_events: 0,
      sessions_involved: 0,
      user_messages_during: 0,
    },
  }

  const sessionDates: string[] = []
  const allResponseTimes: number[] = []
  const allMessageHours: number[] = []

  for (const session of sessions) {
    const sessionDate = toDateOnly(session.time_created)
    if (sessionDate) {
      sessionDates.push(sessionDate)
    }

    result.total_messages += session.total_messages
    result.total_duration_hours += session.duration_ms / (60 * 60 * 1000)
    result.total_input_tokens += session.input_tokens
    result.total_output_tokens += session.output_tokens
    result.git_commits += session.git_commits
    result.git_pushes += session.git_pushes
    result.total_interruptions += session.user_interruptions
    result.total_tool_errors += session.tool_errors
    result.total_lines_added += session.lines_added
    result.total_lines_removed += session.lines_removed
    result.total_files_modified += session.files_modified

    incrementEntries(result.tool_counts, session.tool_counts)
    incrementEntries(result.languages, session.languages)
    incrementEntries(result.tool_error_categories, session.tool_error_categories)
    incrementCounter(result.projects, session.project_id)

    allResponseTimes.push(...session.user_response_times)
    allMessageHours.push(...session.message_hours)

    if (session.uses_task_agent) result.sessions_using_task_agent += 1
    if (session.uses_mcp) result.sessions_using_mcp += 1
    if (session.uses_web_search) result.sessions_using_web_search += 1
    if (session.uses_web_fetch) result.sessions_using_web_fetch += 1

    const sessionFacets = facets.get(session.id)
    if (sessionFacets) {
      incrementEntries(result.goal_categories, sessionFacets.goal_categories)
      incrementCounter(result.outcomes, sessionFacets.outcome)
      incrementEntries(result.satisfaction, sessionFacets.user_satisfaction_counts)
      incrementCounter(result.helpfulness, sessionFacets.claude_helpfulness)
      incrementCounter(result.session_types, sessionFacets.session_type)
      incrementEntries(result.friction, sessionFacets.friction_counts)

      if (sessionFacets.primary_success !== "none") {
        incrementCounter(result.success, sessionFacets.primary_success)
      }
    }

    if (result.session_summaries.length < MAX_SESSION_SUMMARIES) {
      result.session_summaries.push(buildSessionSummary(session, sessionFacets))
    }
  }

  sessionDates.sort()
  result.date_range = {
    start: sessionDates[0] || "",
    end: sessionDates[sessionDates.length - 1] || "",
  }

  result.user_response_times = allResponseTimes
  result.median_response_time = calculateMedian(allResponseTimes)
  result.avg_response_time =
    allResponseTimes.length > 0
      ? allResponseTimes.reduce((sum, value) => sum + value, 0) / allResponseTimes.length
      : 0

  const uniqueDays = new Set(sessionDates)
  result.days_active = uniqueDays.size
  result.messages_per_day =
    result.days_active > 0 ? result.total_messages / result.days_active : 0
  result.message_hours = allMessageHours
  result.multi_clauding = detectMultiClauding(sessions)

  return result
}
