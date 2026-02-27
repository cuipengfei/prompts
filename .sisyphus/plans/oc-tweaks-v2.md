# oc-tweaks v2: 增量改进

## TL;DR

> **Quick Summary**: 7 项改进 — 默认关闭 + CLI init + 语气软化 + WPF 通知 + 共享 Logger + Smoke 测试 + README 双语文档
>
> **Deliverables**: 配置系统重构、WPF 通知替换 UWP Toast、共享日志、CLI 初始化工具、完整文档
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: T1 → T2/T4 → T5 → T8 → FINAL

---

## Context

### Original Request
用户要求对已完成的 oc-tweaks 包做 7 项增量改进。

### Interview Summary
- 所有 4 个插件默认关闭，需要配置文件 + enabled: true 才启用
- 提供 `bunx oc-tweaks init` CLI 命令创建配置文件
- background-subagent 的 VIOLATION_WARNING 语气太强，改为友善提醒
- Windows 通知从 UWP Toast 完全替换为 WPF 自定义窗口（参考 `/home/cpf/.claude/hooks/notify-wpf.sh`）
  - 不抢焦点（WS_EX_NOACTIVATE + ShowActivated=False）
  - 跨虚拟桌面（WS_EX_TOOLWINDOW）
  - 样式可配置（颜色、圆角、尺寸、透明度等）
- 提取 leaderboard 独有 log() 为共享 Logger，所有插件接入
- 配置项 `logging: { enabled, maxLines }` 控制日志
- 全部写单元测试
- smoke test 脚本 + OpenCode 实测
- README 中英双语在一个文件

### Metis Review
- 语气改后测试断言 `[VIOLATION]` 会失效 → 同步更新测试
- WS_EX_NOACTIVATE + 点击关闭需验证兼容性
- 日志并发写需单通道
- 非 Windows 平台不改
- 所有新增配置必须有默认值

---

## Work Objectives

### Core Objective
对 oc-tweaks 做 7 项改进：默认关闭、CLI init、语气软化、WPF 通知、共享 Logger、测试、文档。

### Must Have
- 无配置文件时所有插件静默关闭
- `bunx oc-tweaks init` 生成默认配置到 `~/.config/opencode/oc-tweaks.json`
- VIOLATION_WARNING 改为友善提醒语气
- Windows 通知改用 WPF（不抢焦点 + 跨虚拟桌面 + 样式可配）
- 共享 Logger（utils/logger.ts）替换 leaderboard 独有日志
- 配置项 `logging: { enabled, maxLines }`
- 所有改动有单元测试
- smoke test 脚本
- README.md 中英双语完整文档

### Must NOT Have
- 不改 macOS/Linux/TUI/custom-command 通知路径
- 不引入外部日志框架
- 不改 packages/oc-tweaks 以外的代码（README 除外）
- 不做日志 level/filter/transport 全家桶
- 不搬 desktop-notify 的 FileWatcher 架构

---

## Verification Strategy

- **Infrastructure exists**: YES (bun test)
- **Automated tests**: Tests-after（每个实现任务包含测试）
- **Framework**: bun test

---

## Execution Strategy

```
Wave 1 (基础设施):
└── T1: 配置系统重构 [quick]

Wave 2 (核心功能, 并行 3):
├── T2: 共享 Logger [quick]
├── T3: background-subagent 语气软化 [quick]
└── T4: CLI init 命令 [quick]

Wave 3 (大功能 + 集成, 并行 3):
├── T5: notify WPF 重构 [unspecified-high]
├── T6: leaderboard 迁移共享 Logger [quick]
└── T7: compaction + bg-subagent + safeHook 接入 Logger [quick]

Wave 4 (文档 + E2E, 并行 2):
├── T8: Smoke test 脚本 [unspecified-high]
└── T9: README 中英双语文档 [writing]

Wave FINAL (审计, 并行 4):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real QA [unspecified-high]
└── F4: Scope fidelity check [deep]
```

