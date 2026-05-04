## Context

The current `oc-tweaks` insights implementation reads transcript text from `message.content` and only uses `part` rows for tool summaries. Investigation on the current machine established three important facts:

1. The current OpenCode runtime code path still builds transcript text from `message.content`.
2. The current recovered OpenCode SQLite database stores real session text in `part.data` (`type = text` / `reasoning` / `tool`) and does not expose non-empty `message.content` in sampled recent sessions.
3. Upstream OpenCode introduced the v2 message format in `PR #743` (merged 2025-07-07), and the message/part schema is formalized in later migrations and `PartID` work.

This means transcript extraction must support both shapes without assuming that one source always exists.

## Goals / Non-Goals

- Goals:
  - Accurately reconstruct transcript content from the real storage location used by the current OpenCode schema
  - Preserve compatibility with legacy session data that still stores transcript text in `message.content`
  - Avoid duplicate transcript lines if both representations appear in the same session
- Non-Goals:
  - Redesign the full insights prompt pipeline
  - Change report section semantics unrelated to transcript extraction
  - Introduce database migrations or mutate the user's OpenCode database

## Decisions

- Decision: Use `part` as the primary transcript source when part-based textual content exists for a session.
  - Why: The current machine's recovered DB stores real text and reasoning in `part.data`, while `message.data` mostly holds metadata.
- Decision: Use `message.content` only as a fallback path.
  - Why: Upstream history indicates the newer message format centers on parts, but some older exported or migrated sessions may still rely on `message.content`.
- Decision: Do not blindly concatenate `message.content` and `part.data.text`.
  - Why: Mixed sessions could otherwise duplicate transcript text and distort facets.
- Decision: Add real-schema regression tests rather than relying only on synthetic counters or HTML output.
  - Why: The failure mode is not always a hard error; reports can still render while losing substantive transcript content.

## Risks / Trade-offs

- Risk: Some old sessions may not have complete `part` linkage data.
  - Mitigation: Keep `message.content` fallback and test both paths explicitly.
- Risk: Some mixed sessions may contain overlapping text in both representations.
  - Mitigation: Prefer part-based transcript when meaningful part text exists, and avoid concatenating fallback content into the same logical transcript path.
- Risk: Prompt size may still cause downstream instability for very large sessions.
  - Mitigation: Keep this change tightly scoped to transcript source compatibility; prompt-size reductions can be handled separately.

## Migration Plan

1. Extend collector output so transcript assembly can see `message.id` and `part.message_id` when available.
2. Update transcript construction to synthesize ordered user/assistant/tool text from part rows.
3. Fall back to existing `message.content` extraction only if part-derived transcript text is absent.
4. Validate with both targeted tests and a real OpenCode DB.

## Open Questions

- Whether the current repository also needs a separate proposal to reduce downstream prompt size once transcript compatibility is fixed.
