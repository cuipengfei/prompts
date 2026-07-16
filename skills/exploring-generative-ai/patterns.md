# Patterns

## Bounded Agent Loop
**When to use**: A task can be checked with concrete evidence.
**How**: Define scope, give tools and current context, run checks, review the full diff, then stop or iterate.
**Trade-offs**: More setup; less uncontrolled autonomy.

## Reliability Timebox
**When to use**: The assistant revises repeatedly, feedback is weak, or interaction cost is growing.
**How**: Define a short convergence window and the evidence that ends it. If the evidence does not appear, stop and return to deterministic investigation or a smaller task.
**Trade-offs**: May abandon a promising exploration; prevents open-ended time loss.

## Risk-Calibrated Oversight
**When to use**: Deciding whether an agent may act, what it may change, or how deeply to review.
**How**: Assess probability of error, impact of failure, and detectability. Use outside-the-loop only when work is bounded, reversible, and strongly checked; otherwise use in-the-loop or on-the-loop control.
**Trade-offs**: Higher scrutiny slows low-risk work; it protects consequential, hard-to-detect failures.

## Reference Anchoring
**When to use**: Conventions matter and a current example exists.
**How**: Provide the smallest relevant reference application or pattern; refresh it when conventions change and remove stale examples.
**Trade-offs**: Stale references mislead; current references reduce ambiguity.

## Context Refresh
**When to use**: The agent guesses, uses superseded conventions, or lacks a reliable route to needed evidence.
**How**: Name the current task boundary, replace stale references, expose search/read interfaces, pre-load indispensable constraints, and remove unrelated context.
**Trade-offs**: Curation costs time; broad uncurated context costs reliability. Context curation improves probability; it does not guarantee agent behavior.

## Local-Model Viability Funnel
**When to use**: Evaluating a local model for an actual coding harness.
**How**: Test memory fit, speed, tool calling, functional correctness, sustained context, task size, then review burden in that order.
**Trade-offs**: A strict funnel can reject a model useful for simpler work; it prevents extrapolating chat success to agentic coding.

## Prototype Then Harden
**When to use**: Exploration is useful but production risk is higher.
**How**: Explore quickly, then separately validate design, security, tests, maintainability, and ownership before production adoption.
**Trade-offs**: Avoids treating exploratory output as production-ready.
