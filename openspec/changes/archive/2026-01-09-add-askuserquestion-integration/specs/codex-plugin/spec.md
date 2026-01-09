# codex-plugin Specification Delta

## ADDED Requirements

### Requirement: User Selection

系统 SHALL 使用 AskUserQuestion 工具让用户选择要采纳的 Codex 建议，替代文本输入方式。

#### Scenario: 用户通过多选采纳建议

**Given** Codex 返回了多个建议
**And** 建议已经过批判性评估分类
**When** 展示建议给用户选择
**Then** 使用 AskUserQuestion 工具呈现选项
**And** 设置 multiSelect 为 true
**And** 按相关性排序，最相关的放第一位并标记 "(Recommended)"
**And** 用户可选择多个建议同时采纳

#### Scenario: Codex 只有一个建议

**Given** Codex 只返回一个有价值的建议
**When** 展示建议给用户选择
**Then** 仍使用 AskUserQuestion 呈现单选项
**And** 用户可选择采纳或通过 "Other" 提供反馈

---
