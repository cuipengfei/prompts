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
`

const VIOLATION_WARNING = `💡 [Reminder] Consider using background mode for better responsiveness.
You used foreground mode (run_in_background=false). Check the three conditions in the system prompt.
If not all three are met, consider run_in_background=true + background_output() for next time.`

export const backgroundSubagentPlugin: Plugin = async () => {
  const config = await loadOcTweaksConfig()
  if (!config || config.backgroundSubagent?.enabled !== true) return {}

  const foregroundCalls = new Set<string>()

  return {
    "experimental.chat.system.transform": safeHook(
      "background-subagent:system.transform",
      async (_input: unknown, output: { system: string[] }) => {
        output.system.push(SUB_AGENT_DISPATCH_PROMPT)
      },
    ),

    "tool.execute.before": safeHook(
      "background-subagent:tool.execute.before",
      async (
        input: { tool: string; callID: string },
        output: { args?: { run_in_background?: boolean } },
      ) => {
        if (input.tool !== "task") return
        if (!output.args?.run_in_background) {
          foregroundCalls.add(input.callID)
        }
      },
    ),

    "tool.execute.after": safeHook(
      "background-subagent:tool.execute.after",
      async (input: { callID: string }, output: { output: string }) => {
        if (!foregroundCalls.has(input.callID)) return
        foregroundCalls.delete(input.callID)
        output.output += `\n\n${VIOLATION_WARNING}`
      },
    ),
  }
}
