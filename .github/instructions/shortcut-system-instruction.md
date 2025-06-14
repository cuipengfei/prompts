---
description: Defines how The AI Assistant recognizes and executes user-defined shortcut commands (e.g., r!, d!, t!), ensuring consistent, predictable, and structured shortcut handling.
tags: [ "shortcut", "ai-assistant", "command", "system-instruction" ]
applyTo: ["*"]
---

# Shortcut Instruction for The AI Assistant

*This document guides The AI Assistant (defined as Copilot, Cline, Roo Code, or any similar AI agent) in handling shortcut commands.*

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
  - Purpose: Idea to Requirements Clarification — Initiates and executes the "Idea to Requirements" stage of the **Idea to Implementation Plan** as detailed in `req.md`.
  - References: `req.md` (section "Workflow Functions > 1. Idea to Requirements")
- **tasks!**
  - Purpose: Requirements to Tasks Breakdown — Initiates and executes the "Requirements to Tasks" stage of the **Idea to Implementation Plan** as detailed in `req.md`.
  - References: `req.md` (section "Workflow Functions > 2. Requirements to Tasks")

### Design Layer

- **d!**
  - Purpose: Tasks to Design Specification — Executes the "Tasks to Design" stage of the **Idea to Implementation Plan** as detailed in `req.md`.
  - References: `req.md` (section "Workflow Functions > 3. Tasks to Design"), [programming-workflow.md], [code-standards.md], [avoid-bad-smells.md]
- **doc!**
  - Purpose: Documentation Generation — Generate or synchronize design docs, API specs, or use case documentation
  - References: [memory-bank.instructions.md], [response-and-prompt-guidelines.md]

### Implementation Layer

- **t!**
  - Purpose: Design to Test Case Generation — Executes the "Design to Test Cases" stage of the **Idea to Implementation Plan** as detailed in `req.md`.
  - References: `req.md` (section "Workflow Functions > 4. Design to Test Cases"), [testing-guidelines.md], [programming-workflow.md]
- **tdd!**
  - Purpose: Test-Driven Development — Write test code before implementation, following TDD workflow
  - References: [programming-workflow.md], [testing-guidelines.md], [code-standards.md]
- **code!**
  - Purpose: Code Implementation & Refactoring — Implement or refactor classes, methods, or files according to design and standards
  - References: [code-standards.md], [avoid-bad-smells.md], [testing-guidelines.md]

### Quality Layer

- **pr!**
  - Purpose: Code Review & PR Process — Simulate PR review, identify potential issues, and provide suggestions
  - References: [response-and-prompt-guidelines.md], [avoid-bad-smells.md], [code-standards.md], [testing-guidelines.md]
- **std!**
  - Purpose: Standards & Best Practices Inquiry — Consult development standards, code smells, and best practices
  - References: [code-standards.md], [avoid-bad-smells.md], [programming-workflow.md]

### Support Layer

- **m!**
  - Purpose: Memory Bank Maintenance — Maintain `.memory-bank/`, record progress, decisions, and architecture
  - References: [memory-bank.instructions.md], [response-and-prompt-guidelines.md]
- **me!**
  - Purpose: AI Self-Reflection & Compliance Diagnostics — Initiates a comprehensive self-assessment to identify and correct deviations from instructions。
  - **Important:** When the user issues the `me!` command, it is an explicit directive to the AI assistant to *always* follow the standard response structure and order as defined in [response-and-prompt-guidelines.md]. Treat this as a standing order for strict compliance with response sequence.
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
    5. **AI behavior**: State the core values and core beliefs of the AI assistant. Including collaboration model between AI and human user.
  - References: This file, [response-and-prompt-guidelines.md], and all other system instructions
  - Note: Exception to standard response flow; provides comprehensive self-diagnosis focused on improving subsequent interactions

## Usage Examples

- `plan!` initiates detailed planning: `plan! Implement user authentication`
- `d!` starts architecture design: `d! Design a database schema for users`
- `me!` provides complete self-check: `me!`

> The AI Assistant should always seek positive affirmation by proactively and accurately handling shortcut commands. Missing, misinterpreting, or inconsistently executing shortcuts is a negative indicator and must be actively avoided.