### Dependency Matrix
- T1: — → T2,T3,T4,T5,T6,T7
- T2: T1 → T5,T6,T7
- T3: T1 → T7
- T4: T1 → T8
- T5: T1,T2 → T8
- T6: T2 → T8
- T7: T2,T3 → T8
- T8: T4,T5,T6,T7 → F1-F4
- T9: T1,T4,T5 → F1-F4

---

## TODOs


- [x] 1. 配置系统重构：类型扩展 + 默认关闭逻辑

  **What to do**:
  - 扩展 `OcTweaksConfig` 类型：加 `logging: { enabled?, maxLines? }` 和 `notify.style` 子类型（backgroundColor, backgroundOpacity, accentColor, textColor, borderRadius, colorBarWidth, width, height, titleFontSize, contentFontSize, iconFontSize, duration, position, shadow, idleColor, errorColor）
  - 改 `loadOcTweaksConfig()`：配置文件不存在时返回 `null`
  - 改所有 4 个插件入口：`enabled === false` → `enabled !== true`（即默认关闭）
  - 更新所有现有测试以适配新的 enabled 逻辑（测试需要 mock 配置文件存在且 enabled: true）

  **Must NOT do**:
  - 不改任何插件的业务逻辑，只改 enabled 检查
  - 不添加运行时提示（那是 T4 CLI init 的事）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: T2, T3, T4, T5, T6, T7
  - **Blocked By**: None

  **References**:
  - `packages/oc-tweaks/src/utils/config.ts` — 当前 OcTweaksConfig 类型和 loadOcTweaksConfig() 实现
  - `packages/oc-tweaks/src/plugins/compaction.ts:15` — 当前 enabled 检查模式 `config.compaction?.enabled === false`
  - `packages/oc-tweaks/src/plugins/background-subagent.ts:25` — 同上
  - `packages/oc-tweaks/src/plugins/leaderboard.ts:157` — 同上
  - `packages/oc-tweaks/src/plugins/notify.ts:18` — 同上
  - `packages/oc-tweaks/src/__tests__/compaction.test.ts` — 测试中 enabled: false 的 mock 模式
  - `/home/cpf/.claude/hooks/notify-wpf.sh:256-281` — WPF XAML 中可配置的样式属性参考

  **Acceptance Criteria**:
  - [ ] `OcTweaksConfig` 包含 `logging` 和 `notify.style` 子类型
  - [ ] `loadOcTweaksConfig()` 在文件不存在时返回 `null`
  - [ ] 所有 4 个插件在 config 为 null 或 enabled !== true 时返回 `{}`
  - [ ] `bun test packages/oc-tweaks/src/__tests__` → 全部 PASS

  **QA Scenarios**:
  ```
  Scenario: 无配置文件时插件全部关闭
    Tool: Bash (bun)
    Steps:
      1. 设置 HOME 到临时目录（无 oc-tweaks.json）
      2. import 并调用 compactionPlugin()
      3. 断言返回 {}
    Expected Result: 返回空对象，无报错
    Evidence: .sisyphus/evidence/task-1-no-config-disabled.txt

  Scenario: 配置文件存在但未设 enabled 时插件关闭
    Tool: Bash (bun)
    Steps:
      1. 创建 oc-tweaks.json 内容 { "compaction": {} }
      2. import 并调用 compactionPlugin()
      3. 断言返回 {}
    Expected Result: enabled 未显式为 true，插件关闭
    Evidence: .sisyphus/evidence/task-1-no-enabled-disabled.txt
  ```

  **Commit**: NO (groups with final)

---

