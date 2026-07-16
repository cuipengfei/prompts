---
name: exploring-generative-ai
description: Use when evaluating coding assistants, agent autonomy, AI-assisted development workflows, context engineering, local coding-model viability, or software-engineering trade-offs using Martin Fowler's Exploring Generative AI series.
---

# Exploring Generative AI

**Series**: Martin Fowler, *Exploring Generative AI*
**Sources**: 29 official articles, published 2023-07-26 through 2026-07-08

## How to Use

- Start with the **Topic Index** for a decision; then read every named chapter before making an article-specific claim.
- Use `cheatsheet.md` for a fast risk, autonomy, context, or local-model decision; read its cited chapters before acting.
- Use `patterns.md` when designing a workflow or harness; use `glossary.md` when terminology is unclear.
- Treat each chapter's source URL, author, and date as its authoritative metadata. Say a claim is not covered when no chapter supports it.

## Core Decision Rules

| Signal | Default action | Escalate when | Read |
|---|---|---|---|
| Output is plausible but unverified | Add the fastest trustworthy feedback: compiler, test, linter, review, or observable artifact. | Feedback is slow, ambiguous, or unavailable. | [ch06](chapters/6.md), [ch08](chapters/8.md), [ch12](chapters/12.md) |
| Probability of error is high, impact is high, or detectability is low | Do not use unsupervised execution; reduce scope and require human review. | A public API, security boundary, data change, or production behavior is involved. | [ch16](chapters/16.md), [ch19](chapters/19.md), [ch21](chapters/21.md), [ch27](chapters/27.md) |
| Context is stale, broad, or causing guesses | Refresh the smallest relevant reference, specification, and workspace evidence; remove stale noise. | The agent cannot reliably decide what context to load. | [ch09](chapters/9.md), [ch22](chapters/22.md), [ch25](chapters/25.md) |
| Repeated agent misstep has a growing impact radius | Encode the missing judgment or constraint in a reusable skill or harness control. | It reaches team iteration or codebase-lifetime impact. | [ch13](chapters/13.md), [ch24](chapters/24.md), [ch26](chapters/26.md) |
| Considering a local model | Test the actual harness in sequence: memory fit, speed, tool calling, correctness, context, task size, and review burden. | Any earlier stage fails. | [ch28](chapters/28.md), [ch29](chapters/29.md) |

## Chapter Index

| # | Article | Author |
|---|---|---|
| [1](chapters/1.md) | The toolchain | Birgitta Böckeler |
| [2](chapters/2.md) | Median - A tale in three functions | Birgitta Böckeler |
| [3](chapters/3.md) | In-line assistance - when is it more useful? | Birgitta Böckeler |
| [4](chapters/4.md) | In-line assistance - how can it get in the way? | Birgitta Böckeler |
| [5](chapters/5.md) | Coding assistants do not replace pair programming | Birgitta Böckeler |
| [6](chapters/6.md) | TDD with GitHub Copilot | Paul Sobocinski |
| [7](chapters/7.md) | How is GenAI different from other code generators? | Birgitta Böckeler |
| [8](chapters/8.md) | How to tackle unreliability of coding assistants | Birgitta Böckeler |
| [9](chapters/9.md) | Onboarding to a 'legacy' codebase with the help of AI | Birgitta Böckeler |
| [10](chapters/10.md) | Building an AI agent application to migrate a tech stack | Birgitta Böckeler |
| [11](chapters/11.md) | Expanding the solution size with multi-file editing | Birgitta Böckeler |
| [12](chapters/12.md) | What role does LLM reasoning play for software tasks? | Birgitta Böckeler |
| [13](chapters/13.md) | The role of developer skills in agentic coding | Birgitta Böckeler |
| [14](chapters/14.md) | Guiding an LLM for Robust Java ByteBuffer Code | Unmesh Joshi |
| [15](chapters/15.md) | Building TMT Mirror Visualization with LLM: A Step-by-Step Journey | Unmesh Joshi |
| [16](chapters/16.md) | Coding Assistants Threaten the Software Supply Chain | Jim Gumbley、Lilly Ryan |
| [17](chapters/17.md) | Building Custom Tooling with LLMs | Unmesh Joshi |
| [18](chapters/18.md) | Autonomous coding agents: A Codex example | Birgitta Böckeler |
| [19](chapters/19.md) | I still care about the code | Birgitta Böckeler |
| [20](chapters/20.md) | Partner with the AI, throw away the code | Matteo Vaccari |
| [21](chapters/21.md) | To vibe or not to vibe | Birgitta Böckeler |
| [22](chapters/22.md) | Anchoring AI to a reference application | Birgitta Böckeler |
| [23](chapters/23.md) | Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl | Birgitta Böckeler |
| [24](chapters/24.md) | Assessing internal quality while coding with an agent | Erik Doernenburg |
| [25](chapters/25.md) | Context Engineering for Coding Agents | Birgitta Böckeler |
| [26](chapters/26.md) | Harness Engineering - first thoughts | Birgitta Böckeler |
| [27](chapters/27.md) | Humans and Agents in Software Engineering Loops | Kief Morris |
| [28](chapters/28.md) | Viability of local models for coding | Birgitta Böckeler |
| [29](chapters/29.md) | Experiences with local models for coding | Birgitta Böckeler |

## Topic Index

- **AI output may be wrong / unreliable**: [ch04](chapters/4.md), [ch06](chapters/6.md), [ch08](chapters/8.md), [ch12](chapters/12.md)
- **agentic coding / harness engineering**: [ch13](chapters/13.md), [ch18](chapters/18.md), [ch24](chapters/24.md), [ch26](chapters/26.md), [ch27](chapters/27.md)
- **autonomy, oversight, or high-risk execution**: [ch16](chapters/16.md), [ch18](chapters/18.md), [ch19](chapters/19.md), [ch21](chapters/21.md), [ch27](chapters/27.md)
- **code quality and review complacency**: [ch04](chapters/4.md), [ch05](chapters/5.md), [ch19](chapters/19.md), [ch24](chapters/24.md)
- **context drift / reference application / context loading**: [ch09](chapters/9.md), [ch22](chapters/22.md), [ch25](chapters/25.md)
- **local-model viability**: [ch28](chapters/28.md), [ch29](chapters/29.md)
- **prototype versus production**: [ch20](chapters/20.md), [ch21](chapters/21.md), [ch24](chapters/24.md)
- **risk assessment / vibe coding**: [ch19](chapters/19.md), [ch21](chapters/21.md)
- **security and supply chain**: [ch16](chapters/16.md)
- **spec-driven development**: [ch23](chapters/23.md)
- **TDD**: [ch06](chapters/6.md), [ch14](chapters/14.md)

## Supporting Files

- [glossary.md](glossary.md) — precise terms and source chapters.
- [patterns.md](patterns.md) — workflow patterns; read before designing a harness or repeated agent process.
- [cheatsheet.md](cheatsheet.md) — decision tables; read before choosing autonomy, handling context drift, or evaluating a local model.

## Scope and Limits

This skill covers only the 29 official URLs listed in the chapter files. It does not treat the series as a single-author book: chapter attribution remains article-specific. Do not infer claims beyond the cited article.
