# oc-tweaks Insights 模块 — 复刻 Claude Code `/insights`

## TL;DR

> **目标**: 在 `packages/oc-tweaks/` 中新增 `insights` 插件模块，复刻 Claude Code `/insights` 的普通用户路径，生成 LLM 驱动的个性化 HTML 使用报告。
>
> **交付物**:
> - `src/insights/` 目录：types, collector, facets, aggregator, generator, renderer, export, handler
> - `src/plugins/insights.ts`：OpenCode 插件入口，注册 `insights_generate` tool
> - `src/__tests__/insights/`：单元测试 + 集成测试
> - 生成到 `~/.local/share/opencode/insights/report.html` 的 HTML 报告（每次运行覆盖同一文件，与原版行为一致）
>
> **明确排除**:
> - `USER_TYPE=ant` 专属功能：远程 homespace 收集、S3 上传、Team Feedback section (`cc_team_improvements` + `model_behavior_improvements`)
> - Learning Mode Insights（独立功能，不属于 `/insights` 命令本身）
>
> **预计工作量**: Large（16 个实现任务 + 4 个 Final Verification）
> **并行执行**: YES — 5 waves
> **关键路径**: T1 → T8 → T12 → T13 → T15 → F1-F4

---

## Context

### 原始需求

用户要在 oc-tweaks 中实现 Claude Code `/insights` 的 OpenCode 版本。要求：
- 尽量忠实复刻（普通用户路径）
- 本地开发、本地轻量测试、不推 npm
- 小粒度测试，不做重端到端流程
- 不用 Playwright，直接读生成的 HTML 验证

### 研究总结

完整研究记录在 `docs/insights-analysis.md`（910 行）。关键事实：

**Claude Code 原版架构**（源码：`/mnt/d/code/claude-code-leaked/src/commands/insights.ts`，3200 行）：
1. Phase 1: 轻扫描 `scanAllSessions()` — 文件系统 metadata only
2. Phase 2: 加载 `SessionMeta` — 缓存命中直接用，未命中才解析 JSONL
3. Phase 3: Facets 提取 — per-session LLM 调用提取结构化标签，缓存
4. Phase 4: 聚合 `aggregateData()` — 40+ 字段全局统计
5. Phase 5: 并行生成 7 个 section（普通用户）+ At a Glance 最后串行
6. Phase 6: HTML 报告渲染
7. 返回 prompt 给 Claude（Markdown 摘要 + 报告链接）

**OpenCode 适配关键差异**:
- 存储：SQLite DB 而非 JSONL 文件 → collector 需要 SQL 查询
- SessionMeta：OC 的 `session` 表自带 `summary_additions/deletions/files` → 不需要单独的 meta 缓存层
- Facets：OC 无此概念 → 需从零构建 + 自建缓存
- LLM 调用：通过 `client.session.prompt()` → 会创建新 session → 需要元会话污染防护
- 无 JSONL 解析：消息在 `message` 表的 `data` JSON blob，工具调用在 `part` 表

### Metis 审查 + Oracle 两轮审查

Oracle 第一次评分 64%，第二次评分 84%。高优缺口（本版全部修复）：
1. ✅ Team Feedback 分支 → 明确排除（ant-only）
2. ✅ `buildExportData()` / `buildPromptForCommand()` contract → 已从源码逐行确认（原版名 `getPromptForCommand`，复刻后重命名为 `buildPromptForCommand`）
3. ✅ Facets 枚举值完整性 → 已从 LABEL_MAP + 提取 prompt 完整提取
4. ✅ 元会话污染防护 → 明确方案
5. ✅ 缓存 API + pipeline 顺序 → 已从 `generateUsageReport()` 确认

---

## Work Objectives

### 核心目标

在 oc-tweaks 中实现 Claude Code `/insights` 普通用户路径的完整复刻，生成 LLM 驱动的 HTML 使用分析报告。

### 具体交付

- `src/insights/types.ts` — SessionFacets, AggregatedData, InsightResults, InsightsExport
- `src/insights/constants.ts` — EXTENSION_TO_LANGUAGE, LABEL_MAP, batch constants
- `src/insights/cache.ts` — facets 缓存 load/save（JSON 文件）
- `src/insights/collector.ts` — 从 OpenCode SQLite DB 读 session/message/part
- `src/insights/facets.ts` — per-session LLM facets 提取
- `src/insights/aggregator.ts` — aggregateData() 全局聚合
- `src/insights/generator.ts` — 7 路并行 section + At a Glance 串行
- `src/insights/renderer.ts` — HTML 报告渲染
- `src/insights/export.ts` — buildExportData() + buildPromptForCommand()
- `src/insights/handler.ts` — 完整 pipeline 编排
- `src/plugins/insights.ts` — OpenCode 插件入口
- `src/__tests__/insights/*.test.ts` — 测试

### Must Have

1. per-session facets extraction（LLM 驱动，结构化 JSON 输出）
2. facets 缓存（避免重复 LLM 调用）
3. 7 路并行 section 生成 + At a Glance 最后串行
4. CSS 条形图 + 渐变卡片的 HTML 报告（Inter 字体，dark/light toggle）
5. `buildExportData()` 返回 InsightsExport 结构
6. `buildPromptForCommand()` 返回最终用户可见的 Markdown 摘要 + 报告链接
7. 元会话污染防护（insights 内部 session 不回流统计）
8. 报告缓存先查，命中则跳过重算

### Must NOT Have (Guardrails)

1. 不实现 `USER_TYPE=ant` 的 Team Feedback section、远程 homespace 收集、S3 上传
2. 不使用 Playwright 做测试 — 直接读 HTML 文件验证
3. 不推 npm — 本地测试即可
4. 不在 HTML 中硬编码 `Claude Code` 品牌 — 替换为 `OpenCode`
5. 不重复 oc-tweaks 已有的通知/compaction 逻辑
6. 不修改 OpenCode SQLite DB 的任何表 — 只读

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — 所有验证由 agent 执行。

### Test Decision

- **Infrastructure exists**: YES（`bun:test`，已有 9 个测试文件）
- **Automated tests**: YES (Tests-after)
- **Framework**: `bun:test`
- **Pattern**: 遵循 `src/__tests__/*.test.ts` 已有模式

### QA Policy

每个任务必须包含 agent 可执行的 QA scenarios。
Evidence 保存到 `.sisyphus/evidence/task-{N}-*.{ext}`。

- **类型正确性**: `bun run build` 无 TS 错误
- **单元测试**: `bun test src/__tests__/insights/`
- **HTML 验证**: Bash 读取生成的 HTML，grep 关键 section 标题
- **Pipeline 验证**: 脚本化运行 handler，验证输出文件存在

---

## Execution Strategy

### 并行执行 Waves

