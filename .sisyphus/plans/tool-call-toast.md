# Tool Call Toast — 工具调用透明度通知

## TL;DR

> **Quick Summary**: 在 oc-tweaks notify 插件体系中新增 tool call 透明度通知——LLM 每次调用工具时弹出 WPF 弹窗显示工具名+参数，支持垂直堆叠、排队不丢失、可配置。代码架构遵循 SOLID/SoC，从 notify.ts 提取共享 WPF 模块实现复用。
>
> **Deliverables**:
> - `src/utils/wpf-notify.ts` — 共享 WPF 弹窗模块（XAML 生成、PS 脚本构建、增强转义、sender 检测）
> - `src/utils/wpf-position.ts` — WPF 位置管理器（堆叠坐标计算、slot 分配/释放、排队消费）
> - `src/plugins/tool-call-notify.ts` — 工具调用通知插件
> - `src/utils/config.ts` — 扩展 OcTweaksConfig 添加 toolCall 配置
> - `src/plugins/notify.ts` — 重构使用共享 WPF 模块
> - `src/__tests__/wpf-notify.test.ts` — 共享模块测试
> - `src/__tests__/tool-call-notify.test.ts` — 新插件测试
> - 更新 `notify.test.ts`、`index.ts`、README
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: T1/T2/T3 → T5 → T7 → F1-F4

---

## Context

### Original Request

用户希望在 OpenCode TUI 中获得 LLM 工具调用的透明度——当前 TUI 不显示 agent 调用了哪些工具、传了什么参数。通过非侵入式 WPF 弹窗实时展示 tool name + args，支持多弹窗垂直堆叠、超限排队、可配置位置/时长/数量上限。

### Interview Summary

**Key Discussions**:
- **showToast API 不满足需求**: TUI toast 同时只显示一个（新覆盖旧），位置不可控。必须用 WPF。
- **布局**: 垂直堆叠，新弹窗在底部。
- **超限处理**: 用户明确拒绝"最旧消失"方案（"our primary goal is to give user transparency, that would defeat the purpose"），选择排队等待、零丢失。
- **代码架构**: SOLID、SoC、模块化。从 notify.ts 提取 WPF 逻辑到共享模块，两插件复用。
- **实验验证**: 在 `~/.config/opencode/plugins/tool-call-toast.ts` 中完成原型验证，17+ 工具类型测试通过。

**Research Findings**:
- `tool.execute.before` hook: `args` 在 `output` 中而非 `input` 中。
- `backgroundSubagentPlugin` 已占用 `tool.execute.before`，多 Plugin 同 hook 共存经实验验证可行。
- WPF `WindowStartupLocation` 只接受 `Manual`/`CenterScreen`/`CenterOwner`，堆叠必须用 `Manual` + 精确 Left/Top 坐标。
- 现有参数转义仅做单引号替换，tool args 含任意字符需增强。

### Metis Review

**Identified Gaps** (addressed):
- **WPF Manual 定位坐标系**: 使用 `SystemParameters.PrimaryScreenWidth/Height` 计算右上角坐标，每个弹窗递增 `Height + gap`。
- **进程洪泛风险**: 排队机制 + maxVisible 天然限制同时 pwsh 进程数。
- **参数转义不足**: 增强为 Base64 编码传参（PowerShell `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(...))`），消除所有特殊字符问题。
- **fire-and-forget 生命周期**: TS 侧用 `setTimeout(duration + buffer)` 估算 slot 释放时机。

---

## Work Objectives

### Core Objective

实现工具调用透明度通知功能，同时重构现有 notify 插件提取共享 WPF 模块，消除代码重复。

### Concrete Deliverables

- 用户配置 `notify.toolCall.enabled: true` 后，每次 LLM 调用工具时弹出 WPF 弹窗
- 弹窗显示工具名（标题）+ 参数（正文，JSON 格式化后截断）
- 多弹窗垂直堆叠显示，新弹窗在底部
- 超过 maxVisible 的弹窗排队等待，不丢失
- 共享 WPF 模块被 notify.ts 和 tool-call-notify.ts 共用
- 完整测试覆盖

### Definition of Done

- [ ] `bun test` — 所有测试通过（包含新增测试）
- [ ] `bun run build` — 构建成功无报错
- [ ] 配置 `notify.toolCall.enabled: true` 后，执行工具调用触发 WPF 弹窗
- [ ] 多个快速工具调用时弹窗垂直堆叠，不覆盖
- [ ] 超过 maxVisible 时排队等待，全部最终显示
- [ ] notify.ts 重构后行为不变（现有 idle/error 通知正常）

### Must Have

- tool.execute.before hook 触发 WPF 弹窗
- 垂直堆叠 + 排队消费
- 共享 WPF 模块（notify.ts 和 tool-call-notify.ts 复用）
- 配置热重载（每次 hook 调用时读取最新配置）
- safeHook 包装确保不阻塞 agent 流程
- 参数转义安全（任意工具 args 不会导致 PS 注入）