- [x] 2. 共享 Logger（utils/logger.ts）

  **What to do**:
  - 创建 `src/utils/logger.ts`：从 leaderboard.ts 提取 log() 函数
  - 配置驱动：读取 `config.logging.enabled` 和 `config.logging.maxLines`（默认 100，保留 50）
  - 日志文件路径：`~/.config/opencode/plugins/oc-tweaks.log`
  - 确保目录不存在时自动创建
  - 增强 `safeHook`：catch 块中调用 logger 写日志（替代 console.warn）
  - 导出 logger 供所有插件使用
  - 在 `src/utils/index.ts` 导出 logger
  - 写单元测试：`src/__tests__/logger.test.ts`

  **Must NOT do**:
  - 不引入外部日志框架
  - 不做 log level/filter/transport
  - 不改 leaderboard.ts（那是 T6 的事）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T3, T4)
  - **Blocks**: T5, T6, T7
  - **Blocked By**: T1

  **References**:
  - `packages/oc-tweaks/src/plugins/leaderboard.ts:74-92` — 现有 log() 函数，MAX_LINES/KEEP_LINES 机制
  - `packages/oc-tweaks/src/utils/safe-hook.ts` — 当前 safeHook 用 console.warn，需改为 logger
  - `packages/oc-tweaks/src/utils/config.ts` — OcTweaksConfig.logging 类型（T1 新增）
  - `packages/oc-tweaks/src/utils/index.ts` — 需要导出 logger

  **Acceptance Criteria**:
  - [ ] `src/utils/logger.ts` 存在且导出 `createLogger` 或 `log` 函数
  - [ ] logger 读取 config.logging.enabled，为 false 时静默跳过
  - [ ] logger 读取 config.logging.maxLines，超限时截断保留后半
  - [ ] safeHook catch 块调用 logger 而非 console.warn
  - [ ] `bun test packages/oc-tweaks/src/__tests__/logger.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: logging enabled 时写入日志文件
    Tool: Bash (bun)
    Steps:
      1. mock config logging.enabled = true
      2. 调用 log("INFO", "test message")
      3. 读取日志文件内容
    Expected Result: 文件包含 "[INFO] test message"
    Evidence: .sisyphus/evidence/task-2-logger-write.txt

  Scenario: logging disabled 时不写文件
    Tool: Bash (bun)
    Steps:
      1. mock config logging.enabled = false
      2. 调用 log("INFO", "test message")
      3. 检查日志文件不存在
    Expected Result: 无文件写入，无报错
    Evidence: .sisyphus/evidence/task-2-logger-disabled.txt
  ```

  **Commit**: NO (groups with final)

---

- [x] 3. background-subagent 语气软化

  **What to do**:
  - 将 `SUB_AGENT_DISPATCH_PROMPT` 的语气从命令式改为建议式（保留核心策略内容）
  - 将 `VIOLATION_WARNING` 从 "⚠️⚠️⚠️ [VIOLATION] You violated...Do not repeat" 改为友善提醒，例如 "💡 [Reminder] Consider using background mode..."
  - 同步更新 `background-subagent.test.ts` 中对 `[VIOLATION]` 的断言，改为新关键词

  **Must NOT do**:
  - 不改 tool.execute.before/after 的判定逻辑，只改文案
  - 不加中文（保持英文 system prompt）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T2, T4)
  - **Blocks**: T7
  - **Blocked By**: T1

  **References**:
  - `packages/oc-tweaks/src/plugins/background-subagent.ts:5-21` — 当前文案
  - `packages/oc-tweaks/src/__tests__/background-subagent.test.ts:87-88` — 断言 [VIOLATION] 的测试

  **Acceptance Criteria**:
  - [ ] VIOLATION_WARNING 不再包含 "VIOLATION"、"violated"、"Do not repeat"
  - [ ] 新文案包含友善提醒词汇（Reminder/Consider/Tip）
  - [ ] 测试断言更新为新关键词
  - [ ] `bun test packages/oc-tweaks/src/__tests__/background-subagent.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: 前台调用 task 后提醒语气友善
    Tool: Bash (bun)
    Steps:
      1. 加载插件，触发 tool.execute.before(task, run_in_background=false)
      2. 触发 tool.execute.after
      3. 检查 output.output 内容
    Expected Result: 包含 "Reminder" 或 "Consider"，不包含 "VIOLATION" 或 "violated"
    Evidence: .sisyphus/evidence/task-3-softer-tone.txt
  ```

  **Commit**: NO (groups with final)

---

