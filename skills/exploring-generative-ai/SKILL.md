---
name: exploring-generative-ai
description: "Martin Fowler's 29-part Exploring Generative AI series. Use for evidence-grounded guidance on coding assistants, agentic coding, context engineering, AI-assisted development, local coding models, and software-engineering trade-offs."
---

# Exploring Generative AI

**Series**: Martin Fowler, *Exploring Generative AI*
**Sources**: 29 official articles, published 2023-07-26 through 2026-07-08

## How to Use

- Ask for a topic, article title, author, or chapter number.
- Read the matching chapter before making article-specific claims.
- Treat each chapter's source URL, author, and date as authoritative metadata.
- Say that a claim is not covered when no chapter supports it.

## Core Working Models

- **Toolchain, not one tool**: assess tasks, interaction mode, prompt/context construction, model properties, and hosting together.
- **Feedback over fluency**: generated code needs tests, review, quality signals, and explicit failure handling.
- **Context is engineered**: choose relevant examples, repository conventions, specifications, and current task state; remove stale noise.
- **Autonomy needs a harness**: tools, permissions, structured outputs, stop conditions, and human review determine safe agent behavior.
- **Prototype versus production**: exploratory output may be disposable; production work needs maintainability, security, and ownership.
- **Local-model choice is situational**: compare capability, privacy, hardware, cost, and operational workflow.

## Chapter Index

| # | Article | Author |
|---|---|---|
| 1 | The toolchain | Birgitta Böckeler |
| 2 | Median - A tale in three functions | Birgitta Böckeler |
| 3 | In-line assistance - when is it more useful? | Birgitta Böckeler |
| 4 | In-line assistance - how can it get in the way? | Birgitta Böckeler |
| 5 | Coding assistants do not replace pair programming | Birgitta Böckeler |
| 6 | TDD with GitHub Copilot | Paul Sobocinski |
| 7 | How is GenAI different from other code generators? | Birgitta Böckeler |
| 8 | How to tackle unreliability of coding assistants | Birgitta Böckeler |
| 9 | Onboarding to a legacy codebase with the help of AI | Birgitta Böckeler |
| 10 | Building an AI agent application to migrate a tech stack | Birgitta Böckeler |
| 11-29 | Multi-file editing through local-model experiences | See `chapters/` |

## Topic Index

- **agentic coding**: 13, 18, 25, 26, 27
- **code quality**: 5, 6, 8, 19, 24
- **context engineering**: 1, 9, 22, 25
- **local models**: 28, 29
- **security and supply chain**: 16
- **spec-driven development**: 23
- **TDD**: 6, 14

## Supporting Files

- `glossary.md`
- `patterns.md`
- `cheatsheet.md`
- `chapters/`

## Scope and Limits

This skill covers only the 29 official URLs listed in the chapter files. It does not treat the series as a single-author book: chapter attribution remains article-specific. Do not infer claims beyond the cited article.
