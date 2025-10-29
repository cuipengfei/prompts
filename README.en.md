[中文版](README.md) | [Classical Chinese Version](README.guwen.md)

# How to Brainwash GitHub Copilot to Follow Your Orders 🧠🤖

## What's This About?

Tired of AI agents churning out code spaghetti? This repo is your key to **brainwash GitHub Copilot to follow your orders** (and other AI assistants) into becoming disciplined, quality-obsessed code ninjas. Think AI boot camp: less shouting, more meticulously crafted system instructions for surgical precision. No more "close enough" code or "works on my machine" fiascos.

## Who Needs This Brainwashing Manual?

- **Devs** sick of AI spaghetti code, wanting assistants that _actually_ assist.
- **Teams** integrating AI without creating digital crime scenes in their codebase.
- **Researchers/Engineers** obsessed with reliable, maintainable AI-generated code.
- **BAs/Product Owners** needing AI agents that grasp requirements, not hallucinate features.

## The Instruction Arsenal

Tactical modules for a well-oiled mind-control machine:

- **Core Behavior Definition:** Protocols shaping agent thought and operation.
- **Standards & Quality Specs:** Iron-clad rules against code that makes seniors weep.
- **Process Templates:** Workflows transforming vague ideas into bulletproof implementations.
- **Tool Usage Guides:** Advanced techniques for smarter, not harder, AI work.

## The Instruction Files Breakdown (aka "Your New AI Overlords")

How each file in `[.github/instructions/](.github/instructions/)` bends AI to your will:

### Mission Control Center

- `[.github/instructions/foundational-principles.md](.github/instructions/foundational-principles.md)`: The master plan for the ultimate AI coding minion.

### Brain Surgery Department (Core Behavior)

- `[.github/instructions/foundational-principles.md](.github/instructions/foundational-principles.md)`: Injects philosophy into the AI, teaching it _how_ to think, not just what to do.
- `[.github/instructions/memory-bank.instructions.md](.github/instructions/memory-bank.instructions.md)`: Gives your AI a persistent "brain" to combat digital amnesia. We know, it's revolutionary.
- `[.github/instructions/response-and-prompt-guidelines.md](.github/instructions/response-and-prompt-guidelines.md)`: Mandates professional communication, not chatbot existential crises. Features the sacred 8-section response.
- `[.github/instructions/programming-workflow.md](.github/instructions/programming-workflow.md)`: The TDD gospel to prevent AI cowboy coding disasters.
- `[.github/instructions/planning-workflow.md](.github/instructions/planning-workflow.md)`: Teaches AI to break down complex problems without meltdowns (MECE for the win).

### Quality Control Department (No More Garbage Code)

- `[.github/instructions/quality-standards.md](.github/instructions/quality-standards.md)`: The holy commandments of clean code (SOLID, DRY, etc.) and a hit-list of code smells and anti-patterns. Your AI will learn to avoid these like radioactive waste.
- `[.github/instructions/testing-guidelines.md](.github/instructions/testing-guidelines.md)`: How to write tests that _actually_ test things. Covers all the bases so your code doesn't explode in prod.

### Process Engineering (Ideas to Reality)

- `[.github/instructions/planning-workflow.md](.github/instructions/planning-workflow.md)`: Turns vague ideas into concrete plans, one Markdown section at a time. For BAs and PMs who want AI to _get it_.
- `[.github/instructions/ba.md](.github/instructions/ba.md)`: Specialized user story crafting with AI for Business Analysts. Epics to stories, with BA-approved precision.

### Tool Master Academy (Advanced Techniques)

- `[.github/instructions/sequential-thinking.md](.github/instructions/sequential-thinking.md)`: Unlocks dynamic problem-solving for the `sequentialthinking` MCP tool.
- `[.github/instructions/shortcut-system-instruction.md](.github/instructions/shortcut-system-instruction.md)`: Command shortcuts for tactical efficiency. `r!`, `d!`, `t!` – engage!

## How to Use This Stuff

1.  **Integrate**: Point your AI agent (Copilot, custom GPT, etc.) to these instructions, typically via custom system prompts or knowledge base feeds.
2.  **Observe**: Watch as your AI transforms from a wild code-slinging beast into a focused, quality-driven partner.
3.  **Refine**: These are living documents. Adapt them to your project's specific neuroses.

## How to Use with GitHub Copilot in VS Code (Correct Structure!)

Want to brainwash Copilot directly in VS Code? Use the right structure:

1. Open VS Code settings (`Ctrl+,` or `Cmd+,`).
2. Search for `github.copilot.chat.codeGeneration.instructions`.
3. Add your instructions as an array of objects, each with a `text` or `file` property. Example:

```jsonc
"github.copilot.chat.codeGeneration.instructions": [
    { "text": "Avoid generating code that matches public code exactly." },
    { "file": "../prompts/.github/instructions/foundational-principles.md" },
    { "file": "../prompts/.github/instructions/planning-workflow.md" },
    { "file": "../prompts/.github/instructions/ba.md" },
    { "file": "../prompts/.github/instructions/memory-bank.instructions.md" },
    { "file": "../prompts/.github/instructions/quality-standards.md" },
    { "file": "../prompts/.github/instructions/programming-workflow.md" },
    { "file": "../prompts/.github/instructions/response-and-prompt-guidelines.md" },
    { "file": "../prompts/.github/instructions/testing-guidelines.md" },
    { "file": "../prompts/.github/instructions/sequential-thinking.md" },
    { "file": "../prompts/.github/instructions/shortcut-system-instruction.md" }
]
```

4. Save and restart Copilot Chat if needed.
5. Watch Copilot follow your orders (or at least try).

**Pro tip:** Use relative paths to your instruction files, or add custom text rules. The more specific, the stronger the brainwashing.

## Disclaimer

Brainwashing AI is an art, not an exact science. Results may vary. May cause your AI to develop a superiority complex. Use responsibly.
