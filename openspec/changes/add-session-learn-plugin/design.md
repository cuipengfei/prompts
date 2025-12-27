# Design: Session-Learn Plugin

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User invokes /learn                       │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                 Command: learn.md                            │
│  - 简短触发器                                                 │
│  - 告诉 Claude Code 使用 session-learning skill              │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              Skill: session-learning                         │
│  1. 分析当前会话                                              │
│  2. 提取学习维度                                              │
│  3. 使用 Memory MCP 持久化                                   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                   Memory MCP                                 │
│  - search_nodes: 检查已有实体                                │
│  - create_entities: 创建新实体                               │
│  - add_observations: 追加观察                                │
│  - create_relations: 建立关系                                │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Command (`/learn`)

**职责**: 简短触发器，不包含业务逻辑

**设计原则**:
- 最小化内容，仅引导到 skill
- 支持可选参数（焦点领域）

**示例调用**:
```
/learn              # 全面学习
/learn 代码风格      # 聚焦代码风格
```

### 2. Skill (`session-learning`)

**职责**: 详细指导分析和持久化流程

**分析维度**:

| 维度 | 说明 | 实体类型 |
|------|------|----------|
| 成功 | 什么进展顺利 | `session_learning` |
| 失败 | 什么不顺利 | `session_learning` |
| 分歧 | 用户不同意什么 | `interaction_pattern` |
| 偏好 | 推断的用户偏好 | `user_preference` |

**Memory MCP 使用流程**:

```
1. search_nodes("user_preference") → 检查已有偏好
2. search_nodes("interaction_pattern") → 检查已有模式
3. 对比新旧，决定:
   - add_observations: 更新已有
   - create_entities: 创建新实体
4. create_relations: 建立关联
```

## Entity Schema

### session_learning

```json
{
  "entityType": "session_learning",
  "name": "会话学习 - {date}",
  "observations": [
    "成功: ...",
    "失败: ...",
    "关键决策: ..."
  ]
}
```

### user_preference

```json
{
  "entityType": "user_preference",
  "name": "{preference_area}",
  "observations": [
    "偏好: ...",
    "原因: ...",
    "推断来源: ..."
  ]
}
```

### interaction_pattern

```json
{
  "entityType": "interaction_pattern",
  "name": "{pattern_name}",
  "observations": [
    "模式描述: ...",
    "触发条件: ...",
    "期望响应: ..."
  ]
}
```

## Relation Schema

| From | To | RelationType |
|------|-----|--------------|
| session_learning | user_cpf | learned_from |
| user_preference | 领域实体 | influences |
| session_learning | session_learning | related_to |

## Design Decisions

### D1: Command vs Skill 分离

**决策**: Command 只做触发，Skill 包含所有逻辑

**理由**:
- 符合单一职责原则
- Command 保持简短，易于记忆
- Skill 可独立更新和复用

### D2: 先搜索后创建

**决策**: 使用 Memory MCP 前先搜索已有实体

**理由**:
- 避免重复实体
- 支持增量学习
- 保持知识图谱整洁

### D3: 用户确认

**决策**: 学习结果先展示给用户，确认后再持久化

**理由**:
- 用户保持控制权
- 避免存储敏感信息
- 提高学习质量
