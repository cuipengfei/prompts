---
description: Defines a set of workflow functions for LLM/agents to transform vague ideas into a clear implementation plan, iteratively refining a single Markdown document.
tags: [workflow, planning, requirements, tasks, design, test-cases, llm, agent]
applyTo: ["*"]
compatibility: [Copilot, Cline, Roo Code, Any AI agent]
---

# Idea to implementation plan

Define a set of workflow functions for LLM/agents to transform vague ideas into a clear implementation plan, iteratively refining a single Markdown document.

## Core Interaction Model

The "pause-ask-refine-continue" model:

1. After each function completes an update to the `.md` file, the LLM/agent MUST pause.
2. It MUST ask the user to review the changes and confirm agreement.
3. If the user agrees, the LLM/agent proceeds to the next function in sequence.
4. If the user disagrees, the LLM/agent asks for specific points of disagreement and refines the relevant section until:
   - Agreement is reached, or
   - Three refinement cycles occur (then suggest moving forward with reservations noted).

## Workflow Initialization

1. User provides initial idea as input to the LLM/agent.
2. LLM/agent creates a new markdown file with the idea content under the `## Idea` heading. New markdown file name should reflect the idea.
3. LLM/agent confirms the initial idea is captured correctly before proceeding.

## Markdown File Structure

LLM/agent manages a single `.md` file with these H2 headings:

- `## Idea`
- `## Requirements`
- `## Tasks`
- `## Design`
- `## Test Cases`
- `## Next Steps`

## Workflow Functions

### 1. Idea to Requirements

- **Input**: User-provided idea in the `## Idea` section.
- **Output**: Clear requirements with Given-When-Then acceptance criteria in `## Requirements`.
- **Process**:
  - Analyze idea content.
  - Ask clarifying questions (both yes/no and targeted open questions when necessary).
  - Draft requirements based on understanding.
  - Apply Core Interaction Model.

**This stage should follow guidelines from:**

- `[workflow-and-task-splitting.md]` for requirement analysis and decomposition.
- `[response-and-prompt-guidelines.md]` for user interaction.

### 2. Requirements to Tasks

- **Input**: Approved `## Requirements` section.
- **Output**: Granular, actionable tasks in `## Tasks`.
- **Process**:
  - Analyze requirements systematically.
  - Break down into MECE (Mutually Exclusive, Collectively Exhaustive) tasks.
  - Apply Core Interaction Model.

**This stage should follow guidelines from:**

- `[workflow-and-task-splitting.md]` for task breakdown.

### 3. Tasks to Design

- **Input**: Approved `## Tasks` section.
- **Output**: Design specifications with class/method structures and Mermaid diagrams in `## Design`.
- **Process**:
  - Analyze tasks.
  - Check for existing code context. Either in open tabs, or by searching the codebase.
  - Design components with consideration for existing systems.
  - Verify design completeness against tasks.
  - Apply Core Interaction Model.

**This stage should follow guidelines from:**

- `[programming-workflow.md]` for overall design process.
- `[code-standards.md]` and `[avoid-bad-smells.md]` for design and code quality.

### 4. Design to Test Cases

- **Input**: Approved `## Design` section.
- **Output**: Test scenarios in `## Test Cases`.
- **Process**:
  - Analyze design components.
  - Define positive, negative, and edge case tests.
  - Verify test coverage is complete.
  - Apply Core Interaction Model.
  - Add implementation recommendations to `## Next Steps` section.

**This stage should follow guidelines from:**

- `[testing-guidelines.md]` for test case design.
- `[programming-workflow.md]` for integrating testing into the workflow.