### Must NOT Have (Guardrails)

- ❌ 不修改 idle/error 通知的行为（只重构内部实现）
- ❌ 不引入新的外部依赖
- ❌ 不在 tool-call-notify.ts 中重复 WPF XAML/PS 代码
- ❌ 不使用 `as any`（生产代码）
- ❌ 不硬编码工具过滤列表（用户通过配置控制）
- ❌ 不使用 TUI showToast 作为 fallback（不满足堆叠需求）
- ❌ 不直接修改 `~/.config/opencode/plugins/tool-call-toast.ts` 实验文件（它是独立的）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: YES (Tests-after)
- **Framework**: bun:test
- **Pattern**: 遵循现有测试约定（`// @ts-nocheck`、Bun global mock、`createShellMock`）

### QA Policy

每个 task 必须包含 agent-executed QA scenarios。
Evidence 保存到 `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`。

- **Module/Plugin**: 使用 Bash (`bun test`) — 运行测试，断言通过
- **Integration**: 使用 Bash (`bun run build`) — 验证构建
- **Behavioral**: 使用 Bash (`bun -e "..."`) — 导入模块验证 API

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 并行 3 tasks):
├── T1: OcTweaksConfig 类型扩展 [quick]
├── T2: 共享 WPF 弹窗模块 wpf-notify.ts [deep]
└── T3: WPF 位置管理器 wpf-position.ts [deep]

Wave 2 (Core — 并行 2 tasks):
├── T4: 重构 notify.ts 使用共享模块 (depends: T2) [unspecified-high]
└── T5: 新建 tool-call-notify.ts + index.ts 导出 (depends: T1, T2, T3) [deep]

Wave 3 (Tests + Docs — 并行 4 tasks):
├── T6: wpf-notify.test.ts + wpf-position 测试 (depends: T2, T3) [unspecified-high]
├── T7: tool-call-notify.test.ts (depends: T5) [unspecified-high]
├── T8: 更新 notify.test.ts 适配重构 (depends: T4) [unspecified-high]
└── T9: 更新 README 文档 (depends: T1, T5) [quick]

Wave FINAL (Review — 并行 4 tasks):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real manual QA [unspecified-high]
└── F4: Scope fidelity check [deep]

