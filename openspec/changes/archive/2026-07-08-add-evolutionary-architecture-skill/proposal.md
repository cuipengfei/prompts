# Change: Add Evolutionary Architecture Skill Plugin

## Why
用户希望将《Building Evolutionary Architectures》(Neal Ford, Rebecca Parsons, Patrick Kua) 一书转化为可复用的 agent skill，方便在日常架构工作中应用书中的适应性函数、增量变更、架构量子等核心框架。该 skill 属于知识库类插件，与现有 plugins 中的 foundational-principles 同类。

## What Changes
- 新增 `plugins/evolutionary-architecture/` 插件目录
- 包含 `.claude-plugin/plugin.json`（元数据）
- 包含 `skills/evolutionary-architecture/SKILL.md`（主 skill 文件，核心框架 + 章节索引）
- 包含 `skills/evolutionary-architecture/chapters/ch01-ch08-*.md`（8 个章节摘要）
- 包含 `skills/evolutionary-architecture/glossary.md`（术语表）
- 包含 `skills/evolutionary-architecture/patterns.md`（模式与技术清单）
- 包含 `skills/evolutionary-architecture/cheatsheet.md`（决策速查表）
- 更新 `.claude-plugin/marketplace.json` 注册新插件

## Impact
- Affected specs: 无现有 spec（新增 capability）
- Affected code: `plugins/evolutionary-architecture/`（全新目录）, `.claude-plugin/marketplace.json`（新增条目）
- 不修改任何现有插件或代码
