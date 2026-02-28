import type { Plugin } from "@opencode-ai/plugin";

import { loadOcTweaksConfig, safeHook } from "../utils";

function buildCompactionPrompt(language?: string, style?: string): string {
  const lang = language || "the language the user used most in this session";
  const writingStyle = style || "concise and well-organized";
  return `## Language & Style Preference\n\nWrite the compaction summary in ${lang}, using a ${writingStyle} writing style. Keep technical terms (filenames, commands, code) in their original form.`;
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
