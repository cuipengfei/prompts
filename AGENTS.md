
# Repository Guidelines

**Generated:** 2026-07-16
**Commit:** b5b6952
**Branch:** main

## OVERVIEW

这个仓库同时维护两类产物：Claude Code 插件市场（`plugins/` + `.claude-plugin/marketplace.json`）与 OpenCode 运行时增强包（`packages/oc-tweaks/`）。根目录 `AGENTS.md` 记录本仓库通用的结构与维护规则，包括 skill 的目录布局；各子目录的局部实现规则写在对应子目录的 `AGENTS.md` 中。

## STRUCTURE

| 路径 | 用途 |
| --- | --- |
| `.claude-plugin/marketplace.json` | Claude Code marketplace 清单 |
| `skills/<skill-name>/` | 所有 skill 的正文与附属文件 |
| `plugins/` | 独立插件及指向根目录 skill 的入口 |
| `packages/oc-tweaks/` | OpenCode 运行时增强包 |
| `openspec/` | spec 与 change proposal 工作流 |
| `.claude/` | 本仓库的 Claude workspace 入口 |
| `.sisyphus/` | 计划、证据与工作文件 |

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 新增或调整 Claude Code 插件 | `plugins/` | 插件层共享约束在 `plugins/AGENTS.md` |
| 修改 OpenCode 运行时增强 | `packages/oc-tweaks/` | 包级规则已独立维护 |
| 修改 insights 报告链路 | `packages/oc-tweaks/src/insights/` | 这是 `oc-tweaks` 内最独立的子域 |
| 写 proposal / spec delta | `openspec/` | 查看 `openspec/project.md` 与相关 spec/change |
| 调整本仓库的 Claude workspace 资产 | `.claude/` | 包括 commands / agents / output-styles |
| 追计划、证据、执行工件 | `.sisyphus/` | 计划文件视为只读规范 |

## CONVENTIONS

- 仓库不是传统 workspace monorepo；市场索引入口是 `.claude-plugin/marketplace.json`，运行时包入口是 `packages/oc-tweaks/package.json`。
- `plugins/*` 走自动发现：`plugin.json` 只放元数据，不显式声明 `skills/commands/outputStyles` 数组。
- 插件与包的任何可见改动都要 bump version；否则安装端可能继续命中旧缓存。
- `README.md`、`README.en.md`、`README.guwen.md` 必须保持内容同步。
- 文档与插件说明默认中文；技术术语保持英文。

## SKILL DIRECTORY RULES

- 所有 skill 的实际内容统一放在仓库根目录 `skills/<skill-name>/`，包括 `SKILL.md`、`references/`、脚本和其他附属文件。新增和修改 skill 都在这个目录完成。
- plugin 内的 `plugins/<plugin>/skills/<skill-name>` 必须是相对 symlink，指向 `../../../skills/<skill-name>`。plugin 名称与 skill 名称可以不同。
- `.claude/skills/`、`.codex/skills/` 等工具目录也通过相对 symlink 引用根目录内容。工具专用文案存在必要差异时，保存在对应 skill 的 `variants/` 下，工具入口中的 `SKILL.md` 链接到该文件；相同文案共用同一个源文件。
- 迁移时保留正文、附属文件、文件权限和必要的工具差异。完成后检查每个入口可以读取 `SKILL.md`、相对资源引用可访问，且 skill 发现结果保持一致。

## ANTI-PATTERNS

- 不要把多个无关能力塞进同一个插件目录。
- 不要在 `plugin.json` 里加入 `$schema` 或组件数组。
- 不要直接 `npm publish` `oc-tweaks`；发版走 tag + GitHub Actions。
- 不要把 `openspec/` 与 `.sisyphus/` 混为一谈：前者是真值规范，后者是执行工件。

## COMMANDS

```bash
# 验证所有插件 manifest
for f in plugins/*/.claude-plugin/plugin.json; do jq . "$f" >/dev/null; done

# 验证根目录 skill 发现（只列出，不安装）
skills add . --list

# 验证 plugin 的相对 symlink 及其 SKILL.md 入口
for entry in plugins/*/skills/*; do
  test -L "$entry" &&
    test "$(readlink "$entry")" = "../../../skills/${entry##*/}" &&
    test -f "$entry/SKILL.md" || exit 1
done

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
