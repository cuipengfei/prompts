# AGENTS.md — desktop-notify

`desktop-notify` 是 hook 型插件，不是纯文档型 skill。它通过 `Stop` / `Notification` hook 调用脚本，把通知推到浏览器或桌面侧。

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 改 hook 声明 | `hooks/hooks.json` | wrapper 结构，含 `Stop` 与 `Notification` |
| 改 hook 实现 | `hooks/notify.ts` | 入口脚本 |
| 改 WPF / shell 辅助 | `scripts/` | 平台脚本与辅助逻辑 |

## CONVENTIONS

- `hooks.json` 里的命令通过 `bun ${CLAUDE_PLUGIN_ROOT}/hooks/notify.ts ...` 调用，不要硬编码绝对路径。
- Notification hook 常见 matcher 类型包括 `permission_prompt`、`idle_prompt`、`auth_success`、`elicitation_dialog`。
- Bun WebSocket pub/sub 里，`server.publish()` 返回的是字节数，不是客户端数量；客户端数用 `server.subscriberCount(topic)` 取。
- 在 `close` handler 中显式 `ws.unsubscribe(topic)`，避免悬挂订阅。

## VALIDATION

```bash
jq '.hooks' plugins/desktop-notify/hooks/hooks.json > /tmp/hooks.json
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/hook-development/scripts/validate-hook-schema.sh /tmp/hooks.json
```

## ANTI-PATTERNS

- 不要把 wrapper 格式直接拿去喂 schema 校验脚本；先提取 `.hooks`。
- 不要把 `publish()` 的返回值误当在线用户数。
- 不要省略 `unsubscribe` 清理步骤。
