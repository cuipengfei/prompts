// @ts-nocheck

import { describe, expect, test } from "bun:test"

import { aggregateData, detectMultiClauding } from "../../insights/aggregator"

function createSession(overrides = {}) {
  return {
    id: "session-default",
    project_id: "project-default",
    slug: "session-default",
    directory: "/repo/default",
    title: "Default session",
    version: "0.7.1",
    summary_additions: 0,
    summary_deletions: 0,
    summary_files: 0,
    time_created: Date.UTC(2026, 0, 1, 9, 0, 0),
    time_updated: Date.UTC(2026, 0, 1, 9, 30, 0),
    user_message_count: 2,
    total_messages: 4,
    duration_ms: 30 * 60 * 1000,
    tool_counts: {},
    languages: {},
    git_commits: 0,
    git_pushes: 0,
    input_tokens: 0,
    output_tokens: 0,
    user_interruptions: 0,
    tool_errors: 0,
    tool_error_categories: {},
    user_response_times: [],
    message_hours: [],
    lines_added: 0,
    lines_removed: 0,
    files_modified: 0,
    uses_task_agent: false,
    uses_mcp: false,
    uses_web_search: false,
    uses_web_fetch: false,
    user_message_timestamps: [],
    ...overrides,
  }
}

describe("detectMultiClauding", () => {
  test("detects overlapping sessions inside a 30 minute window", () => {
    const start = Date.UTC(2026, 0, 3, 10, 0, 0)

    const result = detectMultiClauding([
      {
        id: "session-a",
        user_message_timestamps: [start, start + 20 * 60 * 1000],
      },
      {
        id: "session-b",
        user_message_timestamps: [start + 10 * 60 * 1000],
      },
      {
        id: "session-c",
        user_message_timestamps: [start + 50 * 60 * 1000],
      },
    ])

    expect(result).toEqual({
      overlap_events: 1,
      sessions_involved: 2,
      user_messages_during: 3,
    })
  })
})