- [x] 4. CLI init 命令

  **What to do**:
  - 创建 `src/cli/init.ts`（文件首行加 `#!/usr/bin/env bun` shebang）：
    - 检查 `~/.config/opencode/oc-tweaks.json` 是否存在
    - 如果已存在，提示用户并退出（不覆盖）
    - 如果不存在，生成带注释的默认配置文件（所有插件 enabled: true + 常用选项）
    - 确保目录存在（mkdir -p）
    - 打印成功信息和文件路径
  - 在 `package.json` 加 `"bin": { "oc-tweaks": "./src/cli/init.ts" }`
  - init 生成的配置示例（带注释）：
    ```json
    {
      "notify": { "enabled": true },
      "compaction": { "enabled": true },
      "backgroundSubagent": { "enabled": true },
      "leaderboard": { "enabled": false },
      "logging": { "enabled": false, "maxLines": 200 }
    }
    ```
  - 写单元测试：`src/__tests__/cli-init.test.ts`

  **Must NOT do**:
  - 不覆盖已存在的配置文件
  - 不做交互式问答（简单直接）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T2, T3)
  - **Blocks**: T8
  - **Blocked By**: T1

  **References**:
  - `packages/oc-tweaks/package.json` — 需要加 bin 字段
  - `packages/oc-tweaks/src/utils/config.ts:36-41` — loadOcTweaksConfig 的路径逻辑，init 要用相同路径

  **Acceptance Criteria**:
  - [ ] `src/cli/init.ts` 存在
  - [ ] `package.json` 有 `bin` 字段指向 init.ts
  - [ ] 运行 init 后 `~/.config/opencode/oc-tweaks.json` 被创建
  - [ ] 再次运行不覆盖，提示已存在
  - [ ] `bun test packages/oc-tweaks/src/__tests__/cli-init.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: 首次 init 创建配置文件
    Tool: Bash
    Steps:
      1. 确保目标路径不存在
      2. 运行 bun packages/oc-tweaks/src/cli/init.ts
      3. 检查文件存在且内容正确
    Expected Result: JSON 文件创建成功，包含所有插件配置
    Evidence: .sisyphus/evidence/task-4-init-create.txt

  Scenario: 重复 init 不覆盖
    Tool: Bash
    Steps:
      1. 确保目标路径已存在
      2. 运行 bun packages/oc-tweaks/src/cli/init.ts
      3. 检查输出包含提示信息
    Expected Result: 不覆盖，提示文件已存在
    Evidence: .sisyphus/evidence/task-4-init-exists.txt
  ```

  **Commit**: NO (groups with final)

---

