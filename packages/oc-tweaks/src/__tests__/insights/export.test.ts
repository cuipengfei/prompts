// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"

import * as exportModule from "../../insights/export"

const originalUser = process.env.USER
const originalOpenCodeVersion = process.env.OPENCODE_VERSION

function createAggregatedData(overrides: Record<string, unknown> = {}) {
  return {
    total_sessions: 2,
    total_sessions_scanned: 2,
    sessions_with_facets: 2,
    date_range: { start: "2026-04-01", end: "2026-04-08" },
    total_messages: 345,
    total_duration_hours: 41.7,
    total_input_tokens: 1000,
    total_output_tokens: 2000,
    tool_counts: { Read: 10 },
    languages: { TypeScript: 3 },
    git_commits: 7,
    git_pushes: 1,
    projects: { prompts: 2 },
    goal_categories: { debugging: 2 },
    outcomes: { fully_achieved: 1, mostly_achieved: 1 },
    satisfaction: { satisfied: 2 },
    helpfulness: { very_helpful: 2 },
    session_types: { single_task: 2 },
    friction: { waiting: 1 },
    success: { good_debugging: 1 },
    session_summaries: [
      {
        id: "ses-1",
        date: "2026-04-01",
        summary: "Fixed the issue quickly",
        goal: "Debug export builder",
      },
    ],
    total_interruptions: 0,
    total_tool_errors: 0,
    tool_error_categories: {},
    user_response_times: [100, 200],
    median_response_time: 150,
    avg_response_time: 150,
    sessions_using_task_agent: 1,
    sessions_using_mcp: 0,
    sessions_using_web_search: 0,
    sessions_using_web_fetch: 0,
    total_lines_added: 120,
    total_lines_removed: 30,
    total_files_modified: 8,
    days_active: 5,
    messages_per_day: 69,
    message_hours: [9, 10],
    multi_clauding: {
      overlap_events: 0,
      sessions_involved: 0,
      user_messages_during: 0,
    },
    ...overrides,
  }
}

function createInsights(overrides: Record<string, unknown> = {}) {
  return {
    at_a_glance: {
      whats_working: "You keep prompts concrete and scoped.",
      whats_hindering: "Long verification loops slow momentum.",
      quick_wins: "Bundle related checks into one tighter workflow.",
      ambitious_workflows: "Use reusable report prompts for recurring audits.",
    },
    ...overrides,
  }
}

function createFacet(overrides: Record<string, unknown> = {}) {
  return {
    session_id: "ses-1",
    underlying_goal: "Ship export builder",
    goal_categories: { debugging: 1, research: 0 },
    outcome: "fully_achieved",
    user_satisfaction_counts: { satisfied: 1, delighted: 0 },
    claude_helpfulness: "very_helpful",
    session_type: "single_task",
    friction_counts: { waiting: 1, confusion: 0 },
    friction_detail: "Waited on manual verification",
    primary_success: "good_debugging",
    brief_summary: "Completed the export path.",
    ...overrides,
  }
}

afterEach(() => {
  if (originalUser === undefined) {
    delete process.env.USER
  } else {
    process.env.USER = originalUser
  }

  if (originalOpenCodeVersion === undefined) {
    delete process.env.OPENCODE_VERSION
  } else {
    process.env.OPENCODE_VERSION = originalOpenCodeVersion
  }
})

describe("buildExportData", () => {
  test("returns the export contract with aggregated facet summaries", () => {
    process.env.USER = "alice"
    process.env.OPENCODE_VERSION = "9.9.9"

    expect(typeof exportModule.buildExportData).toBe("function")

    const data = createAggregatedData()
    const insights = createInsights()
    const facets = new Map([
      [
        "ses-1",
        createFacet(),
      ],
      [
        "ses-2",
        createFacet({
          session_id: "ses-2",
          goal_categories: { debugging: 2, research: 1 },
          outcome: "mostly_achieved",
          user_satisfaction_counts: { satisfied: 1, delighted: 1 },
          friction_counts: { waiting: 0, confusion: 2 },
        }),
      ],
    ])

    const result = exportModule.buildExportData(data, insights, facets)

    expect(result.metadata.username).toBe("alice")
    expect(result.metadata.opencode_version).toBe("9.9.9")
    expect(result.metadata.session_count).toBe(2)
    expect(result.metadata.date_range).toEqual(data.date_range)
    expect(new Date(result.metadata.generated_at).toISOString()).toBe(
      result.metadata.generated_at,
    )
    expect(result.aggregated_data).toEqual(data)
    expect(result.insights).toEqual(insights)
    expect(result.facets_summary).toEqual({
      total: 2,
      goal_categories: {
        debugging: 3,
        research: 1,
      },
      outcomes: {
        fully_achieved: 1,
        mostly_achieved: 1,
      },
      satisfaction: {
        satisfied: 2,
        delighted: 1,
      },
      friction: {
        waiting: 1,
        confusion: 2,
      },
    })
  })
})

describe("buildPromptForCommand", () => {
  test("returns the OpenCode command prompt with summary and reply template", () => {
    expect(typeof exportModule.buildPromptForCommand).toBe("function")

    const data = createAggregatedData({ total_sessions: 12 })
    const insights = createInsights()
    const htmlPath = "/tmp/opencode-insights/report.html"
    const facetsDir = "/tmp/opencode-insights/facets"

    const prompt = exportModule.buildPromptForCommand(
      insights,
      htmlPath,
      data,
      facetsDir,
    )

    expect(prompt).toContain(
      "The user just ran /insights to generate a usage report analyzing their OpenCode sessions.",
    )
    expect(prompt).toContain(JSON.stringify(insights, null, 2))
    expect(prompt).toContain("Report URL: file:///tmp/opencode-insights/report.html")
    expect(prompt).toContain("HTML file: /tmp/opencode-insights/report.html")
    expect(prompt).toContain("Facets directory: /tmp/opencode-insights/facets")
    expect(prompt).toContain("# OpenCode Insights")
    expect(prompt).toContain("12 sessions · 345 messages · 42h · 7 commits")
    expect(prompt).toContain("2026-04-01 to 2026-04-08")
    expect(prompt).toContain("## At a Glance")
    expect(prompt).toContain("**What's working:** You keep prompts concrete and scoped.")
    expect(prompt).toContain("**What's hindering you:** Long verification loops slow momentum.")
    expect(prompt).toContain(
      "**Quick wins to try:** Bundle related checks into one tighter workflow.",
    )
    expect(prompt).toContain(
      "**Ambitious workflows:** Use reusable report prompts for recurring audits.",
    )
    expect(prompt).toContain("Your shareable insights report is ready:")
    expect(prompt).toContain("Want to dig into any section or try one of the suggestions?")
    expect(prompt).toContain("<message>")
    expect(prompt).toContain("file:///tmp/opencode-insights/report.html")
  })
})
