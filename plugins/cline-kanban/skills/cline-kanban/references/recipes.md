# 实战指南

## 端到端工作流

### Codex Agent（推荐）

```bash
# 1. 创建实施型任务，开启 auto-review
kanban task create --prompt "实现用户登录功能" \
  --auto-review-enabled true --auto-review-mode commit

# 2. 查看 backlog，拿到 task ID
kanban task list --column backlog

# 3. 启动任务（创建 worktree + session）
kanban task start --task-id abc12

# 4. Codex 完成 → 进程退出 → auto-review 触发 → commit + merge + trash
# （全自动，无需手动干预）
```

### Claude Code / 其他 Agent

```bash
# 1. 创建任务
kanban task create --prompt "实现用户登录功能" \
  --auto-review-enabled --auto-review-mode commit

# 2. 查看 backlog，拿到 task ID
kanban task list --column backlog

# 3. 启动任务（创建 worktree + session）
kanban task start --task-id abc12

# 4. agent 工作完成后通知进入 review
kanban hooks notify --event to_review --source agent --final-message "登录功能完成"

# 5. 审查通过后移入 trash（保留 patch，解锁依赖）
kanban task trash --task-id abc12
```

---

## 常见操作速查

| 场景 | 命令 |
|------|------|
| 创建并立即启动 | `create` → 拿 ID → `start --task-id <id>` |
| 批量清理 review 列 | `kanban task trash --column review` |
| 批量永久删除 trash | `kanban task delete --column trash` |
| A 等待 B 完成 | `kanban task link --task-id A --linked-task-id B` |
| 查看所有依赖关系 | `kanban task list`（看 `dependencies` 数组） |
| 检查全局配置 | `cat ~/.cline/kanban/config.json` |
| 查看 board 数据 | `cat ~/.cline/kanban/workspaces/index.json` |
| 调试 hook 是否送达 | 改用 `kanban hooks ingest`（失败会报错） |

---

## 常见错误与解决

| 错误场景 | 原因 | 解决方案 |
|----------|------|----------|
| `ok: false` + "workspace not found" | 当前目录不是 kanban workspace | 用 `--project-path` 指定正确路径 |
| `task start` 失败 | 任务不在 backlog/in_progress | `kanban task list` 确认任务当前状态 |
| prompt 被拒绝 | 空字符串或纯空白 | 提供有意义的描述文本 |
| `link` 失败 "non_backlog" | 两方都不在 backlog | 至少一方须在 backlog 状态 |
| `hooks notify` 静默失败 | notify 不报错 | 改用 `ingest` 调试；确认 runtime 正在运行 |
| auto-review 不触发 | CLI 只保存配置，runtime 才执行 | 确认 Web UI runtime 在运行且 `autoReviewEnabled=true` |

---

## ⚠️ 坑点清单

### Codex Agent 专项

| 坑 | 说明 | 解决方案 |
|----|------|----------|
| 纯分析 task 永远卡 in_progress | Codex 完成文字输出后回到 idle，不退出进程，不触发完成事件 | 只给 Codex **有代码修改的实施型 task**；分析工作由主 agent 完成 |
| `--start-in-plan-mode` + Codex 卡住 | plan 完成后 Codex 等待下一步输入，不触发 task_complete | 不要对 Codex task 使用 plan mode |
| kill 进程触发 auto-restart | `shouldAutoRestart` 不检查状态，只要有 listener 就重启 | 用 `kanban task trash --task-id <id>` 代替 kill |
| `hooks notify --event to_review` 被覆盖 | running session 的 `codexPromptDetector` 将状态拉回 running | 不要手动发 hook 给 running 的 Codex session |
| Codex 扩展 prompt 范围 | Codex 可能做超出 prompt 要求的工作 | prompt 中明确限制范围（"只修改以下文件：..."） |

**推荐 Codex 创建参数**：

```bash
# ✅ 实施型 task + auto-review = 完整闭环
kanban task create \
  --prompt "实现用户登录功能" \
  --auto-review-enabled true \
  --auto-review-mode commit

# ❌ 不要这样做
kanban task create --prompt "分析代码架构并给出报告"  # 纯分析，Codex 会卡住
kanban task create --prompt "..." --start-in-plan-mode true  # plan mode + Codex 不兼容
```

### 通用坑点

```bash
# ❌ 错误：to_review 不是有效 JSON，会被当作 positional payload 解析失败
kanban hooks notify to_review

# ✅ 正确
kanban hooks notify --event to_review
```

```bash
# ❌ 已弃用，不要使用
kanban mcp
```

```bash
# ❌ 不能同时传两个，二选一
kanban task trash --task-id abc12 --column review

# ✅ 选其一
kanban task trash --task-id abc12
kanban task trash --column review
```

```bash
# ❌ --prompt 是必填项
kanban task create

# ❌ hooks 没有 --task-id 选项，taskId 从环境变量自动读取
kanban hooks notify --event to_review --task-id abc12
```

```bash
# ❌ task list 默认不显示 trash
kanban task list  # 不会返回 trash 中的任务

# ✅ 需要显式指定
kanban task list --column trash
```

```bash
# ❌ --start-in-plan-mode 只接受 true/false/1/0/yes/no
kanban task create --prompt "..." --start-in-plan-mode maybe
```

### 状态管理

- ❌ **不要直接编辑 `board.json`** — runtime 内存状态会在下一次 hooks 事件时覆盖文件修改
- ❌ **`task trash` 会删除 worktree** — trash 前先 cherry-pick 或创建分支保护 commit，否则成果变 orphan
- ✅ 所有状态操作通过 `kanban task` CLI 命令执行
