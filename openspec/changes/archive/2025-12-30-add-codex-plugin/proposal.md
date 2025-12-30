# Proposal: add-codex-plugin

## Status
PROPOSED

## Why

Claude Code 用户有时需要第二意见来验证代码方案、获取代码审查或探索替代方法。OpenAI Codex 作为另一个 AI 编程助手，可以提供不同视角。

**问题**：
1. 用户需要手动切换工具来获取第二意见
2. Codex 倾向于 nitpick 和 over-engineer，直接采纳其建议可能引入不必要的复杂性
3. 缺乏结构化的方式来比较两个 AI 的观点

**解决方案**：
创建 `codex` 插件，让 Claude Code 能够调用 Codex MCP 获取第二意见，并在展示给用户前进行批判性评估，过滤掉 nitpick 和过度工程化的建议。

## What Changes

### 新增插件：`codex`

**结构**：
```
plugins/codex/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── codex.md           # /codex 命令
└── skills/
    └── codex-advisor/
        └── SKILL.md       # Codex 顾问技能
```

**核心特性**：

1. **智能场景推断**
   - Claude Code 根据上下文推断用户意图（审查代码 / 第二意见 / 方案比较）
   - 无需用户明确指定场景

2. **上下文传递**
   - 使用 `cwd` 传递项目目录
   - 使用 `base-instructions` 注入项目规则
   - 支持文件引用、git diff、代码片段

3. **批判性评估（关键）**
   - Claude Code 不盲目信任 Codex 结果
   - 过滤 nitpick（过于细碎的建议）
   - 过滤 over-engineering（过度工程化）
   - 保留有价值的洞察

4. **结构化展示**
   - 分类展示：采纳建议 / 需讨论 / 已过滤
   - 说明过滤原因
   - 让用户做最终决定

## Scope

- **In scope**: 插件结构、command、skill、Codex MCP 调用流程、评估逻辑
- **Out of scope**: Codex MCP 服务器本身的配置

## Dependencies

- Codex MCP server (`mcp__codex-mcp__codex`, `mcp__codex-mcp__codex-reply`)
- 现有插件开发最佳实践（Forced Eval 3-Step 模式）
