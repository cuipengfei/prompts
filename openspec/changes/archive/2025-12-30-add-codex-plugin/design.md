# Design: add-codex-plugin

## Architecture Overview

```
User: /codex [args]
    │
    ▼
┌─────────────────────────────────┐
│  Command: codex.md              │
│  (Forced Eval 3-Step)           │
│  1. EVALUATE: YES               │
│  2. ACTIVATE: Skill(...)        │
│  3. IMPLEMENT: follow skill     │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Skill: codex-advisor           │
│  1. Infer scenario              │
│  2. Collect context             │
│  3. Call Codex MCP              │
│  4. Critically evaluate         │
│  5. Present to user             │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Codex MCP                      │
│  mcp__codex-mcp__codex          │
│  - prompt: [构建的请求]          │
│  - cwd: [项目目录]               │
│  - sandbox: read-only           │
│  - base-instructions: [规则]    │
└─────────────────────────────────┘
```

## Key Design Decisions

### D1: 场景推断而非明确指定

**决策**: Claude Code 根据上下文自动推断用户意图

**理由**:
- 用户体验更流畅（不需要记住不同命令）
- 符合用户要求："claude code itself should infer"

**推断逻辑**:
| 上下文特征 | 推断场景 |
|-----------|----------|
| 有文件引用 (`@file`) | 代码审查 |
| 有 git diff 上下文 | 变更审查 |
| 问句形式 | 第二意见 |
| 无明确目标 | 整体评估 |

### D2: 批判性评估框架

**决策**: Claude Code 必须评估 Codex 结果，不盲目信任

**理由**:
- 用户明确指出 "codex tends to nit pick and over engineer"
- 不同 AI 有不同偏好，需要平衡

**Nitpick 判断标准**:
- 仅涉及风格偏好（非功能性）
- 改动收益 < 改动成本
- 与项目现有风格不一致

**Over-engineering 判断标准**:
- 引入不必要的抽象层
- 为未来可能的需求预设设计
- 显著增加复杂度但收益不明确

### D3: 上下文传递策略

**决策**: 组合使用多种上下文传递方式

| 方式 | 用途 |
|------|------|
| `cwd` | 让 Codex 访问项目文件 |
| `base-instructions` | 注入项目规则（从 CLAUDE.md 提取） |
| prompt 内联 | git diff、代码片段 |
| 文件引用 | 指定 `@file` 让 Codex 读取 |

### D4: 输出格式

**决策**: 三分类展示 + 理由说明

```markdown
## Codex 反馈评估

### ✅ 采纳建议（有价值）
- [建议 1]: [理由为什么采纳]

### 💬 需讨论（可能有价值）
- [建议 2]: [为什么需要用户决定]

### ⏭️ 已过滤（nitpick/over-engineering）
- [建议 3]: [过滤原因]

---

**你想要采纳哪些建议？**
```

## Trade-offs

| 选项 | 优点 | 缺点 | 决策 |
|------|------|------|------|
| 直接展示 Codex 结果 | 简单 | 用户需自行过滤噪音 | ❌ |
| 完全自动过滤 | 用户无需思考 | 可能过滤掉有价值建议 | ❌ |
| **三分类 + 理由** | 平衡透明度和效率 | 略复杂 | ✅ |

## Security Considerations

- 使用 `sandbox: read-only` 确保 Codex 不会修改文件
- 不传递敏感信息（如 API keys）到 Codex