```
Wave 1 (7 tasks — foundation, all parallel):
├── T1: Types 定义 [quick]
├── T2: Constants 定义 [quick]
├── T3: Cache 层 [quick]
├── T4: DB Collector [unspecified-high]
├── T5: Prompt Templates（facets + 7 section + at-a-glance）[writing]
├── T6: HTML Renderer 骨架 [visual-engineering]
└── T7: Plugin Scaffold 骨架 [quick]

Wave 2 (4 tasks — core processing, parallel):
├── T8: Facets Extractor (depends: T1,T3,T5) [deep]
├── T9: Data Aggregator (depends: T1,T4) [unspecified-high]
├── T10: Renderer 完整实现 (depends: T1,T2,T6) [visual-engineering]
└── T11: Export Builder (depends: T1) [quick]

Wave 3 (2 tasks):
├── T12: Parallel Insights Generator (depends: T1,T5,T8,T9) [deep]
└── T13: Pipeline Handler (depends: T3,T4,T8,T9,T10,T11,T12) [deep]

Wave 4 (3 tasks — testing, parallel):
├── T14: Unit Tests (depends: T1-T4,T8,T9,T11) [quick]
├── T15: Integration Test (depends: T13) [unspecified-high]
└── T16: Wiring + Version Bump (depends: T13) [quick]

Wave FINAL (4 parallel reviews → user okay):
├── F1: Plan Compliance Audit (oracle)
├── F2: Code Quality Review (unspecified-high)
├── F3: Real Manual QA (unspecified-high)
└── F4: Scope Fidelity Check (deep)
→ Present results → Get explicit user okay
```

**Critical Path**: T1 → T8 → T12 → T13 → T15 → F1-F4 → user okay
**Parallel Speedup**: ~65% faster than sequential
**Max Concurrent**: 7 (Wave 1)

### Dependency Matrix

| Task | Blocked By | Blocks |
|------|-----------|--------|
| T1 | — | T8,T9,T10,T11,T12 |
| T2 | — | T10 |
| T3 | — | T8,T13 |
| T4 | — | T9,T13 |
| T5 | — | T8,T12 |
| T6 | — | T10 |
| T7 | — | T16 |
| T8 | T1,T3,T5 | T12,T13 |
| T9 | T1,T4 | T12,T13 |
| T10 | T1,T2,T6 | T13 |
| T11 | T1 | T13 |
| T12 | T1,T5,T8,T9 | T13 |
| T13 | T3,T4,T8,T9,T10,T11,T12 | T15,T16 |
| T14 | T1-T4,T8,T9,T11 | — |
| T15 | T13 | — |
| T16 | T13 | — |

### Agent Dispatch Summary

- **Wave 1**: 7 — T1→`quick`, T2→`quick`, T3→`quick`, T4→`unspecified-high`, T5→`writing`, T6→`visual-engineering`, T7→`quick`
- **Wave 2**: 4 — T8→`deep`, T9→`unspecified-high`, T10→`visual-engineering`, T11→`quick`
- **Wave 3**: 2 — T12→`deep`, T13→`deep`
- **Wave 4**: 3 — T14→`quick`, T15→`unspecified-high`, T16→`quick`
- **FINAL**: 4 — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. Types 定义 — `src/insights/types.ts`

  **What to do**:
  - 定义 `SessionFacets` 类型（完整对齐 Claude Code 原版 line 260-272）：
    ```typescript
    type SessionFacets = {
      session_id: string
      underlying_goal: string
      goal_categories: Record<string, number>
      outcome: "fully_achieved" | "mostly_achieved" | "partially_achieved" | "not_achieved" | "unclear_from_transcript"
      user_satisfaction_counts: Record<string, number>
      claude_helpfulness: "unhelpful" | "slightly_helpful" | "moderately_helpful" | "very_helpful" | "essential"
      session_type: "single_task" | "multi_task" | "iterative_refinement" | "exploration" | "quick_question"
      friction_counts: Record<string, number>
      friction_detail: string
      primary_success: "none" | "fast_accurate_search" | "correct_code_edits" | "good_explanations" | "proactive_help" | "multi_file_changes" | "good_debugging"
      brief_summary: string
      user_instructions_to_claude?: string[]
    }
    ```
  - 定义 `AggregatedData` 类型（40+ 字段，对齐原版 line 275-326）：
    - 基础统计：total_sessions, sessions_with_facets, date_range, total_messages, total_duration_hours
    - Token 统计：total_input_tokens, total_output_tokens
    - 工具统计：tool_counts, languages, git_commits, git_pushes
    - Facets 聚合：goal_categories, outcomes, satisfaction, helpfulness, session_types, friction, success
    - Session 摘要：session_summaries[]
    - 行为统计：total_interruptions, total_tool_errors, tool_error_categories, user_response_times, median/avg_response_time
    - 特性使用：sessions_using_task_agent/mcp/web_search/web_fetch
    - 代码统计：total_lines_added/removed, total_files_modified, days_active, messages_per_day
    - 时间统计：message_hours[]
    - Multi-clauding：overlap_events, sessions_involved, user_messages_during
  - 定义 `InsightResults` 类型（对齐原版 line 1497-1570）：
    - at_a_glance?: { whats_working, whats_hindering, quick_wins, ambitious_workflows }
    - project_areas?: { areas: { name, session_count, description }[] }
    - interaction_style?: { narrative, key_pattern }
    - what_works?: { intro, impressive_workflows: { title, description }[] }
    - friction_analysis?: { intro, categories: { category, description, examples }[] }
    - suggestions?: { claude_md_additions[], features_to_try[], usage_patterns[] }
    - on_the_horizon?: { intro, opportunities: { title, whats_possible, how_to_try, copyable_prompt }[] }
    - fun_ending?: { headline, detail }
  - 定义 `InsightsExport` 类型（对齐原版 line 2679-2737）：
    - metadata: { username, generated_at, opencode_version, date_range, session_count }
    - aggregated_data: AggregatedData
    - insights: InsightResults
    - facets_summary: { total, goal_categories, outcomes, satisfaction, friction }
  - 定义 `SessionMeta` 类型（OpenCode 适配版，从 DB session + message + part 聚合）
  - 定义 `InsightSection` 类型：{ name, prompt, maxTokens }

  **Must NOT do**: 不添加 `cc_team_improvements` 或 `model_behavior_improvements` 到 InsightResults

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 1 | Blocks: T8,T9,T10,T11,T12 | Blocked By: None

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:260-326` — SessionFacets + AggregatedData 原版类型
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1497-1570` — InsightResults 原版类型
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2679-2737` — InsightsExport + buildExportData 原版
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/types.ts` — 现有 types.ts 导出模式
  - `/mnt/d/code/prompts/docs/insights-analysis.md:620-688` — OpenCode Message 数据模型

  **Acceptance Criteria**:
  - [ ] `bun run build` 无 TS 错误
  - [ ] SessionFacets 包含 11 个必填字段（session_id, underlying_goal, goal_categories, outcome, user_satisfaction_counts, claude_helpfulness, session_type, friction_counts, friction_detail, primary_success, brief_summary）+ 1 个可选字段（user_instructions_to_claude）
  - [ ] AggregatedData 包含 40+ 字段

  **QA Scenarios**:
  ```
  Scenario: Types compile correctly
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun run build
      2. cd packages/oc-tweaks && grep "SessionFacets" src/insights/types.ts | wc -l
    Expected Result: build 成功，SessionFacets 出现 ≥1 次
    Evidence: .sisyphus/evidence/task-1-types-compile.txt
  ```

  **Commit**: YES (group with T2, T3)
  - Message: `feat(insights): add types, constants, and cache layer`

