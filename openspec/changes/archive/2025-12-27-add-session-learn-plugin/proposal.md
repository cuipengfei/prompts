# Proposal: Add Session-Learn Plugin

## Why

当前存在三个独立的知识存储层级（项目 CLAUDE.md、用户 CLAUDE.md、Memory MCP），但缺乏结构化的方式来从会话中提取学习并正确分类，也无法主动召回跨项目学习。

## What Changes

- 新增 `/learn` 命令：从当前会话提取学习，按三层存储分类持久化
- 新增 `/recall` 命令：查询 Memory MCP，将相关上下文注入当前会话
- 新增 `session-learning` skill：会话分析 + 三层分类 + 用户确认流程
- 新增 `session-recall` skill：Memory MCP 查询 + 上下文注入
- 更新 marketplace.json 和 README 文档

## Summary

创建 `session-learn` 插件，提供两个命令：
- `/learn` - 从当前会话提取学习，按三层存储分类持久化
- `/recall` - 查询 Memory MCP，将相关上下文注入当前会话

## Motivation

当前存在三个独立的知识存储层级，但缺乏结构化的方式来：
1. 从会话中提取学习并正确分类到对应层级
2. 主动召回跨项目学习增强当前会话

### 三层存储现状

| 层级 | 位置 | 自动加载 | 当前状态 |
|------|------|----------|----------|
| 项目级 | `{repo}/CLAUDE.md` | ✅ | 手动维护 |
| 用户级 | `~/.claude/CLAUDE.md` | ✅ | 手动维护 |
| 跨项目 | Memory MCP | ❌ | 未充分利用 |

## Scope

### In Scope
- 2 个 Commands: `/learn`, `/recall`
- 2 个 Skills: `session-learning`, `session-recall`
- 三层存储分类逻辑
- Memory MCP 查询和注入

### Out of Scope
- 修改 Memory MCP 本身
- 自动学习（需用户显式触发）
- 自动 recall（保持用户控制）

## Solution Overview

### 三层存储分类规则

#### 项目 CLAUDE.md（本项目特定）
- 架构决策、技术栈版本配置
- 构建/测试命令
- 文件/命名规范
- API 模式、错误处理模式
- 项目特定的坑和解决方案

#### 用户 CLAUDE.md（用户偏好）
- 语言偏好（中文/English）
- 响应详略偏好
- 工具偏好（bun > npm, helix）
- 代码风格偏好
- 沟通风格偏好

#### Memory MCP（跨项目模式）
- 交互模式（什么问题该问/跳过）
- 有效的问题解决方法
- 用户专业领域
- 反复出现的分歧及解决
- 会话学习历史摘要

### 命令设计

| 命令 | Skill | 用途 |
|------|-------|------|
| `/learn` | session-learning | 分析会话 → 分类 → 持久化到 3 层 |
| `/recall` | session-recall | 查询 Memory MCP → 注入当前会话 |

### 工作流程

#### /learn 流程
```
分析当前会话
    ↓
分类学习内容:
├── 项目特定 → 追加到 {repo}/CLAUDE.md
├── 用户偏好 → 追加到 ~/.claude/CLAUDE.md
└── 跨项目模式 → 存储到 Memory MCP
    ↓
展示结果给用户确认
    ↓
持久化
```

#### /recall 流程

**触发场景**: 用户对当前 Claude Code 表现不满意，**不想重复自己**：
- "我之前说过这个问题怎么处理"
- "你又犯同样的错误了"
- "我们讨论过这种方式行不通"

**核心目的**: 让 Claude Code 主动回顾历史学习，而不是让用户再解释一遍。

```
用户感到烦躁：Claude Code 似乎忘记了之前学过的东西
    ↓
调用 /recall（可选指定主题）
    ↓
查询 Memory MCP (search_nodes)
    ↓
获取相关历史学习
    ↓
注入当前会话，纠正方向，避免用户重复
```

## Success Criteria

1. `/learn` 能正确分类并持久化到三层
2. `/recall` 能查询并注入相关学习
3. 分类逻辑清晰、MECE
4. 用户确认后才持久化

## Risks and Mitigations

| 风险 | 缓解措施 |
|------|----------|
| 分类错误 | 展示分类结果让用户确认/修改 |
| CLAUDE.md 冲突 | 追加而非覆盖，使用明确的分隔标记 |
| 隐私敏感 | 用户审核后才持久化 |

## Dependencies

- Memory MCP 服务器可用
- 项目和用户 CLAUDE.md 文件可写
