# oc-tweaks v0.3.0: Auto-Memory 边界定义对齐

## TL;DR

> **Quick Summary**: 改造 auto-memory 插件的 prompt 文案和注入逻辑，对齐 Claude Code 的 memory 边界定义。删除自定义 remember tool（agent 用内置 read/write/edit 工具管理 memory），重写 buildMemoryGuide 加入 What to save / What NOT to save 边界定义。
>
> **Deliverables**:
>
> - `auto-memory.ts` 重写：边界定义 + 全量注入 + 删除 remember tool
> - `auto-memory.test.ts` 测试适配
> - AGENTS.md 文档更新
> - 发布 oc-tweaks@0.3.0
>
> **Estimated Effort**: Short（单文件核心改造 + 测试适配）
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: T1 → T2 + T3 → T4

---

## Context

### Original Request

用户发现 auto-memory 插件缺乏 "what to save vs what not to save" 的边界定义。经调研 Claude Code 的 memory 实现（GB9/DA7 两个版本的 prompt），确认需要补充完整的边界定义、定位声明、以及改进注入逻辑。

### Interview Summary

**Key Decisions**:

1. **改进范围**: 完整对齐 Claude Code 的 memory 边界定义机制
2. **Prompt 风格**: 混合（显式用户请求用 MUST，自主判断用建议式）
3. **指令文件引用**: AGENTS.md + CLAUDE.md（负面清单说"不得重复"这些文件）
4. **写入机制**: 去掉 remember tool 整个——agent 用内置 read/write/edit 工具管理 memory
5. **注入范围**: 扫描目录注入所有 topic files 内容，不做截断保护
6. **MEMORY.md**: 不要——不创建索引文件，直接扫描注入
7. **Timestamp**: 去掉——不再在 memory 文件中写时间戳

**Research Findings**:

- Claude Code 有两个版本的 auto memory prompt（GB9 建议式 / DA7 强制式，behind feature flag）
- 核心铁律：Memory 是 AGENTS.md/CLAUDE.md 的**补充**，不是替代
- Claude Code 没有自定义 remember tool——agent 用内置 write 工具直接管理 memory 文件

### Metis Review

**Identified Gaps** (addressed):

- `appendMemoryRecord` 与 frontmatter 冲突 → 删除整个 remember tool，无需自定义写入逻辑
- MEMORY.md 是否需要 → 不需要，扫描目录直接注入
- `readPreferences` 只读单文件 → 改为读取所有 .md 文件
- Prompt 大小 budget → 用户选择不截断，由文件数量自然控制

---

## Work Objectives

### Core Objective

让 auto-memory 插件注入的 system prompt 明确告诉 AI：什么该存 memory、什么不该存、memory 与 AGENTS.md/CLAUDE.md 的关系、用内置工具直接管理 memory 文件。

### Concrete Deliverables

- `packages/oc-tweaks/src/plugins/auto-memory.ts` — 重写核心文件
- `packages/oc-tweaks/src/__tests__/auto-memory.test.ts` — 适配测试
- `packages/oc-tweaks/AGENTS.md` — 文档更新
- `packages/oc-tweaks/package.json` — version bump to 0.3.0

### Definition of Done

- [ ] `bun test --cwd packages/oc-tweaks` → 全部 PASS
- [ ] `bun run build --cwd packages/oc-tweaks` → 无 error
- [ ] system.transform 注入的内容包含边界定义（What to save / What NOT to save）
- [ ] system.transform 注入所有 memory 目录下的 .md 文件内容
- [ ] 无 `tool.remember` 注册
- [ ] 无 `appendMemoryRecord` 函数
- [ ] `REMEMBER_COMMAND_CONTENT` 引导用内置 write/edit 工具，不引用 remember tool

### Must Have

- 边界定义文案对齐 Claude Code（参考 GB9/DA7 的 What to save / What NOT to save）
- 定位声明：Memory 是 AGENTS.md/CLAUDE.md 的补充
- 混合 prompt 风格（显式请求 MUST / 自主判断建议式）
- 注入所有 topic files 内容

