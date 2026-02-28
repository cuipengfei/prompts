import type { Plugin } from "@opencode-ai/plugin";

import { loadOcTweaksConfig, safeHook } from "../utils";

function buildLanguagePrompt(language?: string): string {
  const lang = language || "the language the user used most in this session"
  return `## Language Preference\n\nWrite the compaction summary in ${lang}. Keep technical terms (filenames, commands, code) in their original form.`
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
        output.context.push(buildLanguagePrompt(config.compaction?.language));
      },
    ),
  };
};
