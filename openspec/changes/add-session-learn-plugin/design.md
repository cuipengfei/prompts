# Design: Session-Learn Plugin

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User invokes /learn                       │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              Skill: session-learning                         │
│  1. 分析当前会话                                              │
│  2. 分类学习内容                                              │
│  3. 展示给用户确认                                            │
│  4. 持久化到三层存储                                          │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
    ┌─────────────────┼─────────────────┐
    ↓                 ↓                 ↓
┌────────┐      ┌────────┐      ┌────────────┐
│ 项目级  │      │ 用户级  │      │  跨项目    │
│CLAUDE.md│      │CLAUDE.md│      │ Memory MCP │
│ (repo)  │      │ (~/)    │      │            │
└────────┘      └────────┘      └────────────┘
    ↑                 ↑                 ↓
    │                 │                 │
    │    自动加载      │                 │ 需要 /recall
    └─────────────────┘                 │
                                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    User invokes /recall                      │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│               Skill: session-recall                          │
│  1. 获取当前上下文                                            │
│  2. 查询 Memory MCP (search_nodes)                           │
│  3. 格式化相关学习                                            │
│  4. 注入当前会话                                              │
└─────────────────────────────────────────────────────────────┘
```

## Three-Tier Storage Design

### Tier 1: 项目 CLAUDE.md

**位置**: `{repo}/CLAUDE.md` 或 `{repo}/.claude/CLAUDE.md`

**内容类型**:
| 类别 | 示例 |
|------|------|
| 架构决策 | "使用 Repository 模式处理数据访问" |
| 构建命令 | "使用 `bun test` 运行测试" |
| 命名规范 | "组件使用 PascalCase" |
| API 模式 | "错误响应使用 `{error: string, code: number}`" |
| 项目陷阱 | "不要在 hooks 中使用 async/await" |

**更新方式**:
```markdown
## Session Learnings - {date}

### 项目规范
- [学习内容]
```

### Tier 2: 用户 CLAUDE.md

**位置**: `~/.claude/CLAUDE.md`

**内容类型**:
| 类别 | 示例 |
|------|------|
| 语言偏好 | "用中文交流，技术术语保持英文" |
| 响应风格 | "简洁为主，避免冗长解释" |
| 工具偏好 | "优先使用 bun 而非 npm" |
| 代码风格 | "偏好函数式风格" |
| 沟通习惯 | "不需要过多确认，直接执行" |

**更新方式**:
```markdown
## User Preferences - {date}

- [偏好内容]
```

### Tier 3: Memory MCP

**存储方式**: 知识图谱（实体 + 关系）

**实体类型**:
| 类型 | 用途 | 示例 |
|------|------|------|
| `interaction_pattern` | 交互模式 | "用户喜欢先看方案再确认" |
| `problem_solving` | 解决方法 | "调试时先检查日志" |
| `expertise_area` | 专业领域 | "熟悉 TypeScript 和 React" |
| `learning_history` | 学习记录 | "2024-01-15 会话学习摘要" |

**关系类型**:
| From | To | RelationType |
|------|-----|--------------|
| learning_history | user_cpf | learned_from |
| interaction_pattern | 领域 | applies_to |
| problem_solving | 问题类型 | solves |

## Classification Logic

### 决策树

```
对于每个学习项:
│
├─ 是否与当前项目代码/架构/工具链直接相关？
│   └─ Yes → 项目 CLAUDE.md
│
├─ 是否是用户的通用偏好（适用于所有项目）？
│   └─ Yes → 用户 CLAUDE.md
│
└─ 是否是交互模式/问题解决方法/跨项目经验？
    └─ Yes → Memory MCP
```

### 分类示例

| 学习内容 | 分类 | 理由 |
|----------|------|------|
| "这个项目用 Vitest 测试" | 项目 | 项目特定 |
| "用户喜欢用 bun" | 用户 | 跨项目偏好 |
| "用户不喜欢冗长解释" | 用户 | 沟通偏好 |
| "先问清楚再动手效果好" | Memory | 交互模式 |
| "用户擅长 TypeScript" | Memory | 专业领域 |
| "这类问题先查日志" | Memory | 解决方法 |

## Command Design

### /learn Command

**文件**: `commands/learn.md`

**职责**: 简短触发器，调用 session-learning skill

**参数**:
- 无参数: 全面学习
- 可选焦点: `/learn 代码风格`

### /recall Command

**文件**: `commands/recall.md`

**职责**: 简短触发器，调用 session-recall skill

**参数**:
- 无参数: 基于当前上下文查询
- 可选主题: `/recall 认证模式`

## Skill Design

### session-learning Skill

**文件**: `skills/session-learning/SKILL.md`

**职责**:
1. 分析当前会话（成功、失败、分歧、偏好）
2. 分类学习内容到三层
3. 展示分类结果给用户确认
4. 执行持久化:
   - 项目/用户 CLAUDE.md: 使用 Edit/Write 工具
   - Memory MCP: 使用 create_entities, add_observations, create_relations

### session-recall Skill

**文件**: `skills/session-recall/SKILL.md`

**触发场景**: 用户对 Claude Code 当前表现不满，不想重复解释之前说过的事情。

**职责**:
1. 理解用户为什么调用 recall（可能是哪里出了问题）
2. 提取当前上下文关键词
3. 使用 search_nodes 查询 Memory MCP
4. 使用 open_nodes 获取详细内容
5. 格式化并注入当前会话
6. 明确告知用户："我回顾了之前的学习，发现..."

## Design Decisions

### D1: 三层分离而非单一存储

**决策**: 按内容性质分离到三个存储层

**理由**:
- 项目/用户 CLAUDE.md 自动加载，零开销
- Memory MCP 适合跨项目、长期知识
- MECE 分类，避免重复

### D2: 用户确认后持久化

**决策**: 展示分类结果，用户确认后才写入

**理由**:
- 用户保持控制权
- 避免错误分类
- 保护隐私

### D3: /recall 按需触发

**决策**: 不自动注入 Memory MCP 内容

**理由**:
- 避免自动开销（不像 claude-mem 每次会话都注入）
- 用户控制何时查询
- 可聚焦特定主题

### D4: 追加而非覆盖

**决策**: 向 CLAUDE.md 追加内容而非覆盖

**理由**:
- 保留现有内容
- 使用日期分隔标记
- 用户可手动整理