### Must NOT Have (Guardrails)

- ❌ 自定义 remember tool（agent 用内置工具）
- ❌ `appendMemoryRecord` 函数
- ❌ Timestamp 写入 memory 文件
- ❌ MEMORY.md 索引文件
- ❌ 截断保护 / 行数上限
- ❌ Frontmatter 解析代码
- ❌ LLM-based memory 选择（排除 scope）
- ❌ Session memory 机制（排除 scope）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: YES（bun:test）
- **Automated tests**: Tests-after（T2 更新测试适配新代码）
- **Framework**: bun test

### QA Policy

每个任务必须包含 agent-executed QA scenarios。
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (核心改造):
└── Task 1: auto-memory.ts 全面重写 [deep]

Wave 2 (After Wave 1 — 并行):
├── Task 2: auto-memory.test.ts 测试适配 [unspecified-high]
└── Task 3: AGENTS.md 文档更新 [quick]

Wave 3 (After Wave 2 — 收尾):
└── Task 4: Version bump + build + tag + push [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: T1 → T2 → T4
Parallel Speedup: T2 + T3 并行
```

### Dependency Matrix

| Task  | Depends On | Blocks     |
| ----- | ---------- | ---------- |
| T1    | —          | T2, T3, T4 |
| T2    | T1         | T4         |
| T3    | T1         | T4         |
| T4    | T2, T3     | F1-F4      |
| F1-F4 | T4         | —          |

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `deep`
- **Wave 2**: 2 tasks — T2 → `unspecified-high`, T3 → `quick`
- **Wave 3**: 1 task — T4 → `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [ ] 1. auto-memory.ts 全面重写

  **What to do**:

  **1a. 重写 `buildMemoryGuide` 函数（核心文案改造）**

  删除现有函数体，按以下结构重写输出。文案风格参考 Claude Code 的 GB9/DA7 prompt（见参考文件）。
  使用**混合 prompt 风格**：显式用户请求用 MUST，自主判断用建议式。

  目标输出结构（非逐字要求，但必须覆盖以下 sections）：

  ```
  ## 🧠 Memory 系统指引

  Memory 是 AGENTS.md / CLAUDE.md 的**补充**，用于存储跨会话有价值的信息。
  不要将 AGENTS.md / CLAUDE.md 中已有的内容重复写入 memory。

  ### 何时保存 memory

  **你必须（MUST）保存 memory 当：**
  - 用户明确要求记住（触发词：记住、保存偏好、记录一下、记到memory、别忘了
    / remember、save to memory、note this down、don't forget、record）
  - 用户纠正了你的行为或表达了明确偏好

  **建议保存 memory 当：**
  - 发现了跨会话有用的模式或约定（想想：如果明天从头开始，这个信息有帮助吗？）
  - 用户描述了目标或背景（"我在做..."、"我们在迁移到..."）
  - 找到了可能再次出现的问题的解决方案
  - 用户的工作流、工具、沟通风格偏好

  ### 不要保存

  - 临时的当前任务细节（只在本次对话有用的信息）
  - AGENTS.md 或 CLAUDE.md 中已有的内容（不得重复或矛盾）
  - 可能不完整或未验证的结论（先查证再记录）
  - 机密信息（密码、API key 等）

  ### 如何保存

  直接使用你的内置 Write 或 Edit 工具操作 memory 文件：
  - 全局 memory：`{globalMemoryDir}/`
  - 项目 memory：`{projectMemoryDir}/`

  文件按主题分类（如 preferences.md、decisions.md、setup.md）。
  写入时保持简洁，用 markdown bullet points，保持原意不扩写。

  ### 如何更新已有 memory
  
  - 更新已有文件时，使用 Edit 工具追加或修改特定段落，不要用 Write 整体覆盖
  - 内容要具体、信息密集（包含文件路径、函数名、具体命令等）
  - 当某个 memory 文件内容过长时，精简旧条目而不是无限追加
  - 更新时保持已有内容的结构完整，不要破坏其他条目

  ### 当前 Memory 文件
  **全局**
  {文件名列表}

  **项目级**
  {文件名列表}

  ### 用户核心 Preferences
  {所有 memory 文件内容，格式参考 Claude Code: `Contents of {path}:\n{content}`}
  ```

  **1b. 改造函数签名**

  从：

  ```typescript
  function buildMemoryGuide(params: {
    globalMemoryDir: string;
    projectMemoryDir: string;
    globalFiles: string[];
    projectFiles: string[];
    preferencesContent: string; // ← 删除，替换为全部文件内容
  }): string;
  ```

  改为：

  ```typescript
  function buildMemoryGuide(params: {
    globalMemoryDir: string;
    projectMemoryDir: string;
    globalFiles: string[];
    projectFiles: string[];
    fileContents: Map<string, string>; // ← path → content 的映射
  }): string;
  ```

  **1c. 改造 `system.transform` hook — 注入所有 topic files**

  将当前的 `readPreferences` 调用替换为并行读取所有 .md 文件内容：

  ```typescript
  // 当前代码（删除）
  const [globalFiles, projectFiles, preferencesContent] = await Promise.all([
    listMarkdownFiles(globalMemoryDir),
    listMarkdownFiles(projectMemoryDir),
    readPreferences(`${globalMemoryDir}/preferences.md`),
  ]);

  // 新代码
  const [globalFiles, projectFiles] = await Promise.all([
    listMarkdownFiles(globalMemoryDir),
    listMarkdownFiles(projectMemoryDir),
  ]);
  const fileContents = new Map<string, string>();
  const allPaths = [
    ...globalFiles.map((f) => ({ dir: globalMemoryDir, name: f })),
    ...projectFiles.map((f) => ({ dir: projectMemoryDir, name: f })),
  ];
  await Promise.all(
    allPaths.map(async ({ dir, name }) => {
      try {
        const content = await Bun.file(`${dir}/${name}`).text();
        if (content.trim()) fileContents.set(`${dir}/${name}`, content.trim());
      } catch {
        /* Never disrupt user workflow */
      }
    }),
  );
  ```

  **1d. 删除以下代码**
  - `appendMemoryRecord` 函数（L87-102）
  - `readPreferences` 函数（L60-69）
  - `tool: { remember: tool({...}) }` 整个 tool 注册块（L213-248）
  - `tool` import（L2，`import { tool } from "@opencode-ai/plugin"`）

  **1e. 重写 `REMEMBER_COMMAND_CONTENT` 常量**

  当前引导调用 `remember tool`，改为引导用内置 write/edit 工具：

  ```
  ---
  description: 记忆助手 - 将关键信息写入 memory 文件
  ---

  当用户希望你记住偏好、决策或长期有价值的信息时，
  直接使用 Write 或 Edit 工具操作 memory 文件。

  ## 保存位置
  - 全局 memory：`~/.config/opencode/memory/`
  - 项目 memory：`{project}/.opencode/memory/`

  ## 保存步骤
  1. 提取要保存的信息（保持原意，不扩写）
  2. 确定文件分类（如 preferences.md、decisions.md、setup.md、notes.md）
  3. 确定 scope（全局 vs 项目级）
  4. 使用 Read 工具检查目标文件是否已存在，读取现有内容
  5. 使用 Edit 工具追加新内容（若文件存在），或用 Write 创建新文件

  ## 格式规范
  - 使用 markdown bullet points
  - 保持简洁，不扩写
  - 不存临时信息（只存跨会话有价值的内容）
  - 不重复 AGENTS.md / CLAUDE.md 中已有的内容

  如有参数，则优先围绕参数提取重点：$ARGUMENTS
  ```

  **1f. 改造 `ensureRememberCommand` — 内容不匹配时覆盖**

  当前逻辑：文件存在就跳过。新逻辑：文件存在但内容不匹配就覆盖。

  ```typescript
  // 当前代码（删除）
  if (await commandFile.exists()) return;

  // 新代码
  if (await commandFile.exists()) {
    const existing = await commandFile.text();
    if (existing.trim() === REMEMBER_COMMAND_CONTENT.trim()) return;
  }
  // 继续创建/覆盖
  ```

  **Must NOT do**:
  - ❌ 保留任何 `tool.remember` 相关代码
  - ❌ 保留 `appendMemoryRecord` 函数
  - ❌ 保留 `readPreferences` 函数
  - ❌ 保留 `import { tool }` 导入
  - ❌ 在 prompt 文案中引用 remember tool
  - ❌ 引入 frontmatter 解析、截断保护、MEMORY.md 索引
  - ❌ 改动 `compacting` hook（保持不变）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心文案设计 + 多处代码改造，需要深度理解 Claude Code prompt 风格
  - **Skills**: []
    - 无需特定 skill，任务聚焦在单文件改造

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: T2, T3, T4
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/oc-tweaks/src/plugins/auto-memory.ts` — 完整源文件，所有改动在此
  - `packages/oc-tweaks/src/plugins/compaction.ts` — 同项目 hook 模式参考（coding style）

  **Claude Code Prompt References** (边界定义文案风格参考):
  - `/home/cpf/.tweakcc/system-prompts/system-prompt-agent-memory-instructions.md` — agent memory 指令模板。注意它的简洁风格
  - `/home/cpf/.tweakcc/system-prompts/system-reminder-memory-file-contents.md` — memory 文件内容注入格式：`Contents of ${path}:\n\n${content}`
  - `/home/cpf/.tweakcc/system-prompts/agent-prompt-memory-selection.md` — memory 选择指令（参考风格，不实现选择逻辑）
  - `/home/cpf/.tweakcc/system-prompts/agent-prompt-remember-skill.md` — /remember skill（参考边界定义和「保守」风格）

  **Claude Code Binary Grep References** (GB9/DA7 原始 prompt):
  - GB9 建议式 prompt — "Stable patterns and conventions confirmed across multiple interactions" / "Solutions to recurring problems"
  - DA7 强制式 prompt — "You MUST save memories when: Information useful in future conversations" / "Reusable patterns NOT OTHERWISE DOCUMENTED in CLAUDE.md files"
  - 核心铁律: "Anything that duplicates or contradicts existing CLAUDE.md instructions → 不存 memory"

  **WHY Each Reference Matters**:
  - system-prompt-agent-memory-instructions.md → 模仿其简洁指令式风格
  - system-reminder-memory-file-contents.md → 用 `Contents of ${path}:` 格式注入文件内容
  - agent-prompt-remember-skill.md → 参考 "Be Conservative" 原则和 evidence threshold 概念
  - GB9/DA7 → 直接复用 What to save / What NOT to save 的条目列表，适配 OpenCode 语境

  **Acceptance Criteria**:
  - [ ] `buildMemoryGuide` 输出包含 "何时保存 memory" section（含 MUST 和建议两层）
  - [ ] `buildMemoryGuide` 输出包含 "不要保存" section（含 AGENTS.md/CLAUDE.md 不重复条目）
  - [ ] `buildMemoryGuide` 输出包含 "如何保存" section（引导用内置 Write/Edit 工具）
  - [ ] `buildMemoryGuide` 输出注入所有 memory 文件内容（不只是 preferences.md）
  - [ ] 代码中无 `tool.remember`、`appendMemoryRecord`、`readPreferences`
  - [ ] `import { tool }` 已删除
  - [ ] `REMEMBER_COMMAND_CONTENT` 不引用 remember tool，引导用内置工具
  - [ ] `ensureRememberCommand` 在内容不匹配时覆盖文件
  - [ ] `bun run build --cwd packages/oc-tweaks` 无 error

  **QA Scenarios:**

  ```
  Scenario: system.transform 注入包含边界定义
    Tool: Bash (bun test)
    Preconditions: autoMemory.enabled = true, memory 目录有 preferences.md
    Steps:
      1. 调用 autoMemoryPlugin({ directory: "/tmp/test" })
      2. 调用 hooks["experimental.chat.system.transform"]({}, { system: [] })
      3. 检查 output.system[0] 内容
    Expected Result:
      - 包含 "何时保存 memory" 或 "MUST"
      - 包含 "不要保存" 或 "NOT"
      - 包含 "AGENTS.md" 和 "CLAUDE.md"
      - 包含 "Write" 或 "Edit" 工具引用
      - 不包含 "remember tool"
    Evidence: .sisyphus/evidence/task-1-boundary-definitions.txt

  Scenario: 注入多个 memory 文件内容
    Tool: Bash (bun test)
    Preconditions: memory 目录有 preferences.md + decisions.md 两个文件
    Steps:
      1. mock 两个文件的内容
      2. 调用 system.transform hook
      3. 检查 output.system[0]
    Expected Result:
      - 包含 preferences.md 的内容
      - 包含 decisions.md 的内容
    Evidence: .sisyphus/evidence/task-1-multi-file-injection.txt

  Scenario: 无 remember tool 注册
    Tool: Bash (bun test)
    Preconditions: autoMemory.enabled = true
    Steps:
      1. 调用 autoMemoryPlugin
      2. 检查返回的 hooks 对象
    Expected Result:
      - hooks.tool 为 undefined 或不存在 remember 属性
    Evidence: .sisyphus/evidence/task-1-no-remember-tool.txt

  Scenario: ensureRememberCommand 覆盖旧版内容
    Tool: Bash (bun test)
    Preconditions: remember.md 已存在但内容是旧版（包含 "remember tool"）
    Steps:
      1. mock 旧版 remember.md
      2. 调用 ensureRememberCommand
      3. 检查写入调用
    Expected Result:
      - Bun.write 被调用，覆盖旧内容
      - 新内容不包含 "remember tool"
    Evidence: .sisyphus/evidence/task-1-command-override.txt
  ```

  **Commit**: YES
  - Message: `feat(auto-memory): rewrite memory guide with boundary definitions and remove remember tool`
  - Files: `packages/oc-tweaks/src/plugins/auto-memory.ts`
  - Pre-commit: `bun run build --cwd packages/oc-tweaks`

---

---

- [ ] 2. auto-memory.test.ts 测试适配

  **What to do**:

  适配测试到新代码结构：无 remember tool、新的 buildMemoryGuide 输出、注入所有文件、ensureRememberCommand 覆盖逻辑。

  **删除的测试（因对应代码已删除）：**
  - `"remember tool writes to global memory path"` (L151-172)
  - `"remember tool writes to project memory path with default category"` (L174-195)
  - `"remember tool returns error message when write fails"` (L197-216)
  - `"remember tool returns disabled message and does not write when config disabled"` (L218-238)

  **修改的测试：**
  - `"registers hooks and remember tool"` → 改为 `"registers hooks without remember tool"`
    - 删除 `expect(typeof hooks.tool?.remember).toBe("object")` 断言
    - 添加 `expect(hooks.tool).toBeUndefined()` 或 `expect(hooks.tool?.remember).toBeUndefined()`
  - `"injects memory system guide with trigger words"` → 加强断言
    - 新增: `expect(output.system[0]).toContain("AGENTS.md")` — 边界定义引用
    - 新增: `expect(output.system[0]).toContain("不要保存")` — 负面清单存在
    - 新增: `expect(output.system[0]).not.toContain("remember tool")` — 不引用旧 tool

  **新增的测试：**
  - `"injects all memory files, not just preferences"` — mock 多个 .md 文件，验证全部内容被注入
  - `"ensureRememberCommand overwrites when content differs"` — mock 旧版 remember.md，验证覆盖
  - `"ensureRememberCommand skips when content matches"` — mock 新版 remember.md，验证跳过

  **Must NOT do**:
  - ❌ 保留任何引用 `tool.remember` 的测试代码
  - ❌ 新增与计划无关的测试

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 测试适配需要理解新代码结构，但不需要深度推理
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T3)
  - **Blocks**: T4
  - **Blocked By**: T1

  **References**:
  - `packages/oc-tweaks/src/__tests__/auto-memory.test.ts` — 完整测试文件（239 行），了解现有 mock 模式和测试结构
  - `packages/oc-tweaks/src/plugins/auto-memory.ts` — T1 改造后的新代码，测试需对齐新接口
  - `packages/oc-tweaks/AGENTS.md` — 测试约定（mock 模式、// @ts-nocheck、afterEach 恢复）

  **Acceptance Criteria**:
  - [ ] 所有 remember tool 相关测试已删除
  - [ ] “边界定义”断言已添加（AGENTS.md、不要保存、无 remember tool 引用）
  - [ ] 多文件注入测试已添加
  - [ ] ensureRememberCommand 覆盖/跳过测试已添加
  - [ ] `bun test --cwd packages/oc-tweaks` 全部 PASS

  **QA Scenarios:**

  ```
  Scenario: 所有测试通过
    Tool: Bash
    Steps:
      1. bun test --cwd packages/oc-tweaks 2>&1
    Expected Result: 全部 pass，0 failures
    Evidence: .sisyphus/evidence/task-2-test-results.txt
  ```

  **Commit**: YES
  - Message: `test(auto-memory): adapt tests to new boundary-aware memory system`
  - Files: `packages/oc-tweaks/src/__tests__/auto-memory.test.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`

- [ ] 3. AGENTS.md 文档更新

  **What to do**:
  更新 `packages/oc-tweaks/AGENTS.md` 中 auto-memory 部分的架构描述：
  - 删除 `tool.remember` 的描述（「主动写入」部分）
  - 更新「被动注入」描述：加入边界定义 + 全量注入
  - 更新「约束」部分：反映新的架构（无 tool、无 append、无 timestamp）
  - 更新 `ensureRememberCommand` 描述：添加「内容不匹配时覆盖」逻辑

  **Must NOT do**:
  - ❌ 改动非 auto-memory 部分的文档
  - ❌ 改动 README.md（scope 外）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯文档更新，范围明确
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T2)
  - **Blocks**: T4
  - **Blocked By**: T1

  **References**:
  - `packages/oc-tweaks/AGENTS.md` — 当前文档，特别是 `### auto-memory 插件架构` 部分

  **Acceptance Criteria**:
  - [ ] AGENTS.md 不再描述 `tool.remember`
  - [ ] AGENTS.md 描述边界定义注入和全量文件注入
  - [ ] AGENTS.md 描述 `ensureRememberCommand` 的覆盖逻辑

  **QA Scenarios:**

  ```
  Scenario: AGENTS.md 无旧架构引用
    Tool: Bash (grep)
    Steps:
      1. grep -c "tool.remember" packages/oc-tweaks/AGENTS.md
      2. grep -c "appendMemoryRecord" packages/oc-tweaks/AGENTS.md
    Expected Result: 两个 grep 返回 0
    Evidence: .sisyphus/evidence/task-3-agents-md-clean.txt
  ```

  **Commit**: YES
  - Message: `docs(oc-tweaks): update AGENTS.md for auto-memory v0.3.0 changes`
  - Files: `packages/oc-tweaks/AGENTS.md`

- [ ] 4. Version bump + build + tag + push

  **What to do**:
  - bump `packages/oc-tweaks/package.json` version 从 `0.2.0` 到 `0.3.0`
  - 运行 `bun test --cwd packages/oc-tweaks && bun run build --cwd packages/oc-tweaks` 确认无 error
  - `git add . && git commit`
  - `git tag oc-tweaks-v0.3.0`
  - `git push && git push origin oc-tweaks-v0.3.0`
  - 监控 CI: `gh run list --repo cuipengfei/prompts --workflow=publish-oc-tweaks.yml --limit 5`

  **Must NOT do**:
  - ❌ 直接 `npm publish`（CI 处理）
  - ❌ 忘记 `--repo cuipengfei/prompts` 参数

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单字段修改 + 标准发布流程
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (solo)
  - **Blocks**: F1-F4
  - **Blocked By**: T2, T3

  **References**:
  - `packages/oc-tweaks/package.json` — 当前 version 0.2.0
  - `packages/oc-tweaks/AGENTS.md` — 发布流程说明（「发布」部分）

  **Acceptance Criteria**:
  - [ ] package.json version = "0.3.0"
  - [ ] `bun test` 全部 PASS
  - [ ] `bun run build` 无 error
  - [ ] git tag `oc-tweaks-v0.3.0` 已创建
  - [ ] tag 已推送到 remote
  - [ ] CI workflow 已触发

  **QA Scenarios:**

  ```
  Scenario: CI 已触发
    Tool: Bash
    Steps:
      1. gh run list --repo cuipengfei/prompts --workflow=publish-oc-tweaks.yml --limit 3
    Expected Result: 最新一条 run 对应 oc-tweaks-v0.3.0 tag
    Evidence: .sisyphus/evidence/task-4-ci-triggered.txt
  ```

  **Commit**: YES
  - Message: `chore(oc-tweaks): bump version to 0.3.0`
  - Files: `packages/oc-tweaks/package.json`
  - Pre-commit: `bun test --cwd packages/oc-tweaks && bun run build --cwd packages/oc-tweaks`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `bun test --cwd packages/oc-tweaks` + `bun run build --cwd packages/oc-tweaks`. Review all changed files for: empty catches without comment, console.log in prod, unused imports. Check AI slop: excessive comments, over-abstraction.
      Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
      Start from clean state. Load oc-tweaks in OpenCode with autoMemory enabled. Verify: system prompt contains boundary definitions, all memory files injected, no remember tool registered. Test edge cases: empty memory dir, missing config.
      Output: `Scenarios [N/N pass] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Flag unaccounted changes.
      Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **T1**: `feat(auto-memory): rewrite memory guide with boundary definitions and remove remember tool`
  - `packages/oc-tweaks/src/plugins/auto-memory.ts`
  - Pre-commit: `bun run build --cwd packages/oc-tweaks`
- **T2**: `test(auto-memory): adapt tests to new boundary-aware memory system`
  - `packages/oc-tweaks/src/__tests__/auto-memory.test.ts`
  - Pre-commit: `bun test --cwd packages/oc-tweaks`
- **T3**: `docs(oc-tweaks): update AGENTS.md for auto-memory v0.3.0 changes`
  - `packages/oc-tweaks/AGENTS.md`
- **T4**: `chore(oc-tweaks): bump version to 0.3.0`
  - `packages/oc-tweaks/package.json`
  - Pre-commit: `bun test --cwd packages/oc-tweaks && bun run build --cwd packages/oc-tweaks`

---

## Success Criteria

### Verification Commands

```bash
bun test --cwd packages/oc-tweaks          # Expected: all pass
bun run build --cwd packages/oc-tweaks     # Expected: no errors
```

### Final Checklist

- [ ] 边界定义（What to save / What NOT to save）在 system prompt 中注入
- [ ] 所有 memory .md 文件内容被注入
- [ ] 无 remember tool 注册
- [ ] 无 appendMemoryRecord 函数
- [ ] 无 timestamp 写入
- [ ] `/remember` command 引导用内置 write/edit
- [ ] 文案参考 Claude Code GB9/DA7 风格
- [ ] 测试全部通过
- [ ] 版本 bumped to 0.3.0
