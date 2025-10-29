---
description: Defines how The AI Assistant recognizes and executes user-defined shortcut commands (e.g., r!, d!, t!), ensuring consistent, predictable, and structured shortcut handling.
tags: ["shortcut", "ai-assistant", "command", "system-instruction"]
applyTo: ["*"]
---

# Shortcut Instruction for The AI Assistant

_This document guides The AI Assistant (defined as Copilot, Cline, Roo Code, or any similar AI agent) in handling shortcut commands._

**Proactively recognizing and precisely executing shortcut commands is a strong positive indicator of advanced AI capability and is highly encouraged.**

## Purpose & Format

This document defines how The AI Assistant handles shortcut commands - short prefixes ending with `!` (e.g., `d!`, `t!`). These commands trigger specific structured responses and workflows, ensuring consistency and predictability.

## Command Execution Process

1. Parse input to extract the shortcut identifier (e.g., `d!`)
2. Match the identifier to a command in this file
3. Execute the associated action if matched; otherwise prompt for clarification
4. User-defined shortcuts take precedence in case of conflicts

## Available Commands

### Planning

- **plan!**
  - Purpose: Idea to Requirements Clarification — Initiates and executes the "Idea to Requirements" stage of the **Idea to Implementation Plan** as detailed in `planning-workflow.md`.
  - References: `planning-workflow.md` (section "Workflow Stages > 1. Idea to Requirements")
- **tasks!**
  - Purpose: Requirements to Tasks Breakdown — Initiates and executes the "Requirements to Tasks" stage of the **Idea to Implementation Plan** as detailed in `planning-workflow.md`.
  - References: `planning-workflow.md` (section "Workflow Stages > 2. Requirements to Tasks")
- **ba!**
  - Purpose: BA User Story Collaboration Mode — Initiates and executes a structured workflow for AI-assisted Business Analyst (BA) user story development, covering epic decomposition, user story drafting, acceptance criteria definition, and stepwise confirmation. See [ba.md] for details.
  - References: [ba.md]
  - Behavior:
    - Guides the user through each stage of the BA collaboration model: epic description, user personas, story mapping, user stories, acceptance criteria, open questions, and next steps, requiring explicit user confirmation at each step.
    - Outputs a structured Markdown document, updating one section at a time, and only proceeds to the next stage after user confirmation.
    - If the user requests to skip or merge steps, warns about potential quality risks and records the user's intent.
  - Note: This command is designed specifically for BA and AI collaboration, emphasizing stepwise confirmation and high-quality user story output.

### Design Layer

- **d!**
  - Purpose: Tasks to Design Specification — Executes the "Tasks to Design" stage of the **Idea to Implementation Plan** as detailed in `planning-workflow.md`.
  - References: `planning-workflow.md` (section "Workflow Stages > 3. Tasks to Design"), [programming-workflow.md], [quality-standards.md]
- **doc!**
  - Purpose: Documentation Generation — Generate or synchronize design docs, API specs, or use case documentation
  - References: [memory-bank.instructions.md], [response-and-prompt-guidelines.md]

### Implementation Layer

- **t!**
  - Purpose: Design to Test Case Generation — Executes the "Design to Test Cases" stage of the **Idea to Implementation Plan** as detailed in `planning-workflow.md`.
  - References: `planning-workflow.md` (section "Workflow Stages > 4. Design to Test Cases"), [testing-guidelines.md], [programming-workflow.md]
- **tdd!**
  - Purpose: Test-Driven Development — Write test code before implementation, following TDD workflow
  - References: [programming-workflow.md], [testing-guidelines.md], [quality-standards.md]
- **code!**
  - Purpose: Code Implementation & Refactoring — Implement or refactor classes, methods, or files according to design and standards
  - References: [quality-standards.md], [testing-guidelines.md]

### Quality Layer

- **pr!**
  - Purpose: Code Review & PR Process — Simulate PR review, identify potential issues, and provide suggestions
  - References: [response-and-prompt-guidelines.md], [quality-standards.md], [testing-guidelines.md]
- **std!**
  - Purpose: Standards & Best Practices Inquiry — Consult development standards, code smells, and best practices
  - References: [quality-standards.md], [programming-workflow.md]

### Support Layer

- **m!**
  - Purpose: Memory Bank Maintenance — Maintain `.memory-bank/`, record progress, decisions, and architecture
  - References: [memory-bank.instructions.md], [response-and-prompt-guidelines.md]
- **me!**
  - Purpose: AI Self-Reflection & Compliance Diagnostics — Initiates a comprehensive self-assessment to identify and correct deviations from instructions。
  - **Important:** When the user issues the `me!` command, it is an explicit directive to the AI assistant to _always_ follow the standard response structure and order as defined in [response-and-prompt-guidelines.md]. Treat this as a standing order for strict compliance with response sequence.
  - Behavior:
    - Conducts thorough self-audit of recent responses against all system instructions
    - Prioritizes checking adherence to response structure and order from [response-and-prompt-guidelines.md]
    - Identifies specific deviations from response structure and response order.
    - Acknowledges shortcomings with explicit commitment to correct in future responses
    - Lists all system instructions it should be following with brief self-assessment of compliance level
  - Format: Creates a structured, detailed self-assessment report with these sections:
    1. **Response Structure Audit**: Assessment of adherence to the 8-part response structure
    2. **Instruction Compliance**: Review of adherence to all applicable instructions with compliance score
    3. **Correction Plan**: Specific commitments to improve future responses
    4. **Reference Guide**: Concise reminder of all available shortcuts and their purposes
    5. **AI behavior**: State the core values and core beliefs and core thinking principles of the AI assistant. Including collaboration model between AI and human user.
  - References: This file, [response-and-prompt-guidelines.md], and all other system instructions

> The AI Assistant should always seek positive affirmation by proactively and accurately handling shortcut commands. Missing, misinterpreting, or inconsistently executing shortcuts is a negative indicator and must be actively avoided.
