# Change: update oc-tweaks insights compatibility

## Why

`oc-tweaks` insights currently builds transcript text primarily from `message.content`, but the current OpenCode session schema stores real user/assistant text, reasoning, and tool traces in the `part` table linked by `message_id`. On the current machine's recovered OpenCode DB, recent sessions contain substantive `part.data` content and no non-empty `message.content`, which means insights can still generate partial reports while silently losing important transcript context.

## What Changes

- Add transcript extraction compatibility for both OpenCode storage shapes:
  - prefer `part`-based text/reasoning/tool content when available
  - fallback to legacy `message.content` only when part-based content is unavailable
- Define deterministic transcript assembly rules so the same session is not double-counted or duplicated when both sources exist
- Require validation against real SQLite session samples and targeted regression tests for both schema shapes
- Keep existing report generation behavior, but ensure transcript-dependent facets analyze the real stored content instead of metadata-only messages

## Impact

- Affected specs: `oc-tweaks-insights`
- Affected code: `packages/oc-tweaks/src/insights/collector.ts`, `packages/oc-tweaks/src/insights/facets.ts`, related tests under `packages/oc-tweaks/src/__tests__/insights/`
