# Cheatsheet

## Choose the level of autonomy

| Probability of error | Impact if missed | Detectability | Default |
|---|---|---|---|
| Low | Low | High | Exploration or vibe coding can be appropriate; keep output disposable. |
| Mixed | Any | Mixed | Narrow scope, add checks, and use human-in-the-loop review. |
| High | High | Low | Do not use unsupervised execution; require explicit design, deterministic checks, and human approval. |

## Handle unreliable output

| Signal | Action |
|---|---|
| Fast, trustworthy check exists | Run it before accepting output. |
| Coverage is uncertain | Ask for edge cases, add tests, or reduce scope. |
| Revisions do not converge | End the timebox; switch to deterministic investigation. |
| Feedback is slow or unclear | Lower autonomy and require human review. |

## Repair context drift

| Symptom | Action |
|---|---|
| Agent guesses or uses old conventions | Replace stale reference material and state current constraints. |
| Agent cannot find evidence | Provide explicit paths or a reliable search/read interface. |
| Prompt contains broad unrelated material | Keep only task-relevant context for the next decision. |

## Evaluate a local coding model

| Stage | Pass condition | Stop or narrow when |
|---|---|---|
| Memory fit | Model weights and working context fit RAM or VRAM. | The setup cannot load or leaves insufficient working memory. |
| Response speed | Simple requests sustain the intended workflow. | Waiting makes interactive or agent work impractical. |
| Tool calling | The real harness can read and change files reliably. | Calls fail, recover poorly, or cannot be observed. |
| Functional correctness | A bounded representative task passes its checks. | Output cannot meet deterministic checks. |
| Context and task size | Continued conversation and larger work remain within demonstrated limits. | Context degrades or added discovery/file count breaks the workflow. |
| Review burden | Review and correction effort remains worth the coding speed. | Human correction erases the apparent throughput gain. |
