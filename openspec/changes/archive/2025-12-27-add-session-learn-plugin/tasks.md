# Tasks: Add Session-Learn Plugin

## Overview

创建 session-learn 插件，支持三层存储分类和召回功能。

## Task List

### Phase 1: Plugin Structure

- [x] **T1**: 创建插件目录结构
  ```
  plugins/session-learn/
  ├── .claude-plugin/plugin.json
  ├── commands/
  │   ├── learn.md
  │   └── recall.md
  └── skills/
      ├── session-learning/SKILL.md
      └── session-recall/SKILL.md
  ```
  - **验证**: 目录结构完整

### Phase 2: Commands Implementation

- [x] **T2**: 创建 `/learn` 命令
  - 文件: `commands/learn.md`
  - YAML frontmatter (description)
  - 简短指令，引导使用 session-learning skill
  - **验证**: 命令可被识别

- [x] **T3**: 创建 `/recall` 命令
  - 文件: `commands/recall.md`
  - YAML frontmatter (description)
  - 简短指令，引导使用 session-recall skill
  - **验证**: 命令可被识别

### Phase 3: Skills Implementation

- [x] **T4**: 创建 `session-learning` skill
  - 文件: `skills/session-learning/SKILL.md`
  - 内容:
    - 会话分析指南（成功、失败、分歧、偏好）
    - 三层分类决策树
    - 分类示例表
    - 持久化指南:
      - 项目 CLAUDE.md: Edit/Write 工具
      - 用户 CLAUDE.md: Edit/Write 工具
      - Memory MCP: create_entities, add_observations, create_relations
    - 用户确认流程
  - **验证**: Skill 格式正确

- [x] **T5**: 创建 `session-recall` skill
  - 文件: `skills/session-recall/SKILL.md`
  - 内容:
    - 上下文提取指南
    - Memory MCP 查询指南 (search_nodes, open_nodes)
    - 结果格式化模板
    - 注入当前会话指南
  - **验证**: Skill 格式正确

### Phase 4: Marketplace Integration

- [x] **T6**: 更新 marketplace.json
  - 添加 session-learn 插件条目
  - **验证**: `jq . marketplace.json` 无错误

### Phase 5: Documentation

- [x] **T7**: 更新 README 文件
  - README.md, README.en.md, README.guwen.md
  - 添加 session-learn 插件说明
  - **验证**: 所有 3 个 README 一致

## Dependencies

```
T1 (结构)
 ├── T2, T3 (命令) - 可并行
 └── T4, T5 (技能) - 可并行
      └── T6, T7 (集成和文档) - 可并行
```

## Parallelizable

- T2 和 T3 可并行
- T4 和 T5 可并行
- T6 和 T7 可并行
