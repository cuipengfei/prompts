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

Claude Code 插件市场项目 - 14 个独立可选安装的插件，每个插件包含单一功能组件。

## Project Structure

```
.claude-plugin/
└── marketplace.json       # 14 个独立插件条目

plugins/
├── improve-prompt/         # Command: 提示词优化
├── desktop-notify/         # Hooks: Stop + Notification 通知
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
```

## Plugin Development Best Practices

### ✅ DOs

1. **Auto-discovery > Explicit declaration**
   - Plugin.json **不需要** `skills/commands/outputStyles` 数组
   - Claude Code 自动从文件系统发现组件
   - plugin.json 只包含元数据

2. **参考官方插件实现**
   ```bash
   # 查看官方插件结构
   ls ~/.claude/plugins/marketplaces/claude-code-plugins/plugins/
   cat ~/.claude/.../hookify/.claude-plugin/plugin.json
   ```

3. **使用官方验证脚本**
   ```bash
   # 验证 hooks.json (需提取内层)
   jq '.hooks' hooks/hooks.json > /tmp/inner.json
   bash ~/.claude/.../validate-hook-schema.sh /tmp/inner.json

   # 验证 SKILL.md frontmatter
   bash ~/.claude/.../parse-frontmatter.sh skills/*/SKILL.md
   ```

4. **正确的 plugin.json 格式**
   ```json
   {
     "name": "plugin-name",
     "version": "1.0.0",
     "description": "...",
     "author": {
       "name": "Name",
       "email": "email@example.com"
     },
     "license": "MIT",
     "repository": "https://github.com/..."
   }
   ```

5. **Hooks wrapper format**
   - Plugin hooks: `{"hooks": {"Stop": [...]}}`
   - User settings: 直接 `{"Stop": [...]}`

### ❌ DON'Ts

1. **不要在 plugin.json 中声明组件数组**
   ```json
   // ❌ 错误
   {"skills": [{"name": "...", "description": "..."}]}

   // ✅ 正确 - 移除，自动发现
   {"name": "...", "author": {...}}
   ```

2. **不要打包不相关功能**
   - 一个插件 = 一个功能单元
   - 11 个 skills 应该是 11 个插件

3. **不要用字符串作为 author**
   ```json
   // ❌ "author": "name"
   // ✅ "author": {"name": "...", "email": "..."}
   ```

4. **不要假设验证脚本支持所有格式**
   - `validate-hook-schema.sh` 只支持 direct format
   - Plugin wrapper format 需要先提取 `.hooks`

## Validation Commands

```bash
# 验证所有 plugin.json
for f in plugins/*/.claude-plugin/plugin.json; do
  jq . "$f" > /dev/null && echo "✓ $(basename $(dirname $(dirname $f)))" || echo "✗ FAIL"
done

# 验证 SKILL.md (11 个)
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/plugin-settings/scripts/parse-frontmatter.sh plugins/*/skills/*/SKILL.md

# 验证 hooks.json
jq '.hooks' plugins/desktop-notify/hooks/hooks.json > /tmp/hooks.json
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/hook-development/scripts/validate-hook-schema.sh /tmp/hooks.json
```

## Key Architecture Patterns

### 单一职责插件
每个插件目录只包含一个组件类型：
- `commands/` - 斜杠命令
- `skills/skill-name/` - 单个 skill
- `hooks/` - 事件钩子
- `output-styles/` - 输出风格

### Skills 结构
每个 skill 包含：
- **知识定义** - 原则、标准、流程
- **执行指导** - 触发条件、检查清单（如 quality-standards、programming-workflow）

### Hooks 配置
```json
{
  "description": "...",
  "hooks": {
    "Stop": [{"matcher": ".*", "hooks": [{...}]}],
    "Notification": [{"matcher": ".*", "hooks": [{...}]}]
  }
}
```

## Marketplace Schema

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "prompts",
  "owner": {...},
  "plugins": [
    {
      "name": "plugin-name",
      "description": "...",
      "source": "./plugins/plugin-name",
      "category": "development|productivity|learning|tools|collaboration"
    }
  ]
}
```

**注意**: `source` 不是 `path`

## Communication Standards

- **内部推理**: 英语
- **用户交流**: 中文
- **技术术语**: 保持英语
- **SKILL.md 内容**: 使用中文，与项目其他插件保持一致

## OpenSpec Conventions

- **proposal 格式要求**：必须包含 `## Why` 和 `## What Changes` sections
- **不要忽略验证警告**：即使标记为 "non-blocking" 也应处理
