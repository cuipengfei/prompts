import { tool, type Plugin } from "@opencode-ai/plugin"

import { generateUsageReport } from "../insights/handler"
import { getFacetsDir, getReportPath } from "../insights/cache"
import { buildPromptForCommand } from "../insights/export"

export const insightsPlugin: Plugin = async ({ client }) => {
  return {
    tool: {
      insights_generate: tool({
        description:
          "Generate an LLM-driven usage insights report analyzing your OpenCode sessions",
        args: {
          days: tool.schema.number().optional(),
          project: tool.schema.string().optional(),
        },
        execute: async ({ days, project }, ctx) => {
          ctx.metadata({
            title: "Generating OpenCode insights",
            metadata: { stage: "pipeline:start" },
          })

          const result = await generateUsageReport(client, {
            days,
            project,
            onProgress: (metadata) => {
              ctx.metadata({
                title: "Generating OpenCode insights",
                metadata,
              })
            },
          })

          return buildPromptForCommand(
            result.insights,
            result.htmlPath ?? getReportPath(),
            result.data,
            getFacetsDir(),
          )
        },
      }),
    },
  }
}
