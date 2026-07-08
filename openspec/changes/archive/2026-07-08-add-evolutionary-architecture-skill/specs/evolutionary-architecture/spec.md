## ADDED Requirements

### Requirement: Evolutionary Architecture Knowledge Base
The system SHALL provide a skill plugin that encapsulates the core frameworks, mental models, and decision guides from "Building Evolutionary Architectures" by Neal Ford, Rebecca Parsons, and Patrick Kua.

#### Scenario: User queries evolutionary architecture concepts
- **WHEN** a user asks about fitness functions, architectural quanta, incremental change, or related concepts
- **THEN** the skill provides structured knowledge from the book's 8 chapters, glossary, patterns, and cheatsheet

#### Scenario: User navigates by chapter
- **WHEN** a user references a specific chapter (e.g., "ch02")
- **THEN** the skill loads the corresponding chapter summary file with frameworks, worked examples, and key takeaways

#### Scenario: Marketplace registration
- **WHEN** the marketplace.json is updated
- **THEN** the evolutionary-architecture plugin appears with its source path and description
