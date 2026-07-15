# Patterns

## Bounded Agent Loop
**When to use**: A task can be checked with concrete evidence.
**How**: Define scope, give tools and context, run checks, review diff, stop or iterate.
**Trade-offs**: More setup; less uncontrolled autonomy.

## Reference Anchoring
**When to use**: Conventions matter and an example exists.
**How**: Provide the smallest relevant reference application or pattern.
**Trade-offs**: Stale references mislead.

## Prototype Then Harden
**When to use**: Exploration is useful but production risk is higher.
**How**: Explore quickly, then separately validate design, security, tests, and maintainability.
**Trade-offs**: Avoids treating exploratory output as production-ready.