- [x] 5. notify WPF 重构（Windows 通知从 UWP Toast 改为 WPF）

  **What to do**:
  - 替换 `runPowerShellToast()` 为 `runWpfNotification()`，基于参考实现 `/home/cpf/.claude/hooks/notify-wpf.sh`
  - WPF 窗口要求：
    - `WindowStyle=None, AllowsTransparency=True, Topmost=True, ShowInTaskbar=False`
    - **不抢焦点**：`ShowActivated="False"` + P/Invoke `WS_EX_NOACTIVATE` (0x08000000)
    - **跨虚拟桌面**：P/Invoke `WS_EX_TOOLWINDOW` (0x00000080)，去掉 `WS_EX_APPWINDOW`
    - 点击关闭（MouseLeftButtonDown）
    - 自动关闭定时器
    - 子进程完全分离（不阻塞主进程）
  - 从 config.notify.style 读取可配项：
    - backgroundColor (default: "#101018")
    - backgroundOpacity (default: 0.95)
    - textColor (default: "#AAAAAA")
    - borderRadius (default: 14)
    - colorBarWidth (default: 5)
    - width (default: 420)
    - height (default: 105)
    - titleFontSize (default: 14)
    - contentFontSize (default: 11)
    - duration (default: 10000 ms)
    - position (default: "center")
    - shadow (default: true)
    - idleColor (default: "#4ADE80")
    - errorColor (default: "#EF4444")
  - XAML 模板参数化，根据 style 配置生成
  - 保持 `NotifySender` 类型的 pwsh 分支改为 wpf 分支
  - macOS/Linux/TUI/custom-command 路径完全不改
  - 接入共享 Logger（替换 console.warn）
  - 更新 `notify.test.ts` 中的 pwsh 相关测试
  - 特殊字符转义：消息中的 `' " \n < > &` 需正确处理 PowerShell + XAML 双重转义

  **Must NOT do**:
  - 不改 macOS (`osascript`)、Linux (`notify-send`)、TUI、custom-command 路径
  - 不搬 desktop-notify 的 FileWatcher 架构
  - 不用 ShowDialog()（会抢焦点），用 Show() + Dispatcher 消息循环

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T6, T7)
  - **Blocks**: T8
  - **Blocked By**: T1, T2

  **References**:
  - `/home/cpf/.claude/hooks/notify-wpf.sh` — 完整 WPF 参考实现（XAML + P/Invoke + 定时器）
  - `packages/oc-tweaks/src/plugins/notify.ts:98-123` — 当前 detectNotifySender，pwsh 分支需改为 wpf
  - `packages/oc-tweaks/src/plugins/notify.ts:179-223` — 当前 runPowerShellToast，需替换
  - `packages/oc-tweaks/src/utils/config.ts` — notify.style 类型（T1 新增）
  - `packages/oc-tweaks/src/__tests__/notify.test.ts` — 现有测试，需更新 pwsh 部分

  **Acceptance Criteria**:
  - [ ] `runPowerShellToast` 被替换为 WPF 方案
  - [ ] XAML 模板包含 `ShowActivated="False"`
  - [ ] P/Invoke 包含 WS_EX_TOOLWINDOW 和 WS_EX_NOACTIVATE
  - [ ] style 配置项注入 XAML 模板
  - [ ] macOS/Linux 路径未改动
  - [ ] `bun test packages/oc-tweaks/src/__tests__/notify.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: WPF 通知生成正确的 PowerShell 命令
    Tool: Bash (bun)
    Steps:
      1. mock shell，设置 pwsh 可用
      2. 加载插件，触发 session.idle 事件
      3. 检查 shell 调用参数
    Expected Result: 命令包含 PresentationFramework、WS_EX_TOOLWINDOW、ShowActivated="False"
    Evidence: .sisyphus/evidence/task-5-wpf-command.txt

  Scenario: 自定义 style 注入 XAML
    Tool: Bash (bun)
    Steps:
      1. mock config notify.style = { backgroundColor: "#FF0000", borderRadius: 20 }
      2. 加载插件，触发事件
      3. 检查生成的 XAML 包含自定义值
    Expected Result: XAML 中出现 "#FF0000" 和 "CornerRadius=\"20\""
    Evidence: .sisyphus/evidence/task-5-wpf-style.txt
  ```

  **Commit**: NO (groups with final)

---

- [x] 6. leaderboard 迁移共享 Logger

  **What to do**:
  - 移除 leaderboard.ts 中的私有 `log()` 函数、`getLogFilePath()`、`MAX_LINES`、`KEEP_LINES` 常量
  - 所有 `await log(...)` 调用改为使用共享 logger
  - 移除 `claude-leaderboard.log` 日志路径的硬编码
  - 更新 `leaderboard.test.ts`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T5, T7)
  - **Blocks**: T8
  - **Blocked By**: T2

  **References**:
  - `packages/oc-tweaks/src/plugins/leaderboard.ts:7-14,74-92` — 私有 log/path 函数
  - `packages/oc-tweaks/src/utils/logger.ts` — 共享 logger（T2 创建）
  - `packages/oc-tweaks/src/__tests__/leaderboard.test.ts` — 现有测试

  **Acceptance Criteria**:
  - [ ] leaderboard.ts 不再包含私有 log()/getLogFilePath()/MAX_LINES/KEEP_LINES
  - [ ] 所有日志调用使用共享 logger
  - [ ] `bun test packages/oc-tweaks/src/__tests__/leaderboard.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: leaderboard 使用共享 logger 写日志
    Tool: Bash (bun)
    Steps:
      1. grep leaderboard.ts 确认无私有 log 函数
      2. grep leaderboard.ts 确认 import 共享 logger
    Expected Result: 无私有日志函数，全部用共享 logger
    Evidence: .sisyphus/evidence/task-6-leaderboard-logger.txt
  ```

  **Commit**: NO (groups with final)

