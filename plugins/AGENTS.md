# AGENTS.md — plugins/

Claude Code 插件市场目录的共享规则层。这里讲跨插件共性；单插件自己的行为、参数、测试与示例，留在各自目录。

## OVERVIEW

`plugins/*` 下每个目录都是一个独立可安装插件单元，面向 marketplace 索引 `.claude-plugin/marketplace.json`。

## STRUCTURE

```text
plugins/<plugin>/
├── .claude-plugin/plugin.json
├── commands/*.md
├── skills/*/SKILL.md
├── hooks/hooks.json
├── hooks/*.ts
└── output-styles/*.md
```

并非每个插件都有全部目录；常见形态是单 skill、单 output-style、单 hook，或 command + skill 混合。

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 改插件元数据 | `.claude-plugin/plugin.json` | 只放元数据 |
| 改 slash command | `commands/*.md` | 命令依赖 skill 时优先用强制激活模式 |
| 改 skill | `skills/*/SKILL.md` | frontmatter 必须可解析 |
| 改 hook | `hooks/` | `hooks.json` 用 wrapper 结构 |
| 改 output style | `output-styles/*.md` | 只写输出风格，不混业务逻辑 |

## CONVENTIONS

- 一个插件目录只承载一个清晰功能单元，不打包不相关能力。
- `plugin.json` 只包含元数据：`name/version/description/author/license/repository` 等；不要声明组件数组。
- `author` 必须是对象，不是字符串。
- 同一插件同时含 command 和 skill 时，skill 名称不要包含 command 名称子串，避免模糊匹配冲突。
- command 依赖 skill 时，优先采用强制两步模式：先显式调用 Skill tool 激活，再执行命令逻辑。
- 插件说明文档默认中文；命令、skill、output-style 的命名保持稳定，不随描述改动漂移。

## REFERENCE PATTERNS

- 需要对照官方插件实现时，优先查看 `~/.claude/plugins/marketplaces/claude-code-plugins/plugins/`。
- 典型 `plugin.json` 形状保持简洁：`name`、`version`、`description`、`author`、`license`、`repository`；不要往里塞行为定义。
- skill 目录通常由 `skills/<skill-name>/SKILL.md` 承担主体知识；复杂 skill 再加 `references/` 或 examples 子树。

## SKILL AUTHORING NOTES

- Skill 面向主代理编写；若需要子代理参与，应用“告知主代理如何调度子代理”的写法，不要把读者写乱。
- 不要硬编码某个外部环境才有的代理类型；优先写成按主题选择合适 agent / subagent。
- 把约束放在实际会用到它的地方附近；不要把关键执行要求埋到文末。
- 在上下文不足时，优先让子代理自主找文件并汇报，而不是先停下来索取信息。

## MARKETPLACE / HOOK NOTES

- marketplace 清单字段使用 `source`，不是 `path`。
- plugin hook 配置用 wrapper 结构：`{"hooks": {"Stop": [...]}}`；直接用户设置格式才是 `{"Stop": [...]}`。
- Notification hook 常见 matcher 类型包括 `permission_prompt`、`idle_prompt`、`auth_success`、`elicitation_dialog`。

## VALIDATION

```bash
# 查看官方插件结构
ls ~/.claude/plugins/marketplaces/claude-code-plugins/plugins/

# plugin.json 语法检查
for f in plugins/*/.claude-plugin/plugin.json; do jq . "$f" >/dev/null; done

# skill frontmatter
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/plugin-settings/scripts/parse-frontmatter.sh plugins/*/skills/*/SKILL.md

# hook schema（wrapper 先提取 .hooks）
jq '.hooks' plugins/desktop-notify/hooks/hooks.json > /tmp/hooks.json
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/hook-development/scripts/validate-hook-schema.sh /tmp/hooks.json

# 测 hooks 时复制到 Claude 插件缓存
cp -r plugins/xxx/* ~/.claude/plugins/cache/prompts/xxx/{version}/
```

## ANTI-PATTERNS

- 不要在 `plugin.json` 里写 `$schema`。
- 不要把 command / skill / hooks / output-styles 的自动发现改回手工声明。
- 不要改 `plugin.json`、`SKILL.md`、`hooks.json`、命令文档后忘记 bump version。
- 不要为很薄的单插件目录复制一份泛泛的 AGENTS；只有明显复杂时再下钻。
