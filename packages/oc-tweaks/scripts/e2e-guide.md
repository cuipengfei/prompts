# oc-tweaks E2E Testing Guide

在 OpenCode 中实际加载 oc-tweaks 插件并验证各功能是否正常工作。

## Prerequisites

- [Bun](https://bun.sh/) >= 1.1
- [OpenCode](https://opencode.ai/) 已安装并可运行
- 本仓库已 clone 到本地

## Setup: Load from Local Path

1. **构建/链接插件**（从仓库根目录）：

   ```bash
   cd packages/oc-tweaks
   bun install
   ```

2. **配置 OpenCode 加载本地插件**：

   编辑 `~/.config/opencode/opencode.json`，将 `plugin` 指向本地路径：

   ```json
   {
     "plugin": ["/absolute/path/to/packages/oc-tweaks"]
   }
   ```

3. **创建插件配置文件**：

   创建 `~/.config/opencode/oc-tweaks.json`：

   ```json
   {
     "notify": { "enabled": true, "notifyOnIdle": true, "notifyOnError": true },
     "compaction": { "enabled": true },
     "backgroundSubagent": { "enabled": true },
     "leaderboard": { "enabled": false },
     "logging": { "enabled": true, "maxLines": 200 }
   }
   ```

4. **启动 OpenCode**：

   ```bash
   opencode
   ```

   检查启动日志，确认插件加载无错误。

## Testing Each Plugin

### notify plugin

**验证目标**：任务完成或出错时收到桌面通知。

1. 在 OpenCode 中发送一个简单请求（如 `echo hello`）
2. 等待任务完成，观察是否弹出桌面通知
3. 通知应包含项目名称和任务摘要

**平台检测优先级**：
- Windows (WSL): `pwsh` / `powershell.exe` → WPF 自定义窗口
- macOS: `osascript` → 系统通知
- Linux: `notify-send` → 桌面通知
- Fallback: OpenCode TUI toast

**自定义命令测试**：

```json
{
  "notify": {
    "enabled": true,
    "command": "echo \"$TITLE: $MESSAGE\" >> /tmp/oc-notify.log"
  }
}
```

发送请求后检查 `/tmp/oc-notify.log` 是否有记录。

### compaction plugin

**验证目标**：会话压缩时摘要使用用户语言。

1. 进行一个较长的对话（触发 context compaction）
2. 使用中文与 AI 交流
3. 当会话被压缩时，检查压缩摘要是否为中文
4. 技术术语（文件名、代码）应保持英文

**触发条件**：对话超过 context window 限制时自动触发。

### backgroundSubagent plugin

**验证目标**：sub-agent 默认后台运行，前台调用时有提醒。

1. 让 AI 执行需要调用 `task()` 的复杂任务
2. 观察 sub-agent 是否默认使用 `run_in_background=true`
3. 如果 AI 使用了前台模式（`run_in_background=false`），应在输出末尾看到提醒：
   > 💡 [Reminder] Consider using background mode for better responsiveness.

**系统提示注入验证**：
- 在对话中询问 AI 关于 sub-agent 调度的策略
- AI 应该提到优先后台运行

### leaderboard plugin

**验证目标**：token 用量上报到 claudecount.com。

1. 先创建 leaderboard 配置文件：

   ```bash
   mkdir -p ~/.claude
   cat > ~/.claude/leaderboard.json << 'EOF'
   {
     "twitter_handle": "your_handle",
     "twitter_user_id": "your_id"
   }
   EOF
   ```

2. 在 `oc-tweaks.json` 中启用：

   ```json
   { "leaderboard": { "enabled": true } }
   ```

3. 发送请求，检查日志：

   ```bash
   cat ~/.config/opencode/plugins/oc-tweaks.log
   ```

   应看到 `Submitting:` 和 `Submitted OK` 日志。

## Expected Behaviors

| Plugin | 事件 | 预期行为 |
|--------|------|----------|
| notify | session.idle | 弹出桌面通知，显示项目名 + 任务摘要 |
| notify | session.error | 弹出错误通知 |
| compaction | session.compacting | 压缩摘要使用用户语言 |
| backgroundSubagent | task() 调用 | 系统提示注入调度策略 |
| backgroundSubagent | 前台 task() | 输出末尾追加提醒 |
| leaderboard | message.updated | 向 claudecount.com API 上报 token 用量 |

## Troubleshooting

### 插件未加载

```bash
# 确认路径正确
cat ~/.config/opencode/opencode.json
# 确认配置文件存在
cat ~/.config/opencode/oc-tweaks.json
# 检查日志
cat ~/.config/opencode/plugins/oc-tweaks.log
```

### notify 不弹通知

1. 确认 `notify.enabled` 为 `true`
2. 确认系统有可用的通知命令（`which pwsh` / `which notify-send` / `which osascript`）
3. WSL 用户确认 `pwsh` 或 `powershell.exe` 可从 WSL 调用
4. 尝试设置 `notify.command` 为自定义命令进行调试

### leaderboard 上报失败

1. 确认 `~/.claude/leaderboard.json` 存在且格式正确
2. 确认网络可达 `https://api.claudecount.com`
3. 检查日志中的错误信息

### 运行 smoke test 快速验证

```bash
bun run --cwd packages/oc-tweaks smoke
```

输出 `SMOKE_RESULT: PASS` 表示所有插件的基本功能正常。
