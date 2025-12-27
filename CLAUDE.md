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

这是一个 Claude Code 插件市场项目，提供 AI 编程助手指令框架。每个功能组件都是独立可选安装的插件。

## Project Structure

```
.claude-plugin/
└── marketplace.json       # Marketplace 元数据（14 个独立插件）

plugins/
├── improve-prompt/         # Command: 提示词优化
├── desktop-notify/         # Hooks: 桌面通知
├── structured-responder/   # Output-style: 结构化响应
├── foundational-principles/ # Skill: 基础原则
├── quality-standards/      # Skill: 质量标准
├── programming-workflow/   # Skill: TDD 工作流
├── testing-guidelines/     # Skill: 测试指南
├── planning-workflow/      # Skill: 规划工作流
├── ba-collaboration/       # Skill: BA 协作
├── memory-bank/           # Skill: 记忆库
├── response-guidelines/   # Skill: 响应指南
├── sequential-thinking/   # Skill: 顺序思维
├── shortcut-system/       # Skill: 快捷命令
└── zellij-control/        # Skill: Zellij 控制

.github/instructions/      # 原始指令文件（供 GitHub Copilot 使用）
openspec/                  # OpenSpec 规范驱动开发配置
```

## Plugin Development

### 插件结构模式

每个插件只包含单一功能组件：

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # 声明单个组件
└── <type>/                # commands/ or skills/ or hooks/ or output-styles/
    └── <files>
```

### 验证插件

```bash
# 验证所有 plugin.json
for f in plugins/*/.claude-plugin/plugin.json; do jq . "$f" > /dev/null && echo "✓ $(basename $(dirname $(dirname $f)))"; done

# 验证 SKILL.md frontmatter
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/plugin-settings/scripts/parse-frontmatter.sh plugins/*/skills/*/SKILL.md

# 验证 hooks.json
jq '.hooks' plugins/desktop-notify/hooks/hooks.json > /tmp/hooks.json
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/hook-development/scripts/validate-hook-schema.sh /tmp/hooks.json
```

### 可用插件（14 个）

| Category | Plugins |
|----------|---------|
| productivity | improve-prompt, desktop-notify |
| learning | structured-responder, response-guidelines |
| development | foundational-principles, quality-standards, programming-workflow, testing-guidelines, planning-workflow, memory-bank |
| tools | sequential-thinking, shortcut-system, zellij-control |
| collaboration | ba-collaboration |

## Communication Standards

- **内部推理**: 英语
- **用户交流**: 中文
- **技术术语**: 保持英语