- [x] 2. Constants 定义 — `src/insights/constants.ts`

  **What to do**:
  - 定义 `EXTENSION_TO_LANGUAGE` 映射表（16 个扩展名键 → 13 种语言标签：.ts/.tsx→TypeScript, .js/.jsx→JavaScript, .py→Python, .rb→Ruby, .go→Go, .rs→Rust, .java→Java, .md→Markdown, .json→JSON, .yaml/.yml→YAML, .sh→Shell, .css→CSS, .html→HTML）
  - 定义 `LABEL_MAP`（完整对齐原版 line 352-414）—— **注意：这是 UI 显示标签映射表，不是 LLM 必须输出的枚举集**。LLM 可以返回这些键之外的自由文本，LABEL_MAP 只是负责把常见键美化为人类可读标签：
    - Goal categories (13): debug_investigate, implement_feature, fix_bug, write_script_tool, refactor_code, configure_system, create_pr_commit, analyze_data, understand_codebase, write_tests, write_docs, deploy_infra, warmup_minimal
    - Success factors (7): fast_accurate_search, correct_code_edits, good_explanations, proactive_help, multi_file_changes, handled_complexity→"Multi-file Changes", good_debugging
    - Friction types (12): misunderstood_request, wrong_approach, buggy_code, user_rejected_action, claude_got_blocked, user_stopped_early, wrong_file_or_location, excessive_changes, slow_or_verbose, tool_failed, user_unclear, external_issue
    - Satisfaction (8): frustrated, dissatisfied, likely_satisfied, satisfied, happy, unsure, neutral, delighted
    - Session types (5): single_task, multi_task, iterative_refinement, exploration, quick_question
    - Outcomes (5): fully_achieved, mostly_achieved, partially_achieved, not_achieved, unclear_from_transcript
    - Helpfulness (5): unhelpful, slightly_helpful, moderately_helpful, very_helpful, essential
  - 定义排序常量：SATISFACTION_ORDER, OUTCOME_ORDER
  - 定义批量常量：MAX_FACET_EXTRACTIONS=50, CONCURRENCY=50, MAX_SESSIONS=200

  **Must NOT do**: 不添加任何 ant-only 相关常量

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 1 | Blocks: T10 | Blocked By: None

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:332-414` — EXTENSION_TO_LANGUAGE + LABEL_MAP 完整定义
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1807-1818` — SATISFACTION_ORDER, OUTCOME_ORDER

  **Acceptance Criteria**:
  - [ ] LABEL_MAP 包含 55+ 条映射（13+7+12+8+5+5+5）
  - [ ] EXTENSION_TO_LANGUAGE 包含 16 个扩展名键（映射到 13 种语言标签）

  **QA Scenarios**:
  ```
  Scenario: Constants complete
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && grep -c ":" src/insights/constants.ts
    Expected Result: ≥70 行包含冒号（映射条目）
    Evidence: .sisyphus/evidence/task-2-constants.txt
  ```

  **Commit**: YES (group with T1, T3)

- [x] 3. Cache Layer — `src/insights/cache.ts`

  **What to do**:
  - 实现 facets 缓存：
    - `getFacetsDir()` → `~/.local/share/opencode/insights/facets/`
    - `loadCachedFacets(sessionId: string): Promise<SessionFacets | null>` — 读 `{facetsDir}/{sessionId}.json`
    - `saveFacets(facets: SessionFacets): Promise<void>` — 写 JSON 到缓存目录
    - `isValidSessionFacets(obj: unknown): obj is SessionFacets` — 验证函数（对齐原版 line 3184-3197：检查 underlying_goal, outcome, brief_summary 为 string，goal_categories/user_satisfaction_counts/friction_counts 为 object）
  - 实现报告缓存：
    - `getReportDir()` → `~/.local/share/opencode/insights/`
    - `getReportPath()` → `{reportDir}/report.html`
    - `isReportFresh(dbPath?: string): Promise<boolean>` — 检查 report.html 是否仍然新鲜：
      - report.html 存在且 mtime < 24h
      - DB 的 `SELECT MAX(time_updated) FROM session` 不晚于 report.html mtime
      - 两个条件都满足 → fresh
  - 使用 Bun.file / Bun.write API（遵循 oc-tweaks 的 Bun API 约定）
  - 确保目录创建（mkdir -p equivalent）

  **Must NOT do**: 不实现 session meta 缓存（OC 的 session 表已包含预计算统计，不需要额外缓存）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 1 | Blocks: T8, T13 | Blocked By: None

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:420-428` — 原版缓存目录结构
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:3184-3197` — isValidSessionFacets 验证逻辑
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:963-970` — saveFacets 原版
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/utils/config.ts` — Bun.file 用法模式

  **Acceptance Criteria**:
  - [ ] loadCachedFacets 读取不存在的文件返回 null
  - [ ] saveFacets → loadCachedFacets 往返一致
  - [ ] isValidSessionFacets 正确拒绝不完整对象

  **QA Scenarios**:
  ```
  Scenario: Cache round-trip
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/cache.test.ts
    Expected Result: 全部通过
    Evidence: .sisyphus/evidence/task-3-cache-test.txt
  ```

  **Commit**: YES (group with T1, T2)

