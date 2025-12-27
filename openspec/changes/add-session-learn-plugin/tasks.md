# Tasks: Add Session-Learn Plugin

## Overview

创建 session-learn 插件的实施任务清单。

## Task List

### Phase 1: Plugin Structure

- [ ] **T1**: 创建插件目录结构
  - `plugins/session-learn/.claude-plugin/plugin.json`
  - `plugins/session-learn/commands/`
  - `plugins/session-learn/skills/session-learning/`
  - **验证**: 目录结构符合项目规范

### Phase 2: Command Implementation

- [ ] **T2**: 创建 `/learn` 命令
  - 文件: `plugins/session-learn/commands/learn.md`
  - 包含 YAML frontmatter (description)
  - 简短指令，引导使用 session-learning skill
  - **验证**: 命令可被 Claude Code 识别

### Phase 3: Skill Implementation

- [ ] **T3**: 创建 `session-learning` skill
  - 文件: `plugins/session-learn/skills/session-learning/SKILL.md`
  - 包含 YAML frontmatter (name, description)
  - 详细的分析维度指南
  - Memory MCP 工具使用指南
  - 实体/关系类型定义
  - 执行检查清单
  - **验证**: Skill 格式符合项目规范

### Phase 4: Marketplace Integration

- [ ] **T4**: 更新 marketplace.json
  - 添加 session-learn 插件条目
  - **验证**: `jq . marketplace.json` 无错误

### Phase 5: Documentation

- [ ] **T5**: 更新 README 文件
  - README.md, README.en.md, README.guwen.md
  - 添加 session-learn 插件说明
  - **验证**: 所有 3 个 README 一致

## Dependencies

- T2, T3 依赖 T1
- T4, T5 依赖 T2, T3

## Parallelizable

- T2 和 T3 可并行执行
- T4 和 T5 可并行执行
