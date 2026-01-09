# Tasks: AskUserQuestion Integration

## Overview

将 AskUserQuestion 工具集成到三个插件的实现任务。

---

## Phase 1: session-learn 插件

### Task 1.1: 更新 auto-extract skill
- **File**: `plugins/session-learn/skills/auto-extract/SKILL.md`
- **Changes**:
  - [x] 修改"第二步"，将 y/n 替换为 AskUserQuestion
  - [x] 添加选项构建规则说明
  - [x] 添加边界情况处理（项目数超过 4 个）
- **Effort**: Small

### Task 1.2: 更新 learn command
- **File**: `plugins/session-learn/commands/learn.md`
- **Changes**:
  - [x] 无需更新，command 只调用 skill
- **Effort**: N/A

### Task 1.3: Bump version
- **File**: `plugins/session-learn/.claude-plugin/plugin.json`
- **Changes**:
  - [x] 版本从 1.0.4 → 1.1.0 (minor: 新功能)
- **Effort**: Trivial

---

## Phase 2: codex 插件

### Task 2.1: 更新 codex skill
- **File**: `plugins/codex/skills/codex-advisor/SKILL.md`
- **Changes**:
  - [x] 添加"第六步：使用 AskUserQuestion 让用户选择"
  - [x] 更新建议展示格式
  - [x] 添加 multiSelect 支持说明
- **Effort**: Small

### Task 2.2: 更新 codex command
- **File**: `plugins/codex/commands/codex.md`
- **Changes**:
  - [x] 无需更新，command 只调用 skill
- **Effort**: N/A

### Task 2.3: Bump version
- **File**: `plugins/codex/.claude-plugin/plugin.json`
- **Changes**:
  - [x] 版本从 1.1.0 → 1.2.0 (minor: 新功能)
- **Effort**: Trivial

---

## Phase 3: improve-prompt 插件

### Task 3.1: 更新 improve-prompt command
- **File**: `plugins/improve-prompt/commands/improve-prompt.md`
- **Changes**:
  - [x] 添加步骤 1.5 歧义检测逻辑
  - [x] 添加 AskUserQuestion 调用模式
  - [x] 定义歧义类型和触发条件
- **Effort**: Small

### Task 3.2: Bump version
- **File**: `plugins/improve-prompt/.claude-plugin/plugin.json`
- **Changes**:
  - [x] 版本从 1.0.1 → 1.1.0 (minor: 新功能)
- **Effort**: Trivial

---

## Phase 4: Documentation

### Task 4.1: 更新 CLAUDE.md
- **File**: `CLAUDE.md`
- **Changes**:
  - [x] 跳过 - 已有足够上下文，无需额外文档
- **Effort**: N/A

---

## Dependencies

```
Phase 1-3 完成 ✓
```

## Total Effort

- 实际修改: 3 个文件
- 版本更新: 3 个 plugin.json
- **状态**: ✅ 完成