describe("aggregateData", () => {
  test("produces complete aggregated data from sessions and facets", () => {
    const sessions = [
      createSession({
        id: "session-a",
        project_id: "project-a",
        time_created: Date.UTC(2026, 0, 1, 9, 0, 0),
        time_updated: Date.UTC(2026, 0, 1, 10, 0, 0),
        total_messages: 10,
        duration_ms: 60 * 60 * 1000,
        tool_counts: { Read: 2, Edit: 1 },
        languages: { TypeScript: 2, JavaScript: 1 },
        git_commits: 1,
        input_tokens: 100,
        output_tokens: 50,
        user_interruptions: 1,
        tool_errors: 2,
        tool_error_categories: { Other: 1, "File Not Found": 1 },
        user_response_times: [4, 10],
        message_hours: [9, 9],
        lines_added: 20,
        lines_removed: 5,
        files_modified: 3,
        uses_task_agent: true,
        user_message_timestamps: [
          Date.UTC(2026, 0, 1, 9, 5, 0),
          Date.UTC(2026, 0, 1, 9, 10, 0),
        ],
      }),
      createSession({
        id: "session-b",
        project_id: "project-b",
        time_created: Date.UTC(2026, 0, 2, 12, 0, 0),
        time_updated: Date.UTC(2026, 0, 2, 13, 30, 0),
        total_messages: 6,
        duration_ms: 90 * 60 * 1000,
        tool_counts: { Read: 1, Bash: 2 },
        languages: { TypeScript: 1, Markdown: 2 },
        git_pushes: 1,
        input_tokens: 70,
        output_tokens: 30,
        user_interruptions: 2,
        tool_errors: 1,
        tool_error_categories: { Other: 1 },
        user_response_times: [6],
        message_hours: [12],
        lines_added: 10,
        lines_removed: 3,
        files_modified: 2,
        uses_mcp: true,
        uses_web_search: true,
        uses_web_fetch: true,
        user_message_timestamps: [Date.UTC(2026, 0, 2, 12, 5, 0)],
      }),
    ]

    const facets = new Map([
      [
        "session-a",
        {
          session_id: "session-a",
          underlying_goal: "Fix flaky aggregator output",
          goal_categories: { fix_bug: 2, write_tests: 1 },
          outcome: "fully_achieved",
          user_satisfaction_counts: { satisfied: 1, happy: 1 },
          claude_helpfulness: "very_helpful",
          session_type: "single_task",
          friction_counts: { slow_or_verbose: 1 },
          friction_detail: "Had to retry a verbose command once.",
          primary_success: "correct_code_edits",
          brief_summary: "Fixed the aggregator bug and added tests.",
        },
      ],
      [
        "session-b",
        {
          session_id: "session-b",
          underlying_goal: "Ship report plumbing",
          goal_categories: { implement_feature: 1 },
          outcome: "mostly_achieved",
          user_satisfaction_counts: { neutral: 1 },
          claude_helpfulness: "moderately_helpful",
          session_type: "iterative_refinement",
          friction_counts: { tool_failed: 2 },
          friction_detail: "One external tool failed twice.",
          primary_success: "multi_file_changes",
          brief_summary: "Built most of the report pipeline.",
        },
      ],
    ])

    const result = aggregateData(sessions, facets)

    expect(result).toEqual({
      total_sessions: 2,
      sessions_with_facets: 2,
      date_range: { start: "2026-01-01", end: "2026-01-02" },
      total_messages: 16,
      total_duration_hours: 2.5,
      total_input_tokens: 170,
      total_output_tokens: 80,
      tool_counts: { Read: 3, Edit: 1, Bash: 2 },
      languages: { TypeScript: 3, JavaScript: 1, Markdown: 2 },
      git_commits: 1,
      git_pushes: 1,
      projects: { "project-a": 1, "project-b": 1 },
      goal_categories: { fix_bug: 2, write_tests: 1, implement_feature: 1 },
      outcomes: { fully_achieved: 1, mostly_achieved: 1 },
      satisfaction: { satisfied: 1, happy: 1, neutral: 1 },
      helpfulness: { very_helpful: 1, moderately_helpful: 1 },
      session_types: { single_task: 1, iterative_refinement: 1 },
      friction: { slow_or_verbose: 1, tool_failed: 2 },
      success: { correct_code_edits: 1, multi_file_changes: 1 },
      session_summaries: [
        {
          id: "session-a",
          date: "2026-01-01",
          summary: "Fixed the aggregator bug and added tests.",
          goal: "Fix flaky aggregator output",
        },
        {
          id: "session-b",
          date: "2026-01-02",
          summary: "Built most of the report pipeline.",
          goal: "Ship report plumbing",
        },
      ],
      total_interruptions: 3,
      total_tool_errors: 3,
      tool_error_categories: { Other: 2, "File Not Found": 1 },
      user_response_times: [4, 10, 6],
      median_response_time: 6,
      avg_response_time: 20 / 3,
      sessions_using_task_agent: 1,
      sessions_using_mcp: 1,
      sessions_using_web_search: 1,
      sessions_using_web_fetch: 1,
      total_lines_added: 30,
      total_lines_removed: 8,
      total_files_modified: 5,
      days_active: 2,
      messages_per_day: 8,
      message_hours: [9, 9, 12],
      multi_clauding: {
        overlap_events: 0,
        sessions_involved: 0,
        user_messages_during: 0,
      },
    })
  })

  test("accumulates facet-derived records and ignores missing or none success values", () => {
    const sessions = [
      createSession({ id: "session-a", time_created: Date.UTC(2026, 0, 4, 8, 0, 0) }),
      createSession({ id: "session-b", time_created: Date.UTC(2026, 0, 4, 9, 0, 0) }),
      createSession({ id: "session-c", time_created: Date.UTC(2026, 0, 4, 10, 0, 0) }),
    ]

    const facets = new Map([
      [
        "session-a",
        {
          session_id: "session-a",
          underlying_goal: "Debug and test",
          goal_categories: { debug_investigate: 1, write_tests: 2, fix_bug: 0 },
          outcome: "partially_achieved",
          user_satisfaction_counts: { dissatisfied: 1, happy: 0 },
          claude_helpfulness: "slightly_helpful",
          session_type: "exploration",
          friction_counts: { wrong_approach: 1, tool_failed: 0 },
          friction_detail: "Needed a new angle.",
          primary_success: "none",
          brief_summary: "Explored the issue.",
        },
      ],
      [
        "session-b",
        {
          session_id: "session-b",
          underlying_goal: "Debug again",
          goal_categories: { debug_investigate: 2, write_tests: 1 },
          outcome: "partially_achieved",
          user_satisfaction_counts: { dissatisfied: 2 },
          claude_helpfulness: "essential",
          session_type: "exploration",
          friction_counts: { wrong_approach: 2 },
          friction_detail: "Finally found the right lead.",
          primary_success: "good_debugging",
          brief_summary: "Found the root cause.",
        },
      ],
    ])

    const result = aggregateData(sessions, facets)

    expect(result.sessions_with_facets).toBe(2)
    expect(result.goal_categories).toEqual({
      debug_investigate: 3,
      write_tests: 3,
    })
    expect(result.outcomes).toEqual({ partially_achieved: 2 })
    expect(result.satisfaction).toEqual({ dissatisfied: 3 })
    expect(result.helpfulness).toEqual({ slightly_helpful: 1, essential: 1 })
    expect(result.session_types).toEqual({ exploration: 2 })
    expect(result.friction).toEqual({ wrong_approach: 3 })
    expect(result.success).toEqual({ good_debugging: 1 })
  })
})
