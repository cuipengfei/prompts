<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个 Claude Code 插件市场项目，提供 AI 编程助手指令框架。包含 skills、commands、hooks 和 output-styles 的完整插件集合。

## Project Structure

```
.claude-plugin/
└── marketplace.json       # Marketplace 元数据和插件列表

plugins/
├── prompts-commands/      # 命令和钩子
│   ├── commands/          # 斜杠命令 (improve-prompt)
│   └── hooks/             # 事件钩子 (notify.sh)
├── prompts-output-styles/ # 输出风格模板
└── prompts-skills/        # 11 个核心技能
    └── skills/*/SKILL.md  # 每个技能一个目录

.github/instructions/      # 原始指令文件（供 GitHub Copilot 使用）
openspec/                  # OpenSpec 规范驱动开发配置
```

## Plugin Development

### 验证插件结构

```bash
# 验证 hooks.json
jq '.hooks' plugins/prompts-commands/hooks/hooks.json > /tmp/inner.json
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/hook-development/scripts/validate-hook-schema.sh /tmp/inner.json

# 验证 SKILL.md frontmatter
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/plugin-settings/scripts/parse-frontmatter.sh plugins/prompts-skills/skills/*/SKILL.md
```

### 插件规范

- **plugin.json**: 必须有 `name` 字段（kebab-case）
- **SKILL.md**: 必须有 YAML frontmatter（`name` + `description`）
- **Command.md**: 必须有 YAML frontmatter（`description`）
- **hooks.json**: 使用 wrapper format `{"hooks": {...}}`，matcher 用 `".*"` 匹配所有

### 可用插件

| 插件 | 内容 |
|------|------|
| prompts-commands | `/improve-prompt` 命令 + Stop/Notification 通知钩子 |
| prompts-output-styles | structured-responder 输出风格 |
| prompts-skills | 11 个技能（含执行指导章节） |

## Key Architecture

### Skills 结构
每个 skill 包含知识定义 + 执行指导：
- **知识部分**: 原则、标准、流程说明
- **执行指导**: 触发条件、检查清单、执行流程

### Hooks 配置
```json
{
  "hooks": {
    "Stop": [{ "matcher": ".*", "hooks": [...] }],
    "Notification": [{ "matcher": ".*", "hooks": [...] }]
  }
}
```

## Communication Standards

- **内部推理**: 英语
- **用户交流**: 中文
- **技术术语**: 保持英语
