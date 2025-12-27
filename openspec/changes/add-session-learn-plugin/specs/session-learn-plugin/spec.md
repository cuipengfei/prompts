# Session-Learn Plugin Specification

## ADDED Requirements

### Requirement: Learn Command

系统 SHALL 提供 `/learn` 命令，允许用户触发会话学习功能。

#### Scenario: 用户调用 /learn 命令

**Given** 用户在 Claude Code 会话中
**When** 用户输入 `/learn`
**Then** Claude Code 加载 session-learning skill
**And** 分析当前会话内容
**And** 提取学习维度（成功、失败、分歧、偏好）
**And** 展示学习结果给用户确认

---

### Requirement: Session Learning Skill

Claude Code MUST 能够通过 session-learning skill 分析会话并使用 Memory MCP 持久化学习。

#### Scenario: 分析会话并持久化学习

**Given** session-learning skill 被激活
**When** Claude Code 分析当前会话
**Then** 识别以下维度:
  - 什么进展顺利
  - 什么不顺利
  - 用户不同意什么
  - 可推断的用户偏好
**And** 使用 Memory MCP 工具持久化:
  - `search_nodes`: 检查已有实体
  - `create_entities`: 创建新学习实体
  - `add_observations`: 向已有实体追加
  - `create_relations`: 建立实体关系

#### Scenario: 避免重复实体

**Given** 知识图谱中已存在 "编码风格偏好" 实体
**When** 新会话发现相同偏好
**Then** 使用 `add_observations` 追加而非创建新实体

---

### Requirement: Entity Types

插件 SHALL 使用标准化的实体类型进行知识存储。

#### Scenario: 创建会话学习实体

**Given** 会话分析完成
**When** 创建学习实体
**Then** 使用以下实体类型之一:
  - `session_learning`: 会话级别学习总结
  - `user_preference`: 用户偏好
  - `interaction_pattern`: 交互模式

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
│   └── learn.md
└── skills/
    └── session-learning/
        └── SKILL.md
```
