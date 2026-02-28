import type { Plugin } from "@opencode-ai/plugin";

import { loadOcTweaksConfig, safeHook } from "../utils";

function buildCompactionPrompt(language?: string, style?: string): string {
  const lang = language || "the language the user used most in this session";
  const lines: string[] = [
    "## MANDATORY: Language & Writing Style",
    "",
    `**Language**: Write the ENTIRE compaction summary in ${lang}. Keep technical terms (filenames, commands, code) in their original form.`,
  ];

  if (style) {
    lines.push(
      "",
      `**Writing Style**: ${style}`,
      "",
      "This is a NON-NEGOTIABLE requirement. Every section, every bullet point, every description in the summary MUST be written in this style. The structural format (numbered sections, bullet points) should be preserved, but the TONE, VOICE, and WORD CHOICE must unmistakably reflect the specified writing style throughout the entire output. Do NOT fall back to a neutral or generic tone.",
    );
  } else {
    lines.push("", "**Writing Style**: concise and well-organized");
  }

  return lines.join("\n");
}

export const compactionPlugin: Plugin = async () => {
  return {
    "experimental.session.compacting": safeHook(
      "compaction",
      async (
        _input: { sessionID: string },
        output: { context: string[]; prompt?: string },
      ) => {
        const config = await loadOcTweaksConfig();
        if (!config || config.compaction?.enabled !== true) return;
        output.context.push(buildCompactionPrompt(config.compaction?.language, config.compaction?.style));
      },
    ),
  };
};
