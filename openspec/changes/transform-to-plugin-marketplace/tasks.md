# 实施任务清单

## 1. 创建 Marketplace 基础结构

- [x] 1.1 创建 `.claude-plugin/marketplace.json` 定义 marketplace 元数据
- [x] 1.2 创建 `plugins/` 目录作为插件容器

## 2. 迁移 Agents 插件

- [x] 2.1 创建 `plugins/prompts-core-agents/.claude-plugin/plugin.json`
- [x] 2.2 创建 `plugins/prompts-core-agents/agents/` 目录
- [x] 2.3 迁移 `.claude/agents/*.md` 到插件目录
- [x] 2.4 验证插件结构正确性

## 3. 迁移 Commands 插件

- [x] 3.1 创建 `plugins/prompts-commands/.claude-plugin/plugin.json`
- [x] 3.2 创建 `plugins/prompts-commands/commands/` 目录
- [x] 3.3 迁移 `.claude/commands/improve-prompt.md` 到插件目录
- [x] 3.4 验证插件结构正确性

## 4. 迁移 Output Styles 插件

- [x] 4.1 创建 `plugins/prompts-output-styles/.claude-plugin/plugin.json`
- [x] 4.2 创建 `plugins/prompts-output-styles/output-styles/` 目录
- [x] 4.3 迁移 `.claude/output-styles/*.md` 到插件目录
- [x] 4.4 验证插件结构正确性

## 5. 创建 Skills 插件

- [x] 5.1 创建 `plugins/prompts-skills/.claude-plugin/plugin.json`
- [x] 5.2 创建 `plugins/prompts-skills/skills/` 目录结构
- [x] 5.3 将 `.github/instructions/*.md` 转化为 Skills 格式：
  - [x] 5.3.1 `foundational-principles/SKILL.md`
  - [x] 5.3.2 `quality-standards/SKILL.md`
  - [x] 5.3.3 `programming-workflow/SKILL.md`
  - [x] 5.3.4 `testing-guidelines/SKILL.md`
  - [x] 5.3.5 `planning-workflow/SKILL.md`
  - [x] 5.3.6 `ba-collaboration/SKILL.md`
  - [x] 5.3.7 `memory-bank/SKILL.md`
  - [x] 5.3.8 `response-guidelines/SKILL.md`
  - [x] 5.3.9 `sequential-thinking/SKILL.md`
  - [x] 5.3.10 `shortcut-system/SKILL.md`
- [x] 5.4 验证 Skills 格式正确性

## 6. 更新 Marketplace 清单

- [x] 6.1 在 `marketplace.json` 中注册所有插件
- [x] 6.2 添加插件描述和版本信息
- [x] 6.3 验证 marketplace 结构

## 7. 文档更新

- [x] 7.1 更新 README.md 添加 Marketplace 安装指南
- [x] 7.2 添加插件使用示例
- [x] 7.3 更新 CLAUDE.md 反映新架构

## 8. 验证与测试

- [x] 8.1 验证所有 JSON 文件格式正确
- [x] 8.2 验证所有 SKILL.md 文件已创建
- [x] 8.3 验证目录结构完整

## 依赖关系

- 任务 1 必须先于任务 2-5 完成（创建基础结构）
- 任务 2-5 可并行执行
- 任务 6 依赖任务 2-5 完成
- 任务 7-8 依赖任务 6 完成
