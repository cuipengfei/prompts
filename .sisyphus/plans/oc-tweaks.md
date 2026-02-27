# oc-tweaks — OpenCode 运行时增强插件 npm 包

## TL;DR

> **目标**：将 4 个 OpenCode 插件合并为一个 npm 包 `oc-tweaks`，配置化、测试覆盖、GitHub Actions 自动发布。
>
> **交付物**：npm 包 + GitHub Actions 工作流 + 4 个文档更新
> **工作量**：中等
> **并行执行**：是 — 4 个 Wave

---

## 背景

### 原始需求
将 desktop-notify、compaction、prefer-background-subagent、claude-leaderboard 四个 OpenCode 插件合并为一个 npm 包。可配置化（去所有硬编码）、优雅降级（错误不中断工作流）、bun test 测试、GitHub Actions 发布、更新 CLAUDE.md 和三个 README。

### 源文件位置
- `~/.config/opencode/plugin/hooks.ts.bak` — desktop-notify（已是 Plugin SDK 格式）
- `~/.config/opencode/plugins/chinese-compaction.ts` — compaction（Plugin SDK 格式）
- `~/.config/opencode/plugins/prefer-background-subagent.ts` — background-subagent（Plugin SDK 格式）
- `~/.config/opencode/plugins/claude-leaderboard.ts` — leaderboard（Plugin SDK 格式）

### 技术验证结论（DeepWiki + Context7 + grep.app 验证）

