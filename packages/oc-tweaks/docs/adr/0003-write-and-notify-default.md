# ADR 0003：autoWrite 默认值为 'notify'，而非 'off' 或 'reviewable'

## Status

Accepted

## Context

`autoWrite` 控制模型触发写入 memory 文件时的行为，共三个可选值：

- `"off"`：禁止自动写入，模型只能读取 memory，不能写入。
- `"notify"`：后台直接写入，同时向用户展示写入摘要（scope / relPath / action / willAffectRecall 四个字段）。
- `"reviewable"`（若实现）：生成 diff 草稿，等待用户显式确认后再写入。

根据 plan Interview Summary（行 41）：

> Auto-write 默认 = Write + Notify：后台直接写但必须 stderr/notify 显示 scope/path/action。

SDK spike 笔记（`packages/oc-tweaks/docs/sdk-spike-notes.md`）§4 结论（行 163-166）
确认了通知通道的可用性与降级序列：

> Notify 通道降级序列：shell notifier → `client.tui.showToast` → 静默 stderr/log → 下条 `system.transform` 内嵌 `<system-reminder>`。

这意味着"写入后通知"在已有基础设施（`notify.ts`，测试覆盖于 `notify.test.ts:183-205`）上
可以直接实现，不需要引入新的交互等待机制。

`"off"` 作为默认值会使 Write+Notify 这个核心特性对新用户完全不可见，
需要用户主动阅读文档并修改配置才能体验；这与"开箱即用的自动写入"目标背道而驰。

`"reviewable"` 作为默认值需要在 plugin 层实现"draft 暂存 → 用户确认 → 实际写入"
的完整状态机，包括暂存文件的管理、超时清理、以及与 TUI 的交互接口；
SDK spike 未找到 server plugin 可直接渲染"等待确认"UI 的接口，
该方案风险高、实现复杂、V1 不宜作为默认。

## Decision

`autoWrite` 配置项的默认值为 `"notify"`。

行为语义：
- 模型触发写入时，插件在后台完成写入（含 tmpfile + fsync + rename 原子序列）。
- 写入完成后，通过通知通道输出 4 个字段的摘要：
  - `scope`：`global` 或 `project`
  - `relPath`：相对 memory root 的路径
  - `action`：`created` / `updated` / `appended`
  - `willAffectRecall`：布尔，说明此次写入是否影响后续召回结果
- 通知通道按降级序列执行，不因通知失败而中断写入流程。

用户若要关闭自动写入，显式配置 `autoWrite: "off"`。

## Consequences

**正面**

- 新用户无需配置即可体验完整的"写入 + 可见性"循环，降低上手门槛。
- 通知提供的 4 字段摘要让用户知道写了什么、写在哪、是否影响召回，
  同时不打断工作流（无需等待用户响应）。
- 通知失败不阻塞写入，降级序列已有测试覆盖（`notify.test.ts:225-236`）。

**负面**

- 用户在未明确了解配置前，内容已被写入文件系统；
  对写入敏感的用户需要主动设置 `autoWrite: "off"`。
- `"notify"` 不提供撤销或预览，若模型写入内容有误，用户需要手动修改或删除。

**不受影响**

- 软件层护栏（realpath 校验、大小上限、节流、sanitization）与 `autoWrite` 值无关，
  在所有模式下均生效。
- `"reviewable"` 作为配置值保留在接口定义中，V2 可实现其完整语义。

## Alternatives Considered

### 方案 A：默认 `"off"`

最保守的默认值，用户零意外。

拒绝原因：Write+Notify 是本次增强的核心特性；默认关闭意味着
大多数用户永远不会体验到它，且无法从实际使用中收集反馈来指导 V2 设计。

### 方案 B：默认 `"reviewable"`

每次写入前展示 diff，等用户确认。

拒绝原因：SDK spike §4（行 144，tui.d.ts 范围）未在 server plugin Hooks 中
找到"渲染等待确认 UI"的标准接口；
实现需要引入 draft 状态机与 TUI 扩展，复杂度超出 V1 边界。

### 方案 C：默认 `"notify"` 但首次运行弹引导（本 ADR 未采用的变体）

首次写入时展示一次性说明，之后静默。

评估结论：首次运行检测需要持久化 flag，增加实现复杂度；
通知本身已经提供了足够的可见性，无需额外引导层；
此变体留作 V2 可选优化。