Critical Path: T2 → T5 → T7 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 3 & FINAL)
```

### Dependency Matrix

| Task | Blocked By | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | T5, T9 | 1 |
| T2 | — | T4, T5, T6 | 1 |
| T3 | — | T5, T6 | 1 |
| T4 | T2 | T8 | 2 |
| T5 | T1, T2, T3 | T7, T9 | 2 |
| T6 | T2, T3 | — | 3 |
| T7 | T5 | — | 3 |
| T8 | T4 | — | 3 |
| T9 | T1, T5 | — | 3 |
| F1-F4 | T6, T7, T8, T9 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `deep`, T3 → `deep`
- **Wave 2**: 2 tasks — T4 → `unspecified-high`, T5 → `deep`
- **Wave 3**: 4 tasks — T6 → `unspecified-high`, T7 → `unspecified-high`, T8 → `unspecified-high`, T9 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

---

- [ ] 1. 扩展 OcTweaksConfig 类型 — 添加 toolCall 配置

  **What to do**:
  - 在 `src/utils/config.ts` 的 `OcTweaksConfig` 接口中添加 `toolCall` 配置节：
    ```typescript
    toolCall?: {
      enabled?: boolean      // default: false
      duration?: number      // default: 3000 (ms)
      position?: string      // default: "top-right"
      maxVisible?: number    // default: 3
      maxArgLength?: number  // default: 300 (字符)
      filter?: {
        exclude?: string[]   // 排除的工具名列表
      }
    }
    ```
  - 将 `toolCall` 添加到 `notify` 配置节内（嵌套在 `notify` 下）
  - 更新 `DEFAULT_CONFIG` 的 `notify` 节包含空 `toolCall` 默认值

  **Must NOT do**:
  - 不修改 `loadOcTweaksConfig` 函数逻辑
  - 不修改其他配置节（compaction、autoMemory 等）
  - 不添加运行时默认值（默认值由使用方处理）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件类型定义修改，~10 行变更
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3)
  - **Blocks**: T5, T9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/utils/config.ts:35-51` — 现有 `OcTweaksConfig` 接口定义，新增 `toolCall` 应嵌套在 `notify` 节内
  - `src/utils/config.ts:17-33` — 现有 `NotifyStyle` 接口，展示可选属性 + 注释默认值的风格

  **API/Type References**:
  - `src/utils/config.ts:44-50` — `notify` 配置节当前结构，`toolCall` 应加在 `style` 之后

  **Acceptance Criteria**:
  - [ ] `OcTweaksConfig.notify.toolCall` 类型存在且包含 `enabled`, `duration`, `position`, `maxVisible`, `maxArgLength`, `filter` 字段
  - [ ] `bun run build` 构建通过
  - [ ] 现有测试不受影响：`bun test`

  **QA Scenarios**:

  ```
  Scenario: 类型定义正确导出
    Tool: Bash (bun)
    Steps:
      1. bun -e "import type { OcTweaksConfig } from './packages/oc-tweaks/src/utils/config'; const x: OcTweaksConfig = {} as any; console.log('type-check-ok')"
    Expected Result: 输出 "type-check-ok"，无类型错误
    Evidence: .sisyphus/evidence/task-1-type-export.txt

  Scenario: 现有测试不受影响
    Tool: Bash
    Steps:
      1. bun test --cwd packages/oc-tweaks
    Expected Result: 所有现有测试通过（51 tests, 0 failures）
    Evidence: .sisyphus/evidence/task-1-existing-tests.txt
  ```

  **Commit**: YES (groups with T2, T3)
  - Message: `feat(notify): add shared WPF module and toolCall config type`
  - Files: `src/utils/config.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 2. 创建共享 WPF 弹窗模块 wpf-notify.ts

  **What to do**:
  - 创建 `src/utils/wpf-notify.ts`，从 `notify.ts` 提取以下逻辑：
    - `NotifySender` 类型定义（原 L9-15）
    - `detectNotifySender()` 函数（原 L100-131）— 检测可用通知发送器
    - `commandExists()` 辅助函数（原 L133-135）
    - `notifyWithSender()` 函数（原 L137-177）— 分发到不同发送器
    - `runWpfNotification()` 函数（原 L184-334）— WPF XAML + PS 脚本生成
    - `showToastWithFallback()` 函数（原 L336-356）
    - `runCustomCommand()` 函数（原 L179-182）
    - `truncateText()` 函数（原 L358-361）
    - `cleanMarkdown()` 函数（原 L363-369）
    - `escapeAppleScript()` 函数（原 L372-374）
  - **增强参数转义**：创建 `escapeForPowerShell(text: string): string` 函数
    - 使用 Base64 编码方案：TS 侧 `Buffer.from(text).toString('base64')`，PS 侧 `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('...'))`
    - 替换现有的单引号替换逻辑（`replace(/'/g, "''")`）
  - **新增 `sendWpfToast()` 高层 API**：统一入口，接受 `{ title, message, tag, style, position?, $, sender }` 参数
  - 导出所有公共函数

  **Must NOT do**:
  - 不修改任何函数的外部行为（只是提取 + 增强转义）
  - 不删除 notify.ts 中的代码（T4 负责重构 notify.ts）
  - 不引入新依赖
  - 不在此 task 中实现位置管理（T3 负责）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 大量代码提取 + 重组，需要深入理解 WPF/PS 脚本交互
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3)
  - **Blocks**: T4, T5, T6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/plugins/notify.ts:9-15` — `NotifySender` 类型定义（原样提取）
  - `src/plugins/notify.ts:100-131` — `detectNotifySender` 实现（提取到共享模块）
  - `src/plugins/notify.ts:184-334` — `runWpfNotification` 完整实现（XAML + PS 脚本）——这是核心提取目标
  - `src/plugins/notify.ts:137-177` — `notifyWithSender` 分发函数
  - `src/plugins/notify.ts:358-374` — 工具函数（truncateText、cleanMarkdown、escapeAppleScript）

  **API/Type References**:
  - `src/utils/config.ts:17-33` — `NotifyStyle` 类型，wpf-notify 需要导入
  - `src/utils/index.ts` — barrel 导出，新模块需加入

  **External References**:
  - PowerShell Base64 解码：`[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('...'))`

  **WHY Each Reference Matters**:
  - notify.ts L184-334 是提取的核心——整个 XAML 生成 + PS 脚本构建逻辑搬到共享模块
  - NotifyStyle 类型需要从 config.ts 导入而非重复定义
  - 工具函数（truncateText 等）同时被 notify 和 tool-call-notify 使用，必须提取

  **Acceptance Criteria**:
  - [ ] `src/utils/wpf-notify.ts` 创建，导出：`NotifySender`, `detectNotifySender`, `notifyWithSender`, `sendWpfToast`, `runWpfNotification`, `escapeForPowerShell`, `truncateText`, `cleanMarkdown`
  - [ ] `escapeForPowerShell` 使用 Base64 编码方案
  - [ ] `bun run build` 构建通过

  **QA Scenarios**:

  ```
  Scenario: 模块导出验证
    Tool: Bash (bun)
    Steps:
      1. bun -e "const m = require('./packages/oc-tweaks/src/utils/wpf-notify'); console.log(Object.keys(m).sort().join(','))"
    Expected Result: 输出包含 detectNotifySender, notifyWithSender, sendWpfToast, escapeForPowerShell, truncateText, cleanMarkdown
    Evidence: .sisyphus/evidence/task-2-module-exports.txt

  Scenario: Base64 转义正确性
    Tool: Bash (bun)
    Steps:
      1. bun -e "const { escapeForPowerShell } = require('./packages/oc-tweaks/src/utils/wpf-notify'); const r = escapeForPowerShell(\"hello'world\\ntest\"); console.log(r)"
    Expected Result: 输出 Base64 编码字符串（非包含特殊字符的原文）
    Evidence: .sisyphus/evidence/task-2-base64-escape.txt
  ```

  **Commit**: YES (groups with T1, T3)
  - Message: `feat(notify): add shared WPF module and toolCall config type`
  - Files: `src/utils/wpf-notify.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 3. 创建 WPF 位置管理器 wpf-position.ts

  **What to do**:
  - 创建 `src/utils/wpf-position.ts`，实现弹窗堆叠位置管理：
    - **`WpfPositionManager` class**（单例模式或模块级状态）：
      - `slots: Map<number, { expiresAt: number }>` — 跟踪已占用的位置槽
      - `queue: Array<() => void>` — 等待显示的弹窗回调队列
      - `allocateSlot(duration: number): { slotIndex: number, release: () => void } | null` — 分配可用 slot
      - `enqueue(callback: () => void): void` — 加入排队
      - `processQueue(): void` — 消费队列（有空 slot 时自动触发）
    - **`calculatePosition(slotIndex: number, config: PositionConfig): { left: number, top: number }`**
      - `PositionConfig`: `{ position: string, width: number, height: number, gap?: number, screenMargin?: number }`
      - `top-right`: Left = `screenWidth - width - margin`，Top = `margin + slotIndex * (height + gap)`
      - `bottom-right`: Left = 同上，Top = `screenHeight - margin - (slotIndex + 1) * (height + gap)`
      - `center`: 忽略 slotIndex，返回 CenterScreen 标记
    - **生成 PowerShell 位置代码片段**：返回 XAML `WindowStartupLocation="Manual"` + `Left="{n}"` + `Top="{n}"`
      - 坐标通过 PS 的 `[System.Windows.SystemParameters]::PrimaryScreenWidth/Height` 运行时计算
  - 导出 `WpfPositionManager`, `calculatePosition`, `PositionConfig` 类型

  **Must NOT do**:
  - 不依赖 wpf-notify.ts（保持独立，被 wpf-notify 使用而非反过来）
  - 不引入文件 I/O 或网络请求
  - 不使用 `setInterval`（只用 `setTimeout` 做 slot 释放）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及坐标系计算、并发 slot 管理、排队消费逻辑
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2)
  - **Blocks**: T5, T6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/plugins/notify.ts:203` — 现有 `position` 配置用法：`const position = style?.position ?? "center"`
  - `src/plugins/notify.ts:210` — 现有 startupLocation 逻辑：`position === "center" ? "CenterScreen" : position` — 这个逻辑有 bug（非 center 时直接传字符串到 WPF 枚举），新模块需修复
  - `src/plugins/notify.ts:224` — XAML `WindowStartupLocation` 属性位置

  **External References**:
  - WPF `WindowStartupLocation` 枚举：只接受 `Manual`, `CenterScreen`, `CenterOwner`
  - PowerShell 屏幕尺寸 API：`[System.Windows.SystemParameters]::PrimaryScreenWidth`

  **WHY Each Reference Matters**:
  - notify.ts L210 的 startupLocation 逻辑有 bug：`top-right` 等值不是合法 WPF 枚举。位置管理器需要正确实现为 `Manual` + 精确坐标
  - PS `SystemParameters` API 用于运行时获取屏幕分辨率，计算弹窗坐标

  **Acceptance Criteria**:
  - [ ] `src/utils/wpf-position.ts` 创建，导出 `WpfPositionManager`, `calculatePosition`
  - [ ] `allocateSlot` 在 slots 满时返回 null
  - [ ] `enqueue` + `processQueue` 实现排队消费
  - [ ] `calculatePosition` 对 `top-right` 返回 `Manual` + 精确坐标
  - [ ] `bun run build` 构建通过

  **QA Scenarios**:

  ```
  Scenario: Slot 分配与释放
    Tool: Bash (bun)
    Steps:
      1. bun -e "const { WpfPositionManager } = require('./packages/oc-tweaks/src/utils/wpf-position'); const mgr = new WpfPositionManager(2); const s1 = mgr.allocateSlot(1000); const s2 = mgr.allocateSlot(1000); const s3 = mgr.allocateSlot(1000); console.log(s1?.slotIndex, s2?.slotIndex, s3)"
    Expected Result: 输出 "0 1 null"（两个 slot 分配成功，第三个返回 null）
    Evidence: .sisyphus/evidence/task-3-slot-allocation.txt

  Scenario: top-right 坐标计算
    Tool: Bash (bun)
    Steps:
      1. bun -e "const { calculatePosition } = require('./packages/oc-tweaks/src/utils/wpf-position'); const pos = calculatePosition(0, { position: 'top-right', width: 420, height: 80, screenWidth: 1920, screenHeight: 1080 }); console.log(pos.startupLocation, typeof pos.leftExpr, typeof pos.topExpr)"
    Expected Result: 输出 "Manual string string"（Manual 定位 + 表达式字符串）
    Evidence: .sisyphus/evidence/task-3-position-calc.txt
  ```

  **Commit**: YES (groups with T1, T2)
  - Message: `feat(notify): add shared WPF module and toolCall config type`
  - Files: `src/utils/wpf-position.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`


- [ ] 4. 重构 notify.ts 使用共享 WPF 模块

  **What to do**:
  - 将 `src/plugins/notify.ts` 中已提取到 `wpf-notify.ts` 的函数替换为导入调用：
    - 删除内联的 `NotifySender` 类型、`detectNotifySender`、`commandExists`、`notifyWithSender`、`runWpfNotification`、`runCustomCommand`、`showToastWithFallback`、`truncateText`、`cleanMarkdown`、`escapeAppleScript`
    - 从 `../utils/wpf-notify` 导入对应函数
  - 保持 `notifyPlugin` 的公共 API 和行为完全不变：
    - event hook 逻辑不变（idle/error 判断、配置读取、sendToast 调用）
    - `cachedSender` 缓存机制不变
    - `getProjectName` 和 `extractIdleMessage` 保留在 notify.ts 内（业务特定，不共享）
  - notify.ts 重构后应从 374 行减少到 ~80-100 行

  **Must NOT do**:
  - 不修改 idle/error 通知的外部行为
  - 不修改配置读取逻辑
  - 不在 notify.ts 中引入位置管理器（notify 的弹窗是单个的，不需要堆叠）
  - 不添加新功能，纯重构

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 大量代码删除 + 导入替换，需确保行为保持
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T5)
  - **Parallel Group**: Wave 2
  - **Blocks**: T8
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `src/plugins/notify.ts:1-66` — 插件入口 + event hook — 这部分保留，修改导入
  - `src/plugins/notify.ts:68-98` — `getProjectName` + `extractIdleMessage` — 保留不动
  - `src/plugins/notify.ts:100-374` — 被提取的函数 — 全部删除，改为 import

  **API/Type References**:
  - `src/utils/wpf-notify.ts` — T2 创建的共享模块，提供所有被提取的函数

  **WHY Each Reference Matters**:
  - L1-66 是插件入口，展示哪些 import 需要修改、哪些逻辑保留
  - L100-374 是要删除的部分，需要对照确认每个函数都已在 wpf-notify.ts 中提供

  **Acceptance Criteria**:
  - [ ] notify.ts 从 `../utils/wpf-notify` 导入共享函数
  - [ ] notify.ts 不再包含任何 WPF/PS 脚本代码
  - [ ] notify.ts 行数 < 120 行
  - [ ] `bun test src/__tests__/notify.test.ts` 全部通过（行为保持）
  - [ ] `bun run build` 构建通过

  **QA Scenarios**:

  ```
  Scenario: 重构后现有测试全部通过
    Tool: Bash
    Steps:
      1. bun test --cwd packages/oc-tweaks src/__tests__/notify.test.ts
    Expected Result: 所有 notify 测试通过，0 failures
    Evidence: .sisyphus/evidence/task-4-notify-tests.txt

  Scenario: notify.ts 不包含 WPF 代码
    Tool: Bash (grep)
    Steps:
      1. grep -c "PresentationFramework\|Add-Type\|XamlReader" packages/oc-tweaks/src/plugins/notify.ts
    Expected Result: 输出 "0"（无 WPF 相关代码）
    Evidence: .sisyphus/evidence/task-4-no-wpf-code.txt
  ```

  **Commit**: YES
  - Message: `refactor(notify): extract WPF logic to shared module`
  - Files: `src/plugins/notify.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 5. 新建 tool-call-notify.ts 插件 + 更新 index.ts 导出

  **What to do**:
  - 创建 `src/plugins/tool-call-notify.ts`，实现 `toolCallNotifyPlugin: Plugin`：
    - 注册 `tool.execute.before` hook，用 `safeHook` 包装
    - 每次 hook 触发时：
      1. 读取配置：`loadOcTweaksConfig()` → 检查 `config.notify?.toolCall?.enabled`
      2. 检查工具过滤：`config.notify.toolCall.filter?.exclude` 包含当前 tool name 则跳过
      3. 格式化参数：`JSON.stringify(output.args, null, 2)` → `truncateText(result, maxArgLength)`
      4. 申请 slot：通过 `WpfPositionManager.allocateSlot(duration)`
        - 如果返回 null（slot 满），`enqueue` 加入排队
      5. 发送 WPF 弹窗：调用 `sendWpfToast()` 传入 slot 位置信息
    - 缓存 `NotifySender` 检测结果（与 notify.ts 同样的模式）
    - 只在 sender.kind === "wpf" 时才显示弹窗（其他平台不支持堆叠）
  - 更新 `src/index.ts` 添加：`export { toolCallNotifyPlugin } from "./plugins/tool-call-notify"`
  - 弹窗外观：
    - 标题：`🔧 {toolName}`
    - 正文：截断后的 JSON 参数
    - 强调色：可配置（默认 `#60A5FA` 蓝色，区别于 idle 绿/error 红）
    - 图标：🔧
    - 没有 "Click to dismiss" 文本（tool call 弹窗短暂，不需要）

  **Must NOT do**:
  - 不重复 WPF XAML/PS 代码（必须用 wpf-notify.ts 共享模块）
  - 不修改 notify.ts
  - 不修改 background-subagent.ts
  - 不硬编码工具过滤列表（从配置读取）
  - 不用 TUI showToast 做 fallback

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心新插件实现，需要集成多个模块（config + wpf-notify + wpf-position）
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T4)
  - **Parallel Group**: Wave 2
  - **Blocks**: T7, T9
  - **Blocked By**: T1, T2, T3

  **References**:

  **Pattern References**:
  - `src/plugins/notify.ts:17-66` — `notifyPlugin` 实现模式：Plugin 异步函数、cachedSender、safeHook 包装、配置热重载
  - `src/plugins/background-subagent.ts:36-49` — `tool.execute.before` hook 实现模式：input.tool 判断、output.args 访问
  - `src/index.ts:1-5` — 插件导出模式，新增一行

  **API/Type References**:
  - `src/utils/config.ts` — `OcTweaksConfig.notify.toolCall` 配置类型（T1 创建）
  - `src/utils/wpf-notify.ts` — `sendWpfToast`, `detectNotifySender`, `truncateText`（T2 创建）
  - `src/utils/wpf-position.ts` — `WpfPositionManager`（T3 创建）
  - `@opencode-ai/plugin` — `Plugin` 类型、hook 签名

  **Test References**:
  - `src/__tests__/background-subagent.test.ts` — `tool.execute.before` hook 测试模式
  - `src/__tests__/notify.test.ts` — shell mock、Bun global mock 模式

  **External References**:
  - 实验插件 `~/.config/opencode/plugins/tool-call-toast.ts` — 原型参考（核心逻辑），但不要复制，需用共享模块重写

  **WHY Each Reference Matters**:
  - notify.ts L17-66 展示了插件的标准架构（Plugin 返回 hook map、cachedSender、safeHook），新插件应完全仿照
  - background-subagent.ts L36-49 展示了 tool.execute.before hook 的签名和使用方式（input.tool、output.args）
  - 实验插件是原型参考，但不能直接复制——它用 TUI showToast，我们需用 WPF

  **Acceptance Criteria**:
  - [ ] `src/plugins/tool-call-notify.ts` 创建，导出 `toolCallNotifyPlugin`
  - [ ] hook 注册为 `tool.execute.before`，用 `safeHook` 包装
  - [ ] 配置热重载：每次 hook 调用时读取 `loadOcTweaksConfig()`
  - [ ] 支持工具过滤（`filter.exclude` 配置）
  - [ ] 使用 `WpfPositionManager` 管理 slot + 排队
  - [ ] 使用 `sendWpfToast` 发送弹窗（不重复 WPF 代码）
  - [ ] `index.ts` 导出 `toolCallNotifyPlugin`
  - [ ] `bun run build` 构建通过

  **QA Scenarios**:

  ```
  Scenario: 插件注册正确的 hook
    Tool: Bash (bun)
    Steps:
      1. bun -e "const { toolCallNotifyPlugin } = require('./packages/oc-tweaks/src/plugins/tool-call-notify'); toolCallNotifyPlugin({ $: async () => {}, directory: '/tmp', client: {} }).then(h => console.log(Object.keys(h).join(',')))"
    Expected Result: 输出包含 "tool.execute.before"
    Evidence: .sisyphus/evidence/task-5-hook-registration.txt

  Scenario: 禁用时为 no-op
    Tool: Bash (bun)
    Steps:
      1. 配置 notify.toolCall.enabled = false
      2. 调用 hook，验证无 shell 执行记录
    Expected Result: hook 存在但不触发任何弹窗逻辑
    Failure Indicators: shell mock 记录到了调用
    Evidence: .sisyphus/evidence/task-5-disabled-noop.txt

  Scenario: 工具过滤生效
    Tool: Bash (bun)
    Steps:
      1. 配置 filter.exclude = ["think_sequentialthinking"]
      2. 调用 hook with input.tool = "think_sequentialthinking"
      3. 验证无弹窗触发
    Expected Result: 被过滤的工具不触发弹窗
    Evidence: .sisyphus/evidence/task-5-tool-filter.txt
  ```

  **Commit**: YES
  - Message: `feat(notify): add tool-call-notify plugin`
  - Files: `src/plugins/tool-call-notify.ts`, `src/index.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`


