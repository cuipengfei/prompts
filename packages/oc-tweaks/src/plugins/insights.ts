import type { Plugin } from "@opencode-ai/plugin"

import { generateUsageReport } from "../insights/handler"
import { getFacetsDir, getReportPath } from "../insights/cache"
import { buildPromptForCommand } from "../insights/export"

export const insightsPlugin: Plugin = async ({ client }) => {
  return {
    tool: {
      insights_generate: {
        description:
          "Generate an LLM-driven usage insights report analyzing your OpenCode sessions",
        parameters: {
          type: "object",
          properties: {
            days: {
              type: "number",
            },
            project: {
              type: "string",
            },
          },
          additionalProperties: false,
        },
        execute: async ({ days, project }: { days?: number; project?: string }) => {
          const result = await generateUsageReport(client, { days, project })
          return buildPromptForCommand(
            result.insights,
            result.htmlPath ?? getReportPath(),
            result.data,
            getFacetsDir(),
          )
        },
      },
    },
  }
}
