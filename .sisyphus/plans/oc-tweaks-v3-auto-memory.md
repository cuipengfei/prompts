# oc-tweaks v3: Auto-Memory 插件吸收

## TL;DR

  > **Quick Summary**: 将独立的 `auto-memory.ts` 插件吸收到 `oc-tweaks` npm 包中作为第 5 个插件，同时升级为智能记忆系统——新增 Custom Tool `remember` 让 AI 可以主动调用写入 memory 文件，新增 `/remember` slash command 让用户显式触发，配合 system prompt 触发词机制实现"用户说→AI 自动记录"的完整闭环。
> 
  > **Deliverables**:
  > - `src/plugins/auto-memory.ts` — 核心插件（system.transform hook + compacting hook + Custom Tool + slash command 创建）
  > - 配置层更新（`config.ts` + `cli/init.ts`）
  > - `~/.config/opencode/commands/remember.md` — 自动创建的 slash command 文件
  > - 完整单元测试 + smoke test 覆盖
  > - 文档更新（oc-tweaks README + AGENTS.md + 根 README + 项目 memory 文件）
  > - 独立版 deprecation 标记
  > - npm v0.2.0 发布
>
  > **Estimated Effort**: Medium
  > **Parallel Execution**: YES - 5 waves
  > **Critical Path**: T1 → T2 → T3-T9 (parallel) → T10 → T11 → T12

---

## Context

### Original Request
将独立的 `~/.config/opencode/plugins/auto-memory.ts`（158 行）吸收到 `oc-tweaks` npm 包，作为继 v1（4 插件迁移）和 v2（7 项增量改进）后的第三次迭代。在迁移基础上增加 Custom Tool 和触发词机制。

### Interview Summary
**Key Discussions**:
- 初始化行为：保持一样 — Plugin init 时 mkdir（如果不存在），但不创建 preferences.md 模板
- 清理策略：不删除独立版 `auto-memory.ts`，只标记 deprecated
- 配置范围：只要 `autoMemory: { enabled: boolean }`
- Command 实现：**双层方案**——(1) Custom Tool `remember` 通过 Plugin API 注册，AI 可主动调用；(2) Plugin init 时自动创建 `~/.config/opencode/commands/remember.md` slash command 文件，用户可显式输入 `/remember` 触发
- 触发词：综合集（中文 + 英文 + record 等），在 system prompt 中列出
- 分类策略：LLM 智能判断文件名，tool schema 提供 category 参数引导
- 版本号：0.2.0（MINOR bump，新增功能）
- 文件截断：信任用户自控，不做截断

**Research Findings**:
- OpenCode Plugin API 文档 (https://opencode.ai/docs/plugins/) 确认支持 Custom Tools
- `tool` 函数从 `@opencode-ai/plugin` 导入，提供 `description` + `args`（Zod schema）+ `execute`
- Plugin ctx 对象包含 `{ project, client, $, directory, worktree }`
- Custom Tool execute 的 context 也有 `{ directory, worktree }` — 不需要 `(input as any).directory` hack
- `client.app.log()` 是官方推荐日志方式，但 oc-tweaks 已有 `logger.ts`，保持一致用后者
- **Slash commands** 可通过 `~/.config/opencode/commands/*.md` 或 `opencode.json` `command` key 定义
- **Plugin 可在 init 时自动创建 command 文件** — `bunx oc-tweaks init` 或 Plugin 初始化时写入
- oh-my-opencode (omo) 通过内置 hook 系统注册 `/start-work` 等 7 个命令（参考模式）

### Metis Review
**Identified Gaps** (addressed):
- auto-memory.ts 不在仓库中 → 确认在 `~/.config/opencode/plugins/auto-memory.ts`（用户本地文件）
- Memory 文件大小可能撑爆上下文 → 用户确认不做截断，信任自控
- 两个 compacting hooks 执行顺序 → OpenCode 按 load order 串联执行，都是 push 不覆盖，无冲突
- `(input as any).directory` 类型不安全 → 改用 Plugin ctx 闭包捕获 directory
- 版本号应为 0.2.0 → 用户确认

---

## Work Objectives

### Core Objective
将 auto-memory 功能集成到 oc-tweaks 并升级为智能记忆系统：被动注入（读取 memory 到 system prompt）+ 主动记录（Custom Tool 让 AI 写入 memory 文件）。

### Concrete Deliverables
- `packages/oc-tweaks/src/plugins/auto-memory.ts` — 核心插件文件
- `packages/oc-tweaks/src/__tests__/auto-memory.test.ts` — 单元测试
- `~/.config/opencode/commands/remember.md` — Plugin init 自动创建的 slash command
- 配置更新：`config.ts`、`cli/init.ts`、`types.ts`
- 导出更新：`index.ts`
- 文档更新：oc-tweaks `README.md`、`AGENTS.md`、根 `README.md`
- 项目 memory 更新：`.opencode/memory/oc-tweaks-publish.md`（追加参考链接）
- 独立版 deprecated README
- npm 0.2.0 发布

### Definition of Done
- [ ] `bun test --cwd packages/oc-tweaks` — ALL PASS, 0 failures
- [ ] `bun run build --cwd packages/oc-tweaks` — exit 0, dist/index.js 存在
- [ ] `npm v0.2.0` 成功发布到 npm registry
- [ ] `~/.config/opencode/opencode.json` 中版本更新为 `oc-tweaks@0.2.0`
- [ ] OpenCode 重启后 auto-memory 功能正常工作

### Must Have
- system.transform hook 注入两层 memory 内容（全局 + 项目级）+ 触发词指引
- compacting hook 注入 memory 保留提醒
- Custom Tool `remember` 可被 AI 调用写入 memory 文件（带 content/category/scope 参数）
- Slash command `/remember` — Plugin init 时自动创建 `~/.config/opencode/commands/remember.md`
- system prompt 中的触发词列表（中文：记住、保存偏好、记录一下、记到memory、别忘了；英文：remember、save to memory、note this down、don't forget、record）
- 配置热重载（`loadOcTweaksConfig()` 模式）
- `enabled !== true` 时全部 no-op（hooks 和 tool 都不工作）
- 所有 hook 用 `safeHook()` 包装
- 初始化时 mkdir memory 目录（不创建模板文件）
- Plugin ctx 闭包捕获 `directory`（不用 `(input as any).directory` hack）

### Must NOT Have (Guardrails)
- ❌ 不修改任何现有插件代码（compaction.ts、background-subagent.ts 等不动）
- ❌ 不创建 preferences.md 模板文件（只 mkdir）
- ❌ 不删除独立版 auto-memory.ts（只 deprecate）
- ❌ 不在 autoMemory 配置中增加超出 `enabled: boolean` 的字段
- ❌ 不引入新的外部依赖
- ❌ 不做 memory 文件大小截断
- ❌ 不用 `console.log`（用 oc-tweaks 的 logger 或静默失败）
- ❌ 不硬编码 HOME 路径（用 `Bun.env.HOME` 或 ctx）
- ❌ 不直接 `npm publish`（CI 处理）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES（bun:test, 43 tests, 8 files）
- **Automated tests**: YES (Tests-after)
- **Framework**: bun:test
- **New test count target**: ≥ 50（现有 43 + 新增至少 7）

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Plugin logic**: Use Bash (bun test) — 运行测试验证
- **Build**: Use Bash (bun run build) — 构建验证
- **Integration**: Use Bash (bun run smoke) — 冒烟测试
- **Live test**: 重启 OpenCode 后实测 memory 注入和 remember tool

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 基础设施):
└── Task 1: 配置层更新 [quick]

