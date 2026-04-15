# AGENTS.md — .sisyphus/

`.sisyphus/` 是执行工件层：计划、证据、notepads、草稿。它记录“怎么做、做到了什么、留下什么证据”，不是真值规范层。

## OVERVIEW

当前目录包含 `plans/`、`evidence/`、`notepads/`、`drafts/` 与 `boulder.json`。其中 `plans/` 和 `evidence/` 已经是高频工作区。

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 看执行计划 | `plans/*.md` | `oc-tweaks-insights.md` 等大型计划都在这里 |
| 看验证证据 | `evidence/` | 包括 task 级文本证据与 `final-qa/` |
| 看过程性笔记 | `notepads/` | 按主题分目录沉淀 |
| 看临时草稿 | `drafts/` | 不要把草稿误当最终结论 |

## CONVENTIONS

- 计划文件一旦写入，视为只读规范；执行阶段不要就地改计划内容来“追认”实现。
- 证据文件名应能反映任务编号或主题，便于回溯。
- `evidence/` 只存可验证产出：命令输出、检查结果、QA 记录；不要混入讨论性长文。
- `notepads/` 适合工作草稿、拆解思路与中间整理；最终结论应回到代码、README、AGENTS 或 spec。

## ANTI-PATTERNS

- 不要把 `.sisyphus/` 当真值来源覆盖 `openspec/`。
- 不要把临时草稿误写成最终发布文档。
- 不要删除验证失败的证据来制造“通过”的表象。