- [x] 4. DB Collector — `src/insights/collector.ts`

  **What to do**:
  - 实现 `collectSessions(options?: { dbPath?: string, days?: number, project?: string }): Promise<SessionMeta[]>`:
    - 默认 dbPath = `~/.local/share/opencode/opencode.db`
    - SQL 组装逻辑（4 步）：
      1. `let sql = "SELECT * FROM session"`
      2. 构建 `conditions: string[]`，有条件就 push：
         - `days` 有值→ `conditions.push("time_created > ?")`（参数 = 当前时间 - days * 86400000）
         - `project` 有值→ `conditions.push("project_id = ?")`
         - title 排除→ `conditions.push("title NOT LIKE '%[insights-internal]%'")`
      3. 若 conditions 非空，`sql += " WHERE " + conditions.join(' AND ')`
      4. `sql += " ORDER BY time_updated DESC"`
    - 排除 title 含 `[insights-internal]` 的 session（元会话污染防护）
    - 全量读取用于统计，前 MAX_SESSIONS=200 做 facets 提取
    - 将每个 session row 映射为 SessionMeta
  - 实现 `collectMessages(dbPath: string, sessionId: string): Promise<MessageData[]>`:
    - `SELECT data FROM message WHERE session_id = ? ORDER BY time_created ASC`
    - 解析 data JSON blob
  - 实现 `collectParts(dbPath: string, sessionId: string): Promise<PartData[]>`:
    - `SELECT data FROM part WHERE session_id = ? ORDER BY id ASC`
    - 解析 data JSON blob，提取 tool 调用信息
  - 实现 `extractToolStats(messages, parts)`:
    - **注意 OC vs CC 数据模型差异**：
      - CC 的 tool_use/tool_result 在 message.content blocks 中，OC 的工具调用在 `part.data`（type="tool"）
      - CC 的 is_error 在 tool_result block，OC 的错误判断逻辑：优先读 `part.data.state.error`（boolean/string），若无则从 `part.data.state.output` 文本内容推断（含错误子串分类）
      - CC 的 input 在 tool_use block.input，OC 的在 `part.data.state.input`
      - CC 的 token 在 message.usage，OC 的在 `message.data.tokens`
    - 对齐原版 `extractToolStats` (line 467-489) 的**语义**，但适配 OC 数据结构：
      - toolCounts: tool part 的 tool name 计数
      - languages: tool input 中 file_path 的后缀 → EXTENSION_TO_LANGUAGE
      - gitCommits: command tool 中 `git commit` 计数
      - gitPushes: command tool 中 `git push` 计数
      - inputTokens/outputTokens: message.data.tokens.input/output
      - userInterruptions: user message 含 `[Request interrupted` 计数
      - userResponseTimes: user_time - last_assistant_time (2s < t < 3600s)
      - messageHours: user message 的 time_created → getHours()
      - toolErrors: 优先读 `part.data.state.error`，若无则从 `part.data.state.output` 文本内容推断错误计数
      - toolErrorCategories: 按子串分类 (exit code, rejected, string to replace, modified since, exceeds maximum, file not found, 其他)
      - linesAdded/Removed: 从 Edit tool 的 old_string/new_string diff 计算
      - filesModified: Edit/Write tool 的 file_path Set
  - 使用 `bun:sqlite` API 进行 DB 读取

  **Must NOT do**: 不写入 DB，不修改任何 DB 表

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**: Wave 1 | Blocks: T9, T13 | Blocked By: None

  **References**:
  - `/mnt/d/code/prompts/docs/insights-analysis.md:519-560` — OpenCode DB 表结构
  - `/mnt/d/code/prompts/docs/insights-analysis.md:620-688` — OpenCode message/part 数据模型
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:467-489` — extractToolStats 签名
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:490-660` — extractToolStats 实现逻辑（需要对齐）
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2846-2861` — isMetaSession 元会话检测逻辑
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2919-2924` — isSubstantiveSession 过滤（user_message_count < 2 || duration < 1min）
  - `/home/cpf/.local/share/opencode/opencode.db` — 实际 DB 文件（1.3GB，2447 sessions）

  **Acceptance Criteria**:
  - [ ] collectSessions 能正确读取 OpenCode DB
  - [ ] extractToolStats 从 message/part 数据中提取全部 15+ 指标
  - [ ] 排除 title 含 `[insights-internal]` 的 session
  - [ ] `days` 参数生效：传入 days=1 时只返回最近 1 天的 session
  - [ ] `project` 参数生效：传入存在的 project_id 时只返回该项目的 session
  - [ ] `days` + `project` 同时传入时两个条件用 AND 连接

  **QA Scenarios**:
  ```
  Scenario: Collector reads real DB
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun eval "import { collectSessions } from './src/insights/collector'; const s = await collectSessions(); console.log('sessions:', s.length)"
    Expected Result: sessions > 0（DB 中约 2000+，collectSessions 返回全量）
    Evidence: .sisyphus/evidence/task-4-collector.txt

  Scenario: Meta session excluded
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun eval "import { collectSessions } from './src/insights/collector'; const s = await collectSessions(); const meta = s.filter(x => x.title?.includes('[insights-internal]')); console.log('meta sessions found:', meta.length)"
    Expected Result: meta sessions found: 0
    Evidence: .sisyphus/evidence/task-4-meta-exclusion.txt

  Scenario: Days filter works
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/collector.test.ts --test-name-pattern "days filter"
    Expected Result: 测试通过，验证 days=1 只返回最近 1 天的 session
    Evidence: .sisyphus/evidence/task-4-days-filter.txt

  Scenario: Project filter works
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/collector.test.ts --test-name-pattern "project filter"
    Expected Result: 测试通过，验证只返回指定 project_id 的 session
    Evidence: .sisyphus/evidence/task-4-project-filter.txt
  ```

  **Commit**: YES (group with T5)