Wave 2 (After Wave 1 — 核心实现):
└── Task 2: auto-memory.ts 核心插件 [deep]

Wave 3 (After Wave 2 — 集成 + 测试 + 文档, MAX PARALLEL):
├── Task 3: index.ts 导出更新 [quick]
├── Task 4: auto-memory.test.ts 单元测试 [deep]
├── Task 5: smoke test 更新 [quick]
├── Task 6: oc-tweaks README.md 更新 [writing]
├── Task 7: oc-tweaks AGENTS.md 更新 + 计划原则 [writing]
├── Task 8: 根 README.md 更新 [writing]
└── Task 9: Deprecate 独立版 [quick]

Wave 4 (After Wave 3 — 发布):
├── Task 10: 版本 bump + build + test 全通过 [quick]
├── Task 11: git tag + push + CI 监控 [quick] (depends: T10)
└── Task 12: opencode.json 更新 + 重启 + 实测 [unspecified-high] (depends: T11)

Wave FINAL (After ALL tasks — 独立审查, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: T1 → T2 → T4 (tests) → T10 → T11 → T12
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 7 (Wave 3)
```

### Dependency Matrix

| Task | Blocked By | Blocks |
|------|-----------|--------|
| T1 | — | T2 |
| T2 | T1 | T3-T9 |
| T3 | T2 | T10 |
| T4 | T2 | T10 |
| T5 | T2 | T10 |
| T6 | T2 | T10 |
| T7 | T2 | T10 |
| T8 | T2 | T10 |
| T9 | T2 | T10 |
| T10 | T3-T9 | T11 |
| T11 | T10 | T12 |
| T12 | T11 | F1-F4 |
| F1-F4 | T12 | — |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|-----------|
| 1 | 1 | T1 → `quick` |
| 2 | 1 | T2 → `deep` |
| 3 | 7 | T3 → `quick`, T4 → `deep`, T5 → `quick`, T6 → `writing`, T7 → `writing`, T8 → `writing`, T9 → `quick` |
| 4 | 3 | T10 → `quick`, T11 → `quick`, T12 → `unspecified-high` |
| FINAL | 4 | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep` |

---

## TODOs


- [ ] 1. 配置层更新（config.ts + cli/init.ts）

  **What to do**:
  - 在 `config.ts` 的 `OcTweaksConfig` interface 中添加 `autoMemory?: { enabled?: boolean }` 字段
  - 在 `config.ts` 的 `DEFAULT_CONFIG` 中添加 `autoMemory: {}`（与其他插件保持一致的空对象默认值）
  - 在 `cli/init.ts` 的 `DEFAULT_CONFIG` 中添加 `autoMemory: { enabled: true }`（init 时默认启用）
  - 确保类型导出通过 `types.ts` 正常传递

  **Must NOT do**:
  - ❌ 不修改其他插件的配置字段
  - ❌ 不在 autoMemory 下添加超出 `enabled: boolean` 的字段
  - ❌ 不改变 `loadOcTweaksConfig()` 函数逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯粹的 interface 字段添加和默认值更新，无复杂逻辑
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `java-springboot`: 不相关的技术栈

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (sole task)
  - **Blocks**: T2
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/oc-tweaks/src/utils/config.ts:35-50` — `OcTweaksConfig` interface 定义，新字段应添加在 `notify` 字段之后
  - `packages/oc-tweaks/src/utils/config.ts:52-57` — `DEFAULT_CONFIG` 常量，添加 `autoMemory: {}` 条目
  - `packages/oc-tweaks/src/cli/init.ts:7-13` — CLI `DEFAULT_CONFIG`，添加 `autoMemory: { enabled: true }` 条目

  **Type References**:
  - `packages/oc-tweaks/src/types.ts` — re-export barrel，确认新类型自动传递

  **Acceptance Criteria**:
  - [ ] `bun test --cwd packages/oc-tweaks` → ALL PASS（现有 43 tests 不回归）
  - [ ] `bun run build --cwd packages/oc-tweaks` → exit 0
  - [ ] `OcTweaksConfig` interface 包含 `autoMemory` 可选字段
  - [ ] CLI `DEFAULT_CONFIG` 包含 `autoMemory: { enabled: true }`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 配置 interface 类型正确
    Tool: Bash (bun)
    Preconditions: T1 代码已修改
    Steps:
      1. 运行 `bun run build --cwd packages/oc-tweaks`
      2. 检查编译输出无 type 错误
      3. grep `dist/index.js` 确认 `autoMemory` 相关代码存在
    Expected Result: build 成功，dist 包含 autoMemory 相关代码
    Failure Indicators: TypeScript 编译错误或 dist 中缺少 autoMemory
    Evidence: .sisyphus/evidence/task-1-config-build.txt

  Scenario: 现有测试不回归
    Tool: Bash (bun test)
    Preconditions: T1 代码已修改
    Steps:
      1. 运行 `bun test --cwd packages/oc-tweaks`
      2. 确认 43 tests 全部通过
    Expected Result: 43 tests, 0 failures
    Failure Indicators: 任何 test 失败
    Evidence: .sisyphus/evidence/task-1-test-regression.txt
  ```

  **Commit**: YES
  - Message: `feat(auto-memory): add config type and defaults`
  - Files: `packages/oc-tweaks/src/utils/config.ts`, `packages/oc-tweaks/src/cli/init.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 2. auto-memory.ts 核心插件实现

  **What to do**:

  创建 `packages/oc-tweaks/src/plugins/auto-memory.ts`，包含以下 4 个组件：

  **(A) Plugin 初始化**（在 Plugin async 函数体内，hooks 返回之前）：
  - 使用 Plugin ctx 闭包捕获 `directory`（不用 `(input as any).directory` hack）
  - `mkdir(GLOBAL_MEMORY_DIR, { recursive: true })` 确保全局 memory 目录存在
  - `mkdir(projectMemDir, { recursive: true })` 确保项目级 memory 目录存在
  - 自动创建 `/remember` slash command 文件到 `~/.config/opencode/commands/remember.md`（如果不存在）
  - 初始化错误用 `catch {}` 吞掉（配注释 `// Never disrupt user workflow`）
  - **不创建** preferences.md 模板文件

  **(B) `experimental.chat.system.transform` hook**：
  - `safeHook("auto-memory:system.transform", ...)` 包装
  - `loadOcTweaksConfig()` 热重载 + `enabled !== true` guard
  - 扫描全局 (`~/.config/opencode/memory/`) 和项目级 (`${directory}/.opencode/memory/`) 目录的 `.md` 文件列表
  - 读取 `preferences.md` 全文内容
  - 组装 memory 系统指引 prompt（包含：两层目录路径、文件列表、preferences 内容、使用指南）
  - **注入触发词列表**：中文（记住、保存偏好、记录一下、记到memory、别忘了）+ 英文（remember、save to memory、note this down、don't forget、record）
  - 触发词指引告诉 LLM：当用户说这些关键词时，主动调用 `remember` tool 记录信息
  - `output.system.push(memoryGuide)`

  **(C) `experimental.session.compacting` hook**：
  - `safeHook("auto-memory:compacting", ...)` 包装
  - `loadOcTweaksConfig()` 热重载 + `enabled !== true` guard
  - 注入 `[MEMORY: 文件名.md]` 标记格式说明
  - `output.context.push(compactingReminder)`

  **(D) Custom Tool `remember`**：
  - 使用 `import { tool } from "@opencode-ai/plugin"` 创建
  - tool description 清晰说明用途（保存信息到 memory 文件）
  - args schema：
    - `content: tool.schema.string()` — 必填，要记录的内容
    - `category: tool.schema.string().optional()` — 可选，文件名/分类（如 'preferences'、'decisions'），LLM 智能判断
    - `scope: tool.schema.string().optional()` — 可选，'global' 或 'project'（默认 'global'）
  - execute 逻辑：
    - 根据 scope 确定目标目录（global: `~/.config/opencode/memory/`, project: `${directory}/.opencode/memory/`）
    - 根据 category 确定文件名（默认 `notes.md`，如果传了 category 则用 `{category}.md`）
    - `mkdir(dir, { recursive: true })` 确保目录存在
    - 追加写入（`Bun.file(path).text()` 读现有内容 + append + `Bun.write()`）
    - 返回成功消息（包含写入的文件路径和内容摘要）
    - 用 try/catch 包装，错误返回错误消息（不抛异常）
  - 在 Plugin 返回对象中通过 `tool` key 注册

  **(E) `/remember` slash command 文件**（Plugin init 时创建）：
  - 路径：`~/.config/opencode/commands/remember.md`
  - 内容：一个 markdown 文件，指导 LLM 从当前会话上下文中提取值得记住的信息
  - 指导 LLM 推断用户意图，分类到合适的 memory 文件
  - 指导 LLM 调用 `remember` tool 执行实际写入
  - 如果文件已存在则跳过（不覆盖用户自定义的版本）

  **Must NOT do**:
  - ❌ 不使用 `console.log`（用 `log()` from logger.ts 或静默）
  - ❌ 不使用 `(input as any).directory`（用 Plugin ctx 闭包）
  - ❌ 不创建 preferences.md 模板文件
  - ❌ 不硬编码 HOME 路径字符串（用 `Bun.env.HOME`）
  - ❌ 不引入新外部依赖
  - ❌ 不截断 memory 文件
  - ❌ 不修改其他插件文件

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心实现包含 4 个组件（init + 2 hooks + tool + command 文件），需要理解 Plugin API、闭包模式、文件 I/O
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `mcp-builder`: 这是 OpenCode Plugin 不是 MCP server

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sole task)
  - **Blocks**: T3-T9
  - **Blocked By**: T1

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/oc-tweaks/src/plugins/compaction.ts` — 最简 hook 插件模式：`safeHook` + `loadOcTweaksConfig` + `enabled !== true` guard + `output.context.push()`
  - `packages/oc-tweaks/src/plugins/background-subagent.ts` — system.transform 模式 + 闭包状态 + tool.execute hooks
  - `packages/oc-tweaks/src/utils/safe-hook.ts` — `safeHook(name, fn)` 包装器
  - `packages/oc-tweaks/src/utils/logger.ts` — `log()` 函数用法

  **Migration Source** (迁移源码):
  - `~/.config/opencode/plugins/auto-memory.ts` — 158 行独立版，包含 system.transform + compacting 两个 hook 的完整实现，**直接参考但需重构**：
    - 第 29-40 行：Plugin init（mkdir + preferences 模板创建 → **去掉模板创建**）
    - 第 43-128 行：system.transform hook（扫描目录 + 读 preferences + 组装 prompt → **添加触发词 + 改用 ctx 闭包**）
    - 第 130-156 行：compacting hook（注入 [MEMORY] 标记 → **添加 safeHook 包装 + config guard**）

  **API References** (Custom Tool API):
  - OpenCode Plugin 文档: https://opencode.ai/docs/plugins/ — `tool` 函数用法
  - `import { type Plugin, tool } from "@opencode-ai/plugin"` — tool 创建 API
  - tool execute context 包含 `{ directory, worktree }` — 可用于确定项目目录

  **External References**:
  - Slash command 路径: `~/.config/opencode/commands/*.md` — Plugin init 时自动创建

  **Acceptance Criteria**:
  - [ ] 文件 `packages/oc-tweaks/src/plugins/auto-memory.ts` 存在
  - [ ] 导出 `autoMemoryPlugin` 符合 `Plugin` 类型
  - [ ] 包含 `experimental.chat.system.transform` hook（用 safeHook 包装）
  - [ ] 包含 `experimental.session.compacting` hook（用 safeHook 包装）
  - [ ] 包含 Custom Tool `remember`（带 content/category/scope 参数）
  - [ ] Plugin init 时创建 `~/.config/opencode/commands/remember.md`
  - [ ] system prompt 注入包含触发词列表
  - [ ] `bun run build --cwd packages/oc-tweaks` → exit 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 插件文件结构完整
    Tool: Bash (grep + read)
    Preconditions: T2 代码已实现
    Steps:
      1. 读取 `packages/oc-tweaks/src/plugins/auto-memory.ts`
      2. grep 'safeHook' 确认至少 2 处使用（system.transform + compacting）
      3. grep 'loadOcTweaksConfig' 确认至少 2 处（每个 hook 一次）
      4. grep 'enabled !== true' 确认 guard 存在
      5. grep 'tool(' 确认 Custom Tool 注册
      6. grep '记住\|remember\|save to memory' 确认触发词存在
    Expected Result: 所有 grep 匹配成功
    Failure Indicators: 任何 grep 无匹配
    Evidence: .sisyphus/evidence/task-2-structure-check.txt

  Scenario: 构建成功
    Tool: Bash (bun run build)
    Preconditions: T1 + T2 代码已完成
    Steps:
      1. 运行 `bun run build --cwd packages/oc-tweaks`
      2. 确认 exit code 0
      3. 确认 `dist/index.js` 包含 auto-memory 相关代码
    Expected Result: 构建成功，无 type 错误
    Failure Indicators: TypeScript 编译错误
    Evidence: .sisyphus/evidence/task-2-build.txt

  Scenario: 不创建 preferences 模板
    Tool: Bash (grep)
    Preconditions: T2 代码已实现
    Steps:
      1. grep -c 'INITIAL_PREFERENCES' auto-memory.ts → 应为 0
      2. grep -c 'preferences.md' auto-memory.ts → 读取引用可以有，但不应有创建逻辑
    Expected Result: 无模板创建代码
    Failure Indicators: 发现 INITIAL_PREFERENCES 常量或 Bun.write(prefsPath, ...) 调用
    Evidence: .sisyphus/evidence/task-2-no-template.txt
  ```

  **Commit**: YES
  - Message: `feat(auto-memory): implement plugin with hooks and remember tool`
  - Files: `packages/oc-tweaks/src/plugins/auto-memory.ts`
  - Pre-commit: `bun run build --cwd packages/oc-tweaks`

- [ ] 3. index.ts + types.ts 导出更新

  **What to do**:
  - 在 `packages/oc-tweaks/src/index.ts` 中添加 `export { autoMemoryPlugin } from "./plugins/auto-memory"`
  - 确认 `types.ts` re-export barrel 自动传递新类型（通常无需修改）
  - 保持现有导出顺序的字母表排序风格（`autoMemoryPlugin` 应在 `backgroundSubagentPlugin` 之前）

  **Must NOT do**:
  - ❌ 不删除或重排现有导出
  - ❌ 不修改导出名称格式（保持 `camelCase + Plugin` 后缀）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单行导出添加，最简操作
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T4, T5, T6, T7, T8, T9)
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `packages/oc-tweaks/src/index.ts` — 现有 4 行导出，新增一行保持相同风格
  - `packages/oc-tweaks/src/types.ts` — 检查 re-export 是否自动传递

  **Acceptance Criteria**:
  - [ ] `index.ts` 包含 `autoMemoryPlugin` 导出
  - [ ] `bun run build --cwd packages/oc-tweaks` → exit 0
  - [ ] `bun test --cwd packages/oc-tweaks` → ALL PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 导出可访问
    Tool: Bash
    Preconditions: T2 + T3 完成
    Steps:
      1. 运行 `bun run build --cwd packages/oc-tweaks`
      2. grep 'autoMemoryPlugin' packages/oc-tweaks/dist/index.js
      3. 确认导出存在
    Expected Result: grep 匹配到 autoMemoryPlugin
    Failure Indicators: grep 无匹配
    Evidence: .sisyphus/evidence/task-3-export-check.txt
  ```

  **Commit**: NO (groups with T4, T5)

- [ ] 4. auto-memory.test.ts 单元测试

  **What to do**:
  创建 `packages/oc-tweaks/src/__tests__/auto-memory.test.ts`，覆盖以下场景：

  **测试分组：**

  1. **插件初始化**:
     - 调用 `autoMemoryPlugin()` 返回 hooks 对象
     - 确认包含 `experimental.chat.system.transform` hook
     - 确认包含 `experimental.session.compacting` hook
     - 确认包含 tool 注册

  2. **Disabled 状态**:
     - 配置 `autoMemory.enabled` 为 false 时，system.transform hook 不注入内容
     - 配置缺失时（config 为 null），所有 hooks 为 no-op

  3. **system.transform hook**:
     - enabled 时，push 内容到 `output.system`
     - 注入内容包含 '触发词' 或 'Memory 系统指引'
     - 注入内容包含触发词（记住、remember 等）

  4. **compacting hook**:
     - enabled 时，push 内容到 `output.context`
     - 内容包含 '[MEMORY:' 标记格式说明

  5. **remember tool**:
     - tool execute 能写入文件（mock Bun.write）
     - scope='global' 写入全局目录
     - scope='project' 写入项目目录
     - category 指定时用对应文件名，缺省时用 notes.md
     - 写入失败时返回错误消息而不抛异常

  **测试技术**:
  - 文件开头 `// @ts-nocheck`
  - Mock `Bun.file`、`Bun.env.HOME`、`Bun.write`、`readdir`
  - `afterEach` 恢复原始值
  - 用 `as any` mock input/output 对象

  **Must NOT do**:
  - ❌ 不测试真实文件系统（全部 mock）
  - ❌ 不修改其他测试文件

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解 plugin 结构 + mock 模式 + 覆盖 5 个测试分组，新增至少 7 个 tests
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T3, T5, T6, T7, T8, T9)
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **Test Pattern References**:
  - `packages/oc-tweaks/src/__tests__/compaction.test.ts` — 最简插件测试模式：disabled/enabled/config-missing 三状态
  - `packages/oc-tweaks/src/__tests__/background-subagent.test.ts` — system.transform + tool.execute 测试模式
  - `packages/oc-tweaks/src/__tests__/utils.test.ts` — Bun.file mock 模式参考

  **Implementation Reference**:
  - `packages/oc-tweaks/src/plugins/auto-memory.ts` — T2 的实现代码，测试需对照其导出和逻辑编写

  **Acceptance Criteria**:
  - [ ] 文件 `packages/oc-tweaks/src/__tests__/auto-memory.test.ts` 存在
  - [ ] `bun test src/__tests__/auto-memory.test.ts --cwd packages/oc-tweaks` → ALL PASS
  - [ ] 新增测试数 ≥ 7（init + disabled*2 + system.transform + compacting + tool*3）
  - [ ] 总测试数 ≥ 50（43 + 7）

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 测试全部通过
    Tool: Bash (bun test)
    Preconditions: T2 + T4 完成
    Steps:
      1. 运行 `bun test --cwd packages/oc-tweaks`
      2. 确认总测试数 ≥ 50
      3. 确认 0 failures
    Expected Result: ≥ 50 tests, 0 failures
    Failure Indicators: 任何测试失败或测试数不足
    Evidence: .sisyphus/evidence/task-4-tests.txt

  Scenario: auto-memory 专项测试
    Tool: Bash (bun test)
    Preconditions: T4 完成
    Steps:
      1. 运行 `bun test src/__tests__/auto-memory.test.ts --cwd packages/oc-tweaks`
      2. 确认所有 describe 块通过
    Expected Result: auto-memory 测试全部通过
    Evidence: .sisyphus/evidence/task-4-auto-memory-tests.txt
  ```

  **Commit**: NO (groups with T3, T5)

- [ ] 5. smoke test 更新

  **What to do**:
  - 检查现有 smoke test 文件，确认新插件的导出被覆盖
  - 如果 smoke test 统一检查 `index.ts` 导出，只需确认 `autoMemoryPlugin` 被导入即可
  - 如果 smoke test 有显式插件列表，添加 `autoMemoryPlugin` 条目

  **Must NOT do**:
  - ❌ 不重写现有 smoke test 逻辑
  - ❌ 不添加复杂的集成测试（保持 smoke 级别）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 少量代码添加，参照现有模式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T3, T4, T6, T7, T8, T9)
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `packages/oc-tweaks/src/__tests__/index.test.ts` — 现有导出测试，确认如何添加新插件检查
  - `packages/oc-tweaks/package.json` — 查找 `smoke` script 定义

  **Acceptance Criteria**:
  - [ ] smoke test 覆盖 `autoMemoryPlugin`
  - [ ] `bun run smoke --cwd packages/oc-tweaks` → PASS（如果环境支持）

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: smoke test 通过
    Tool: Bash
    Preconditions: T3 + T5 完成
    Steps:
      1. grep 'autoMemoryPlugin' packages/oc-tweaks/src/__tests__/index.test.ts
      2. 确认 autoMemoryPlugin 被测试覆盖
    Expected Result: grep 匹配成功
    Failure Indicators: autoMemoryPlugin 未被导出测试覆盖
    Evidence: .sisyphus/evidence/task-5-smoke.txt
  ```

  **Commit**: YES (groups with T3, T4)
  - Message: `feat(auto-memory): add exports, tests, and smoke test`
  - Files: `packages/oc-tweaks/src/index.ts`, `packages/oc-tweaks/src/__tests__/auto-memory.test.ts`, `packages/oc-tweaks/src/__tests__/index.test.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 6. oc-tweaks README.md 更新

  **What to do**:
  - 在 oc-tweaks `README.md` 的插件列表中添加 `autoMemory` 插件说明（中英双语）
  - 添加 `autoMemory` 配置说明段（参照 `compaction` 段的简洁风格）
  - 添加 `remember` tool 和 `/remember` command 的使用说明
  - 在完整配置示例 JSON 中添加 `autoMemory` 条目
  - 插件描述："智能记忆系统 — 自动注入 memory 上下文、触发词识别、remember tool 主动记录"

  **Must NOT do**:
  - ❌ 不修改现有插件的说明内容
  - ❌ 不添加技术实现细节（保持用户级说明）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 纯文档更新，中英双语内容
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T3, T4, T5, T7, T8, T9)
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `packages/oc-tweaks/README.md` — 现有 README 结构（英文部分 + 中文部分），在两个语言段都添加 autoMemory 内容
  - `packages/oc-tweaks/README.md` 中 `### compaction` 段 — 配置说明的简洁风格参考

  **Acceptance Criteria**:
  - [ ] README 中英文部分包含 `autoMemory` 插件说明
  - [ ] README 中中文部分包含 `autoMemory` 插件说明
  - [ ] 完整配置示例 JSON 包含 `autoMemory` 条目

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: README 包含 autoMemory 说明
    Tool: Bash (grep)
    Preconditions: T6 完成
    Steps:
      1. grep -c 'autoMemory' packages/oc-tweaks/README.md
      2. 确认至少 4 处匹配（英文插件列表 + 英文配置 + 中文插件列表 + 中文配置）
      3. grep 'remember' packages/oc-tweaks/README.md
      4. 确认 remember tool 和 /remember command 被提及
    Expected Result: 至少 4 处 autoMemory，至少 2 处 remember
    Failure Indicators: 匹配数不足
    Evidence: .sisyphus/evidence/task-6-readme-check.txt
  ```

  **Commit**: NO (groups with T7, T8, T9)

- [ ] 7. oc-tweaks AGENTS.md 更新 + 计划原则

  **What to do**:
  - 在 AGENTS.md 的项目结构中添加 `auto-memory.ts` 和 `auto-memory.test.ts`
  - 在 AGENTS.md 中添加 auto-memory 插件的架构说明（system.transform + compacting + Custom Tool + command 文件创建）
  - 添加计划文件的通用原则和模式段：
    - 计划文件存放在 `.sisyphus/plans/` 目录
    - 计划一旦写入即为只读，任何 agent 不得修改
    - 计划的 Wave/Task 结构和依赖矩阵说明
    - 引用现有计划作为示例（`oc-tweaks.md`, `oc-tweaks-v2.md`, `oc-tweaks-v3-auto-memory.md`）

  **Must NOT do**:
  - ❌ 不删除现有 AGENTS.md 内容
  - ❌ 不添加与项目无关的内容

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 文档编写，需要理解项目架构来编写准确
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T3, T4, T5, T6, T8, T9)
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `packages/oc-tweaks/AGENTS.md` — 现有 AGENTS.md 结构（快速参考 + 项目结构 + 架构 + 代码风格 + 测试约定 + 发布）
  - `.sisyphus/plans/oc-tweaks.md` — v1 计划（模板参考，只读）
  - `.sisyphus/plans/oc-tweaks-v2.md` — v2 计划（模板参考，只读）

  **Acceptance Criteria**:
  - [ ] AGENTS.md 项目结构包含 `auto-memory.ts` 和 `auto-memory.test.ts`
  - [ ] AGENTS.md 包含 auto-memory 架构说明
  - [ ] AGENTS.md 包含计划文件原则段

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: AGENTS.md 更新完整
    Tool: Bash (grep)
    Preconditions: T7 完成
    Steps:
      1. grep 'auto-memory' packages/oc-tweaks/AGENTS.md
      2. grep -c '.sisyphus/plans' packages/oc-tweaks/AGENTS.md
      3. grep '只读' packages/oc-tweaks/AGENTS.md
    Expected Result: auto-memory 和计划原则都存在
    Failure Indicators: 缺少任何一项
    Evidence: .sisyphus/evidence/task-7-agents-md.txt
  ```

  **Commit**: NO (groups with T6, T8, T9)

- [ ] 8. 根 README.md 更新

  **What to do**:
  - 在根 `README.md` 的 OpenCode 插件段更新 oc-tweaks 插件列表，添加 `autoMemory` 插件
  - 插件描述："智能记忆系统 — 自动注入 memory 上下文、触发词识别、主动写入"
  - 在配置 JSON 示例中添加 `autoMemory` 条目

  **Must NOT do**:
  - ❌ 不修改其他插件的说明
  - ❌ 不重新排列现有内容

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 文档更新，参照现有格式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T3, T4, T5, T6, T7, T9)
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `README.md` — 根 README 的 "OpenCode 插件" 段（包含 4 个插件的表格 + 配置 JSON 示例）

  **Acceptance Criteria**:
  - [ ] 根 README.md 插件表格包含 `autoMemory` 行
  - [ ] 配置 JSON 示例包含 `autoMemory` 条目

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 根 README 包含 autoMemory
    Tool: Bash (grep)
    Preconditions: T8 完成
    Steps:
      1. grep -c 'autoMemory\|auto-memory\|智能记忆' README.md
      2. 确认至少 2 处匹配（插件表格 + 配置示例）
    Expected Result: 至少 2 处匹配
    Failure Indicators: 匹配不足
    Evidence: .sisyphus/evidence/task-8-root-readme.txt
  ```

  **Commit**: NO (groups with T6, T7, T9)

- [ ] 9. Deprecate 独立版 + 更新项目 memory 文件

  **What to do**:

  **(A) Deprecate 独立版**:
  - 在 `~/.config/opencode/plugins/auto-memory.ts` 文件开头添加注释标记：
    ```
    // ⚠️ DEPRECATED: This standalone plugin has been absorbed into oc-tweaks v0.2.0
    // Please use oc-tweaks instead: npm install oc-tweaks
    // This file is kept for reference only. It will NOT be loaded if oc-tweaks is configured.
    ```
  - **不删除文件**，只加注释

  **(B) 更新项目 memory 文件**:
  - 在 `.opencode/memory/oc-tweaks-publish.md` 中追加以下参考链接：
    - OpenCode Plugin 文档: https://opencode.ai/docs/plugins/
    - Custom Tool API: `import { type Plugin, tool } from "@opencode-ai/plugin"`
    - omo 命令注册机制参考: oh-my-opencode hook 系统
    - Slash command 路径: `~/.config/opencode/commands/*.md`

  **Must NOT do**:
  - ❌ 不删除独立版 auto-memory.ts
  - ❌ 不修改独立版的功能代码（只加注释）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 添加注释 + 追加参考链接，简单操作
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T3, T4, T5, T6, T7, T8)
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **File References**:
  - `~/.config/opencode/plugins/auto-memory.ts` — 独立版文件，添加 deprecated 注释
  - `.opencode/memory/oc-tweaks-publish.md` — 项目 memory 文件，追加参考链接

  **Acceptance Criteria**:
  - [ ] `~/.config/opencode/plugins/auto-memory.ts` 包含 DEPRECATED 注释
  - [ ] `.opencode/memory/oc-tweaks-publish.md` 包含 OpenCode Plugin 文档链接
  - [ ] `.opencode/memory/oc-tweaks-publish.md` 包含 Custom Tool API 参考

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 独立版已标记 deprecated
    Tool: Bash (grep)
    Preconditions: T9 完成
    Steps:
      1. head -5 ~/.config/opencode/plugins/auto-memory.ts
      2. 确认前 5 行包含 'DEPRECATED'
    Expected Result: DEPRECATED 注释存在
    Failure Indicators: 缺少 DEPRECATED 标记
    Evidence: .sisyphus/evidence/task-9-deprecated.txt

  Scenario: memory 文件已更新
    Tool: Bash (grep)
    Preconditions: T9 完成
    Steps:
      1. grep 'opencode.ai/docs/plugins' .opencode/memory/oc-tweaks-publish.md
      2. grep 'tool.*@opencode-ai/plugin' .opencode/memory/oc-tweaks-publish.md
    Expected Result: 两个 grep 都匹配
    Failure Indicators: 任何 grep 无匹配
    Evidence: .sisyphus/evidence/task-9-memory-file.txt
  ```

  **Commit**: YES (groups with T6, T7, T8)
  - Message: `docs(auto-memory): update README, AGENTS.md, deprecate standalone`
  - Files: `packages/oc-tweaks/README.md`, `packages/oc-tweaks/AGENTS.md`, `README.md`, `~/.config/opencode/plugins/auto-memory.ts`, `.opencode/memory/oc-tweaks-publish.md`
  - Pre-commit: —

- [ ] 10. 版本 bump + build + test 全通过

  **What to do**:
  - 修改 `packages/oc-tweaks/package.json` 的 `version` 从 `0.1.3` 到 `0.2.0`
  - 运行 `bun test --cwd packages/oc-tweaks` 确认全部通过（≥ 50 tests）
  - 运行 `bun run build --cwd packages/oc-tweaks` 确认构建成功
  - 运行 `bun run smoke --cwd packages/oc-tweaks` 确认冒烟测试通过

  **Must NOT do**:
  - ❌ 不修改任何源码（只改 version）
  - ❌ 不直接 `npm publish`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: version bump + 验证命令，纯操作性
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential: T10 → T11 → T12)
  - **Blocks**: T11
  - **Blocked By**: T3-T9 (全部 Wave 3 完成)

  **References**:

  **File References**:
  - `packages/oc-tweaks/package.json` — 修改 version 字段

  **Acceptance Criteria**:
  - [ ] `package.json` version 为 `0.2.0`
  - [ ] `bun test --cwd packages/oc-tweaks` → ALL PASS, ≥ 50 tests
  - [ ] `bun run build --cwd packages/oc-tweaks` → exit 0
  - [ ] `bun run smoke --cwd packages/oc-tweaks` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 全量验证通过
    Tool: Bash
    Preconditions: T3-T9 全部完成
    Steps:
      1. grep '"version"' packages/oc-tweaks/package.json → 确认 "0.2.0"
      2. bun test --cwd packages/oc-tweaks → ≥ 50 tests, 0 failures
      3. bun run build --cwd packages/oc-tweaks → exit 0
      4. bun run smoke --cwd packages/oc-tweaks → PASS
    Expected Result: 全部 4 步成功
    Failure Indicators: 任何一步失败
    Evidence: .sisyphus/evidence/task-10-full-validation.txt
  ```

  **Commit**: YES
  - Message: `chore: bump version to 0.2.0`
  - Files: `packages/oc-tweaks/package.json`
  - Pre-commit: `bun test --cwd packages/oc-tweaks && bun run build --cwd packages/oc-tweaks`

- [ ] 11. git tag + push + CI 监控

  **What to do**:
  - 创建 git tag: `git tag oc-tweaks-v0.2.0`
  - Push tag: `git push origin oc-tweaks-v0.2.0`
  - Push commits: `git push`
  - 监控 CI: `gh run list --repo cuipengfei/prompts --workflow=publish-oc-tweaks.yml --limit 3`
  - 等待 CI 完成，确认 npm 发布成功
  - 验证: `npm view oc-tweaks version` → `0.2.0`

  **Must NOT do**:
  - ❌ 不直接运行 `npm publish`
  - ❌ 不使用 `--no-verify`
  - ❌ 不用 `--force` push

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: git 操作 + CI 监控，标准发布流程
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential: T10 → T11 → T12)
  - **Blocks**: T12
  - **Blocked By**: T10

  **References**:

  **Process References**:
  - `packages/oc-tweaks/AGENTS.md` 中「发布」段 — 完整发布流程参考（必须指定 `--repo cuipengfei/prompts`）
  - `.github/workflows/publish-oc-tweaks.yml` — CI 配置参考

  **Acceptance Criteria**:
  - [ ] git tag `oc-tweaks-v0.2.0` 已创建并推送
  - [ ] CI workflow 成功完成
  - [ ] `npm view oc-tweaks version` → `0.2.0`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: npm 发布成功
    Tool: Bash
    Preconditions: T11 git push 完成
    Steps:
      1. gh run list --repo cuipengfei/prompts --workflow=publish-oc-tweaks.yml --limit 3
      2. 等待最新 run status 为 'completed' + conclusion 'success'
      3. npm view oc-tweaks version
      4. 确认输出为 '0.2.0'
    Expected Result: CI 成功，npm 版本为 0.2.0
    Failure Indicators: CI 失败或版本不匹配
    Evidence: .sisyphus/evidence/task-11-npm-publish.txt
  ```

  **Commit**: NO (无代码变更，只是 tag + push)

- [ ] 12. opencode.json 更新 + 重启 + 实测

  **What to do**:
  - 修改 `~/.config/opencode/opencode.json` 中的插件版本: `"oc-tweaks@0.2.0"`（如果当前是带版本号的样式）或确认 `"oc-tweaks"` 自动拉取最新版
  - 提示用户重启 OpenCode
  - 重启后验证：
    1. 检查 system prompt 是否包含 memory 系统指引（触发词列表、memory 目录路径、preferences 内容）
    2. 输入 `/remember` 确认 slash command 可用
    3. 测试触发词：说"记住，我喜欢 apple 胜过 orange"，观察 AI 是否调用 remember tool
    4. 检查 memory 文件是否被写入
    5. 确认 compacting 时注入了 [MEMORY:] 标记提示

  **Must NOT do**:
  - ❌ 不自动重启 OpenCode（提示用户手动重启）
  - ❌ 不修改 opencode.json 中其他配置

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要交互式验证，可能需要等待用户重启
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential: T10 → T11 → T12)
  - **Blocks**: F1-F4
  - **Blocked By**: T11

  **References**:

  **File References**:
  - `~/.config/opencode/opencode.json` — plugin 配置，更新版本号
  - `~/.config/opencode/oc-tweaks.json` — 确认 `autoMemory: { enabled: true }` 存在（可能需要重新 init）

  **Acceptance Criteria**:
  - [ ] `opencode.json` 插件版本已更新
  - [ ] OpenCode 重启后 auto-memory 功能正常工作
  - [ ] system prompt 包含 memory 指引和触发词
  - [ ] `/remember` slash command 可用
  - [ ] remember tool 可被 AI 调用写入文件

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: memory 注入验证
    Tool: Bash + 用户交互
    Preconditions: OpenCode 已重启，oc-tweaks 0.2.0 已加载
    Steps:
      1. 在 OpenCode 中开始新会话
      2. 检查 session 中是否包含 'Memory 系统指引' 相关内容
      3. 输入"记住，我喜欢 apple 胜过 orange"
      4. 观察 AI 是否调用 remember tool 或直接写入 memory 文件
      5. 检查 ~/.config/opencode/memory/ 下是否有新内容写入
    Expected Result: AI 识别触发词并写入 memory 文件
    Failure Indicators: AI 未识别触发词或未写入文件
    Evidence: .sisyphus/evidence/task-12-memory-injection.txt

  Scenario: /remember command 可用
    Tool: Bash + 用户交互
    Preconditions: OpenCode 已重启
    Steps:
      1. 检查 ~/.config/opencode/commands/remember.md 是否存在
      2. 在 OpenCode 中输入 /remember
      3. 确认 command 被触发
    Expected Result: /remember command 过可用且触发正常
    Evidence: .sisyphus/evidence/task-12-remember-command.txt

  Scenario: npm 版本确认
    Tool: Bash
    Preconditions: T11 发布完成
    Steps:
      1. npm view oc-tweaks version
      2. 确认输出为 '0.2.0'
    Expected Result: 0.2.0
    Failure Indicators: 版本不匹配
    Evidence: .sisyphus/evidence/task-12-npm-version.txt
  ```

  **Commit**: YES
  - Message: `chore: update opencode config to oc-tweaks 0.2.0`
  - Files: `~/.config/opencode/opencode.json`（如需修改）
  - Pre-commit: —

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` + `bun test`. Review all changed files for: `as any`/`@ts-ignore` in production code, empty catches without comments, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration. Test edge cases: empty memory dir, missing config, large files. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Group | Message | Files | Pre-commit |
|-------|---------|-------|-----------|
| T1 | `feat(auto-memory): add config type and defaults` | config.ts, cli/init.ts | `bun test --cwd packages/oc-tweaks` |
| T2 | `feat(auto-memory): implement plugin with hooks and remember tool` | plugins/auto-memory.ts | `bun test --cwd packages/oc-tweaks` |
| T3-T5 | `feat(auto-memory): add exports, tests, and smoke test` | index.ts, types.ts, auto-memory.test.ts, smoke-test.ts | `bun test --cwd packages/oc-tweaks` |
| T6-T9 | `docs(auto-memory): update README, AGENTS.md, deprecate standalone` | README.md (×3), AGENTS.md, deprecated notice | — |
| T10-T12 | `chore: bump version to 0.2.0` | package.json | `bun test && bun run build` |

---

## Success Criteria

### Verification Commands
```bash
bun test --cwd packages/oc-tweaks        # Expected: ALL PASS, ≥50 tests
bun run build --cwd packages/oc-tweaks   # Expected: exit 0
bun run smoke --cwd packages/oc-tweaks   # Expected: SMOKE_RESULT: PASS
npm view oc-tweaks version               # Expected: 0.2.0
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (≥50)
- [ ] Build succeeds
- [ ] npm 0.2.0 published
- [ ] opencode.json updated
- [ ] OpenCode restarted and memory injection working
- [ ] remember tool callable by AI
