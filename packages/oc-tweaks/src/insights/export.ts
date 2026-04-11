import type {
  AggregatedData,
  InsightResults,
  InsightsExport,
  SessionFacets,
} from "./types"

function getOpenCodeVersion(): string {
  return process.env.OPENCODE_VERSION || "unknown"
}

function buildAtAGlanceSummary(insights: InsightResults): string {
  const atAGlance = insights.at_a_glance

  if (!atAGlance) {
    return "_No insights generated_"
  }

  const sections = [
    atAGlance.whats_working
      ? `**What's working:** ${atAGlance.whats_working} See _Impressive Things You Did_.`
      : "",
    atAGlance.whats_hindering
      ? `**What's hindering you:** ${atAGlance.whats_hindering} See _Where Things Go Wrong_.`
      : "",
    atAGlance.quick_wins
      ? `**Quick wins to try:** ${atAGlance.quick_wins} See _Features to Try_.`
      : "",
    atAGlance.ambitious_workflows
      ? `**Ambitious workflows:** ${atAGlance.ambitious_workflows} See _On the Horizon_.`
      : "",
  ].filter(Boolean)

  return `## At a Glance

${sections.join("\n\n")}`
}

function buildStatsLine(data: AggregatedData): string {
  const sessionLabel =
    data.total_sessions_scanned && data.total_sessions_scanned > data.total_sessions
      ? `${data.total_sessions_scanned.toLocaleString()} sessions total · ${data.total_sessions} analyzed`
      : `${data.total_sessions} sessions`

  return [
    sessionLabel,
    `${data.total_messages.toLocaleString()} messages`,
    `${Math.round(data.total_duration_hours)}h`,
    `${data.git_commits} commits`,
  ].join(" · ")
}

export function buildExportData(
  data: AggregatedData,
  insights: InsightResults,
  facets: Map<string, SessionFacets>,
): InsightsExport {
  const facetsSummary = {
    total: facets.size,
    goal_categories: {} as Record<string, number>,
    outcomes: {} as Record<string, number>,
    satisfaction: {} as Record<string, number>,
    friction: {} as Record<string, number>,
  }

  for (const facet of facets.values()) {
    for (const [category, count] of Object.entries(facet.goal_categories)) {
      if (count > 0) {
        facetsSummary.goal_categories[category] =
          (facetsSummary.goal_categories[category] || 0) + count
      }
    }

    facetsSummary.outcomes[facet.outcome] =
      (facetsSummary.outcomes[facet.outcome] || 0) + 1

    for (const [level, count] of Object.entries(facet.user_satisfaction_counts)) {
      if (count > 0) {
        facetsSummary.satisfaction[level] =
          (facetsSummary.satisfaction[level] || 0) + count
      }
    }

    for (const [type, count] of Object.entries(facet.friction_counts)) {
      if (count > 0) {
        facetsSummary.friction[type] = (facetsSummary.friction[type] || 0) + count
      }
    }
  }

  return {
    metadata: {
      username: process.env.USER || "unknown",
      generated_at: new Date().toISOString(),
      opencode_version: getOpenCodeVersion(),
      date_range: data.date_range,
      session_count: data.total_sessions,
    },
    aggregated_data: data,
    insights,
    facets_summary: facetsSummary,
  }
}

export function buildPromptForCommand(
  insights: InsightResults,
  htmlPath: string,
  data: AggregatedData,
  facetsDir: string,
): string {
  const reportUrl = `file://${htmlPath}`
  const header = `# OpenCode Insights

${buildStatsLine(data)}
${data.date_range.start} to ${data.date_range.end}
`
  const userSummary = `${header}${buildAtAGlanceSummary(insights)}

Your full shareable insights report is ready: ${reportUrl}`

  return `The user just ran /insights to generate a usage report analyzing their OpenCode sessions.

Here is the full insights data:
${JSON.stringify(insights, null, 2)}

Report URL: ${reportUrl}
HTML file: ${htmlPath}
Facets directory: ${facetsDir}

Here is what the user sees:
${userSummary}

Now output the following message exactly:

<message>
Your shareable insights report is ready:
${reportUrl}

Want to dig into any section or try one of the suggestions?
</message>`
}
