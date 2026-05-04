## ADDED Requirements

### Requirement: Help Me Read Remains Single-Purpose
The system SHALL keep the `help-me-read` plugin focused on a single reading-assistance skill.

#### Scenario: Plugin directory structure for help-me-read
- **WHEN** the `help-me-read` plugin is inspected
- **THEN** it MUST contain a single `skills/help-me-read/` directory as its functional component
- **AND** it MUST NOT bundle unrelated commands, hooks, or output styles
