import type { Plugin } from "@opencode-ai/plugin";

import { loadOcTweaksConfig, safeHook } from "../utils";

const LANGUAGE_PREFERENCE_PROMPT = `
## Language Preference

Important: Write the compaction summary in the user's preferred language(for example, if user prefers Chinese, then the compaction should be in Chinese as well).
All section titles, descriptions, analysis, and next-step suggestions should use the user's language.
Keep technical terms (filenames, variable names, commands, code snippets) in their original form.
`;

export const compactionPlugin: Plugin = async () => {
  const config = await loadOcTweaksConfig();
  if (!config || config.compaction?.enabled !== true) return {};

  return {
    "experimental.session.compacting": safeHook(
      "compaction",
      async (
        _input: { sessionID: string },
        output: { context: string[]; prompt?: string },
      ) => {
        output.context.push(LANGUAGE_PREFERENCE_PROMPT);
      },
    ),
  };
};
