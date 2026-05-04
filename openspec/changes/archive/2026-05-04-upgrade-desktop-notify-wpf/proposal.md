# Proposal: upgrade-desktop-notify-wpf

## Summary

新增 `desktop-notify-wpf` 插件，提供基于 WPF 的跨虚拟桌面通知方案，与现有 `desktop-notify` 插件并存，用户可根据需求选择安装其中一个。

## Why

现有 `desktop-notify` 插件使用 WebSocket + Browser Notification，适合某些场景。但有用户需要：

1. **跨所有虚拟桌面可见** - 无论在哪个桌面都能看到通知
2. **无需浏览器常驻** - 不想保持浏览器标签页打开
3. **更醒目的视觉效果** - 屏幕中央弹窗，不会错过

新增 `desktop-notify-wpf` 插件提供：

- **跨所有虚拟桌面可见** - 使用 WS_EX_TOOLWINDOW 样式
- **无需浏览器** - 直接弹出原生 Windows 窗口
- **零依赖** - WPF/.NET Framework 随 Windows 预装
- **样式可定制** - 圆角、阴影、自定义颜色

## What Changes

### 插件选择

| 插件 | 方案 | 跨桌面 | 需要浏览器 | 适用场景 |
|------|------|--------|-----------|----------|
| `desktop-notify` | WebSocket + Browser | ❌ | ✅ | 轻量、跨平台 |
| `desktop-notify-wpf` | FileWatcher + WPF | ✅ | ❌ | Windows、跨桌面 |

用户只需安装其中一个插件。

### 新插件架构

```
Container/WSL                 Windows Host
─────────────────             ────────────────
Hook fires
   ↓
Write JSON to    ──────────▶  PowerShell FileWatcher
shared directory                   ↓
                              WPF Popup (cross-desktop)
```

### 核心特性

| 特性 | 规格 |
|------|------|
| 位置 | 屏幕中央 |
| 跨桌面 | ✅ 所有虚拟桌面可见 |
| 默认超时 | 10 秒自动关闭 |
| 手动关闭 | 点击任意位置 |
| 样式 | 圆角 + 阴影 + 左侧彩色条 |

### 通知类型

| Hook 类型 | 图标 | 颜色 | 消息来源 |
|-----------|------|------|----------|
| Stop | ✅ | 绿色 #4ADE80 | 从 transcript 提取最后助手消息 |
| Notification | ⏳ | 橙色 #FBBF24 | hook 输入中的 message 字段 |

### Hook 输入数据

**Stop Hook Input:**
```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/session.jsonl",
  "cwd": "/path/to/project",
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
```

**Notification Hook Input:**
```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/session.jsonl",
  "cwd": "/path/to/project",
  "hook_event_name": "Notification",
  "message": "Claude needs your permission...",
  "notification_type": "permission_prompt"
}
```

## Scope

- **In scope:**
  - 新建 `desktop-notify-wpf` 插件
  - PowerShell WPF 通知脚本（FileWatcher 模式）
  - Hook 客户端（写 JSON 到共享目录）
  - hooks.json 配置 Stop 和 Notification 事件
  - 跨虚拟桌面支持

- **Out of scope:**
  - 修改现有 `desktop-notify` 插件
  - HTTP 服务器方案
  - Toast 通知
  - 分发/安装自动化（后续迭代）

## Dependencies

- Windows 10/11（.NET Framework 预装）
- PowerShell 5.1+ 或 pwsh 7+
- 共享目录访问（容器挂载或 WSL 互通）

## Plugin Structure

```
plugins/
├── desktop-notify/           # 现有插件（保持不变）
│   ├── hooks/
│   │   ├── hooks.json
│   │   └── notify.ts
│   └── .claude-plugin/
│       └── plugin.json
│
└── desktop-notify-wpf/       # 新增插件
    ├── hooks/
    │   ├── hooks.json
    │   └── notify-client.ts
    ├── scripts/
    │   └── notify-watcher.ps1
    └── .claude-plugin/
        └── plugin.json
```
