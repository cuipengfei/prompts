# improve-prompt-enhancement Specification

## Purpose
TBD - created by archiving change enhance-prompt-and-recall. Update Purpose after archive.
## Requirements
### Requirement: 系统 SHALL 提供工具推荐

在重构提示词后，系统 SHALL 分析增强版提示词并基于上下文智能推荐相关的 tool/skill/MCP。

#### Scenario: 有相关工具可推荐
- **Given**: 增强版提示词的任务性质匹配某些工具
- **When**: improve-prompt 命令完成重构
- **Then**: 系统应当推荐 1-3 个最相关的工具
- **And**: 使用格式 `工具名` - 简短理由

#### Scenario: 无相关工具
- **Given**: 增强版提示词不匹配任何工具
- **When**: improve-prompt 命令完成重构
- **Then**: 系统应当省略"💡 推荐工具"部分

---

### Requirement: 输出格式 SHALL 包含工具推荐

当识别到相关工具时，输出格式 SHALL 包含可选的工具推荐部分。

#### Scenario: 完整输出结构
- **Given**: improve-prompt 命令完成重构
- **When**: 有相关工具可推荐
- **Then**: 输出应当遵循以下结构：
  1. 📝 原始提示词
  2. ✨ 增强版提示词
  3. 🔍 改进说明
  4. 💡 推荐工具（可选）
  5. ---（分隔线）
  6. 执行改写后的任务

---

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

