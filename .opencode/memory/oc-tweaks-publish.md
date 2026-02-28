# oc-tweaks 发布流程

## 步骤

1. `bun test` — 确保测试全过
2. `bun run build` — 构建 dist/
3. 修改 `packages/oc-tweaks/package.json` version
4. `git commit` 所有改动
5. `git tag oc-tweaks-v{version}`（如 `oc-tweaks-v0.1.2`）
6. `git push && git push origin oc-tweaks-v{version}`
7. GitHub Actions 自动完成 npm publish

## 关键规则

- **绝不直接 `npm publish`**，CI 会处理
- Tag 格式：`oc-tweaks-v{x.y.z}`
- 发布后更新 `~/.config/opencode/opencode.json` 中的 plugin 版本号（如 `"oc-tweaks@0.1.2"`），下次重启 OpenCode 生效

## 监控 CI 发布

- `gh run list --repo cuipengfei/prompts --workflow=publish-oc-tweaks.yml --limit 5` — 查看发布状态
- `gh run watch --repo cuipengfei/prompts` — 实时监控
- **必须加 `--repo cuipengfei/prompts`**，因为是 fork repo，`gh` 默认指向上游 `cline/prompts`

## 重启 OpenCode 测试新版插件

发布新版后需要重启 OpenCode 才能加载。可以在当前 session 内自行重启：

1. 杀掉当前 OpenCode 进程
2. 运行 `opencode -s <session_id>` 恢复当前 session

这样不需要用户手动操作，插件更新后可以立即验证。

## auto-memory v3 关键参考

- OpenCode Plugin 文档: https://opencode.ai/docs/plugins/
- Custom Tool API（官方示例）: `import { type Plugin, tool } from "@opencode-ai/plugin"`
- omo 命令注册机制参考: oh-my-opencode 通过内置 hook 系统注册 `/start-work` 等命令
- Slash command 目录: `~/.config/opencode/commands/*.md`（插件可在初始化阶段自动写入）
  npm publish 通过 GitHub Actions 发布后，应完整测试新版本：确认 npm 版本号（npm view <pkg> version）、在消费方更新依赖版本、重启应用、运行 smoke test 验证实际功能。CI 成功 ≠ 生产可用，务必闭环验证。
