# 配置与存储

## 全局配置

路径：`~/.cline/kanban/config.json`

格式：JSON，稀疏写入（等于默认值的字段可能不落盘）。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `selectedAgentId` | string | `"cline"` | 当前 agent（`claude`/`codex`/`gemini`/`opencode`/`droid`/`cline`） |
| `agentAutonomousModeEnabled` | boolean | `true` | agent 自主模式开关 |
| `readyForReviewNotificationsEnabled` | boolean | `true` | review 就绪通知开关 |
| `commitPromptTemplate` | string | 内置模板 | auto-review commit 提示词 |
| `openPrPromptTemplate` | string | 内置模板 | auto-review PR 提示词 |

首次启动自动检测：探测到 `claude` 或 `codex` 安装时优先选择对应 `selectedAgentId`。

---

## 项目配置

路径：`<project-root>/.cline/kanban/config.json`

当 cwd 等于 home 目录时不使用项目配置。

字段：仅 `shortcuts` 数组：

```json
{
  "shortcuts": [
    { "label": "Run tests", "command": "bun test", "icon": "play" }
  ]
}
```

`shortcuts` 为空时自动删除配置文件。`icon` 字段可选。

---

## 数据存储目录

```
~/.cline/
├── kanban/
│   ├── config.json                          # 全局配置
│   ├── hooks/                               # hooks 相关文件
│   ├── trashed-task-patches/                # trash/delete 保留的 diff patch
│   └── workspaces/
│       ├── index.json                       # repoPath → workspaceId 映射
│       └── <workspaceId>/
│           ├── board.json                   # 看板状态（四列 + 任务卡片）
│           ├── sessions.json                # agent 会话记录
│           └── meta.json                    # workspace 元数据
└── worktrees/
    └── <taskId>/<repo>/...                  # git worktree 工作目录
```

### 数据格式

全部 JSON，未使用 SQLite 或 YAML。

`board.json` 包含四列，每列含 `cards` 数组：backlog、in_progress、review、trash。

`index.json` 是全局注册表，将项目路径映射到 workspaceId。

---

## 环境变量

| 变量 | 说明 |
|------|------|
| `KANBAN_HOOK_TASK_ID` | 当前任务 ID，runtime 启动 agent session 时自动注入 |
| `KANBAN_HOOK_WORKSPACE_ID` | 当前 workspace ID，同上 |
| `KANBAN_RUNTIME_HOST` | 覆盖 runtime 监听主机（默认 `127.0.0.1`）；代码可读写 |
| `KANBAN_RUNTIME_PORT` | 覆盖 runtime 监听端口（默认 `3484`）；代码可读写 |
| `KANBAN_NO_AUTO_UPDATE` | 设为 `1` 禁用 CLI 自动更新 |
| `KANBAN_DEBUG_MODE` | 调试模式开关（fallback 链：`KANBAN_DEBUG_MODE` → `DEBUG_MODE` → `debug_mode`） |
| `CLINE_DIR` | 覆盖 Cline 根目录，影响全局配置和数据存储路径 |
| `CODEX_TUI_RECORD_SESSION` | 设为 `1` 启用 Codex session log watcher |

---

## 任务级配置（CLI 参数）

通过 `kanban task create/update` 设置，存储于 board 数据中的任务卡片：

| 参数 | 作用域 |
|------|--------|
| `--auto-review-enabled` | 单个任务 |
| `--auto-review-mode` | 单个任务 |
| `--start-in-plan-mode` | 单个任务（启动时生效） |

---

## 检查命令

```bash
# 全局配置
cat ~/.cline/kanban/config.json

# workspace 注册表
cat ~/.cline/kanban/workspaces/index.json

# 某个 workspace 的 board 数据
cat ~/.cline/kanban/workspaces/<workspaceId>/board.json

# 保留的 patch 文件
ls ~/.cline/kanban/trashed-task-patches/
```
