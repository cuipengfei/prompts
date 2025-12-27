# Proposal: Split Plugins into Granular Components

## Why

当前 marketplace 只提供 3 个打包插件，用户想要单个功能（如 `quality-standards`）时被迫安装所有 11 个 skills，违反了"按需安装"的原则。

## What Changes

- 将 3 个打包插件拆分为 14 个独立插件（每个功能一个插件）
- 重组目录结构：每个插件有独立的 `.claude-plugin/plugin.json`
- 更新 `marketplace.json` 为 14 个条目
- 用户可选择性安装任意组合

## Problem

当前 marketplace 只提供 3 个打包插件，用户无法选择性安装需要的功能：

1. **prompts-commands**: 1 个 command + hooks（打包）
2. **prompts-output-styles**: 1 个 output-style
3. **prompts-skills**: 11 个完全不相关的 skills（打包）

**核心问题**：用户想要 `quality-standards` skill 时，被迫安装所有 11 个 skills（包括 `zellij-control`、`ba-collaboration` 等无关内容）。

## Proposed Solution

将每个功能组件拆分为独立插件，让用户按需安装：

### 新插件结构（13-14 个独立插件）

```
marketplace.json:
  - improve-prompt          # 1 command
  - desktop-notify          # hooks only
  - structured-responder    # 1 output-style
  - foundational-principles # 1 skill
  - quality-standards       # 1 skill
  - programming-workflow    # 1 skill
  - testing-guidelines      # 1 skill
  - planning-workflow       # 1 skill
  - ba-collaboration        # 1 skill
  - memory-bank            # 1 skill
  - response-guidelines    # 1 skill
  - sequential-thinking    # 1 skill
  - shortcut-system        # 1 skill
  - zellij-control         # 1 skill
```

### 目录重组

```
plugins/
├── improve-prompt/
│   ├── .claude-plugin/plugin.json
│   └── commands/improve-prompt.md
├── desktop-notify/
│   ├── .claude-plugin/plugin.json
│   └── hooks/
│       ├── hooks.json
│       └── notify.sh
├── structured-responder/
│   ├── .claude-plugin/plugin.json
│   └── output-styles/structured-responder.md
├── foundational-principles/
│   ├── .claude-plugin/plugin.json
│   └── skills/foundational-principles/SKILL.md
... (每个 skill 一个插件)
```

## Benefits

- ✅ 用户可以只安装需要的功能
- ✅ 每个插件职责单一、清晰
- ✅ 符合 Claude Code 插件粒度最佳实践
- ✅ 更容易维护和更新

## Tradeoffs

- ⚠️ marketplace.json 条目增多（3 → 13+）
- ⚠️ 目录结构更深（但更清晰）

## Success Criteria

- [ ] 每个 marketplace.json 插件条目对应一个独立可安装的功能
- [ ] 用户可以选择性安装任意组合的插件
- [ ] 所有插件通过官方验证脚本
- [ ] marketplace 可以正常添加（`/plugin marketplace add cuipengfei/prompts`）
