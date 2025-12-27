# Session-Learn Plugin Specification

## ADDED Requirements

### Requirement: Learn Command

系统 SHALL 提供 `/learn` 命令，允许用户触发会话学习功能。

#### Scenario: 用户调用 /learn 命令

**Given** 用户在 Claude Code 会话中
**When** 用户输入 `/learn`
**Then** Claude Code 加载 session-learning skill
**And** 分析当前会话内容
**And** 将学习分类到三层存储
**And** 展示分类结果给用户确认
**And** 用户确认后持久化

---

### Requirement: Recall Command

系统 SHALL 提供 `/recall` 命令，允许用户在对 Claude Code 表现不满时召回相关历史学习。

#### Scenario: 用户因重复错误调用 /recall

**Given** Claude Code 似乎忘记了之前学过的东西
**And** 用户不想重复解释
**When** 用户输入 `/recall`
**Then** Claude Code 加载 session-recall skill
**And** 提取当前上下文关键词
**And** 查询 Memory MCP
**And** 将相关学习注入当前会话
**And** 明确告知用户回顾到了什么

#### Scenario: 用户指定主题召回

**Given** 用户在 Claude Code 会话中
**When** 用户输入 `/recall 认证模式`
**Then** Claude Code 使用 "认证模式" 作为查询关键词
**And** 返回与认证相关的历史学习

---

### Requirement: Three-Tier Storage Classification

session-learning skill MUST 将学习内容分类到三个存储层级。

#### Scenario: 项目特定内容存储到项目 CLAUDE.md

**Given** 学习内容是 "这个项目使用 Vitest 测试"
**When** 进行分类
**Then** 内容被分类为 "项目级"
**And** 追加到 `{repo}/CLAUDE.md`

#### Scenario: 用户偏好存储到用户 CLAUDE.md

**Given** 学习内容是 "用户偏好使用 bun 而非 npm"
**When** 进行分类
**Then** 内容被分类为 "用户级"
**And** 追加到 `~/.claude/CLAUDE.md`

#### Scenario: 跨项目模式存储到 Memory MCP

**Given** 学习内容是 "先问清楚需求再动手效果更好"
**When** 进行分类
**Then** 内容被分类为 "跨项目"
**And** 使用 Memory MCP 工具存储

---

### Requirement: Session Learning Skill

Claude Code MUST 能够通过 session-learning skill 分析会话并持久化学习。

#### Scenario: 分析会话维度

**Given** session-learning skill 被激活
**When** Claude Code 分析当前会话
**Then** 识别以下维度:
  - 什么进展顺利
  - 什么不顺利
  - 用户不同意什么
  - 可推断的用户偏好

#### Scenario: 用户确认后持久化

**Given** 学习内容已分类完成
**When** 展示分类结果给用户
**Then** 用户可以修改分类
**And** 用户确认后才执行持久化

---

### Requirement: Session Recall Skill

Claude Code MUST 能够通过 session-recall skill 查询 Memory MCP 并注入上下文。

#### Scenario: 查询 Memory MCP

**Given** session-recall skill 被激活
**When** 执行召回
**Then** 使用 `search_nodes` 查询 Memory MCP
**And** 使用 `open_nodes` 获取详细内容
**And** 格式化结果并注入当前会话

---

### Requirement: Plugin Structure

插件 MUST 遵循项目标准目录结构。

#### Scenario: 插件目录结构正确

**Given** session-learn 插件创建完成
**Then** 目录结构为:
```
plugins/session-learn/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── learn.md
│   └── recall.md
└── skills/
    ├── session-learning/
    │   └── SKILL.md
    └── session-recall/
        └── SKILL.md
```
