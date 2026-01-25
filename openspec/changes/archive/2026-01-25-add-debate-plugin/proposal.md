# Proposal: add-debate-plugin

## Summary

新增 `debate` 插件，让主代理与子代理进行有意义的辩论，帮助用户获得更全面的视角和更好的决策。

## Why

### 问题

1. **单一视角局限** - 单个模型可能有盲点或隐含偏见
2. **决策质量** - 重要决策需要多角度验证
3. **思维惰性** - 没有挑战时容易陷入确认偏误

### 机会

1. **跨模型辩论** - 用户环境已配置多模型（Claude Opus + GPT Codex），可利用不同模型的视角差异
2. **连续对话机制** - Task + resume 已验证可实现多轮连续对话（见 `subagent-continuous-conversation.md` 测试结果）
3. **SOTA 模型能力** - 现代模型已具备高质量辩论能力，无需复杂脚手架

### 与 Codex 插件的区别

| 插件 | 模式 | 交互 | 目的 |
|------|------|------|------|
| codex | 单向咨询 | 请求→评估→展示 | 获取第二意见 |
| debate | 多轮对话 | 观点↔质疑↔回应 | 暴露盲点、探索多角度 |

## What Changes

### 新增插件结构

```
plugins/debate/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── debate.md
└── skills/
    └── dialectic-partner/
        └── SKILL.md
```

### 核心机制

利用已验证的 Task + resume 连续对话机制：

```
用户: /debate "是否应该用 microservices"
  ↓
主代理: 陈述观点
  ↓
子代理: 质疑、反驳、提出替代方案
  ↓
主代理: 回应（可 resume 继续）
  ↓
... 多轮对话直到达成共识或用户满意
```

### 设计原则

1. **极简主义** - SOTA 模型知道什么是好辩论，只需设置场景
2. **不预设轮数** - 让对话自然发展
3. **不机械角色** - 不是"正方/反方"，而是"批判性思考伙伴"
4. **建设性目标** - 目标是发现更好答案，不是赢
5. **主代理隔离** - 主代理不得在用户同意前根据子代理建议修改代码或文件，防止被"污染"

### 子代理角色

不是"反对者"，而是"Dialectic Partner"：
- 质疑隐含假设
- 提出边界情况
- 探索替代方案
- 帮助发现盲点

### 用户体验

```bash
# 启动辩论
/debate "我们应该用 Redis 还是 PostgreSQL 做缓存"

# 主代理陈述观点后，自动与子代理开始辩论
# 用户可以：
# - 观察辩论
# - 随时介入提问
# - 引导辩论方向
# - 请求总结
```

## Scope

**In scope:**
- 新建 `debate` 插件（command + skill）
- 利用现有 Task + resume 机制
- 动态选择最合适的 subagent_type
- 用户全程参与（AskUserQuestion）
- 辩论历史持久化（.debates/*.md）

**Out of scope:**
- 复杂的辩论状态机
- 预设辩论轮数
- 评分/胜负判定
