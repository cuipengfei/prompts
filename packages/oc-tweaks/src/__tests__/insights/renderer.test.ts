// @ts-nocheck

import { describe, expect, test } from "bun:test"
import { generateHtmlReport } from "../../insights/renderer"
import type { AggregatedData, InsightResults } from "../../insights/types"

describe("insights renderer", () => {
  test("generates basic HTML without crashing", () => {
    const dummyData: AggregatedData = {
      total_sessions: 1,
      sessions_with_facets: 1,
      date_range: { start: "2025-01-01", end: "2025-01-02" },
      total_messages: 10,
      total_duration_hours: 1,
      total_input_tokens: 1000,
      total_output_tokens: 1000,
      tool_counts: { read: 5, bash: 2 },
      languages: { TypeScript: 1 },
      git_commits: 0,
      git_pushes: 0,
      projects: {},
      goal_categories: { refactoring: 1 },
      outcomes: { fully_achieved: 1 },
      satisfaction: { happy: 1 },
      helpfulness: { essential: 1 },
      session_types: { single_task: 1 },
      friction: { none: 1 },
      success: { code_edits: 1 },
      session_summaries: [],
      total_interruptions: 0,
      total_tool_errors: 0,
      tool_error_categories: {},
      user_response_times: [5, 10, 15],
      median_response_time: 10,
      avg_response_time: 10,
      sessions_using_task_agent: 0,
      sessions_using_mcp: 0,
      sessions_using_web_search: 0,
      sessions_using_web_fetch: 0,
      total_lines_added: 100,
      total_lines_removed: 50,
      total_files_modified: 2,
      days_active: 1,
      messages_per_day: 10,
      message_hours: [10, 11, 14],
      multi_clauding: { overlap_events: 0, sessions_involved: 0, user_messages_during: 0 }
    }

    const dummyInsights: InsightResults = {
      at_a_glance: {
        whats_working: "Coding",
        quick_wins: "Use tests"
      }
    }

    const html = generateHtmlReport(dummyData, dummyInsights)

    expect(html).toContain("OpenCode Insights")
    expect(html).toContain("What You Wanted") // Bar chart titles
    expect(html).toContain("Top Tools Used")
    expect(html).toContain("Languages")
    expect(html).toContain("Session Types")
    expect(html).toContain("What's working:</strong> Coding")
    expect(html).toContain('id="section-glance"')
    expect(html).toContain('class="theme-toggle"')
  })
})