---

- [x] 7. compaction + bg-subagent + safeHook 接入 Logger

  **What to do**:
  - compaction.ts、background-subagent.ts 中的所有 console.warn 改为 logger
  - notify.ts 中的 console.warn 改为 logger（T5 可能已部分处理，检查并补全）
  - safeHook 已在 T2 处理，这里确认所有插件的游离 warn 都已覆盖
  - 更新相关测试

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T5, T6)
  - **Blocks**: T8
  - **Blocked By**: T2, T3

  **References**:
  - `packages/oc-tweaks/src/plugins/notify.ts:61,119-121` — console.warn 调用点
  - `packages/oc-tweaks/src/utils/logger.ts` — 共享 logger（T2）

  **Acceptance Criteria**:
  - [ ] `grep -r "console.warn" packages/oc-tweaks/src/plugins/` → 无结果
  - [ ] `grep -r "console.warn" packages/oc-tweaks/src/utils/` → 无结果
  - [ ] `bun test packages/oc-tweaks/src/__tests__` → 全部 PASS

  **QA Scenarios**:
  ```
  Scenario: 无游离 console.warn
    Tool: Bash (grep)
    Steps:
      1. grep -r "console.warn" packages/oc-tweaks/src/
    Expected Result: 零结果
    Evidence: .sisyphus/evidence/task-7-no-console-warn.txt
  ```

  **Commit**: NO (groups with final)

---

- [x] 8. Smoke test 脚本 + OpenCode 实测指南

  **What to do**:
  - 创建 `scripts/smoke-test.ts`：
    - 模拟 OpenCode plugin 上下文（$, directory, client）
    - 加载并初始化所有 4 个插件
    - 验证 hooks 正确注册
    - 触发关键事件（session.idle、session.error、message.updated、compacting）
    - 打印 SMOKE_RESULT: PASS/FAIL + exit code
  - 在 package.json 加 `"smoke": "bun scripts/smoke-test.ts"` 脚本
  - 创建 `scripts/e2e-guide.md`：OpenCode 实测步骤文档
    - 如何配置本地路径加载
    - 如何触发每个插件
    - 预期行为和检查点

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T9)
  - **Blocks**: F1-F4
  - **Blocked By**: T4, T5, T6, T7

  **References**:
  - `packages/oc-tweaks/src/index.ts` — 导出入口
  - `packages/oc-tweaks/src/__tests__/notify.test.ts:23-54` — shell mock 模式可复用
  - `packages/oc-tweaks/package.json` — 加 smoke 脚本

  **Acceptance Criteria**:
  - [ ] `bun run --cwd packages/oc-tweaks smoke` → 打印 "SMOKE_RESULT: PASS"，exit code 0
  - [ ] `scripts/e2e-guide.md` 存在且包含完整步骤

  **QA Scenarios**:
  ```
  Scenario: smoke test 通过
    Tool: Bash
    Steps:
      1. bun run --cwd packages/oc-tweaks smoke
      2. 检查 stdout 包含 "SMOKE_RESULT: PASS"
      3. 检查 exit code = 0
    Expected Result: 所有插件加载成功，事件触发无报错
    Evidence: .sisyphus/evidence/task-8-smoke-pass.txt
  ```

  **Commit**: NO (groups with final)

---

