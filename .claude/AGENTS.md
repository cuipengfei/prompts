# AGENTS.md — .claude/

`.claude/` 是本仓库自带的 Claude workspace 资产层，不是业务代码层。这里的文件服务于 agent 行为、局部命令和输出风格。

## OVERVIEW

当前目录包含 `CLAUDE.md`、局部 commands、局部 agents、局部 output-styles；它们影响 Claude 在这个仓库中的工作方式。

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 改全局仓库级 Claude 偏好 | `CLAUDE.md` | 这里只放仓库局部偏好，不重复用户级全局配置 |
| 改本仓库专用命令 | `commands/` | 当前有 `improve-prompt.md` 与 `openspec/` 命令组 |
| 改本仓库专用子代理说明 | `agents/` | 如 `tdd-coach.md`、`planning-analyst.md` |
| 改本仓库专用输出风格 | `output-styles/` | 当前是 `structured-responder.md` |

## CONVENTIONS

- `.claude/` 关注“Claude 如何工作”，不承担产品文档、spec 真值或执行证据。
- 这里的内容应与根 `AGENTS.md` 配合：根讲仓库结构，这里讲 Claude workspace 资产。
- 如果某条规则已经是用户级全局偏好，不要在这里再抄一遍；只写仓库局部补充。
- 本目录的命令和输出风格应与 `plugins/` 里的公开插件保持语义一致，避免同名异义。

## LANGUAGE / WRITING NOTES

- 面向仓库内 Claude 资产时，用户交流默认中文，技术术语保持英文。
- `SKILL.md`、命令说明与输出风格文案默认中文，和 `plugins/` 公开资产保持一致。

## ANTI-PATTERNS

- 不要把 `.claude/` 当作源码目录写实现细节。
- 不要在这里存放 `.sisyphus` 计划或 `openspec` 提案。
- 不要让局部命令与公开插件命令发生名称冲突而语义不同。
