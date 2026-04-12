## ADDED Requirements

### Requirement: Transcript Source Compatibility

The `oc-tweaks` insights system SHALL reconstruct transcript content from the OpenCode storage shape that actually contains the session's substantive text.

#### Scenario: Part-based session content is present
- **WHEN** a session stores user text, assistant text, reasoning, or tool traces in `part` rows linked by `message_id`
- **THEN** insights SHALL build transcript content from those `part` rows
- **AND** insights SHALL NOT require non-empty `message.content` for transcript extraction

#### Scenario: Legacy message-content session is present
- **WHEN** a session lacks usable part-based transcript content but includes legacy `message.content`
- **THEN** insights SHALL fall back to `message.content` for transcript extraction

### Requirement: No Duplicate Transcript Content

The `oc-tweaks` insights system SHALL avoid duplicating transcript text when multiple storage representations are available for the same session.

#### Scenario: Both sources are present for one session
- **WHEN** a session contains both part-based content and legacy message-content fields
- **THEN** insights SHALL apply a deterministic precedence rule
- **AND** insights SHALL NOT concatenate both sources in a way that duplicates the same logical transcript text

### Requirement: Schema-Backed Regression Coverage

The `oc-tweaks` insights system SHALL maintain regression coverage for both legacy and current OpenCode transcript storage shapes.

#### Scenario: Legacy schema regression test
- **WHEN** tests exercise a session fixture whose meaningful content is stored in `message.content`
- **THEN** transcript extraction SHALL preserve that content

#### Scenario: Current schema regression test
- **WHEN** tests exercise a session fixture whose meaningful content is stored in `part.data`
- **THEN** transcript extraction SHALL preserve that content even when `message.content` is empty

#### Scenario: Real database verification
- **WHEN** insights is run against a real OpenCode SQLite database using the current part-based schema
- **THEN** the resulting report generation SHALL continue to succeed
- **AND** transcript-dependent analysis SHALL not rely solely on metadata-only `message` rows
