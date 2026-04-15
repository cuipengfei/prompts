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

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-15
**Commit:** 65b179d
**Branch:** main

## OVERVIEW

这个仓库同时维护两类产物：Claude Code 插件市场（`plugins/` + `.claude-plugin/marketplace.json`）与 OpenCode 运行时增强包（`packages/oc-tweaks/`）。根目录只保留跨仓库共享规则；局部实现规则下沉到子目录 `AGENTS.md`。

## STRUCTURE

```text
prompts/
├── .claude-plugin/marketplace.json   # Claude Code marketplace 清单
├── plugins/                          # 21 个独立插件；看 plugins/AGENTS.md
├── packages/oc-tweaks/               # OpenCode 运行时增强包；看 packages/oc-tweaks/AGENTS.md
├── openspec/                         # spec / change proposal 工作流；看 openspec/AGENTS.md
├── .claude/                          # 本仓库自带 Claude workspace 资产；看 .claude/AGENTS.md
└── .sisyphus/                        # 计划、证据、notepads；看 .sisyphus/AGENTS.md
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 新增或调整 Claude Code 插件 | `plugins/` | 插件层共享约束在 `plugins/AGENTS.md` |
| 修改 OpenCode 运行时增强 | `packages/oc-tweaks/` | 包级规则已独立维护 |
| 修改 insights 报告链路 | `packages/oc-tweaks/src/insights/` | 这是 `oc-tweaks` 内最独立的子域 |
| 写 proposal / spec delta | `openspec/` | 先读 `openspec/AGENTS.md` |
| 调整本仓库的 Claude workspace 资产 | `.claude/` | 包括 commands / agents / output-styles |
| 追计划、证据、执行工件 | `.sisyphus/` | 计划文件视为只读规范 |

## CONVENTIONS

- 仓库不是传统 workspace monorepo；市场索引入口是 `.claude-plugin/marketplace.json`，运行时包入口是 `packages/oc-tweaks/package.json`。
- `plugins/*` 走自动发现：`plugin.json` 只放元数据，不显式声明 `skills/commands/outputStyles` 数组。
- 插件与包的任何可见改动都要 bump version；否则安装端可能继续命中旧缓存。
- `README.md`、`README.en.md`、`README.guwen.md` 必须保持内容同步。
- 文档与插件说明默认中文；技术术语保持英文。

## ANTI-PATTERNS

- 不要把多个无关能力塞进同一个插件目录。
- 不要在 `plugin.json` 里加入 `$schema` 或组件数组。
- 不要直接 `npm publish` `oc-tweaks`；发版走 tag + GitHub Actions。
- 不要把 `openspec/` 与 `.sisyphus/` 混为一谈：前者是真值规范，后者是执行工件。

## COMMANDS

```bash
# 验证所有插件 manifest
for f in plugins/*/.claude-plugin/plugin.json; do jq . "$f" >/dev/null; done

# 验证 SKILL frontmatter
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/plugin-settings/scripts/parse-frontmatter.sh plugins/*/skills/*/SKILL.md

# 验证 hooks schema（先提取 .hooks）
jq '.hooks' plugins/desktop-notify/hooks/hooks.json > /tmp/hooks.json
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/hook-development/scripts/validate-hook-schema.sh /tmp/hooks.json

# oc-tweaks 包级验证
bun test --cwd packages/oc-tweaks
bun run build --cwd packages/oc-tweaks

# OpenSpec 严格验证
openspec validate <change-id> --strict
```

## NOTES

- `packages/oc-tweaks/AGENTS.md` 已存在且信息密度高；根文件不重复其实现细节。
- `packages/oc-tweaks/src/insights/` 已形成独立领域，单独维护子级 `AGENTS.md`。
- `plugins/` 适合作为共享插件规范层；单插件目录只有在明显复杂时才值得继续下钻。
