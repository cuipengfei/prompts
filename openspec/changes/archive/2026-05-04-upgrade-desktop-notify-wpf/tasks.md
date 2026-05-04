# Tasks: upgrade-desktop-notify-wpf

## Prerequisites

- [ ] 确认共享目录路径（如 `D:\notify`）

## Implementation Tasks

### 1. 创建插件目录结构

- [ ] 创建 `plugins/desktop-notify-wpf/` 目录
- [ ] 创建 `.claude-plugin/plugin.json` 元数据

### 2. 实现 PowerShell FileWatcher + WPF

- [ ] 创建 `scripts/notify-watcher.ps1`
  - FileSystemWatcher 监听共享目录
  - WPF 弹窗（跨虚拟桌面样式）
  - JSON 解析（title, text, icon, color, duration）
  - 读取后删除文件

### 3. 实现 Hook 客户端

- [ ] 创建 `hooks/notify-client.ts`
  - 读取 stdin JSON
  - Stop: 从 transcript 提取最后助手消息
  - Notification: 使用 message 字段
  - 写入 JSON 到共享目录

### 4. 配置 Hooks

- [ ] 创建 `hooks/hooks.json`
  - 配置 Stop 事件
  - 配置 Notification 事件

### 5. 更新 Marketplace

- [ ] 在 `.claude-plugin/marketplace.json` 添加插件条目

## Validation

- [ ] 启动 watcher，手动写入 JSON 测试弹窗
- [ ] 验证跨虚拟桌面可见
- [ ] 验证 10 秒自动关闭
- [ ] 验证点击关闭
- [ ] 测试 Stop hook 触发
- [ ] 测试 Notification hook 触发
- [ ] 验证文件自动清理（不积累）
