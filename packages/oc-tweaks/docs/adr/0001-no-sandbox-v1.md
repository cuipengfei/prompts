# ADR 0001：V1 不做 worker/sandbox 隔离

## Status

Accepted

## Context

Codex 的 consolidation agent 在写入 memory 时，运行于受严格限制的沙盒进程：
`cwd = memory root`、禁用网络、仅允许对 memory root 单目录写入。
这套沙盒通过 OS 级进程隔离来保证写入内容不会蔓延到项目目录之外，
也防止插件内代码在 consolidation 期间意外读取或修改工作区文件。

oc-tweaks 的 `auto-memory` 插件运行在 OpenCode 的 server plugin 进程模型内。
根据 SDK spike 笔记（`packages/oc-tweaks/docs/sdk-spike-notes.md`，§4 结论部分，行 163-166），
当前插件层的 `Hooks` 接口不暴露任何进程级隔离 API；
`status bar 写入通道`等 TUI hook 也未在 server plugin type 中出现。
插件和主进程共享同一个 Node/Bun 进程，没有内置 worker_threads 隔离边界。

若 V1 要复刻沙盒，需要：
1. 把自动写入逻辑 fork 到 worker_threads 或 child_process。
2. 通过 IPC 把写入请求从插件主进程传给 worker。
3. 在 worker 侧做路径 chroot 或 pledge 等 OS 级限制。
4. 处理 worker 崩溃、超时、重启的完整生命周期。

这会使 V1 的复杂度从"写入模块"跃升为"带 IPC 的进程编排"，
而当前用户场景（个人本地机器、单进程 OpenCode、非多用户）并不需要这一强度的隔离。

## Decision

V1 不引入 worker/sandbox 机制。

以软件层面的受限 writer（`writer.ts`）替代进程级隔离：
- **realpath 前缀校验**：任何写入目标必须在已知 memory root 下，拒绝路径遍历。
- **单文件大小上限**（`maxBytesPerFile`）：超限拒绝写入，防止意外覆盖大文件。
- **每会话写入次数节流**（`maxWritesPerSession` + 30s 同文件间隔）。
- **内容 sanitization**：剥离 `<system>`、`<tool_use>`、`<system-reminder>` 等提权 tag。
- **原子写入**：tmpfile + fsync + rename，不留半写状态。

这五条护栏覆盖了沙盒要解决的主要风险（路径逃逸、过量写入、内容注入），
实现复杂度保持在单文件模块内，无需跨进程通信。

## Consequences

**正面**

- 实现简单，可在单次 TDD 迭代内完成并覆盖所有护栏路径。
- 与现有 plugin 进程模型完全兼容，无需修改 OpenCode 主进程。
- 护栏逻辑可单独单测（纯函数，无进程依赖）。

**负面**

- 恶意插件（若 oc-tweaks 被其他插件调用或 node_modules 被污染）仍可绕过软件层护栏。
- 进程崩溃不影响主进程（现在两者同进程，写入异常会传播）。
- V2 若需要真正隔离，需重新设计 writer 与主进程间的接口。

**不受影响**

- 注入路径（`experimental.chat.system.transform`）与召回工具注册逻辑无变化。
- Notify 通道的降级序列（shell → toast → stderr → system-reminder）不依赖 worker。

## Alternatives Considered

### 方案 A：worker_threads 隔离

将写入逻辑放入 `worker_threads`，通过 `postMessage` 收发写入请求。

拒绝原因：Bun 的 `Worker` 与 Node 的 `worker_threads` 语义略有差异，
且 OpenCode server plugin 进程模型未文档化 worker 行为；
在 spike 阶段未实测 worker 可靠性，引入风险不可控。

### 方案 B：child_process fork + chroot

fork 一个子进程，仅给它 memory root 的写权限（Linux `pledge`/`landlock` 或 macOS `sandbox-exec`）。

拒绝原因：需要平台特化代码（Linux / macOS / WSL2 行为不同），
V1 用户场景为 WSL2，`landlock` 支持因内核版本差异，可靠性无法保证。

### 方案 C：延迟到 V2 的完整 sandbox

将"能不能 sandbox"作为 V2 spike 议题，V1 仅做软件护栏。

**这就是本 ADR 所采用的方案**，但明确记录为"V1 的有意取舍"而非"永久决策"。
V2 设计时应重新评估 OpenCode 插件 API 是否新增隔离接口。
