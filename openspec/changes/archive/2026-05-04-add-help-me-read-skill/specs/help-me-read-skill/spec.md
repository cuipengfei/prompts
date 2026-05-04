## ADDED Requirements

### Requirement: Multi-URL Reading Workflow
The system SHALL provide a `help-me-read` skill that can guide Claude to read one or more URLs as a structured reading aid instead of a summary-only answer.

#### Scenario: User provides one URL
- **WHEN** the user asks Claude to help read a single URL
- **THEN** the skill MUST instruct Claude to fetch the full content before commenting on it
- **AND** the response MUST preserve the source text as paragraph-based reading units

#### Scenario: User provides multiple URLs
- **WHEN** the user asks Claude to help read multiple URLs together
- **THEN** the skill MUST instruct Claude to process each URL separately in a stable order
- **AND** the response MUST keep sections clearly separated by source URL

### Requirement: Paragraph-First Reading Format
The system SHALL present each reading unit in a format optimized for quick human reading, with the original paragraph first, optional translation second, and commentary last.

#### Scenario: Source language matches inferred user preference
- **WHEN** the source paragraph is already in the user's inferred preferred output language
- **THEN** the response MUST show the original paragraph without adding a duplicate translation
- **AND** commentary MUST follow the original paragraph

#### Scenario: Source language differs from inferred user preference
- **WHEN** the source paragraph is not in the user's inferred preferred output language
- **THEN** the response MUST include a faithful paragraph-by-paragraph translation after the original paragraph
- **AND** commentary MUST appear after the translation

### Requirement: Commentary Weight Control
The system SHALL keep commentary useful but lighter than the reading material itself.

#### Scenario: Commentary for a paragraph
- **WHEN** Claude adds commentary for a paragraph
- **THEN** the commentary MUST focus on meaning, context, or reading guidance that helps the user move faster
- **AND** the commentary MUST NOT become longer or denser than the combined original paragraph and translation for that reading unit

### Requirement: Translation Quality Expectation
The system SHALL instruct Claude to translate with emphasis on faithfulness, readability, and style rather than literal word-for-word replacement.

#### Scenario: Translation is required
- **WHEN** the response includes translated paragraphs
- **THEN** the skill MUST instruct Claude to aim for translation quality that is faithful to meaning, understandable to the target reader, and stylistically natural
- **AND** the skill MUST avoid replacing the original paragraph with translation-only output
