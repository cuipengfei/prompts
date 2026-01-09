# Proposal: Add AskUserQuestion Integration

**Status**: APPLIED
**Created**: 2026-01-09
**Author**: Claude Code

## Why

当前三个插件的用户交互模式存在改进空间：

1. **session-learn**: 使用简单的 `y/n` 确认，用户无法选择性持久化部分学习项
2. **codex**: 使用 "回复编号" 的文本方式，不够直观
3. **improve-prompt**: 遇到模糊提示时，Claude 自行猜测而非询问用户

Claude Code 提供了 `AskUserQuestion` 工具，支持 2-4 个选项的多选问题，可显著提升这三个场景的用户体验。

## What Changes

### 1. session-learn 插件

**当前**：提取学习后显示列表，询问 `**确认？**（y/n）`

**改进**：使用 AskUserQuestion 让用户选择要持久化的具体项目
- multiSelect: true
- 每个提取的学习项作为一个选项
- 用户可选择全部、部分或跳过

### 2. codex 插件

**当前**：Codex 建议后显示编号列表，要求用户 "回复编号或描述"

**改进**：使用 AskUserQuestion 呈现建议选项
- multiSelect: true（可采纳多个建议）
- 最多 4 个最相关的建议作为选项
- 保留 "Other" 自动选项供自定义输入

### 3. improve-prompt 插件

**当前**：遇到模糊提示时，Claude 自行推测用户意图

**改进**：检测到歧义时，使用 AskUserQuestion 询问用户
- multiSelect: true（用户可能需要多种解释的组合）
- 2-3 个可能的解释作为选项
- 根据用户选择调整优化方向

## Scope

- **In Scope**:
  - 修改三个插件的 SKILL.md 添加 AskUserQuestion 使用指导
  - 更新相关 command.md 引用新交互模式
  - 更新 plugin.json 版本号

- **Out of Scope**:
  - 其他插件的 AskUserQuestion 集成
  - AskUserQuestion 工具本身的修改

## Risks

| Risk | Mitigation |
|------|------------|
| 选项数量限制（最多 4 个） | 学习项多时，按优先级选取前 4 个 |
| 用户习惯改变 | 新交互更直观，迁移成本低 |

## Success Criteria

1. session-learn 用户可选择性持久化学习项
2. codex 用户可通过点击而非打字采纳建议
3. improve-prompt 在歧义时主动询问而非猜测
