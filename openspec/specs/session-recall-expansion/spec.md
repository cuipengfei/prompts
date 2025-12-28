# session-recall-expansion Specification

## Purpose
TBD - created by archiving change enhance-prompt-and-recall. Update Purpose after archive.
## Requirements
### Requirement: 系统 SHALL 按优先级顺序查询三层数据源

session-recall 技能 SHALL 按优先级顺序查询三层数据源：Project CLAUDE.md、User CLAUDE.md 和 Memory MCP。

#### Scenario: 首先查询 Project CLAUDE.md
- **Given**: 用户使用关键词调用 `/recall`
- **When**: 技能开始执行
- **Then**: 系统应当首先搜索 Project CLAUDE.md（{repo}/CLAUDE.md 或 {repo}/.claude/CLAUDE.md）
- **And**: 系统应当匹配 section 标题和内容

#### Scenario: 其次查询 User CLAUDE.md
- **Given**: 用户使用关键词调用 `/recall`
- **When**: Project CLAUDE.md 搜索完成
- **Then**: 系统应当搜索 User CLAUDE.md（~/.claude/CLAUDE.md）
- **And**: 系统应当匹配 section 标题和内容

#### Scenario: 最后查询 Memory MCP
- **Given**: 用户使用关键词调用 `/recall`
- **When**: User CLAUDE.md 搜索完成
- **Then**: 系统应当使用 `mcp__memory__search_nodes` 查询 Memory MCP

#### Scenario: 无参数调用
- **Given**: 用户调用 `/recall` 但不带参数
- **When**: 技能开始执行
- **Then**: 系统应当展示所有三层的摘要
- **And**: 系统应当从最近对话中提取上下文关键词

---

### Requirement: 系统 SHALL 支持扩展的触发场景

session-recall 技能 SHALL 同时支持沮丧触发和常规查询场景。

#### Scenario: 用户感到沮丧
- **Given**: 用户说 "你又忘了"、"我说过了" 或类似表达
- **When**: /recall 技能被调用
- **Then**: 系统应当确认用户的沮丧
- **And**: 系统应当在展示结果前主动道歉

#### Scenario: 常规查询
- **Given**: 用户问 "有没有关于 X 的记录" 或 "之前怎么处理的"
- **When**: /recall 技能被调用
- **Then**: 系统应当直接展示相关结果
- **And**: 系统不应假设用户感到沮丧

#### Scenario: 主动刷新
- **Given**: 对话已持续一段时间
- **When**: 用户调用 `/recall` 刷新上下文
- **Then**: 系统应当展示相关学习内容的简洁摘要

---

### Requirement: 输出格式 SHALL 标注数据来源

输出格式 SHALL 为每条结果清晰标注数据来源。

#### Scenario: 多层结果
- **Given**: 从多层找到结果
- **When**: 系统展示结果
- **Then**: 结果应当按层级分组，使用清晰的标题：
  - 📁 项目规则 (CLAUDE.md)
  - 👤 用户偏好 (~/.claude/CLAUDE.md)
  - 🧠 历史经验 (Memory MCP)

#### Scenario: 未找到结果
- **Given**: 所有层级都未找到相关结果
- **When**: 系统完成搜索
- **Then**: 系统应当指出搜索了哪些层级
- **And**: 系统应当建议替代搜索关键词

---

### Requirement: 技能描述 SHALL 反映扩展范围

技能描述 SHALL 更新以反映扩展的三层查询能力。

#### Scenario: 更新的描述
- **Given**: 技能元数据
- **When**: 技能在技能列表中显示
- **Then**: 描述应当为："全范围召回 - 从 Project CLAUDE.md、User CLAUDE.md 和 Memory MCP 查询历史知识"

---