- [x] 9. README 中英双语文档

  **What to do**:
  - 重写 `packages/oc-tweaks/README.md`，一个文件包含中英文：
    - 英文在前，中文在后，用分割线分隔
    - 内容覆盖：
      - 简介（4 个插件功能概述）
      - 安装方式（npm/bun + opencode.json 配置）
      - `bunx oc-tweaks init` 快速开始
      - 每个插件的详细配置说明
      - notify.style WPF 可配置项说明
      - logging 配置说明
      - 完整配置示例
  - 同步更新根 README.md 中的 oc-tweaks 段落（如有必要）

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T8)
  - **Blocks**: F1-F4
  - **Blocked By**: T1, T4, T5

  **References**:
  - `packages/oc-tweaks/README.md` — 当前 3 行占位符
  - `README.md` — 根 README 中 oc-tweaks 段落，可能需同步更新
  - `packages/oc-tweaks/src/utils/config.ts` — 所有配置项类型定义
  - `packages/oc-tweaks/src/cli/init.ts` — init 命令（T4）的使用方式

  **Acceptance Criteria**:
  - [ ] `packages/oc-tweaks/README.md` 包含英文 + 中文两部分
  - [ ] 包含安装、配置、每个插件说明、完整示例
  - [ ] 包含 `bunx oc-tweaks init` 的使用说明
  - [ ] 包含 notify.style WPF 配置参考

  **QA Scenarios**:
  ```
  Scenario: README 内容完整性
    Tool: Bash (grep)
    Steps:
      1. grep "Installation" packages/oc-tweaks/README.md
      2. grep "安装" packages/oc-tweaks/README.md
      3. grep "oc-tweaks init" packages/oc-tweaks/README.md
      4. grep "notify.style" packages/oc-tweaks/README.md
    Expected Result: 所有关键词都存在
    Evidence: .sisyphus/evidence/task-9-readme-complete.txt
  ```

  **Commit**: NO (groups with final)
## Final Verification Wave

> 4 个审计 agent 并行运行。全部 APPROVE 才通过。任一 REJECT → 修复 → 重跑。

- [ ] F1. **Plan Compliance Audit** — `oracle`

  **What to do**:
  - 逐条读取计划中的 "Must Have"，验证实现是否存在（读文件、grep 关键代码、运行命令）
  - 逐条读取 "Must NOT Have"，在代码库中搜索违规模式 — 发现则 REJECT 并给出 file:line
  - 检查 `.sisyphus/evidence/` 下 T1-T9 每个任务的 evidence 文件是否存在
  - 对比实际交付物与计划中的 "Concrete Deliverables"

  **Must NOT do**:
  - 不修改任何源代码
  - 不运行会改变状态的命令

  **Recommended Agent Profile**:
  - **Category**: N/A (use `subagent_type="oracle"`)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave FINAL (with F2, F3, F4)
  - **Blocks**: None
  - **Blocked By**: T8, T9

  **References**:
  - `.sisyphus/plans/oc-tweaks-v2.md` — 本计划文件（Must Have / Must NOT Have 段落）
  - `.sisyphus/evidence/` — 所有 evidence 文件目录
  - `packages/oc-tweaks/src/` — 源代码目录

  **Acceptance Criteria**:
  - [ ] Must Have 逐条通过率 = 100%
  - [ ] Must NOT Have 零违规
  - [ ] Evidence 文件完整（T1-T9 每个至少 1 个）
  - [ ] 输出格式：`Must Have [N/N] | Must NOT Have [N/N] | Evidence [N/N] | VERDICT: APPROVE/REJECT`

---

