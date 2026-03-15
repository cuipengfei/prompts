import type { Plugin } from "@opencode-ai/plugin"

import { loadOcTweaksConfig, safeHook } from "../utils"

const SUB_AGENT_DISPATCH_PROMPT = `
## Sub-Agent Dispatch Policy

When calling \`task()\` to dispatch sub-agents, you should default to \`run_in_background=true\`.
This keeps the main conversation responsive while sub-agents work in the background.

Only use \`run_in_background=false\` when ALL of these conditions are met:
1. The next step cannot easily proceed without the sub-agent's result
2. There is NO other useful work to do while waiting
3. The user is explicitly waiting for that specific result

When in doubt → background. Use \`background_output()\` to collect results later.

## Description Transparency Rule

Every \`task()\` call MUST include an agent label in the \`description\` field so the user can see which mode you used.

Required formats:
- \`[category:xxx]\` when using \`category\`
- \`[subagent:xxx]\` when using \`subagent_type\`

Examples:
- \`description="[category:quick] Fix typo in config"\`
- \`description="[subagent:explore] Inspect auth flow"\`

Do NOT omit the tag.
`

const VIOLATION_WARNING = `💡 [Reminder] Consider using background mode for better responsiveness.
You used foreground mode (run_in_background=false). Check the three conditions in the system prompt.
If not all three are met, consider run_in_background=true + background_output() for next time.`

function getMissingTransparencyTags(args?: {
  description?: string
  category?: string
  subagent_type?: string
}): string[] {
  const description = args?.description ?? ""
  const missingTags: string[] = []

  if (args?.category) {
    const tag = `[category:${args.category}]`
    if (!description.includes(tag)) missingTags.push(tag)
  }

  if (args?.subagent_type) {
    const tag = `[subagent:${args.subagent_type}]`
    if (!description.includes(tag)) missingTags.push(tag)
  }

  return missingTags
}

function buildTransparencyWarning(missingTags: string[]): string {
  const plural = missingTags.length > 1 ? "s" : ""
  return `⚠️ [Transparency] Your task description is missing the required transparency tag${plural}: ${missingTags.join(", ")}
Add the tag directly to \`description\` so the user can see which agent mode you used.
Required formats:
- \`[category:xxx]\`
- \`[subagent:xxx]\``
}

export const backgroundSubagentPlugin: Plugin = async () => {
  const foregroundCalls = new Set<string>()
  const transparencyViolations = new Map<string, string[]>()

  return {
    "experimental.chat.system.transform": safeHook(
      "background-subagent:system.transform",
      async (_input: unknown, output: { system: string[] }) => {
        const config = await loadOcTweaksConfig()
        if (!config || config.backgroundSubagent?.enabled !== true) return
        output.system.push(SUB_AGENT_DISPATCH_PROMPT)
      },
    ),

    "tool.execute.before": safeHook(
      "background-subagent:tool.execute.before",
      async (
        input: { tool: string; callID: string },
        output: {
          args?: {
            run_in_background?: boolean
            description?: string
            category?: string
            subagent_type?: string
          }
        },
      ) => {
        const config = await loadOcTweaksConfig()
        if (!config || config.backgroundSubagent?.enabled !== true) return
        if (input.tool !== "task") return

        const missingTags = getMissingTransparencyTags(output.args)
        if (missingTags.length > 0) {
          transparencyViolations.set(input.callID, missingTags)
        }

        if (!output.args?.run_in_background) {
          foregroundCalls.add(input.callID)
        }
      },
    ),

    "tool.execute.after": safeHook(
      "background-subagent:tool.execute.after",
      async (input: { callID: string }, output: { output: string }) => {
        const warnings: string[] = []

        if (foregroundCalls.has(input.callID)) {
          foregroundCalls.delete(input.callID)
          warnings.push(VIOLATION_WARNING)
        }

        const missingTags = transparencyViolations.get(input.callID)
        if (missingTags) {
          transparencyViolations.delete(input.callID)
          warnings.push(buildTransparencyWarning(missingTags))
        }

        if (warnings.length === 0) return
        output.output += `\n\n${warnings.join("\n\n")}`
      },
    ),
  }
}
