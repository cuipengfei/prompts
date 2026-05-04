# desktop-notify-wpf Specification

## Purpose

提供基于 WPF 的跨虚拟桌面通知功能，作为 Claude Code hooks 的可选通知方案。

## ADDED Requirements

### Requirement: Cross-Virtual-Desktop WPF Popup

系统 SHALL 显示一个在所有 Windows 虚拟桌面可见的 WPF 弹窗。

#### Scenario: 弹窗跨虚拟桌面可见
- GIVEN 用户在虚拟桌面 1
- AND 通知弹窗已显示
- WHEN 用户切换到虚拟桌面 2
- THEN 弹窗仍然可见

#### Scenario: 弹窗位于屏幕中央
- GIVEN 通知触发
- WHEN 弹窗显示
- THEN 弹窗位于屏幕正中央
- AND 弹窗宽度为 420px，高度为 105px

#### Scenario: 弹窗样式
- GIVEN 通知触发
- WHEN 弹窗显示
- THEN 弹窗具有 14px 圆角
- AND 具有阴影效果
- AND 左侧有 5px 彩色条

---

### Requirement: Notification Auto-Close

系统 SHALL 在指定时间后自动关闭弹窗。

#### Scenario: 默认超时关闭
- GIVEN 弹窗显示
- AND duration 为 10000（默认）
- WHEN 10 秒过去
- AND 用户未点击
- THEN 弹窗自动关闭

#### Scenario: 手动点击关闭
- GIVEN 弹窗显示
- WHEN 用户点击弹窗任意位置
- THEN 弹窗立即关闭

#### Scenario: 禁用自动关闭
- GIVEN duration 为 0
- WHEN 弹窗显示
- THEN 弹窗不会自动关闭
- AND 只能通过点击关闭

---

### Requirement: FileWatcher Communication

系统 SHALL 通过共享目录的 JSON 文件接收通知请求。

#### Scenario: 检测新文件
- GIVEN FileWatcher 正在监听共享目录
- WHEN 新的 .json 文件写入目录
- THEN 系统读取文件内容
- AND 解析 JSON 数据
- AND 显示 WPF 弹窗

#### Scenario: 文件自动清理
- GIVEN FileWatcher 读取了 JSON 文件
- WHEN 弹窗显示后
- THEN 该 JSON 文件被删除
- AND 目录中不积累临时文件

#### Scenario: 启动时处理遗留文件
- GIVEN FileWatcher 启动
- AND 共享目录中存在 .json 文件
- WHEN FileWatcher 初始化完成
- THEN 处理所有现有 .json 文件
- AND 逐一显示弹窗并删除文件

---

### Requirement: Stop Hook Notification

系统 SHALL 为 Stop hook 显示任务完成通知。

#### Scenario: Stop 通知格式
- GIVEN hook_event_name 为 "Stop"
- AND cwd 为 "/path/to/myproject"
- AND transcript 最后助手消息为 "代码已更新完成"
- WHEN 生成通知
- THEN 标题为 "✅ myproject"
- AND 内容为 "代码已更新完成"
- AND 颜色为 #4ADE80（绿色）

#### Scenario: 消息截断
- GIVEN 最后助手消息超过 120 字符
- WHEN 生成通知
- THEN 消息截断至 117 字符并添加 "..."

---

### Requirement: Notification Hook Notification

系统 SHALL 为 Notification hook 显示等待输入通知。

#### Scenario: Notification 通知格式
- GIVEN hook_event_name 为 "Notification"
- AND cwd 为 "/path/to/myproject"
- AND message 为 "Claude needs your permission"
- WHEN 生成通知
- THEN 标题为 "⏳ myproject"
- AND 内容为 "Claude needs your permission"
- AND 颜色为 #FBBF24（橙色）
