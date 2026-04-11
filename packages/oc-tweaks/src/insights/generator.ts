import type { Plugin } from "@opencode-ai/plugin"

import { AT_A_GLANCE_PROMPT } from "./prompts/at-a-glance"
import { INSIGHT_SECTIONS } from "./prompts/sections"
import type { AggregatedData, InsightResults, InsightSection, SessionFacets } from "./types"

type InsightsClient = Parameters<Plugin>[0]["client"]
type ProgressMetadata = { stage: string; section?: string; completed?: number; total?: number }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getPromptSessionId(created: unknown): string | null {
  if (isObject(created)) {
    if (isObject(created.data) && typeof created.data.id === "string") return created.data.id
    if (typeof created.id === "string") return created.id
  }

  return null
}

function extractTextFromPromptResponse(response: unknown): string {
  const payload = isObject(response) && "data" in response ? response.data : response
  if (!isObject(payload)) return ""

  const parts = payload.parts
  if (Array.isArray(parts)) {
    const texts = parts
      .filter((part) => isObject(part) && part.type === "text" && typeof part.text === "string")
      .map((part) => String(part.text))
    if (texts.length > 0) return texts.join("\n")
  }

  if (typeof payload.text === "string") return payload.text
  return ""
}

function parseJsonObjectFromText(text: string): Record<string, unknown> | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return isObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

function topCounts(counts: Record<string, number>, limit: number): Array<{ name: string; count: number }> {
  return Object.entries(counts || {})
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

function buildDataContext(data: AggregatedData) {
  return {
    sessions: data.total_sessions_scanned ?? data.total_sessions,
    analyzed: data.total_sessions,
    date_range: data.date_range,
    messages: data.total_messages,
    hours: Number(data.total_duration_hours.toFixed(2)),
    commits: data.git_commits,
    top_tools: topCounts(data.tool_counts, 8),
    top_goals: topCounts(data.goal_categories, 8),
    outcomes: data.outcomes,
    satisfaction: data.satisfaction,
    friction: data.friction,
    success: data.success,
    languages: topCounts(data.languages, 8),
  }
}

function buildFullContext(data: AggregatedData, facets: Map<string, SessionFacets>): string {
  const dataContext = buildDataContext(data)
  const facetItems = Array.from(facets.values())

  const sessionSummaries = facetItems.slice(0, 50).map((facet) => ({
    session_id: facet.session_id,
    brief_summary: facet.brief_summary,
    outcome: facet.outcome,
    claude_helpfulness: facet.claude_helpfulness,
  }))

  const frictionDetails = facetItems
    .map((facet) => ({
      session_id: facet.session_id,
      friction_detail: facet.friction_detail,
    }))
    .filter((item) => item.friction_detail && item.friction_detail.trim().length > 0)
    .slice(0, 20)

  const userInstructions = facetItems
    .flatMap((facet) =>
      (facet.user_instructions_to_claude || []).map((instruction) => ({
        session_id: facet.session_id,
        instruction,
      })),
    )
    .filter((item) => item.instruction && item.instruction.trim().length > 0)
    .slice(0, 15)

  return JSON.stringify(
    {
      data_context: dataContext,
      session_summaries: sessionSummaries,
      friction_details: frictionDetails,
      user_instructions: userInstructions,
    },
    null,
    2,
  )
}

function stringifyForPrompt(value: unknown): string {
  if (value === null || value === undefined) return "No section output available"
  if (typeof value === "string") return value

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function pickSuggestionsField(
  suggestions: unknown,
  key: "features_to_try" | "usage_patterns",
): unknown {
  if (!isObject(suggestions)) return null
  return suggestions[key] ?? null
}

async function promptWithInternalSession(
  client: InsightsClient,
  title: string,
  promptText: string,
): Promise<string> {
  let promptSessionId = `insights-internal-${Date.now()}`

  if (client?.session?.create) {
    const created = await client.session.create({
      body: {
        title,
      },
    })
    promptSessionId = getPromptSessionId(created) ?? promptSessionId
  }

  const response = await client?.session?.prompt({
    path: { id: promptSessionId },
    body: {
      parts: [{ type: "text", text: promptText }],
    },
  })

  return extractTextFromPromptResponse(response)
}

async function generateInsightFromPrompt(
  client: InsightsClient,
  sectionName: InsightSection["name"],
  promptText: string,
): Promise<Record<string, unknown> | null> {
  try {
    const title = `[insights-internal] section ${sectionName}`
    const responseText = await promptWithInternalSession(client, title, promptText)
    return parseJsonObjectFromText(responseText)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`[insights] section ${sectionName} failed: ${reason}`)
    return null
  }
}

export async function generateSectionInsight(
  client: InsightsClient,
  section: InsightSection,
  fullContext: string,
): Promise<Record<string, unknown> | null> {
  const promptText = `${section.prompt}\n\nSESSION DATA (JSON):\n${fullContext}`
  return generateInsightFromPrompt(client, section.name, promptText)
}

export async function generateParallelInsights(
  client: InsightsClient,
  data: AggregatedData,
  facets: Map<string, SessionFacets>,
  onProgress?: (metadata: ProgressMetadata) => void,
): Promise<InsightResults> {
  // 1) dataContext
  const dataContext = buildDataContext(data)

  // 2) fullContext
  const fullContext = buildFullContext(data, facets)

  // 3) 7 regular sections in parallel
  const regularSections = INSIGHT_SECTIONS.filter((section) => section.name !== "at_a_glance")
  onProgress?.({ stage: "sections-start", completed: 0, total: regularSections.length + 1 })
  const sectionResults = await Promise.all(
    regularSections.map(async (section) => ({
      name: section.name,
      insight: await generateSectionInsight(client, section, fullContext),
    })),
  )

  // 4) collect section results
  const insights: InsightResults = {}
  const sectionMap: Record<string, Record<string, unknown> | null> = {}

  let completedSections = 0
  for (const { name, insight } of sectionResults) {
    sectionMap[name] = insight
    ;(insights as Record<string, unknown>)[name] = insight
    completedSections += 1
    onProgress?.({
      stage: "section-complete",
      section: name,
      completed: completedSections,
      total: regularSections.length + 1,
    })
  }

  // 5) serially generate at_a_glance after all sections
  const atAGlancePrompt = AT_A_GLANCE_PROMPT
    .replace("{fullContext}", `${fullContext}\n\nData Context Snapshot:\n${stringifyForPrompt(dataContext)}`)
    .replace("{projectAreasText}", stringifyForPrompt(sectionMap.project_areas))
    .replace("{bigWinsText}", stringifyForPrompt(sectionMap.what_works))
    .replace("{frictionText}", stringifyForPrompt(sectionMap.friction_analysis))
    .replace(
      "{featuresText}",
      stringifyForPrompt(pickSuggestionsField(sectionMap.suggestions, "features_to_try")),
    )
    .replace(
      "{patternsText}",
      stringifyForPrompt(pickSuggestionsField(sectionMap.suggestions, "usage_patterns")),
    )
    .replace("{horizonText}", stringifyForPrompt(sectionMap.on_the_horizon))

  const atAGlance = await generateInsightFromPrompt(client, "at_a_glance", atAGlancePrompt)
  ;(insights as Record<string, unknown>).at_a_glance = atAGlance
  onProgress?.({
    stage: "section-complete",
    section: "at_a_glance",
    completed: regularSections.length + 1,
    total: regularSections.length + 1,
  })

  return insights
}
