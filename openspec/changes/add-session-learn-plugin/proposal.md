# Proposal: Add Session-Learn Plugin

## Summary

创建 `session-learn` 插件，让用户可以通过 `/learn` 命令触发 Claude Code 从当前会话中提取学习，并使用 Memory MCP 工具持久化到知识图谱中。

## Motivation

当前 Memory MCP 提供了 9 个工具用于管理知识图谱，但缺乏一个结构化的方式来：
1. 从会话中提取有价值的学习内容
2. 识别用户偏好和交互模式
3. 持久化这些学习以便未来会话使用

## Scope

### In Scope
- 1 个 Command (`/learn`): 简短触发器
- 1 个 Skill (`session-learning`): 详细指导如何分析会话并使用 Memory MCP

### Out of Scope
- 修改 Memory MCP 本身
- 自动学习（需要用户显式触发）
- 跨项目学习（每个项目独立）

## Solution Overview

### 组件设计

1. **Command** (`plugins/session-learn/commands/learn.md`)
   - 简短触发器，告诉 Claude Code 使用 session-learning skill
   - 接受可选参数指定学习焦点

2. **Skill** (`plugins/session-learn/skills/session-learning/SKILL.md`)
   - 分析维度：
     - 什么进展顺利
     - 什么不顺利
     - 用户不同意什么
     - 可推断的用户偏好/风格
   - Memory MCP 使用指南：
     - `search_nodes`: 先搜索是否已有相关实体
     - `create_entities`: 创建新的学习实体
     - `add_observations`: 向已有实体添加观察
     - `create_relations`: 建立实体间关系

### 实体类型设计

| 实体类型 | 用途 | 示例 |
|----------|------|------|
| `session_learning` | 会话级别的学习总结 | "2024-01-15 会话学习" |
| `user_preference` | 用户偏好 | "编码风格偏好" |
| `interaction_pattern` | 交互模式 | "反馈方式" |

### 关系类型设计

| 关系 | 说明 |
|------|------|
| `learned_from` | 学习来源于某用户 |
| `influences` | 偏好影响某方面 |
| `related_to` | 学习之间的关联 |

## Success Criteria

1. `/learn` 命令可被调用并触发 skill
2. Skill 能正确分析会话内容
3. 学习被正确存储到 Memory MCP 知识图谱
4. 后续会话可以通过 `search_nodes` 查询历史学习

## Risks and Mitigations

| 风险 | 缓解措施 |
|------|----------|
| 过度存储无用信息 | Skill 包含筛选指南 |
| 隐私敏感内容 | 明确提示用户审核 |
| 实体重复 | 先搜索后创建 |

## Dependencies

- Memory MCP 服务器可用
- 9 个 Memory MCP 工具已注册
