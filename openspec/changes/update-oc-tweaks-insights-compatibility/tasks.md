## 1. Investigation Baseline

- [x] 1.1 Capture representative SQLite session samples for both transcript storage shapes when available, including `message`, `part`, and `message_id` relationships
- [x] 1.2 Record the compatibility assumptions in code comments or tests so future changes do not regress to message-only transcript extraction

## 2. Implementation

- [x] 2.1 Update insights collection types and queries to expose the fields required for part-linked transcript reconstruction
- [x] 2.2 Implement transcript assembly with `part`-first extraction for `text`, `reasoning`, and `tool` parts
- [x] 2.3 Add fallback behavior to legacy `message.content` when no usable part-based transcript content exists
- [x] 2.4 Prevent duplicate transcript lines when both schemas are present for the same session

## 3. Validation

- [x] 3.1 Add regression tests for a legacy message-content session
- [x] 3.2 Add regression tests for a part-based session where `message.content` is empty
- [x] 3.3 Add regression tests for mixed-source sessions to prove no blind concatenation or duplicate transcript lines
- [x] 3.4 Run targeted insights tests and `bun run build`

## 4. Runtime Verification

- [x] 4.1 Verify insights generation against a real OpenCode SQLite database where transcript text lives in `part.data`
- [x] 4.2 Confirm that report generation still succeeds and that transcript-dependent facets no longer rely on metadata-only messages
