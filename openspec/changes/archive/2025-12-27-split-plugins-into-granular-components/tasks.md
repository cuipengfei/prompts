# Tasks: Split Plugins into Granular Components

## Phase 1: 重组目录结构

- [ ] 1.1 为 `improve-prompt` 创建独立插件目录
- [ ] 1.2 为 `desktop-notify` 创建独立插件目录（hooks）
- [ ] 1.3 为 `structured-responder` 创建独立插件目录
- [ ] 1.4 为 11 个 skills 分别创建独立插件目录

## Phase 2: 创建插件配置

- [ ] 2.1 为每个新插件创建 `.claude-plugin/plugin.json`
- [ ] 2.2 移动对应的组件文件到新插件目录
- [ ] 2.3 验证每个 plugin.json 的 JSON 格式

## Phase 3: 更新 Marketplace

- [ ] 3.1 更新 `.claude-plugin/marketplace.json`，添加所有新插件条目
- [ ] 3.2 为每个插件添加正确的 `category`
- [ ] 3.3 删除旧的 3 个打包插件目录

## Phase 4: 验证

- [ ] 4.1 验证所有 plugin.json 格式正确
- [ ] 4.2 验证所有 SKILL.md frontmatter
- [ ] 4.3 验证 hooks.json 结构
- [ ] 4.4 测试 marketplace 可以正常添加

## Phase 5: 更新文档

- [ ] 5.1 更新 CLAUDE.md
- [ ] 5.2 更新 README.md（3 个语言版本）
- [ ] 5.3 提交所有更改
