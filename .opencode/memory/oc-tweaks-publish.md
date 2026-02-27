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
