# Design: Split Plugins into Granular Components

## Architecture Decision

### Current State (3 Bundles)
```
prompts-commands (bundle)
  → improve-prompt command
  → notify hooks

prompts-output-styles (bundle)
  → structured-responder

prompts-skills (bundle)
  → 11 unrelated skills
```

### Target State (13+ Independent Plugins)

每个功能组件成为独立插件，用户按需安装。

## Plugin Mapping

| 旧插件 | 新插件名称 | 类型 | 组件 |
|--------|-----------|------|------|
| prompts-commands | improve-prompt | command | 1 command |
| prompts-commands | desktop-notify | hooks | hooks.json + notify.sh |
| prompts-output-styles | structured-responder | output-style | 1 output-style |
| prompts-skills | foundational-principles | skill | 1 skill |
| prompts-skills | quality-standards | skill | 1 skill |
| prompts-skills | programming-workflow | skill | 1 skill |
| prompts-skills | testing-guidelines | skill | 1 skill |
| prompts-skills | planning-workflow | skill | 1 skill |
| prompts-skills | ba-collaboration | skill | 1 skill |
| prompts-skills | memory-bank | skill | 1 skill |
| prompts-skills | response-guidelines | skill | 1 skill |
| prompts-skills | sequential-thinking | skill | 1 skill |
| prompts-skills | shortcut-system | skill | 1 skill |
| prompts-skills | zellij-control | skill | 1 skill |

## Directory Structure Pattern

每个插件遵循相同结构：

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json       # 只声明单个组件
└── <component-type>/     # commands/ or skills/ or hooks/ or output-styles/
    └── <files>
```

### 示例：improve-prompt

```
plugins/improve-prompt/
├── .claude-plugin/
│   └── plugin.json       # {"commands": [{"name": "improve-prompt", ...}]}
└── commands/
    └── improve-prompt.md
```

### 示例：quality-standards

```
plugins/quality-standards/
├── .claude-plugin/
│   └── plugin.json       # {"skills": [{"name": "quality-standards", ...}]}
└── skills/
    └── quality-standards/
        └── SKILL.md
```

## Migration Strategy

### 安全迁移步骤

1. **创建新结构**（保留旧的）
2. **验证新结构**
3. **更新 marketplace.json**
4. **删除旧结构**

### 命名规范

- 插件名称：kebab-case，描述性
- 目录名称：与插件名称一致
- 组件名称：保持原样

## Category Assignment

| Category | Plugins |
|----------|---------|
| productivity | improve-prompt, desktop-notify |
| learning | structured-responder, response-guidelines |
| development | quality-standards, programming-workflow, testing-guidelines, planning-workflow, memory-bank, foundational-principles |
| tools | zellij-control, sequential-thinking, shortcut-system |
| collaboration | ba-collaboration |

## Validation Plan

每个插件必须通过：
1. `jq . plugin.json` - JSON 有效性
2. 组件文件存在（commands/*.md, skills/*/SKILL.md 等）
3. Frontmatter 格式正确
4. marketplace.json schema 验证
