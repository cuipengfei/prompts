# Hooks 集成

## 概述

Hooks 通过 HTTP/tRPC 向 kanban runtime 发送事件（endpoint：`/api/trpc`，超时 3s）。

---

## 事件类型

| 事件 | 触发时机 |
|------|----------|
| `to_review` | agent 工作完成，任务移入 review |
| `to_in_progress` | agent 开始处理任务 |
| `activity` | 中间过程通知（工具调用、进度更新等） |

---

## ingest vs notify

| 命令 | 错误处理 | 适用场景 |
|------|----------|----------|
| `kanban hooks notify` | best-effort，吞掉所有异常 | agent 日常使用（推荐） |
| `kanban hooks ingest` | 失败时 stderr + exitCode 1 | 调试、需要确认送达 |

---

## 选项表格

```bash
kanban hooks notify [payload] [选项]
kanban hooks ingest [payload] [选项]
```

| 选项 | 说明 |
|------|------|
| `[payload]` | 位置参数，JSON object 字符串 |
| `--event` | 事件类型：`to_review`\|`to_in_progress`\|`activity` |
| `--source` | 来源标识（如 `agent`、`gemini`） |
| `--activity-text` | activity 事件的文本内容 |
| `--tool-name` | 当前工具名 |
| `--final-message` | 任务完成消息 |
| `--hook-event-name` | hook 事件名（原始值） |
| `--notification-type` | 通知类型 |
| `--metadata-base64` | base64 编码的 JSON metadata（优先级最高） |

**⚠️ 没有 `--task-id` 和 `--workspace-id` 选项。**
`taskId`/`workspaceId` 从环境变量读取，由 runtime 自动注入：
- `KANBAN_HOOK_TASK_ID`
- `KANBAN_HOOK_WORKSPACE_ID`

---

## Payload 输入

三来源，优先级从高到低：

1. `--metadata-base64`（base64 编码的 JSON object）
2. stdin JSON
3. 位置参数 `[payload]`

payload 必须是 JSON object（非数组、非基本类型）。

---

## 归一化过程

CLI 从宽松 payload 中提取字段，映射为标准 tRPC payload：

```json
{
  "taskId": "(from env KANBAN_HOOK_TASK_ID)",
  "workspaceId": "(from env KANBAN_HOOK_WORKSPACE_ID)",
  "event": "to_review|to_in_progress|activity",
  "metadata": {
    "activityText": "string|null",
    "toolName": "string|null",
    "finalMessage": "string|null",
    "hookEventName": "string|null",
    "notificationType": "string|null",
    "source": "string|null"
  }
}
```

payload 中可识别的字段别名（任意一个均可）：
- `hook_event_name` / `hookEventName` / `hookName`
- `activity_text` / `activityText`
- `tool_name` / `toolName`
- `final_message` / `finalMessage`
- `notification_type` / `notificationType`

---

## Gemini Hook

```bash
kanban hooks gemini-hook
```

- 从 stdin 读 JSON → 立即向 stdout 输出 `{}` → 后台 detached spawn notify
- 事件映射：

| Gemini 事件 | Kanban 事件 |
|-------------|-------------|
| `AfterAgent` | `to_review` |
| `BeforeAgent` | `to_in_progress` |
| 其他 | `activity` |

---

## Codex Wrapper

```bash
kanban hooks codex-wrapper --real-binary <path> [agentArgs...]
```

**检测机制**：

1. **session log watcher**：设置 `CODEX_TUI_RECORD_SESSION=1`，每 200ms 轮询 `/tmp/kanban-codex-session-{pid}_{ts}.jsonl`
2. **PTY prompt 检测**：`codexPromptDetector` 在 PTY 输出中检测 `›` 提示符（仅 `awaiting_review` 状态下触发）
3. **进程退出**：Codex 进程退出（exitCode=0）→ 状态变为 `awaiting_review`（reason=exit）

### ⚠️ Codex 完成检测的已知限制

**核心问题**：kanban 的 session log watcher 期望 `{ type: "task_complete" }` 事件，但 Codex 的 JSONL 使用完全不同的 schema（`{ ts, dir, kind, variant }`），不包含 `task_complete` 事件。已验证 12 个 session log 文件，零个 `task_complete`。

**影响**：
- Codex 完成任务后回到 idle `›` prompt，**不退出进程、不写完成事件**
- session log watcher 永远检测不到完成
- task 永远卡在 `in_progress`

**Workaround**：使用 `--auto-review-enabled true --auto-review-mode commit` 创建 task。当 Codex 完成后正常退出进程（exitCode=0）时，auto-review 自动触发 commit + merge + trash。此路径不依赖 session log 检测。

**不要这样做**：
- ❌ 纯分析/review 型 task 交给 Codex（完成后不退出，永远卡住）
- ❌ `kill <pid>` 来"完成" task（触发 auto-restart，不触发 review）
- ❌ `kanban hooks notify --event to_review` 手动通知（被 running session 的 `codexPromptDetector` 拉回 running）
- ❌ 直接编辑 `board.json`（runtime 内存状态会覆盖文件修改）

**推荐做法**：
- ✅ 只给 Codex **有代码修改的实施型 task**
- ✅ 创建 task 时开启 `--auto-review-enabled true`
- ✅ 纯分析工作由主 agent 完成，不走 kanban