- [ ] 6. 共享 WPF 模块单元测试 wpf-notify.test.ts

  **What to do**:
  - 创建 `src/__tests__/wpf-notify.test.ts`，覆盖：
    - `detectNotifySender` — 测试各平台检测顺序（pwsh > powershell.exe > osascript > notify-send > tui > none）
    - `escapeForPowerShell` — 测试各种特殊字符（单引号、双引号、换行、反斜杠、JSON 字符串、中文）
    - `truncateText` — 测试截断边界
    - `cleanMarkdown` — 测试 markdown 符号清理
    - `WpfPositionManager` — 测试 slot 分配/释放/排队/消费
    - `calculatePosition` — 测试 top-right、bottom-right、center 坐标计算
  - 遵循现有测试约定：`// @ts-nocheck`、`bun:test` 导入、Bun global mock

  **Must NOT do**:
  - 不测试实际 WPF 弹窗显示（只测试逻辑）
  - 不使用外部测试框架

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 单元测试编写，需要理解被测模块的 API
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T8, T9)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T2, T3

  **References**:

  **Pattern References**:
  - `src/__tests__/notify.test.ts:1-60` — 测试文件结构、mock 模式、`createShellMock` 用法
  - `src/__tests__/utils.test.ts` — 工具函数测试模式

  **API/Type References**:
  - `src/utils/wpf-notify.ts` — T2 创建的被测模块
  - `src/utils/wpf-position.ts` — T3 创建的被测模块

  **Acceptance Criteria**:
  - [ ] `src/__tests__/wpf-notify.test.ts` 创建
  - [ ] 覆盖 detectNotifySender、escapeForPowerShell、truncateText、cleanMarkdown、WpfPositionManager、calculatePosition
  - [ ] `bun test src/__tests__/wpf-notify.test.ts` 全部通过

  **QA Scenarios**:

  ```
  Scenario: 所有共享模块测试通过
    Tool: Bash
    Steps:
      1. bun test --cwd packages/oc-tweaks src/__tests__/wpf-notify.test.ts
    Expected Result: 所有测试通过，0 failures
    Evidence: .sisyphus/evidence/task-6-wpf-notify-tests.txt
  ```

  **Commit**: YES (groups with T7, T8)
  - Message: `test(notify): add tests for shared WPF module and tool-call-notify`
  - Files: `src/__tests__/wpf-notify.test.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 7. tool-call-notify 插件单元测试

  **What to do**:
  - 创建 `src/__tests__/tool-call-notify.test.ts`，覆盖：
    - hook 注册验证（返回 `tool.execute.before`）
    - 禁用时 no-op（`toolCall.enabled = false` 或 `notify.enabled = false`）
    - 工具过滤（`filter.exclude` 包含当前工具时跳过）
    - 启用时触发弹窗发送（验证 shell 被调用）
    - 参数截断（超长 args 被截断）
    - 非 WPF 平台跳过（sender.kind !== "wpf" 时不发送）
  - 遵循现有测试约定：mockBunFile、mockBunWhich、createShellMock

  **Must NOT do**:
  - 不测试实际 WPF 弹窗
  - 不修改其他测试文件

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 插件测试，需理解 hook 签名和 mock 模式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T8, T9)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T5

  **References**:

  **Pattern References**:
  - `src/__tests__/notify.test.ts:1-60` — mock 模式、shell mock 创建、afterEach 清理
  - `src/__tests__/background-subagent.test.ts` — tool.execute.before hook 测试模式

  **API/Type References**:
  - `src/plugins/tool-call-notify.ts` — T5 创建的被测插件

  **Acceptance Criteria**:
  - [ ] `src/__tests__/tool-call-notify.test.ts` 创建
  - [ ] 覆盖：hook 注册、禁用 no-op、工具过滤、启用发送、参数截断、非 WPF 跳过
  - [ ] `bun test src/__tests__/tool-call-notify.test.ts` 全部通过

  **QA Scenarios**:

  ```
  Scenario: tool-call-notify 测试全部通过
    Tool: Bash
    Steps:
      1. bun test --cwd packages/oc-tweaks src/__tests__/tool-call-notify.test.ts
    Expected Result: 所有测试通过，0 failures
    Evidence: .sisyphus/evidence/task-7-tool-call-tests.txt
  ```

  **Commit**: YES (groups with T6, T8)
  - Message: `test(notify): add tests for shared WPF module and tool-call-notify`
  - Files: `src/__tests__/tool-call-notify.test.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 8. 更新 notify.test.ts 适配重构

  **What to do**:
  - 更新 `src/__tests__/notify.test.ts` 适配 T4 的重构：
    - 如果重构后 notify.ts 的导入路径变化，更新测试中的 import
    - 验证所有现有测试仍然通过（行为未变）
    - 如果 mock 结构需要调整（因为函数移到了共享模块），相应更新
  - 确保 notify 的 330 行测试全部通过

  **Must NOT do**:
  - 不删除现有测试用例
  - 不添加新的测试用例（这是纯适配任务）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 测试适配，需理解重构后的模块边界变化
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T7, T9)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T4

  **References**:

  **Pattern References**:
  - `src/__tests__/notify.test.ts:1-330` — 现有完整测试文件，需要适配重构
  - `src/plugins/notify.ts` — T4 重构后的结果，理解导入变化

  **Acceptance Criteria**:
  - [ ] `bun test src/__tests__/notify.test.ts` 全部通过
  - [ ] 现有测试用例数量不减少

  **QA Scenarios**:

  ```
  Scenario: notify 测试全部通过
    Tool: Bash
    Steps:
      1. bun test --cwd packages/oc-tweaks src/__tests__/notify.test.ts
    Expected Result: 所有现有测试通过，0 failures
    Evidence: .sisyphus/evidence/task-8-notify-tests-adapted.txt
  ```

  **Commit**: YES (groups with T6, T7)
  - Message: `test(notify): add tests for shared WPF module and tool-call-notify`
  - Files: `src/__tests__/notify.test.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 9. 更新 README 文档

  **What to do**:
  - 在 `packages/oc-tweaks/README.md` 的 `notify` 配置节中添加 `toolCall` 子节文档：
    - 配置属性表（enabled, duration, position, maxVisible, maxArgLength, filter）
    - 功能说明（透明度、堆叠、排队）
    - 配置示例
  - 同时更新中文部分的相同内容
  - 在插件列表中提及新功能

  **Must NOT do**:
  - 不修改其他插件的文档
  - 不添加与实现不一致的配置属性

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯文档更新，模仿现有 README 格式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T7, T8)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T1, T5

  **References**:

  **Pattern References**:
  - `packages/oc-tweaks/README.md` — 现有 README 格式，新文档应仿照 `notify.style` 表格风格

  **API/Type References**:
  - `src/utils/config.ts` — T1 扩展后的 `toolCall` 配置类型，确保文档与类型一致

  **Acceptance Criteria**:
  - [ ] README.md 英文部分包含 `notify.toolCall` 配置文档
  - [ ] README.md 中文部分包含相同内容
  - [ ] 配置属性与 `OcTweaksConfig` 类型一致

  **QA Scenarios**:

  ```
  Scenario: README 包含 toolCall 文档
    Tool: Bash (grep)
    Steps:
      1. grep -c "toolCall" packages/oc-tweaks/README.md
    Expected Result: 输出 >= 5（多处提及）
    Evidence: .sisyphus/evidence/task-9-readme-docs.txt
  ```

  **Commit**: YES
  - Message: `docs(oc-tweaks): document toolCall notification config`
  - Files: `README.md`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` + `bun test`. Review all changed files for: `as any` in production code, empty catches without comments, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify no code duplication between notify.ts and tool-call-notify.ts (shared module must be used).
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Import each module and verify exports. Run `bun test` end-to-end. Verify tool-call-notify plugin registers `tool.execute.before` hook. Verify wpf-notify module exports expected functions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Modules [N/N] | Tests [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes. Verify notify.ts idle/error behavior unchanged.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Scope | Message | Files |
|--------|-------|---------|-------|
| 1 | Wave 1 | `feat(notify): add shared WPF module and toolCall config type` | config.ts, wpf-notify.ts, wpf-position.ts |
| 2 | Wave 2 | `refactor(notify): extract WPF logic to shared module` | notify.ts |
| 3 | Wave 2 | `feat(notify): add tool-call-notify plugin` | tool-call-notify.ts, index.ts |
| 4 | Wave 3 | `test(notify): add tests for shared WPF module and tool-call-notify` | wpf-notify.test.ts, tool-call-notify.test.ts, notify.test.ts |
| 5 | Wave 3 | `docs(oc-tweaks): document toolCall notification config` | README.md |

Pre-commit for all: `bun test`

---

## Success Criteria

### Verification Commands

```bash
bun test --cwd packages/oc-tweaks           # Expected: all tests pass
bun run build --cwd packages/oc-tweaks      # Expected: build succeeds
bun -e "const m = require('./packages/oc-tweaks/dist/index.js'); console.log(typeof m.toolCallNotifyPlugin)"  # Expected: "function"
```

### Final Checklist

- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (existing + new)
- [ ] Build succeeds
- [ ] No code duplication between notify.ts and tool-call-notify.ts
- [ ] Shared WPF module used by both plugins
- [ ] README documents toolCall configuration
