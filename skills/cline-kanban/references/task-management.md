# 任务管理

## 创建任务

```bash
kanban task create --prompt "描述" [选项]
```

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--prompt` | string | **必填** | 任务描述；trim 后空字符串被拒绝 |
| `--base-ref` | string | 自动检测 | Git 基础分支；回退顺序：currentBranch → defaultBranch → branches[0] |
| `--start-in-plan-mode` | boolean flag | false | 无值=true；接受 true/false/1/0/yes/no，非法值报错 |
| `--auto-review-enabled` | boolean flag | false | 无值=true；同上 |
| `--auto-review-mode` | commit\|pr\|move_to_trash | commit | 非法值回落到 commit |
| `--project-path` | string | 当前目录 | 指定 workspace 路径 |

---

## 更新任务

```bash
kanban task update --task-id <id> [选项]
```

选项与 create 相同（去掉 `--prompt` 必填约束，加上 `--task-id` 必填）。至少修改一个字段，否则报错。

---

## 启动任务

```bash
kanban task start --task-id <id>
```

- 只允许 `backlog` 或 `in_progress` 状态的任务
- 创建 git worktree + 启动 agent session
- 已在 `in_progress`：返回 `{ ok: true, message: "already in progress" }`，不重复创建
- session 已存在时跳过 startTaskSession，只做列迁移

---

## 查看任务

```bash
kanban task list [--column backlog|in_progress|review|trash]
```

- 默认返回除 trash 以外的所有列
- 返回结构：`{ ok, workspacePath, tasks, dependencies, count }`
- 无 workspace 时返回 `{ ok: false }` + exitCode 1

---

## 清理与删除

```bash
kanban task trash  --task-id <id> | --column <col>
kanban task delete --task-id <id> | --column <col>
```

`--task-id` 与 `--column` 二选一，同时传入报错。

| 行为 | trash | delete |
|------|-------|--------|
| 可恢复 | 是（留在 trash 列） | 否（从 board 移除） |
| 保留 patch | 是（`~/.cline/kanban/trashed-task-patches/`） | 是（同路径） |
| 解锁依赖 | 是（review→trash 时自动启动等待方） | 否 |
| 支持批量 | `--column <col>` | `--column <col>` |

---

## Auto-Review 模式

CLI 只保存配置，实际执行由前端 runtime 驱动（500ms debounce）。

| 模式 | 触发条件 | 行为 |
|------|----------|------|
| `commit` | 检测到文件变更 | 驱动 agent 执行 git commit |
| `pr` | 检测到文件变更 | 驱动 agent 开 PR |
| `move_to_trash` | 无条件 | 直接移入 trash，跳过工作区改动警告 |

`commit`/`pr` 完成后若文件变更归零，自动转入 trash。

---

## 顶层启动命令

```bash
kanban [选项]
```

启动 runtime 服务，含 Web UI。

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `--host` | 127.0.0.1 | 监听地址 |
| `--port` | 3484（auto 可用时） | 监听端口 |
| `--no-open` | — | 不自动打开浏览器 |
| `--skip-shutdown-cleanup` | — | 关闭时跳过清理 |
| `-v, --version` | — | 打印版本号 |