1. **一个 npm 包可以导出多个 Plugin 函数**：OpenCode 用 `Object.entries(mod)` 遍历所有 export，每个 export 的函数独立初始化。不需要 compose 同名 hook。
2. **`bun publish --access public` 可用**：大量开源项目在 GitHub Actions 中使用，认证环境变量为 `NPM_CONFIG_TOKEN`。
3. **Plugin 函数签名**：`async ({ project, client, $, directory, worktree }) => Hooks`
4. **`client.session.messages()` API**：返回 `{ info: Message, parts: Part[] }[]`，hooks.ts.bak 中的用法正确。
5. **npm 包自动安装**：OpenCode 启动时用 `bun install` 安装 plugin 数组中的包，缓存到 `~/.cache/opencode/node_modules/`。
6. **`oven-sh/setup-bun@v2`**：标准 CI action。
7. **官方文档验证**（2025-02-25 抓取）：
   - [SDK 文档](https://opencode.ai/docs/zh-cn/sdk/) — `client.session.messages()` 返回 `{ info: Message, parts: Part[] }[]`；`client.app.log()` 结构化日志
   - [插件文档](https://opencode.ai/docs/zh-cn/plugins/) — 一个模块可导出多个 Plugin 函数；npm 包启动时 Bun 自动安装；事件列表完整
   - [生态文档](https://opencode.ai/docs/zh-cn/ecosystem/) — 30+ 社区插件/项目，有 [opencode-plugin-template](https://github.com/zenobi-us/opencode-plugin-template/) 可参考

---

## 工作目标

### 核心目标
创建 `oc-tweaks` npm 包，包含 4 个独立的 OpenCode Plugin 导出，全部可配置、有测试、自动发布。

### 必须有
- 4 个插件全部以 OpenCode Plugin SDK hooks 格式工作
- 导出 4 个独立的 named Plugin 函数（不需要 compose）
- 优雅错误处理 — 任何插件错误不得中断用户工作流
- 不含硬编码用户路径（`/home/cpf`）
- 所有 prompt 用英文撰写，包含 "respond in the user's preferred language" 声明
- bun test 测试套件覆盖所有插件
- GitHub Actions 工作流，tag 推送时发布到 npm
- 更新 CLAUDE.md + README.md + README.en.md + README.guwen.md

### 禁止
- 使用任何 npm 命令（全部用 bun）
- 硬编码特定语言的 prompt（用语言无关的声明）
- 修改现有 19 个 Claude Code 插件
- 引入复杂 i18n 框架

### 非目标（范围外）
- commands 分发方案（当前无原生远程分发机制，不在本次范围）
- agents 分发方案（同上）
- skills 分发（已有 `skills add` 机制，无需额外处理）
- 修改 OpenCode 核心或上游依赖

### 配置方案

**配置文件路径**: `~/.config/opencode/oc-tweaks.json`（可选，文件不存在 = 全部默认开启）

**完整配置结构**（所有字段均可选）：
```json
{
  "compaction": {
    "enabled": true
  },
  "backgroundSubagent": {
    "enabled": true
  },
  "leaderboard": {
    "enabled": true,
    "configPath": null
  },
  "notify": {
    "enabled": true,
    "notifyOnIdle": true,
    "notifyOnError": true,
    "command": null
  }
}
```

**设计原则**（参考社区插件 opencode-notificator + opencode-wakatime）：
- 所有 4 个插件均有 `enabled` 开关（默认 true）
- `config.xxx !== false` 模式 — 字段缺失 = 开启
- **notify.command** — 通知命令完全可覆盖:
  - `null`（默认）= 自动检测: `which powershell.exe` → `which osascript` → `which notify-send` → `client.tui.showToast()`
  - 字符串 = 用户自定义命令，支持 `$TITLE` 和 `$MESSAGE` 占位符
  - 示例: `"ssh myhost powershell.exe -NoProfile -Command \"...\""`（Docker Desktop + Hyper-V 场景）
  - 不硬编码 `powershell.exe` / `pwsh` — 任何环境都能用
- **leaderboard.configPath** — 覆盖 leaderboard 配置文件路径:
  - `null`（默认）= 搜索 `~/.claude/leaderboard.json` → `~/.config/claude/leaderboard.json`
  - 字符串 = 直接使用指定路径
- 全部读取 try/catch 静默降级

---

## 验证策略

- **测试框架**：bun test（内置）
- **测试方式**：实现后写测试（非 TDD）
- **QA 策略**：每个任务包含 agent 可执行的 QA 场景

---

## 执行策略

### 并行执行 Wave

```
Wave 1（基础 — 并行）：
├── T1: 项目脚手架 [quick]
└── T2: 共享工具 — 错误包装器 + 配置加载器 [quick]

Wave 2（插件迁移 — 最大并行）：
├── T3: compaction 插件迁移 + 测试 [quick]
├── T4: background-subagent 插件迁移 + 测试 [quick]
├── T5: leaderboard 插件迁移 + 测试 [unspecified-high]
└── T6: notify 插件迁移 + 测试 [unspecified-high]

Wave 3（集成 + CI — 并行）：
├── T7: 统一入口 index.ts + 集成测试 [quick]
└── T8: GitHub Actions 发布工作流 [quick]

Wave 4（文档 — 并行）：
├── T9: 三个 README 更新 [writing]
└── T10: CLAUDE.md 更新 [quick]

Wave FINAL（验证 — 4 并行）：
├── F1: 计划合规审计 [oracle]
├── F2: 代码质量审查 [unspecified-high]
├── F3: 真实 QA [unspecified-high]
└── F4: 范围忠实度检查 [deep]
```

### 依赖矩阵
- T1, T2: 无依赖 — 立即开始
- T3-T6: 依赖 T1, T2
- T7: 依赖 T3-T6
- T8: 依赖 T1
- T9, T10: 依赖 T7
- F1-F4: 依赖全部

---

## TODOs

### Wave 1 — 基础

- [x] 1. 项目脚手架 — `packages/oc-tweaks/` 目录结构

  **做什么**:
  - 创建 `packages/oc-tweaks/` 目录结构:
    ```
    packages/oc-tweaks/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts          # 统一导出入口（T7 填充）
    │   ├── plugins/          # 4 个插件文件
    │   ├── utils/            # 共享工具
    │   └── __tests__/        # 测试文件
    └── README.md             # 包说明（T9 填充）
    ```
  - `package.json` 关键字段:
    - `name`: `"oc-tweaks"`
    - `version`: `"0.1.0"`
    - `type`: `"module"`
    - `exports`: `{ ".": "./src/index.ts" }`
    - `peerDependencies`: `{ "@opencode-ai/plugin": ">=1.0.0" }`
    - `devDependencies`: `{ "@opencode-ai/plugin": "^1.2.12" }`
    - `scripts.test`: `"bun test"`
    - `files`: `["src/"]`
    - `publishConfig`: `{ "access": "public" }`
  - `tsconfig.json`: strict 模式, ESNext target, moduleResolution bundler

  **禁止**:
  - 使用 npm 命令
  - 添加 build 步骤（Bun 直接运行 TS，OpenCode 也用 Bun 加载插件）
  - 创建 dist/ 目录

  **推荐 Agent Profile**:
  - **Category**: `quick`
    - 原因: 纯脚手架文件创建，无复杂逻辑
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 1（与 T2 并行）
  - **阻塞**: T3, T4, T5, T6, T7, T8
  - **被阻塞**: 无

  **参考引用**:

  **模式参考**:
  - `.opencode/package.json` — 当前 Plugin SDK 依赖版本（`@opencode-ai/plugin: 1.2.12`）

  **外部参考**:
  - https://opencode.ai/docs/zh-cn/plugins/#从-npm-加载 — npm 包在 opencode.json 的 `plugin` 数组中声明
  - https://opencode.ai/docs/zh-cn/plugins/#插件的安装方式 — 启动时 Bun 自动安装到 `~/.cache/opencode/node_modules/`
  - https://github.com/zenobi-us/opencode-plugin-template/ — 社区插件模板，参考 package.json 结构

  **验收标准**:
  - [ ] `packages/oc-tweaks/package.json` 存在且 `name` 为 `"oc-tweaks"`
  - [ ] `bun install --cwd packages/oc-tweaks` 成功
  - [ ] 目录结构匹配规格（src/plugins/, src/utils/, src/__tests__/）

  **QA 场景**:

  ```
  Scenario: 包结构完整且依赖可安装
    Tool: Bash
    Steps:
      1. ls packages/oc-tweaks/src/plugins packages/oc-tweaks/src/utils packages/oc-tweaks/src/__tests__
      2. bun -e "const p=JSON.parse(await Bun.file('packages/oc-tweaks/package.json').text()); console.log(p.name, p.type)"
      3. bun install --cwd packages/oc-tweaks
    Expected: 目录存在; 输出 "oc-tweaks module"; 安装成功退出码 0
    Evidence: .sisyphus/evidence/task-1-package-structure.txt

  Scenario: TypeScript 配置有效
    Tool: Bash
    Steps:
      1. bun tsc --noEmit --project packages/oc-tweaks/tsconfig.json
    Expected: 无错误退出
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt
  ```

  **提交**: 是（与 T2 合并）
  - Message: `chore(oc-tweaks): scaffold package structure`
  - Files: `packages/oc-tweaks/**`

- [x] 2. 共享工具 — safe-hook 包装器 + 配置加载器 + 类型定义

  **做什么**:
  - 创建 `src/utils/safe-hook.ts`:
    - 导出 `safeHook(name: string, fn: Function): Function` 高阶函数
    - 包装任意 hook 回调，try/catch 捕获所有异常
    - 错误时 `console.warn("[oc-tweaks]", name, error)` 并静默继续
    - **核心原则**: 任何插件错误不得中断用户工作流
  - 创建 `src/utils/config.ts`:
    - 导出 `loadOcTweaksConfig(): Promise<OcTweaksConfig>` — 读取 `~/.config/opencode/oc-tweaks.json`
    - `config.xxx !== false` 模式 — 字段缺失等于开启（参考 opencode-notificator）
    - 文件不存在或 JSON 无效 → 返回全部默认值（静默降级）
    - HOME 路径: `Bun.env.HOME ?? process.env.HOME ?? ""`（**禁止硬编码**）
    - **类型容错**: `config.enabled === false` 严格比较布尔值；`"false"` 字符串视为 true（不做隐式转换，避免意外禁用）
    - 导出 `OcTweaksConfig` 类型定义（含 4 个插件的 config 接口，见「配置方案」章节）
  - 创建 `src/utils/index.ts`: barrel 导出
  - 创建 `src/types.ts`: re-export `Plugin` type + 各插件 config 接口
  - 创建测试 `src/__tests__/utils.test.ts`:
    - `safeHook`: 正常执行透传、错误捕获不抛出、保持函数签名
    - `loadJsonConfig`: 文件不存在返回默认值、有效 JSON 正确合并
    - `loadOcTweaksConfig`: 字段值为字符串 `"false"` 时不被视为禁用（严格布尔比较）

  **禁止**:
  - 硬编码任何路径（`/home/cpf` 等）
  - 从 safeHook 中抛出错误（优雅降级原则）
  - 使用 i18n 框架

  **推荐 Agent Profile**:
  - **Category**: `quick`
    - 原因: 简单工具函数 + 基础测试
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 1（与 T1 并行）
  - **阻塞**: T3, T4, T5, T6
  - **被阻塞**: 无

  **参考引用**:

  **模式参考**:
  - `~/.config/opencode/plugins/claude-leaderboard.ts:99-121` — `loadConfig()` 展示多路径搜索 + 静默降级，T2 的 `loadJsonConfig` 需泛化此模式
  - `~/.config/opencode/plugins/claude-leaderboard.ts:17` — `Bun.env.HOME ?? "/home/cpf"` 硬编码示例，需改为 `Bun.env.HOME ?? process.env.HOME ?? ""`

  **API/类型参考**:
  - `@opencode-ai/plugin` 包 — `Plugin` 类型: `async ({ project, client, $, directory, worktree }) => Hooks`

  **外部参考**:
  - https://opencode.ai/docs/zh-cn/plugins/#基本结构 — Plugin 函数签名和参数说明
  - https://opencode.ai/docs/zh-cn/plugins/#typescript-支持 — `import type { Plugin } from "@opencode-ai/plugin"`

  **验收标准**:
  - [ ] `bun test src/__tests__/utils.test.ts` 全部通过
  - [ ] `safeHook` 捕获错误不抛出，console.warn 输出带 `[oc-tweaks]` 前缀
  - [ ] `loadJsonConfig` 文件不存在返回默认值
  - [ ] `grep -r "/home/cpf" packages/oc-tweaks/src/` 无匹配

  **QA 场景**:

  ```
  Scenario: safeHook 错误隔离
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/utils.test.ts
    Expected: 所有测试通过，包括 "error is caught and not thrown" 场景
    Evidence: .sisyphus/evidence/task-2-utils-test.txt

  Scenario: 无硬编码路径
    Tool: Bash
    Steps:
      1. grep -r "/home/cpf" packages/oc-tweaks/src/ ; echo "EXIT:$?"
    Expected: 无匹配，输出 "EXIT:1"
    Evidence: .sisyphus/evidence/task-2-no-hardcode.txt
  ```

  **提交**: 是（与 T1 合并）
  - Message: `chore(oc-tweaks): scaffold package structure`
  - Files: `packages/oc-tweaks/src/utils/**, packages/oc-tweaks/src/types.ts, packages/oc-tweaks/src/__tests__/utils.test.ts`

### Wave 2 — 插件迁移（最大并行，T3-T6 同时进行）

- [x] 3. compaction 插件迁移 + 测试

  **做什么**:
  - 创建 `src/plugins/compaction.ts`，从 `~/.config/opencode/plugins/chinese-compaction.ts` 迁移
  - 中文 prompt → 英文，添加 "respond in the user's preferred language" 声明
  - 新 prompt 内容（英文）:
    ```
    ## Language Preference
    
    Important: Write the compaction summary in the user's preferred language.
    All section titles, descriptions, analysis, and next-step suggestions should use the user's language.
    Keep technical terms (filenames, variable names, commands, code snippets) in their original form.
    ```
  - 读取 `OcTweaksConfig` 的 `compaction.enabled`（默认 true），disabled 时返回空 hooks
  - 用 `safeHook` 包装 compacting 回调
  - 创建测试 `src/__tests__/compaction.test.ts`:
    - 验证 prompt 被推入 `output.context`
    - 验证 prompt 为英文且包含 "preferred language"
    - 验证 enabled=false 时返回空 hooks

  **禁止**:
  - 硬编码任何语言名称（如 "Chinese", "中文"）
  - 使用 i18n 框架

  **推荐 Agent Profile**:
  - **Category**: `quick`
    - 原因: 单文件迁移，逻辑简单（推 prompt 到 context）
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 2（与 T4, T5, T6 并行）
  - **阻塞**: T7
  - **被阻塞**: T1, T2

  **参考引用**:

  **源码参考（迁移源）**:
  - `~/.config/opencode/plugins/chinese-compaction.ts` — 完整源码（18 行），迁移基础
    - L5-15: `experimental.session.compacting` hook，向 `output.context` 推中文 prompt

  **外部参考**:
  - https://opencode.ai/docs/zh-cn/plugins/#压缩钩子 — `experimental.session.compacting` 官方示例，含 `output.context.push()` 和 `output.prompt` 用法

  **验收标准**:
  - [ ] `bun test src/__tests__/compaction.test.ts` 通过
  - [ ] prompt 为英文，包含 "preferred language"
  - [ ] `grep -r "中文\|Chinese" packages/oc-tweaks/src/plugins/compaction.ts` 无匹配
  - [ ] enabled=false 时插件返回空对象

  **QA 场景**:

  ```
  Scenario: compaction prompt 内容正确
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/compaction.test.ts
      2. grep -i "preferred language" packages/oc-tweaks/src/plugins/compaction.ts
      3. grep -r "中文" packages/oc-tweaks/src/plugins/compaction.ts ; echo "EXIT:$?"
    Expected: 测试通过; grep 找到 "preferred language"; 中文 grep EXIT:1
    Evidence: .sisyphus/evidence/task-3-compaction.txt

  Scenario: enabled=false 时静默禁用
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/compaction.test.ts --test-name-pattern "disabled"
    Expected: 测试通过，disabled 场景返回空 hooks
    Evidence: .sisyphus/evidence/task-3-compaction-disabled.txt
  ```

  **提交**: 是
  - Message: `feat(oc-tweaks): migrate compaction plugin`
  - Files: `packages/oc-tweaks/src/plugins/compaction.ts, packages/oc-tweaks/src/__tests__/compaction.test.ts`

- [x] 4. background-subagent 插件迁移 + 测试

  **做什么**:
  - 创建 `src/plugins/background-subagent.ts`，从 `~/.config/opencode/plugins/prefer-background-subagent.ts` 迁移
  - 中文系统提示（L10-21）→ 英文:
    ```
    ## Sub-Agent Dispatch Policy
    
    When calling `task()` to dispatch sub-agents, you MUST default to `run_in_background=true`.
    This keeps the main conversation responsive while sub-agents work in the background.
    
    Only use `run_in_background=false` when ALL of these conditions are met:
    1. The next step CANNOT proceed without the sub-agent's result
    2. There is NO other useful work to do while waiting
    3. The user is explicitly waiting for that specific result
    
    When in doubt → background. Use `background_output()` to collect results later.
    ```
  - 中文违规警告（L35）→ 英文:
    ```
    ⚠️⚠️⚠️ [VIOLATION] You violated the Sub-Agent Dispatch Policy in the system prompt.
    You just used foreground mode (run_in_background=false). Re-read the three conditions.
    If not all three are met, use run_in_background=true + background_output(). Do not repeat.
    ```
  - 读取 `OcTweaksConfig` 的 `backgroundSubagent.enabled`（默认 true），disabled 时返回空 hooks
  - 用 `safeHook` 包装所有回调
  - 创建测试 `src/__tests__/background-subagent.test.ts`:
    - 验证系统提示被注入 `output.system`
    - 验证前台调用时 foregroundCalls 追踪 + 警告追加
    - 验证所有文本为英文
    - 验证 enabled=false 时返回空 hooks

  **禁止**:
  - 硬编码中文文本
  - 修改 `tool.execute.before/after` 的核心逻辑（只改文本语言）

  **推荐 Agent Profile**:
  - **Category**: `quick`
    - 原因: 单文件迁移，核心逻辑不变，只改文本
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 2（与 T3, T5, T6 并行）
  - **阻塞**: T7
  - **被阻塞**: T1, T2

  **参考引用**:

  **源码参考（迁移源）**:
  - `~/.config/opencode/plugins/prefer-background-subagent.ts` — 完整源码（38 行），迁移基础
    - L3-7: Plugin 工厂函数 + foregroundCalls Set
    - L8-23: `experimental.chat.system.transform` hook，注入中文系统提示（→ 改英文）
    - L25-30: `tool.execute.before` hook，追踪前台 task 调用
    - L32-36: `tool.execute.after` hook，追加中文违规警告（→ 改英文）

  **外部参考**:
  - https://opencode.ai/docs/zh-cn/plugins/#事件 — `tool.execute.before/after` 事件说明

  **验收标准**:
  - [ ] `bun test src/__tests__/background-subagent.test.ts` 通过
  - [ ] `grep -r "中文\|调度\|违反" packages/oc-tweaks/src/plugins/background-subagent.ts` 无匹配
  - [ ] 系统提示和警告均为英文
  - [ ] enabled=false 时返回空 hooks

  **QA 场景**:

  ```
  Scenario: 系统提示注入正确
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/background-subagent.test.ts
      2. grep -i "Sub-Agent Dispatch Policy" packages/oc-tweaks/src/plugins/background-subagent.ts
      3. grep -r "中文" packages/oc-tweaks/src/plugins/background-subagent.ts ; echo "EXIT:$?"
    Expected: 测试通过; 找到 "Sub-Agent Dispatch Policy"; 中文 grep EXIT:1
    Evidence: .sisyphus/evidence/task-4-background-subagent.txt

  Scenario: 前台调用违规警告
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/background-subagent.test.ts --test-name-pattern "violation"
    Expected: 前台 task 调用后 output.output 包含 "[VIOLATION]" 英文警告
    Evidence: .sisyphus/evidence/task-4-violation-warning.txt
  ```

  **提交**: 是
  - Message: `feat(oc-tweaks): migrate background-subagent plugin`
  - Files: `packages/oc-tweaks/src/plugins/background-subagent.ts, packages/oc-tweaks/src/__tests__/background-subagent.test.ts`

- [x] 5. leaderboard 插件迁移 + 测试

  **做什么**:
  - 创建 `src/plugins/leaderboard.ts`，从 `~/.config/opencode/plugins/claude-leaderboard.ts` 迁移
  - 去掉所有硬编码路径（`/home/cpf`）→ `Bun.env.HOME ?? process.env.HOME ?? ""`
  - 读取 `OcTweaksConfig` 的 `leaderboard.enabled`（默认 true），disabled 时返回空 hooks
  - 读取 `leaderboard.configPath`（可选覆盖）:
    - `null`（默认）= 搜索 `~/.claude/leaderboard.json` → `~/.config/claude/leaderboard.json`
    - 字符串 = 直接使用指定路径
  - 保留 `MODEL_MAP` + `mapModel()` + `submitUsage()` 核心逻辑不变
  - 日志策略: 原 `log()` 写本地文件的方式保留（路径也去硬编码），同时加 `console.warn("[oc-tweaks:leaderboard]", ...)` 方便调试
  - `submitted` Set 去重逻辑保留
  - 用 `safeHook` 包装 event 回调 — API 提交失败不中断工作流
  - 将 `loadConfig()` 改为使用通用 `loadJsonConfig()` + configPath override
  - 创建测试 `src/__tests__/leaderboard.test.ts`:
    - `mapModel`: 直接匹配、正则匹配、fallback
    - `loadConfig`: 文件不存在返回 null、有效 JSON 返回 config
    - enabled=false 时返回空 hooks
    - configPath 覆盖时跳过默认搜索

  **禁止**:
  - 硬编码 `/home/cpf` 或其他用户路径
  - 修改 claudecount.com API 接口格式
  - 删除 MODEL_MAP（需要保持与 claudecount.com 兼容）

  **推荐 Agent Profile**:
  - **Category**: `unspecified-high`
    - 原因: 涉及 API 交互、模型映射逻辑、配置路径搜索，复杂度高于简单迁移
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 2（与 T3, T4, T6 并行）
  - **阻塞**: T7
  - **被阻塞**: T1, T2

  **参考引用**:

  **源码参考（迁移源）**:
  - `~/.config/opencode/plugins/claude-leaderboard.ts` — 完整源码（198 行），迁移基础
    - L17: `LOG_FILE` 硬编码 `/home/cpf` → 需动态化
    - L44-64: `MODEL_MAP` — 完整保留，将 opencode 模型 ID 映射为 claudecount.com 接受的 Anthropic 格式
    - L69-76: `mapModel()` — 直接匹配 → 正则 → fallback
    - L99-121: `loadConfig()` — 多路径搜索 + 静默降级 → 改用 T2 的 `loadJsonConfig()` + configPath override
    - L123-158: `submitUsage()` — API 提交，payload 结构不可变
    - L160-198: `ClaudeLeaderboardPlugin` — event hook，`message.updated` 过滤 + 去重 Set

  **API/类型参考**:
  - claudecount.com API: `POST https://api.claudecount.com/api/usage/hook` — payload 结构见源码 L133-146

  **外部参考**:
  - https://opencode.ai/docs/zh-cn/plugins/#事件 — `event` hook 和 `message.updated` 事件类型
  - https://claudecount.com — 注册和配置说明

  **验收标准**:
  - [ ] `bun test src/__tests__/leaderboard.test.ts` 全部通过
  - [ ] `grep -r "/home/cpf" packages/oc-tweaks/src/plugins/leaderboard.ts` 无匹配
  - [ ] mapModel 覆盖: 直接匹配、正则、fallback 三条路径
  - [ ] configPath override 工作正常
  - [ ] enabled=false 时返回空 hooks

  **QA 场景**:

  ```
  Scenario: leaderboard 基础功能
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/leaderboard.test.ts
      2. grep -r "/home/cpf" packages/oc-tweaks/src/plugins/leaderboard.ts ; echo "EXIT:$?"
    Expected: 测试全部通过; 硬编码 grep EXIT:1
    Evidence: .sisyphus/evidence/task-5-leaderboard.txt

  Scenario: configPath 覆盖
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/leaderboard.test.ts --test-name-pattern "configPath"
    Expected: 测试通过，configPath 指定时跳过默认路径搜索
    Evidence: .sisyphus/evidence/task-5-leaderboard-configpath.txt

  Scenario: enabled=false 时静默禁用
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/leaderboard.test.ts --test-name-pattern "disabled"
    Expected: 测试通过，disabled 返回空 hooks
    Evidence: .sisyphus/evidence/task-5-leaderboard-disabled.txt
  ```

  **提交**: 是
  - Message: `feat(oc-tweaks): migrate leaderboard plugin`
  - Files: `packages/oc-tweaks/src/plugins/leaderboard.ts, packages/oc-tweaks/src/__tests__/leaderboard.test.ts`

- [x] 6. notify 插件迁移 + 测试（跨平台通知，命令可覆盖）

  **做什么**:
  - 创建 `src/plugins/notify.ts`，从 `~/.config/opencode/plugin/hooks.ts.bak` 迁移 **通知部分**
  - **仅迁移通知功能**（`sendToast` + event handler）；`bd prime` 逻辑不属于此插件，不迁移
  - 读取 `OcTweaksConfig` 的 `notify` 配置:
    - `enabled`（默认 true）— disabled 时返回空 hooks
    - `notifyOnIdle`（默认 true）— session.idle 事件触发通知
    - `notifyOnError`（默认 true）— session.error 事件触发通知
    - `command`（默认 null）— 通知命令覆盖
  - **通知命令策略（核心 — 禁止硬编码 powershell）**:
    1. 如果 `notify.command` 已配置 → 直接使用，支持 `$TITLE` 和 `$MESSAGE` 占位符
       - 示例: `"ssh myhost powershell.exe -NoProfile -Command \"...\""` （Docker Desktop + Hyper-V）
       - 示例: `"notify-send \"$TITLE\" \"$MESSAGE\""` （原生 Linux）
       - 示例: `"powershell.exe -NoProfile -Command \"...\""` （WSL 用户自选）
    2. 如果 `notify.command` 为 null → **自动检测**（按顺序尝试）:
       - `which pwsh` 成功 → 使用 pwsh（Windows 上可能是 pwsh 而非 powershell.exe）
       - `which powershell.exe` 成功 → 使用 Windows Toast XML 方案（从 hooks.ts.bak 迁移）
       - `which osascript` 成功 → 使用 macOS 通知
       - `which notify-send` 成功 → 使用 Linux 通知
       - 全部失败 → 尝试 `client.tui.showToast()`（OpenCode 内置 Toast）
       - showToast 也不可用 → console.warn 提示用户配置 notify.command，通知功能静默降级
    3. 自动检测结果 **缓存** — 只在插件初始化时检测一次，不每次通知都 which
  - 保留 hooks.ts.bak 的辅助函数（迁移后重命名清晰化）:
    - `truncateText()` → 保留
    - `cleanMarkdown()` → 保留
    - `splitForToast()` → 保留（仅 Windows Toast 方案用）
    - `escapeXml()` → 保留（仅 Windows Toast 方案用）
  - 消息获取: 保留 `client.session.messages()` 调用，获取最后一条助手消息作为通知内容
  - 用 `safeHook` 包装 event 回调
  - **插件初始化也要 try/catch** — safeHook 只包回调，初始化阶段（auto-detect、配置读取）的异常需要在 Plugin 工厂函数顶层捕获，失败时返回空 hooks
  - 创建测试 `src/__tests__/notify.test.ts`:
    - 自动检测逻辑（mock which 结果）
    - 自定义 command 的占位符替换
    - notifyOnIdle=false 时不触发 idle 通知
    - notifyOnError=false 时不触发 error 通知
    - enabled=false 时返回空 hooks
    - 通知失败时静默降级不抛错

  **禁止**:
  - 硬编码 `powershell.exe` 或 `pwsh` 作为直接调用 — 必须走自动检测或 command 覆盖
  - 硬编码 `/home/cpf` 或其他用户路径
  - `bd prime` 相关逻辑（不属于 notify 插件）
  - 在自动检测失败时抛出错误（必须静默降级）

  **推荐 Agent Profile**:
  - **Category**: `unspecified-high`
    - 原因: 跨平台通知检测、命令模板系统、多事件处理，复杂度高
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 2（与 T3, T4, T5 并行）
  - **阻塞**: T7
  - **被阻塞**: T1, T2

  **参考引用**:

  **源码参考（迁移源）**:
  - `~/.config/opencode/plugin/hooks.ts.bak` — 完整源码（170 行），通知部分迁移基础
    - L12-66: `HooksPlugin` — event handler，`session.idle` 和 `session.error` 处理
    - L24-56: `session.idle` 处理 — 获取 sessionId → client.session.messages() → 找最后助手消息 → sendToast
    - L61-64: `session.error` 处理 — 简单错误通知
    - L72-86: `truncateText()` + `cleanMarkdown()` — 消息清洗辅助
    - L91-137: `sendToast()` — Windows Toast XML 构建 + `powershell.exe -NoProfile -Command` 调用 ⚠️ **这里硬编码了 powershell.exe，必须改为可配置**
    - L142-170: `splitForToast()` + `escapeXml()` — Toast XML 辅助

  **API/类型参考**:
  - `client.session.messages({ path: { id: sessionId } })` — 返回 `{ data: { info, parts }[] }`（SDK 文档 + hooks.ts.bak L33 验证）

  **外部参考**:
  - https://opencode.ai/docs/zh-cn/plugins/#事件 — `session.idle` 和 `session.error` 事件类型
  - https://opencode.ai/docs/zh-cn/sdk/ — `client.session.messages()` API 说明

  **验收标准**:
  - [ ] `bun test src/__tests__/notify.test.ts` 全部通过
  - [ ] `grep -r "powershell" packages/oc-tweaks/src/plugins/notify.ts` — 无直接硬编码调用（仅在自动检测 which 结果中出现）
  - [ ] 自定义 command 支持 `$TITLE` 和 `$MESSAGE` 占位符替换
  - [ ] 自动检测结果被缓存（初始化一次）
  - [ ] enabled=false 时返回空 hooks
  - [ ] 通知失败不抛错

  **QA 场景**:

  ```
  Scenario: notify 基础功能和安全性
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/notify.test.ts
      2. grep -n "powershell\.exe" packages/oc-tweaks/src/plugins/notify.ts
    Expected: 测试全部通过; powershell.exe 仅出现在 which 检测逻辑中（非直接调用）
    Evidence: .sisyphus/evidence/task-6-notify.txt

  Scenario: 自定义 command 占位符替换
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/notify.test.ts --test-name-pattern "custom command"
    Expected: $TITLE 和 $MESSAGE 被正确替换为实际值
    Evidence: .sisyphus/evidence/task-6-notify-custom-command.txt

  Scenario: 自动检测失败时静默降级
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/notify.test.ts --test-name-pattern "fallback"
    Expected: 所有 which 失败时 console.warn 提示但不抛错
    Evidence: .sisyphus/evidence/task-6-notify-fallback.txt

  Scenario: enabled=false 时静默禁用
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/notify.test.ts --test-name-pattern "disabled"
    Expected: disabled 返回空 hooks
    Evidence: .sisyphus/evidence/task-6-notify-disabled.txt
  ```

  **提交**: 是
  - Message: `feat(oc-tweaks): migrate notify plugin with cross-platform support`
  - Files: `packages/oc-tweaks/src/plugins/notify.ts, packages/oc-tweaks/src/__tests__/notify.test.ts`

### Wave 3 — 集成 + CI

- [x] 7. 统一入口 index.ts + 集成测试

  **做什么**:
  - 创建 `src/index.ts`，导出 4 个 named Plugin 函数:
    ```typescript
    export { compactionPlugin } from "./plugins/compaction"
    export { backgroundSubagentPlugin } from "./plugins/background-subagent"
    export { leaderboardPlugin } from "./plugins/leaderboard"
    export { notifyPlugin } from "./plugins/notify"
    ```
  - 每个导出名遵循 camelCase + Plugin 后缀
  - **不做 compose** — OpenCode 用 `Object.entries(mod)` 遍历所有 export，每个独立初始化
  - 创建集成测试 `src/__tests__/index.test.ts`:
    - 验证 4 个导出都是函数
    - 验证每个函数返回 hooks 对象（传入 mock 参数）
    - 验证所有 enabled=false 时全部返回空 hooks
    - 验证错误隔离 — 一个插件报错不影响其他插件导出
    - **event hook 并存测试** — leaderboard + notify 同时启用时，模拟 `message.updated` 和 `session.idle` 事件，验证两个 event handler 各自正确触发、互不干扰

  **禁止**:
  - 使用默认导出（必须 named exports）
  - compose 多个 hooks 到一个导出

  **推荐 Agent Profile**:
  - **Category**: `quick`
    - 原因: 简单 barrel 导出 + 基础集成测试
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 3（与 T8 并行）
  - **阻塞**: T9, T10
  - **被阻塞**: T3, T4, T5, T6

  **参考引用**:

  **模式参考**:
  - 技术验证结论 #1 — 一个 npm 包可以导出多个 Plugin 函数，OpenCode 用 `Object.entries(mod)` 遍历

  **外部参考**:
  - https://opencode.ai/docs/zh-cn/plugins/#从-npm-加载 — npm 包如何被 OpenCode 加载和遍历

  **验收标准**:
  - [ ] `bun test src/__tests__/index.test.ts` 全部通过
  - [ ] 4 个 named export 均为函数类型
  - [ ] `bun build packages/oc-tweaks/src/index.ts` 无错误

  **QA 场景**:

  ```
  Scenario: 所有 4 个插件正确导出
    Tool: Bash
    Steps:
      1. bun test packages/oc-tweaks/src/__tests__/index.test.ts
      2. bun -e "const m = require('./packages/oc-tweaks/src/index.ts'); console.log(Object.keys(m).sort().join(','))"
    Expected: 测试通过; 输出包含 4 个 Plugin 名称
    Evidence: .sisyphus/evidence/task-7-index-exports.txt

  Scenario: 构建检查
    Tool: Bash
    Steps:
      1. bun build packages/oc-tweaks/src/index.ts --outdir /tmp/oc-tweaks-build
    Expected: 构建成功，输出文件存在
    Evidence: .sisyphus/evidence/task-7-build-check.txt
  ```

  **提交**: 是
  - Message: `feat(oc-tweaks): unified entry exporting all plugins`
  - Files: `packages/oc-tweaks/src/index.ts, packages/oc-tweaks/src/__tests__/index.test.ts`

- [x] 8. GitHub Actions 发布工作流

  **做什么**:
  - 创建 `.github/workflows/publish-oc-tweaks.yml`:
    - 触发: `push tags: ["oc-tweaks-v*"]`
    - 环境: `ubuntu-latest`
    - 步骤:
      1. `actions/checkout@v4`
      2. `oven-sh/setup-bun@v2`
      3. `bun install --cwd packages/oc-tweaks`
      4. `bun test --cwd packages/oc-tweaks`
      5. `bun publish --cwd packages/oc-tweaks --access public`
    - Secret: `NPM_CONFIG_TOKEN`（需要手动在 repo settings 中配置）
  - 在 `packages/oc-tweaks/package.json` 中确认 `publishConfig.access: "public"`
  - **防呆校验**:
    - 发布前检查 tag 版本与 `package.json` 中 `version` 字段一致（不一致则 CI 失败）
    - 检查 `NPM_CONFIG_TOKEN` 是否存在（缺失时提前报错，不要等到 `bun publish` 才失败）

  **禁止**:
  - 使用 npm 命令（全部用 bun）
  - 在 CI 中跳过测试

  **推荐 Agent Profile**:
  - **Category**: `quick`
    - 原因: 标准 CI 模板，改 tag 名和路径即可
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 3（与 T7 并行）
  - **阻塞**: 无（文档不依赖 CI）
  - **被阻塞**: T1

  **参考引用**:

  **外部参考**:
  - 技术验证结论 #2 — `bun publish --access public` + `NPM_CONFIG_TOKEN` 环境变量
  - 技术验证结论 #6 — `oven-sh/setup-bun@v2` 标准 CI action

  **验收标准**:
  - [ ] `.github/workflows/publish-oc-tweaks.yml` 存在且 YAML 语法正确
  - [ ] 触发条件为 `oc-tweaks-v*` tag
  - [ ] 工作流包含 test → publish 步骤
  - [ ] 仅使用 bun 命令

  **QA 场景**:

  ```
  Scenario: 工作流文件有效
    Tool: Bash
    Steps:
      1. bun -e "const yaml=require('js-yaml'); yaml.load(await Bun.file('.github/workflows/publish-oc-tweaks.yml').text()); console.log('VALID')" || echo 'INVALID'
      2. grep -c "npm" .github/workflows/publish-oc-tweaks.yml ; echo "EXIT:$?"
    Expected: YAML 有效; npm grep EXIT:1（无 npm 命令）
    Evidence: .sisyphus/evidence/task-8-ci-workflow.txt
  ```

  **提交**: 是
  - Message: `ci(oc-tweaks): add GitHub Actions publish workflow`
  - Files: `.github/workflows/publish-oc-tweaks.yml`

### Wave 4 — 文档更新（并行）

- [x] 9. 三个 README 更新

  **做什么**:
  - **README.md**（中文）:
    - 在「Claude Code 插件安装」章节后新增「OpenCode 插件」章节
    - 内容: oc-tweaks 功能简介、安装方法（`opencode.json` 中添加 `"oc-tweaks"`）、配置文件示例
    - 配置示例: 完整 `~/.config/opencode/oc-tweaks.json`（含 notify.command 的 SSH 示例）
  - **README.en.md**（英文）:
    - 同样内容，英文撰写
  - **README.guwen.md**（古文版）:
    - 同样内容，古文风格撰写（保持与现有古文版一致的谐谑风格）

  **禁止**:
  - 修改现有 Claude Code 插件部分的内容
  - 添加与 oc-tweaks 无关的内容

  **推荐 Agent Profile**:
  - **Category**: `writing`
    - 原因: 纯文档撰写，需保持三种语言风格一致性
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 4（与 T10 并行）
  - **阻塞**: 无
  - **被阻塞**: T7

  **参考引用**:

  **模式参考**:
  - `README.md` L1-50 — 现有中文 README 的写作风格，新增部分要保持一致
  - `README.en.md` — 英文版风格参考
  - `README.guwen.md` — 古文版风格参考（谐谑古风）

  **内容参考**:
  - 配置方案章节（本计划）— 配置文件结构、字段说明、示例

  **验收标准**:
  - [ ] README.md 包含 oc-tweaks 安装指南
  - [ ] README.en.md 包含同样英文内容
  - [ ] README.guwen.md 包含同样古文内容
  - [ ] 配置示例包含 notify.command SSH 场景

  **QA 场景**:

  ```
  Scenario: 三个 README 都包含 oc-tweaks 内容
    Tool: Bash
    Steps:
      1. grep -c "oc-tweaks" README.md
      2. grep -c "oc-tweaks" README.en.md
      3. grep -c "oc-tweaks" README.guwen.md
    Expected: 三个文件均匹配 ≥ 1 次
    Evidence: .sisyphus/evidence/task-9-readme-update.txt

  Scenario: 配置示例完整性
    Tool: Bash
    Steps:
      1. grep "notify" README.md | grep -c "command"
      2. grep "ssh" README.md
    Expected: README 中包含 notify.command 配置示例和 SSH 场景
    Evidence: .sisyphus/evidence/task-9-readme-config-example.txt
  ```

  **提交**: 是（与 T10 合并）
  - Message: `docs: add oc-tweaks installation guide`
  - Files: `README.md, README.en.md, README.guwen.md`

- [x] 10. CLAUDE.md 更新

  **做什么**:
  - 在 `CLAUDE.md` 中添加 oc-tweaks 相关信息:
    - oc-tweaks 是本仓库的 OpenCode 插件包，位于 `packages/oc-tweaks/`
    - 包含 4 个插件的简要说明
    - 配置文件位置: `~/.config/opencode/oc-tweaks.json`
    - 测试命令: `bun test --cwd packages/oc-tweaks`
    - 发布方式: tag `oc-tweaks-v*` 触发 GitHub Actions

  **禁止**:
  - 修改 CLAUDE.md 中现有的其他内容

  **推荐 Agent Profile**:
  - **Category**: `quick`
    - 原因: 少量文本追加
  - **Skills**: []

  **并行化**:
  - **可并行**: 是
  - **并行组**: Wave 4（与 T9 并行）
  - **阻塞**: 无
  - **被阻塞**: T7

  **参考引用**:

  **模式参考**:
  - `CLAUDE.md` — 现有结构，在适当位置追加 oc-tweaks 条目

  **验收标准**:
  - [ ] CLAUDE.md 包含 oc-tweaks 说明
  - [ ] 包含测试命令和发布方式

  **QA 场景**:

  ```
  Scenario: CLAUDE.md 包含 oc-tweaks 信息
    Tool: Bash
    Steps:
      1. grep -c "oc-tweaks" CLAUDE.md
      2. grep "bun test" CLAUDE.md | grep "oc-tweaks"
    Expected: 匹配 oc-tweaks 内容和测试命令
    Evidence: .sisyphus/evidence/task-10-claude-md.txt
  ```

  **提交**: 是（与 T9 合并）
  - Message: `docs: add oc-tweaks installation guide`
  - Files: `CLAUDE.md`
---

## 最终验证 Wave

- [x] F1. **计划合规审计** — `oracle`
  逐条检查"必须有"和"禁止"。验证所有证据文件存在。
  输出：`必须有 [N/N] | 禁止 [N/N] | 判定`

- [x] F2. **代码质量审查** — `unspecified-high`
  运行 `bun test`，检查 `as any`、空 catch、console.log、未使用 import。
  输出：`测试 [N 通过/N 失败] | 文件 [N 干净/N 有问题] | 判定`

- [x] F3. **真实 QA** — `unspecified-high`
  从干净状态：在 opencode.json 中添加 `"oc-tweaks"`，启动 OpenCode，验证 hooks 触发。
  输出：`场景 [N/N 通过] | 判定`

- [x] F4. **范围忠实度检查** — `deep`
  验证每个任务 1:1 匹配规格。无范围蔓延。无遗漏交付物。
  输出：`任务 [N/N 合规] | 判定`

---

## 提交策略

- T1-T2: `chore(oc-tweaks): scaffold package structure`
- T3-T6: `feat(oc-tweaks): migrate {plugin-name} plugin`
- T7: `feat(oc-tweaks): unified entry exporting all plugins`
- T8: `ci(oc-tweaks): add GitHub Actions publish workflow`
- T9-T10: `docs: add oc-tweaks installation guide`

---

## 成功标准

### 验证命令
```bash
bun test --cwd packages/oc-tweaks           # 所有测试通过
bun build packages/oc-tweaks/src/index.ts    # 构建无错
bun pack --cwd packages/oc-tweaks            # 包内容正确
```

### 最终检查清单
- [x] 4 个插件全部功能正常
- [x] 无 `/home/cpf` 或硬编码路径
- [x] 所有 prompt 英文 + 语言偏好声明
- [x] bun test 通过
- [x] GitHub Actions 工作流有效
- [x] 4 个文档已更新
