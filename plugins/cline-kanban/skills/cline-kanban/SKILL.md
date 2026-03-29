---
name: cline-kanban
description: "Use when managing tasks on a Cline Kanban board via CLI, creating or updating or linking or starting tasks, configuring auto-review, integrating agent hooks with kanban runtime, checking kanban configuration or local data storage, or when the user mentions 'kanban task', 'kanban hooks', 'kanban board', 'task dependency', 'auto-review', 'cline kanban', 'kanban config'."
---

## 语言规则

Task prompt 和描述**默认使用中文**，方便人类审查者直接阅读。代码、命令、技术术语保持英文。

## 概述

Cline Kanban（`github.com/cline/kanban`）：为 coding agent 设计的本地编排看板 CLI。

- 包名 `kanban`（`kanban -v` 查看版本），runtime 默认监听 `127.0.0.1:3484`（端口可自动调整）
- 所有 task 命令输出 JSON；错误时 JSON + exitCode 1
- Task ID 格式：5 位短字符串（截取自 UUID）

## 命令速查表

| 命令 | 用途 |
|------|------|
| `kanban` | 启动 runtime 服务（含 Web UI） |
| `kanban task create` | 创建新任务（进入 backlog 顶部） |
| `kanban task update` | 更新任务字段 |
| `kanban task start` | 启动任务（创建 worktree + agent session） |
| `kanban task list` | 列出任务（默认排除 trash） |
| `kanban task trash` | 移入 trash（可恢复，解锁依赖） |
| `kanban task delete` | 永久删除（不可恢复） |
| `kanban task link` | 建立依赖（A 等待 B） |
| `kanban task unlink` | 删除依赖 |
| `kanban hooks notify` | 向 runtime 发送事件（best-effort） |
| `kanban hooks ingest` | 向 runtime 发送事件（失败报错） |
| `kanban hooks gemini-hook` | Gemini agent 专用 hook 包装器 |
| `kanban hooks codex-wrapper` | Codex agent 专用包装器 |

## Codex Agent 注意事项

Codex 的完成检测与其他 agent 不同——它依赖**进程退出**而非 session log 事件。使用要点：

- **必须开 auto-review**：`--auto-review-enabled true --auto-review-mode commit`
- **只给实施型 task**：纯分析/review 工作会卡住（Codex 完成后不退出进程）
- **不要用 plan mode**：`--start-in-plan-mode` 与 Codex 不兼容
- **不要 kill 进程**：会触发 auto-restart 而非完成；用 `kanban task trash` 代替

## 任务生命周期

```
create (→ backlog 顶部)
  → start (→ in_progress + worktree + session)
  → agent 工作
  → hooks notify --event to_review (→ review)
  → auto-review 或手动审查
  → trash（保留 patch，依赖解锁）
  → 可选 delete（永久删除）
```

## 共享选项

所有 task 子命令支持 `--project-path <path>`，默认当前工作目录。

## 详细参考

| 文档 | 内容 |
|------|------|
| [任务管理](references/task-management.md) | create/update/start/list/trash/delete 详细参数与行为 |
| [依赖管理](references/dependency-management.md) | link/unlink、方向语义、自动重定向规则 |
| [Hooks 集成](references/hooks-integration.md) | 事件类型、ingest/notify、payload 格式、Gemini/Codex 适配 |
| [配置与存储](references/config-and-storage.md) | 全局/项目配置、数据目录结构、环境变量 |
| [实战指南](references/recipes.md) | 端到端工作流、常见操作、错误处理、坑点清单 |
| [网络行为与遥测](references/network-and-telemetry.md) | 外部请求、Sentry、自动更新、隐私控制 |
