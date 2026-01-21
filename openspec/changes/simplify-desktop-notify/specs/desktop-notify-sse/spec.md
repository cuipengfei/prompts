# Spec: Desktop Notify SSE

## Overview

desktop-notify 插件使用 Bun + SSE + Web Notification 实现跨平台桌面通知。

---

## ADDED Requirements

### Requirement: SSE Notification Server

系统 SHALL 提供一个 HTTP 服务器，支持 SSE 推送通知到浏览器。

#### Scenario: 服务器启动
- GIVEN notify.ts 以 `--serve` 参数运行
- WHEN 服务器启动
- THEN 监听端口 9999（或 CC_NOTIFY_PORT 环境变量指定的端口）
- AND 提供 /health, /events, /notify, / 四个端点

#### Scenario: 健康检查
- GIVEN 服务器正在运行
- WHEN 客户端 GET /health
- THEN 返回 HTTP 200 和 "ok"

#### Scenario: SSE 连接
- GIVEN 服务器正在运行
- WHEN 浏览器连接 GET /events
- THEN 返回 Content-Type: text/event-stream
- AND 保持连接直到客户端断开

#### Scenario: 通知广播
- GIVEN 有浏览器通过 SSE 连接
- WHEN 收到 POST /notify 请求
- THEN 将消息广播到所有 SSE 客户端

---

### Requirement: Self-Starting Hook Client

系统 SHALL 在 hook 触发时自动检测并启动通知服务器。

#### Scenario: 服务器未运行
- GIVEN 服务器未运行（/health 无响应）
- WHEN hook 触发 notify.ts
- THEN 以 detached 模式启动服务器
- AND 等待服务器就绪
- AND 发送通知

#### Scenario: 服务器已运行
- GIVEN 服务器已运行（/health 返回 200）
- WHEN hook 触发 notify.ts
- THEN 直接发送通知
- AND 不启动新服务器实例

---

### Requirement: Notification Message Format

系统 SHALL 根据 hook 类型生成格式化的通知消息。

#### Scenario: Stop 事件通知
- GIVEN hook 类型为 "Stop"
- AND 项目目录为 "/path/to/myproject"
- WHEN 格式化消息
- THEN 消息为 "cc: myproject - ✓ 完成"

#### Scenario: Notification 事件通知
- GIVEN hook 类型为 "Notification"
- AND 项目目录为 "/path/to/myproject"
- WHEN 格式化消息
- THEN 消息为 "cc: myproject - ⏳ 等待输入"

#### Scenario: 无项目信息
- GIVEN hook 输入中无 cwd 字段
- WHEN 格式化消息
- THEN 使用 "claude" 作为默认项目名

---

### Requirement: Browser Notification UI

系统 SHALL 提供一个浏览器页面，接收 SSE 消息并显示 Web Notification。

#### Scenario: 页面加载
- GIVEN 用户访问 http://localhost:9999/
- WHEN 页面加载
- THEN 显示连接状态指示器
- AND 请求通知权限（如未授权）

#### Scenario: 收到通知
- GIVEN 浏览器已授权通知权限
- AND SSE 连接已建立
- WHEN 收到服务器消息
- THEN 显示 Web Notification 弹窗
- AND 在页面上记录通知历史

---

## REMOVED Requirements

### Requirement: PowerShell Toast Integration

移除 PowerShell Windows Toast 通知实现。

#### Scenario: 不再使用 PowerShell
- GIVEN 旧版使用 PowerShell 发送 Windows Toast
- WHEN 迁移到新版
- THEN 删除所有 PowerShell 相关代码
- AND 删除 XML 模板构建逻辑

### Requirement: Bash Script Implementation

移除 Bash 脚本实现。

#### Scenario: 不再使用 Bash
- GIVEN 旧版使用 400 行 Bash 脚本
- WHEN 迁移到新版
- THEN 删除 notify.sh 文件
- AND 使用 notify.ts 替代