- [ ] F2. **Code Quality Review** — `unspecified-high`

  **What to do**:
  - 运行 `bunx tsc -p packages/oc-tweaks/tsconfig.json --noEmit`，检查类型错误
  - 运行 `bun test packages/oc-tweaks/src/__tests__`，检查测试全部通过
  - 审查所有变更文件（与 v1 基线对比），检查：
    - `as any` / `@ts-ignore` / `@ts-expect-error` 使用
    - 空 catch 块
    - console.log / console.warn 残留（应全部替换为 logger）
    - 注释掉的代码
    - 未使用的 import
    - AI slop：过度注释、过度抽象、泛化命名（data/result/item/temp）

  **Must NOT do**:
  - 不修改任何源代码（只审查和报告）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave FINAL (with F1, F3, F4)
  - **Blocks**: None
  - **Blocked By**: T8, T9

  **References**:
  - `packages/oc-tweaks/tsconfig.json` — TypeScript 配置
  - `packages/oc-tweaks/src/` — 所有源代码
  - `packages/oc-tweaks/src/__tests__/` — 所有测试文件

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` → 零错误
  - [ ] `bun test` → 全部 PASS
  - [ ] 无 `as any` / `@ts-ignore` 新增
  - [ ] 无 console.warn/console.log 残留（test 文件除外）
  - [ ] 无注释掉的代码
  - [ ] 输出格式：`Build [PASS/FAIL] | Tests [N pass/N fail] | Issues [N] | VERDICT: APPROVE/REJECT`

---

- [ ] F3. **Real QA** — `unspecified-high`

  **What to do**:
  - 从干净状态开始，执行 T1-T9 每个任务的所有 QA Scenarios（按 evidence 中步骤操作）
  - 测试跨任务集成：
    - 无配置文件 → 所有插件静默关闭（T1）
    - `bunx oc-tweaks init` 创建配置 → 启用后所有插件正常加载（T4 + T1）
    - Logger 写入正常（T2 + T6 + T7）
    - WPF 通知命令格式正确（T5）
    - Smoke test 通过（T8）
  - 测试边界用例：
    - 配置文件为空 JSON `{}`
    - 配置文件中有未知字段
    - logging.maxLines = 0
    - notify.style 部分覆盖（只设 backgroundColor 不设其他）
  - 保存所有证据到 `.sisyphus/evidence/final-qa/`

  **Must NOT do**:
  - 不修改任何源代码
  - 不跳过任何 scenario

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave FINAL (with F1, F2, F4)
  - **Blocks**: None
  - **Blocked By**: T8, T9

  **References**:
  - `.sisyphus/plans/oc-tweaks-v2.md` — 每个任务的 QA Scenarios
  - `.sisyphus/evidence/` — 已有的 evidence 文件作为参照
  - `packages/oc-tweaks/src/__tests__/` — 单元测试作为补充参考

  **Acceptance Criteria**:
  - [ ] T1-T9 所有 QA Scenarios 执行通过
  - [ ] 跨任务集成测试通过
  - [ ] 边界用例测试通过
  - [ ] 所有证据保存到 `.sisyphus/evidence/final-qa/`
  - [ ] 输出格式：`Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT: APPROVE/REJECT`

---

- [ ] F4. **Scope Fidelity Check** — `deep`

  **What to do**:
  - 逐个任务（T1-T9）：读取 "What to do"，对比实际代码变更
  - 验证 1:1 对应：
    - 计划中写的每项都已实现（无遗漏）
    - 未在计划中的代码不存在（无越界）
  - 检查 "Must NOT do" 合规：每个任务的禁区是否被尊重
  - 检测跨任务污染：Task N 是否修改了 Task M 的专属文件
  - 标记任何未在计划中的文件变更

  **Must NOT do**:
  - 不修改任何源代码

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave FINAL (with F1, F2, F3)
  - **Blocks**: None
  - **Blocked By**: T8, T9

  **References**:
  - `.sisyphus/plans/oc-tweaks-v2.md` — 每个任务的 "What to do" 和 "Must NOT do"
  - `packages/oc-tweaks/src/` — 源代码目录
  - `packages/oc-tweaks/scripts/` — 脚本目录

  **Acceptance Criteria**:
  - [ ] T1-T9 所有计划项均已实现
  - [ ] 无越界代码（未在计划中的变更）
  - [ ] 无跨任务污染
  - [ ] "Must NOT do" 零违规
  - [ ] 输出格式：`Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT: APPROVE/REJECT`
---

## Commit Strategy

- 全部完成后一次性提交，等待用户明确许可

## Success Criteria

```bash
bun test packages/oc-tweaks/src/__tests__  # 全部 pass
bunx tsc -p packages/oc-tweaks/tsconfig.json --noEmit  # 无错误
bun run --cwd packages/oc-tweaks smoke  # PASS
```