- [x] 5. Prompt Templates — `src/insights/prompts/`

  **What to do**:
  - 创建 `src/insights/prompts/facets-extraction.ts`：
    - 导出 `FACET_EXTRACTION_PROMPT: string`
    - 对齐原版 line 856-928 的 facets 提取 prompt
    - 要求 LLM 输出严格 JSON，包含 SessionFacets 所有字段
    - 提示词末尾包含 `RESPOND WITH ONLY A VALID JSON OBJECT`
    - 包含 JSON schema 示例（goal_categories, outcome, satisfaction 等字段）
  - 创建 `src/insights/prompts/sections.ts`：
    - 导出 `INSIGHT_SECTIONS: InsightSection[]`（7 个普通用户 section）
    - 每个 section 包含 { name, prompt, maxTokens: 8192 }
    - 7 个 section（对齐原版 line 1310-1570）：
      1. `project_areas` — "What You Work On"
      2. `interaction_style` — "How You Use OpenCode"
      3. `what_works` — "Impressive Things"
      4. `friction_analysis` — "Where Things Go Wrong"
      5. `suggestions` — "Features to Try"
      6. `on_the_horizon` — "New Ways to Use OpenCode"
      7. `fun_ending` — "Fun Ending"
    - 每个 prompt 末尾包含 `RESPOND WITH ONLY A VALID JSON OBJECT`
    - 每个 prompt 包含明确的 JSON schema（字段名、类型、示例值）
  - 创建 `src/insights/prompts/at-a-glance.ts`：
    - 导出 `AT_A_GLANCE_PROMPT: string`
    - 对齐原版 line 1682-1798 的 At a Glance 生成 prompt
    - 接收已生成 section 的文本摘要作为输入
    - 输出 JSON: `{ whats_working, whats_hindering, quick_wins, ambitious_workflows }`
    - 末尾包含 `RESPOND WITH ONLY A VALID JSON OBJECT`

  **Must NOT do**: 不包含 `cc_team_improvements` 或 `model_behavior_improvements` 的 prompt

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**: Wave 1 | Blocks: T8, T12 | Blocked By: None

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:856-928` — FACET_EXTRACTION_PROMPT 原版
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1310-1570` — 7 个 section prompt 原版
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1682-1798` — At a Glance prompt 原版
  - `/mnt/d/code/prompts/docs/insights-analysis.md:290-370` — Prompt 结构分析

  **Acceptance Criteria**:
  - [ ] 3 个 prompt 文件导出 9 个 prompt（1 facets + 7 section array + 1 at-a-glance）
  - [ ] 每个 prompt 包含 `RESPOND WITH ONLY A VALID JSON` 指令
  - [ ] 每个 prompt 包含明确的 JSON schema 定义

  **QA Scenarios**:
  ```
  Scenario: Prompts complete
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && grep -c "RESPOND WITH ONLY A VALID JSON" src/insights/prompts/*.ts
    Expected Result: ≥9（7 section + 1 facets + 1 at-a-glance = 9 个文件各含至少 1 次）
    Evidence: .sisyphus/evidence/task-5-prompts.txt
  ```

  **Commit**: YES (group with T4)

- [x] 6. HTML Renderer 骨架 — `src/insights/renderer.ts`

  **What to do**:
  - 创建 `generateHtmlReport(data: AggregatedData, insights: InsightResults): string`
  - 先实现完整的 HTML 骨架结构（CSS + JS + section placeholders）
  - 必须包含的 HTML 结构（对齐原版 line 1800-2670）：
    - 页面头部：标题 "OpenCode Insights"、副标题（sessions/messages/date_range）、导航目录
    - 统计摘要栏：Messages | Lines (+/-) | Files | Days Active | Msgs/Day
    - Section 1: At a Glance（黄橙渐变卡，4 段 + 链接到详细 section）
    - Section 2: What You Work On（项目 area 卡片）
    - 4 个 CSS 条形图：What You Wanted (蓝 #2563eb)、Top Tools Used (青 #0891b2)、Languages (绿 #10b981)、Session Types (紫 #8b5cf6)
    - Section 3: How You Use OpenCode（叙述 + 绿色 key pattern 提示框）
    - 用户响应时间直方图
    - 时间分布图（Morning/Afternoon/Evening/Night + 时区选择器）
    - Section 4: Impressive Things（绿色卡片）
    - Section 5: Where Things Go Wrong（红色卡片）
    - Section 6: Features to Try（AGENTS.md 建议 + Feature 卡片 + Copy 按钮）
    - Section 7: New Ways to Use OpenCode（pattern cards + copyable prompts）
    - Section 8: On the Horizon（紫色渐变卡片 + copyable prompts）
    - Section 9: Fun Ending（黄色渐变卡片）
    - 额外图表区：Outcomes / Friction Types / Satisfaction / User Response Time / Time of Day / Multi-Clauding
    - **普通用户路径共计 9 个主 section + 图表/统计区**（原版第 10 个 section 是 ant-only 的 Team Feedback，已排除）
  - CSS 要点：Inter 字体、渐变卡片、CSS 条形图、dark/light toggle、clipboard copy 按钮
  - JS 要点：toggleCollapsible、copyToClipboard、dark mode toggle、timezone selector
  - 辅助函数：`escapeHtml`、`escapeHtmlWithBold`（处理 **bold** → <strong>）、`generateBarChart`

  **Must NOT do**: 不使用任何外部 CSS/JS 框架，全部内联（与原版一致）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**: Wave 1 | Blocks: T10 | Blocked By: None

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1800-2670` — 完整 generateHtmlReport 实现
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2280-2382` — CSS 样式定义
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2386-2484` — JS 交互（dark mode, copy, timezone）
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2484-2670` — HTML section 渲染逻辑
  - `/mnt/d/code/prompts/docs/insights-analysis.md:14-93` — 报告视觉描述

  **Acceptance Criteria**:
  - [ ] 传入空数据时生成有效 HTML（可用浏览器打开）
  - [ ] HTML 包含 9 个主 section 的 id 锚点 + 图表/统计区（section-glance, section-projects, section-style, section-wins, section-friction, section-features, section-patterns, section-horizon, section-fun）
  - [ ] 包含 dark/light toggle JS
  - [ ] 包含 clipboard copy 功能
  - [ ] 使用 Inter/system font stack（Inter via Google Fonts CDN link，fallback 到 system-ui）

  **QA Scenarios**:
  ```
  Scenario: Empty report renders valid HTML
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun eval "import { generateHtmlReport } from './src/insights/renderer'; import { writeFileSync } from 'fs'; const html = generateHtmlReport({} as any, {} as any); writeFileSync('/tmp/test-report.html', html); console.log('wrote', html.length, 'bytes')"  # as any 仅用于 QA 脚本
      2. grep -c 'section-' /tmp/test-report.html
    Expected Result: ≥ 9 个 section id
    Evidence: .sisyphus/evidence/task-6-renderer.txt
  ```

  **Commit**: YES (group with T7)

- [x] 7. Plugin Scaffold — `src/plugins/insights.ts` 骨架

  **What to do**:
  - 创建 `src/plugins/insights.ts`，遵循 oc-tweaks 插件模式：
    ```typescript
    import type { Plugin } from "@opencode-ai/plugin"
    import { loadOcTweaksConfig, safeHook } from "../utils"

    export const insightsPlugin: Plugin = async ({ client, directory }) => {
      return {
        // tool 注册将在 T16 完善
      }
    }
    ```
  - 在 `src/index.ts` 添加 `export { insightsPlugin } from "./plugins/insights"`
  - 创建 `src/insights/` 目录结构（空文件占位）：
    - types.ts, constants.ts, cache.ts, collector.ts, facets.ts, aggregator.ts, generator.ts, renderer.ts, export.ts, handler.ts
    - prompts/: facets-extraction.ts, sections.ts, at-a-glance.ts
  - 在 `src/types.ts` 添加 insights 类型导出

  **Must NOT do**: 不实现具体逻辑，只是骨架和目录结构

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 1 | Blocks: T16 | Blocked By: None

  **References**:
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/index.ts` — 现有导出模式
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/plugins/notify.ts:1-14` — 插件结构模式
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/types.ts` — 类型导出模式

  **Acceptance Criteria**:
  - [ ] `bun run build` 无错误
  - [ ] `src/insights/` 目录包含全部 13 个文件

  **QA Scenarios**:
  ```
  Scenario: Build succeeds with scaffold
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun run build
    Expected Result: 成功，无错误
    Evidence: .sisyphus/evidence/task-7-scaffold.txt
  ```

  **Commit**: YES (group with T6)

- [x] 8. Facets Extractor — `src/insights/facets.ts`

  **What to do**:
  - 实现 `extractFacetsFromAPI(client, sessionId, messages, parts): Promise<SessionFacets | null>`
    - 对齐原版 line 1001-1055
    - 将 messages + parts 格式化为 transcript 文本
    - 长 transcript 先摘要压缩（原版 formatTranscriptWithSummarization：超过 30000 chars 时分 chunk 25000 摘要）
    - 调用 `client.session.prompt()` 发送 FACET_EXTRACTION_PROMPT + transcript + JSON schema
    - 创建的 session title 标记为 `[insights-internal]`（元会话污染防护）
    - 解析 LLM 返回的 JSON（`text.match(/\{[\s\S]*\}/)`）
    - 用 `isValidSessionFacets()` 验证
    - 成功则调用 `saveFacets()` 缓存
  - 实现 `extractAllFacets(client, sessions, messages, parts, cachedFacets): Promise<Map<string, SessionFacets>>`
    - 先加载缓存：对每个 substantive session 调 loadCachedFacets
    - 未命中缓存的 session 走 LLM 提取（最多 MAX_FACET_EXTRACTIONS=50 个）
    - **并发控制**：CONCURRENCY=50 个同时请求
    - 保存新提取的 facets
  - 实现 `isSubstantiveSession(meta)`: user_message_count < 2 || duration < 1min → 跳过
  - 实现 `isMinimalSession(facets)`: warmup_minimal 是唯一 goal_category → 跳过

  **Must NOT do**: 不处理 ant-only 的远程 session

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**: Wave 2 | Blocks: T12, T13 | Blocked By: T1, T3, T5

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1001-1055` — extractFacetsFromAPI 完整实现
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:929-970` — loadCachedFacets + saveFacets
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2929-2992` — Phase 3 facets 流程：缓存→提取→过滤
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2919-2924` — isSubstantiveSession
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2973-2981` — isMinimalSession
  - `/home/cpf/.cache/opencode/node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.d.ts` — client.session.prompt() API

  **Acceptance Criteria**:
  - [ ] extractFacetsFromAPI 返回符合 SessionFacets 类型的对象
  - [ ] 缓存命中时不调 LLM
  - [ ] 创建的 session title 含 `[insights-internal]`

  **QA Scenarios**:
  ```
  Scenario: Facets extraction with mock LLM
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/facets.test.ts
    Expected Result: 全部通过（mock client.session.prompt）
    Evidence: .sisyphus/evidence/task-8-facets.txt

  Scenario: Cache hit skips LLM
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/facets.test.ts --test-name-pattern "cache hit"
    Expected Result: 测试通过，验证 client.session.prompt 未被调用（mock spy 调用次数 = 0）
    Evidence: .sisyphus/evidence/task-8-cache-hit.txt
  ```

  **Commit**: YES (group with T9)

- [x] 9. Data Aggregator — `src/insights/aggregator.ts`

  **What to do**:
  - 实现 `aggregateData(sessions: SessionMeta[], facets: Map<string, SessionFacets>): AggregatedData`
    - 对齐原版 line 1147-1300
    - 基础统计聚合：
      - total_sessions, sessions_with_facets
      - date_range: { start: earliest date, end: latest date }
      - total_messages: sum of all session messages
      - total_duration_hours: sum of session durations
      - total_input_tokens, total_output_tokens
    - 工具统计聚合：
      - tool_counts: 合并所有 session 的 tool 计数
      - languages: 合并所有 session 的语言计数
      - git_commits, git_pushes: 总和
    - Facets 聚合（关键 — 原版 line 1241-1282）：
      - 遍历每个 session 的 facets，将 goal_categories/outcomes/satisfaction/helpfulness/session_types/friction/success 聚合到 AggregatedData 的对应 Record 中
    - Session 摘要：从 facets 的 brief_summary 构建 session_summaries[]
    - 行为统计：
      - total_interruptions, total_tool_errors, tool_error_categories
      - user_response_times (合并所有 session)
      - median_response_time, avg_response_time
      - message_hours (合并)
    - Multi-clauding 检测（对齐原版 detectMultiClauding：30min 窗口内多个 session 同时活跃）
    - 代码统计：total_lines_added/removed, total_files_modified, days_active, messages_per_day
    - 特性使用：sessions_using_task_agent/mcp/web_search/web_fetch

  **Must NOT do**: 不引入新的外部依赖；不修改 SessionFacets 型别定义；不对应该在 collector 层计算的原始指标做重复计算

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**: Wave 2 | Blocks: T12, T13 | Blocked By: T1, T4

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1147-1300` — aggregateData 完整实现
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1057-1145` — detectMultiClauding

  **Acceptance Criteria**:
  - [ ] 传入 mock sessions + facets 返回完整 AggregatedData
  - [ ] multi-clauding 检测工作正常
  - [ ] facets 聚合正确累加 goal_categories/friction 等 Record

  **QA Scenarios**:
  ```
  Scenario: Aggregator produces complete data
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/aggregator.test.ts
    Expected Result: 全部通过
    Evidence: .sisyphus/evidence/task-9-aggregator.txt
  ```

  **Commit**: YES (group with T8)

- [x] 10. Renderer 完整实现 — `src/insights/renderer.ts`

  **What to do**:
  - 在 T6 骨架基础上，实现所有 section 的数据绑定：
    - 将 AggregatedData + InsightResults 的实际数据渲染到各 section HTML
    - `generateBarChart(data, color, maxItems?, order?)` — CSS 条形图生成器
    - At a Glance section 的 4 段绑定
    - 每个 section 的动态内容填充
    - Copy 按钮绑定到 copyable_prompt 字段
    - AGENTS.md suggestions 的 checkbox + Copy All 按钮
  - 确保 `generateHtmlReport(data, insights)` 传入真实数据时正确渲染

  **Must NOT do**: 不引入外部 CSS/JS 图表库（Chart.js/D3 等），全部用纯 CSS 条形图；不硬编码 `Claude Code` 品牌

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**: Wave 2 | Blocks: T13 | Blocked By: T1, T2, T6

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1820-2670` — 完整 HTML 渲染（bar charts, section HTML, CSS）

  **Acceptance Criteria**:
  - [ ] 传入 mock AggregatedData + InsightResults 生成完整 HTML
  - [ ] 4 个 CSS 条形图正确渲染（有 width% 样式）
  - [ ] Copy 按钮有 onclick handler

  **QA Scenarios**:
  ```
  Scenario: Full report with mock data
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun eval "import { generateHtmlReport } from './src/insights/renderer'; import { writeFileSync } from 'fs'; const mockData = { total_sessions: 10, total_messages: 100, tool_counts: { Edit: 50, Read: 30 }, languages: { TypeScript: 40 }, session_types: { single_task: 5, multi_task: 3 } }; const mockInsights = { friction_analysis: { categories: [{ category: 'test' }] } }; const html = generateHtmlReport(mockData as any, mockInsights as any); writeFileSync('/tmp/test-full-report.html', html); console.log('wrote', html.length, 'bytes')"  # as any 仅用于 QA 脚本
      2. grep 'section-friction' /tmp/test-full-report.html
      3. grep -c 'bar-fill' /tmp/test-full-report.html
    Expected Result: section-friction 存在，bar-fill ≥4
    Evidence: .sisyphus/evidence/task-10-renderer-full.txt
  ```

  **Commit**: YES (group with T11)

- [x] 11. Export Builder — `src/insights/export.ts`

  **What to do**:
  - 实现 `buildExportData(data, insights, facets): InsightsExport`
    - 完整对齐原版 line 2679-2737
    - metadata: { username: process.env.USER, generated_at: ISO string, opencode_version: string, date_range, session_count }
    - aggregated_data: 完整 AggregatedData
    - insights: InsightResults
    - facets_summary: 遍历 facets，累加 goal_categories/outcomes/satisfaction/friction
  - 实现 `buildPromptForCommand(insights, htmlPath, data, facetsDir): string`
    - 完整对齐原版 `getPromptForCommand()` (line 3046-3181)，重命名为 `buildPromptForCommand`（排除 ant-only 分支）
    - 返回给 AI 的文本包含：
      1. "The user just ran /insights to generate a usage report analyzing their OpenCode sessions."
      2. Pretty-printed insights JSON
      3. Report URL: `file://{htmlPath}`
      4. HTML file path
      5. Facets directory: `{facetsDir}`
      6. User-visible summary: title + stats line + date range + At a Glance 4 段摘要
      7. Final reply template: "Your shareable insights report is ready: {url}\nWant to dig into any section or try one of the suggestions?"
    - Stats line 格式：`{sessions} sessions · {messages} messages · {hours}h · {commits} commits`

  **Must NOT do**: 不实现 S3 上传、不实现 remote host info

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 2 | Blocks: T13 | Blocked By: T1

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2679-2737` — buildExportData 完整实现
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:3046-3181` — getPromptForCommand 完整实现
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:3102-3153` — stats line + user summary 构建

  **Acceptance Criteria**:
  - [ ] buildExportData 返回包含 metadata/aggregated_data/insights/facets_summary 的对象
  - [ ] buildPromptForCommand 返回包含 "The user just ran /insights" 的字符串
  - [ ] buildPromptForCommand 返回包含 `Facets directory:` 字段
  - [ ] buildPromptForCommand 返回包含固定的最终回复模板 "Your shareable insights report is ready:"
  - [ ] 报告 URL 使用 file:// 协议

  **QA Scenarios**:
  ```
  Scenario: Export data structure
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/export.test.ts
    Expected Result: 全部通过
    Evidence: .sisyphus/evidence/task-11-export.txt
  ```

  **Commit**: YES (group with T10)

- [x] 12. Parallel Insights Generator — `src/insights/generator.ts`

  **What to do**:
  - 实现 `generateParallelInsights(client, data, facets): Promise<InsightResults>`
    - 对齐原版 line 1612-1798
    - Step 1: 构建 dataContext（JSON.stringify 聚合数据的子集）
      - sessions, analyzed, date_range, messages, hours, commits
      - top_tools (前8), top_goals (前8), outcomes, satisfaction, friction, success, languages
    - Step 2: 构建 fullContext = dataContext + SESSION SUMMARIES + FRICTION DETAILS + USER INSTRUCTIONS TO CLAUDE
      - session summaries: 从 facets 取 brief_summary + outcome + claude_helpfulness（前50个）
      - friction details: 从 facets 取 friction_detail（前20个）
      - user instructions: 从 facets 取 user_instructions_to_claude（前15个）
    - Step 3: 7 路并行调用 `generateSectionInsight(section, fullContext)`
      - 每个 section 调用 `client.session.prompt()` 发送 section.prompt + DATA + fullContext
      - 创建的 session title 标记为 `[insights-internal]`
      - 解析返回的 JSON
      - maxTokens = 8192
    - Step 4: 收集结果到 InsightResults
    - Step 5: 串行生成 At a Glance
      - 从已生成的 section 提取文本摘要：projectAreasText, bigWinsText, frictionText, featuresText, patternsText, horizonText
      - 调用 at-a-glance prompt
      - 写入 insights.at_a_glance
  - 实现 `generateSectionInsight(client, section, dataContext): Promise<{ name, result }>`
    - 对齐原版 line 1572-1610
    - 调用 LLM，解析 JSON response，错误时返回 null

  **Must NOT do**: 不包含 cc_team_improvements / model_behavior_improvements 的 section 生成

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**: Wave 3 | Blocks: T13 | Blocked By: T1, T5, T8, T9

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1612-1798` — generateParallelInsights 完整实现
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1572-1610` — generateSectionInsight
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1634-1665` — dataContext 构建
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1667-1680` — Promise.all 并行调用
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:1682-1798` — At a Glance 串行生成

  **Acceptance Criteria**:
  - [ ] 7 个 section 并行调用 LLM
  - [ ] At a Glance 在其他 section 完成后串行生成
  - [ ] 返回完整 InsightResults（7 个普通 section 中至少 5 个成功返回非 null 值，失败的 section 在日志中记录原因）

  **QA Scenarios**:
  ```
  Scenario: Generator with mock LLM
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/generator.test.ts
    Expected Result: 全部通过（mock client.session.prompt 返回预定义 JSON）
    Evidence: .sisyphus/evidence/task-12-generator.txt
  ```

  **Commit**: YES (group with T13)

- [x] 13. Pipeline Handler — `src/insights/handler.ts`

  **What to do**:
  - 实现 `generateUsageReport(client, options?: { dbPath?: string, days?: number, project?: string }): Promise<{ insights, htmlPath, data, facets }>`
    - 完整对齐原版 `generateUsageReport` (line 2796-3023)
    - Pipeline 顺序（**关键 — 缓存必须先查**）：
      1. **先查报告缓存**：如果 `report.html` 存在且 mtime < 24h **且** DB 的最新 session.time_updated 不晚于 report mtime → 直接返回
      2. Phase 1: collectSessions({ dbPath: options?.dbPath, days: options?.days, project: options?.project }) — 从 DB 读 session（按 days/project 过滤）
      3. Phase 2: 不需要（OC 的 session 表已有预计算统计）
      4. Phase 3: extractAllFacets() — 先查缓存，未命中走 LLM
      5. Phase 4: 过滤 substantive session + 过滤 minimal session
      6. Phase 5: aggregateData()
      7. Phase 6: generateParallelInsights()
      8. Phase 7: generateHtmlReport() → 写入 report.html
      9. Phase 8: buildExportData() + buildPromptForCommand()
      10. 返回 { insights, htmlPath, data, facets }
    - 元会话污染防护要点：
      - collectSessions 排除 title 含 `[insights-internal]`
      - LLM 调用创建的 session 用 `[insights-internal]` 标记
    - Session dedup（原版 line 2891-2912）：保留每个 session_id 中 user_message_count 最大的

  **Must NOT do**: 不实现远程 homespace 收集

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**: Wave 3 | Blocks: T15, T16 | Blocked By: T3, T4, T8, T9, T10, T11, T12

  **References**:
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2796-3023` — generateUsageReport 完整实现
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2891-2912` — session dedup 逻辑
  - `/mnt/d/code/claude-code-leaked/src/commands/insights.ts:2846-2861` — isMetaSession 检测

  **Acceptance Criteria**:
  - [ ] 完整 pipeline 从 DB 读到 HTML 输出
  - [ ] 报告缓存命中时跳过重算
  - [ ] 元会话不出现在统计中
  - [ ] `days` 参数正确传递到 collectSessions（只返回指定时间范围内的 session）
  - [ ] `project` 参数正确传递到 collectSessions（只返回指定项目的 session）

  **QA Scenarios**:
  ```
  Scenario: Full pipeline with mock DB
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/handler.test.ts
    Expected Result: 全部通过（mock DB + mock LLM）
    Evidence: .sisyphus/evidence/task-13-handler.txt

  Scenario: Report cache hit
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/handler.test.ts --test-name-pattern "cache"
    Expected Result: 测试通过，验证 report 缓存命中时 LLM 未被调用（mock spy 调用次数 = 0）
    Evidence: .sisyphus/evidence/task-13-cache-hit.txt

  Scenario: Days/project filter passthrough
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/handler.test.ts --test-name-pattern "days|project"
    Expected Result: 测试通过，验证 days/project 参数正确传递到 collectSessions
    Evidence: .sisyphus/evidence/task-13-filter-passthrough.txt
  ```

  **Commit**: YES (group with T12)

- [x] 14. Unit Tests — `src/__tests__/insights/*.test.ts`

  **What to do**:
  - 创建以下测试文件（遵循 oc-tweaks 现有 bun:test describe/it/expect 模式）：
    - `cache.test.ts` — load/save round-trip, 无效数据拒绝, 不存在文件返回 null
    - `collector.test.ts` — SQL 构建验证, days/project 过滤, meta session 排除, extractToolStats 指标
    - `aggregator.test.ts` — mock sessions + facets 聚合, multi-clauding 检测, facets 累加
    - `export.test.ts` — buildExportData 结构完整性, buildPromptForCommand 内容验证
    - `facets.test.ts` — mock LLM facets 提取, cache hit 跳过 LLM, isSubstantiveSession/isMinimalSession
  - 对需要 DB 的测试使用 bun:sqlite in-memory DB
  - 对需要 LLM 的测试 mock client.session.prompt

  **Must NOT do**: 不使用真实 LLM API；不修改生产 DB；不使用 Playwright

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 4 | Blocked By: T1-T4, T8, T9, T11

  **References**:
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/__tests__/index.test.ts` — 现有测试模式
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/__tests__/auto-memory.test.ts` — mock 模式参考

  **Acceptance Criteria**:
  - [ ] 5 个测试文件全部通过
  - [ ] 覆盖 cache, collector, aggregator, export, facets

  **QA Scenarios**:
  ```
  Scenario: All unit tests pass
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/
    Expected Result: 全部通过，0 failures
    Evidence: .sisyphus/evidence/task-14-unit-tests.txt
  ```

  **Commit**: YES (group with T15, T16)

- [x] 15. Integration Test — pipeline 端到端 mock 测试

  **What to do**:
  - 创建 `src/__tests__/insights/integration.test.ts`
  - 完整测试 handler pipeline：
    - mock SQLite DB（bun:sqlite in-memory）
    - mock client.session.prompt（返回预定义 JSON）
    - 调用 generateUsageReport
    - 验证：
      1. 返回值包含 insights/htmlPath/data/facets
      2. htmlPath 指向的文件存在且包含有效 HTML
      3. HTML 包含所有 9 个 section 的 id（普通用户路径，不含 ant-only Team Feedback）
      4. facets 缓存文件已创建
  - 测试元会话污染防护：
    - 先插入一个 title 含 `[insights-internal]` 的 session
    - 运行 pipeline
    - 验证该 session 不出现在 AggregatedData 中

  **Must NOT do**: 不使用 Playwright 或浏览器测试；不访问真实 LLM API（mock client.session.prompt）；不访问生产 DB（用 in-memory SQLite）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**: Wave 4 | Blocked By: T13

  **References**:
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/__tests__/index.test.ts` — 集成测试模式

  **Acceptance Criteria**:
  - [ ] 端到端 pipeline 测试通过
  - [ ] 元会话污染防护测试通过
  - [ ] HTML 输出包含 9 个 section（普通用户路径）
  - [ ] `days` 过滤测试：插入不同时间的 session，传入 days=1，验证只分析最近 1 天的 session
  - [ ] `project` 过滤测试：插入不同 project 的 session，传入 project_id，验证只分析指定项目

  **QA Scenarios**:
  ```
  Scenario: E2E pipeline test
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/integration.test.ts
    Expected Result: 全部通过
    Evidence: .sisyphus/evidence/task-15-integration.txt

  Scenario: Days/project filter E2E
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun test src/__tests__/insights/integration.test.ts --test-name-pattern "days|project"
    Expected Result: 测试通过，验证端到端流程中 days/project 过滤生效
    Evidence: .sisyphus/evidence/task-15-filter-e2e.txt
  ```

  **Commit**: YES (group with T14, T16)

- [x] 16. Wiring + Version Bump — 完成插件注册 + 版本号

  **What to do**:
  - 在 `src/plugins/insights.ts` 中完善 tool 注册：
    - tool name: `insights_generate`
    - tool description: "Generate an LLM-driven usage insights report analyzing your OpenCode sessions"
    - tool parameters: `{ days?: number, project?: string }`
    - handler 逻辑：
      1. `const result = await generateUsageReport(client, { days, project })`
      2. `const facetsDir = getFacetsDir()`
      3. `return buildPromptForCommand(result.insights, result.htmlPath, result.data, facetsDir)`
  - 确保 `src/index.ts` 正确导出 `insightsPlugin`
  - 更新 `package.json` version（MINOR bump，因为新增功能）
  - 确保 `bun run build` 和 `bun test` 全部通过

  **Must NOT do**: 不推 npm

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 4 | Blocked By: T13

  **References**:
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/plugins/notify.ts` — 完整插件注册模式
  - `/mnt/d/code/prompts/packages/oc-tweaks/src/utils/config.ts` — 配置 schema

  **Acceptance Criteria**:
  - [ ] `bun run build` 无错误
  - [ ] `bun test` 全部通过（包括新增的 insights 测试）
  - [ ] package.json version 已更新

  **QA Scenarios**:
  ```
  Scenario: Full build and test
    Tool: Bash
    Steps:
      1. cd packages/oc-tweaks && bun run build && bun test
    Expected Result: build 成功 + 全部测试通过
    Evidence: .sisyphus/evidence/task-16-wiring.txt
  ```

  **Commit**: YES (group with T14, T15)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, grep pattern). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` (TS check) + `bun test`. Review all changed files for: `as any` (prod code only — ignore `as any` in QA scenario inline scripts and test files), empty catches without comment, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Run complete insights pipeline with mock DB or real DB. Verify HTML report: open file, check all 9 sections present (普通用户路径，不含 ant-only Team Feedback), check CSS renders, check bar charts have data, check copy buttons work. Save screenshots.
  Output: `Sections [N/9] | Charts [N/4] | Interactivity [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual code. Verify 1:1. Check "Must NOT do" compliance: no Team Feedback, no S3, no Playwright, no `Claude Code` branding, no DB writes. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Guardrails [N/N] | VERDICT`

---

## Commit Strategy

- **T1-T3**: `feat(insights): add types, constants, and cache layer`
- **T4-T5**: `feat(insights): add db collector and prompt templates`
- **T6-T7**: `feat(insights): add renderer skeleton and plugin scaffold`
- **T8-T9**: `feat(insights): add facets extraction and data aggregation`
- **T10-T11**: `feat(insights): complete renderer and export builder`
- **T12-T13**: `feat(insights): add generator and pipeline handler`
- **T14-T16**: `test(insights): add unit and integration tests; wire plugin`

---

## Success Criteria

### Verification Commands

```bash
bun run build              # Expected: no TS errors
bun test                   # Expected: all tests pass (existing + new)
bun test src/__tests__/insights/  # Expected: insights tests pass
```

### Final Checklist

- [ ] 所有 "Must Have" 已实现
- [ ] 所有 "Must NOT Have" 已遵守
- [ ] HTML 报告包含 9 个 section（普通用户路径，不含 ant-only Team Feedback）
- [ ] Facets 缓存工作正常（二次运行不重复 LLM 调用）
- [ ] 元会话不污染统计
- [ ] `bun run build` 无错误
- [ ] `bun test` 全部通过
