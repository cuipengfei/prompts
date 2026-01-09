# improve-prompt-enhancement Specification Delta

## ADDED Requirements

### Requirement: Ambiguity Detection

系统 SHALL 检测用户提示中的歧义，并使用 AskUserQuestion 工具询问用户意图，而非自行猜测。

#### Scenario: 检测到目标受众歧义

**Given** 用户提示未明确目标受众
**And** 提示可理解为面向开发者或最终用户
**When** improve-prompt skill 分析提示
**Then** 识别歧义类型为"目标受众不明"
**And** 使用 AskUserQuestion 询问用户
**And** 提供 2-3 个可能的受众选项
**And** 根据用户选择调整优化方向

#### Scenario: 检测到输出格式歧义

**Given** 用户提示未明确期望输出格式
**And** 提示可理解为期望代码、文档或设计
**When** improve-prompt skill 分析提示
**Then** 识别歧义类型为"输出格式不明"
**And** 使用 AskUserQuestion 询问用户
**And** 提供格式选项（如 "代码实现"、"技术文档"、"架构设计"）

#### Scenario: 无歧义直接优化

**Given** 用户提示足够明确
**And** 没有检测到歧义
**When** improve-prompt skill 分析提示
**Then** 跳过 AskUserQuestion 步骤
**And** 直接进行提示优化

---
