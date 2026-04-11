# Claude Code `/insights` 逆向分析

> 源码版本：v2.1.88 | 主文件：`src/commands/insights.ts`（3200 行）

## 它是什么

`/insights` 是 Claude Code 的内置 slash command，扫描你的所有历史 session，用 LLM 分析你的使用模式，生成一份**浏览器可打开的 HTML 报告**。

报告有 10 个 section，包含个性化的使用分析、建议、可复制的 prompt 和 CLAUDE.md 配置建议。本质上是一个"离线审计器"——消费本地 session JSONL 日志，不依赖 telemetry 或外部服务。

---

## 报告长什么样

一个完整的 HTML 页面（Inter 字体、渐变卡片、CSS 条形图），包含：

### 页面头部

- 标题 "Claude Code Insights"
- 副标题：`{N} messages across {N} sessions | {date_range}`
- 导航目录（锚点跳转到各 section）
- 统计摘要栏：Messages | Lines (+/-) | Files | Days Active | Msgs/Day

### Section 1：At a Glance（黄橙渐变摘要卡）

4 段个性化摘要，每段链接到对应的详细 section：
- **What's working** → 链接到 "Impressive Things You Did"
- **What's hindering you** → 链接到 "Where Things Go Wrong"
- **Quick wins to try** → 链接到 "Features to Try"
- **Ambitious workflows** → 链接到 "On the Horizon"

### Section 2：What You Work On（项目 area 卡片）

4-5 个项目 area，每个包含：
- area name、session count、2-3 句描述

### 图表区（4 个 CSS 条形图）

| 图表 | 颜色 | 数据源 |
|------|------|--------|
| What You Wanted（goal categories） | 蓝 `#2563eb` | facets |
| Top Tools Used | 青 `#0891b2` | tool_use blocks |
| Languages | 绿 `#10b981` | file path 推断 |
| Session Types | 紫 `#8b5cf6` | facets |

### Section 3：How You Use Claude Code

- 2-3 段叙述分析（用第二人称 "you"）
- 绿色 "Key pattern" 提示框

### 用户响应时间图表

- 响应时间分布直方图
- 显示 median 和 average

### 时间分布图表

- Morning/Afternoon/Evening/Night 4 个时段
- 带**时区选择器**（下拉菜单 + 自定义 UTC offset）
- 紫色条形图 `#8b5cf6`

### Section 4：Impressive Things You Did（绿色卡片）

3 个"成功工作流"卡片，每个 title + 2-3 句描述

### Section 5：Where Things Go Wrong（红色卡片）

3 个摩擦类别，每个包含 category、description、2 个 examples

### Section 6：Existing CC Features to Try

分两块：
1. **CLAUDE.md 建议**：复选框 + code block + Copy 按钮 + "Copy All Checked" 按钮
2. **Feature 卡片**：推荐 MCP Servers / Custom Skills / Hooks / Headless Mode / Task Agents 中的 2-3 个

### Section 7：New Ways to Use Claude Code

Pattern card 列表，每个含 title / suggestion / detail / **copyable prompt**

### Section 8：On the Horizon（紫色渐变卡片）

3 个"未来机会"卡片，每个含 title / what's possible / how to try / **copyable prompt**

### Section 9：Team Feedback（仅内部用户，可折叠）

- Product Improvements for CC Team
- Model Behavior Improvements
- 每项含 title / detail / evidence

### Section 10：Fun Ending（黄色渐变卡片）

一个从 session 中挖掘的有趣/人味时刻

---

## 架构概览

```
用户输入 /insights
  │
  ▼
src/commands.ts (lazy shim)
  │ await import('./commands/insights.js')
  ▼
src/commands/insights.ts
  │
  ├── Phase 1: 轻扫描
  │   scanAllSessions()
  │   └── readdir + stat（不解析 JSONL）
  │
  ├── Phase 2: 加载 SessionMeta
  │   ├── loadCachedSessionMeta() → 命中缓存直接用
  │   └── loadAllLogsFromSessionFile() → 未命中才解析 JSONL
  │       └── logToSessionMeta() → extractToolStats()
  │           └── 从 messages 中提取 tool/token/语言/git 统计
  │
  ├── Phase 3: Facets 提取
  │   ├── loadCachedFacets() → 命中缓存直接用
  │   └── extractFacetsFromAPI() → LLM 生成分类 → saveFacets()
  │
  ├── Phase 4: 聚合
  │   aggregateData(sessions, facets)
  │   └── 全局统计 + detectMultiClauding()
  │
  ├── Phase 5: 并行生成 insights
  │   generateParallelInsights()
  │   └── 8 个 section prompt 并行调用 queryWithModel()
  │       → 每个返回结构化 JSON
  │   └── At a Glance 最后生成（依赖其他 section 输出）
  │
  ├── Phase 6: HTML 报告
  │   generateHtmlReport() → report.html
  │
  └── 返回 prompt 给 Claude（Markdown 摘要 + 报告链接）
```

---

## 全部数据源（穷尽清单）

### 一、本地文件系统

| # | 数据源 | 路径 | 读取方式 | 返回内容 |
|---|--------|------|----------|----------|
| 1 | **Session JSONL 日志** | `~/.claude/projects/{sanitized-cwd}/{sessionId}.jsonl` | `loadAllLogsFromSessionFile()` | assistant/user message 数组，含 tool_use、tool_result、timestamp、usage |
| 2 | **项目目录列表** | `~/.claude/projects/` | `readdir(projectsDir, { withFileTypes: true })` | 各项目子目录名 |
| 3 | **Session 文件列表 + mtime** | `~/.claude/projects/{project}/` | `getSessionFilesWithMtime()` | `{sessionId, filePath, mtime}[]` |
| 4 | **Session Meta 缓存** | `{configHome}/usage-data/session-meta/{sessionId}.json` | `readFile()` → `jsonParse()` | 预计算的 tool/token/语言/git/行为统计 |
| 5 | **Facets 缓存** | `{configHome}/usage-data/facets/{sessionId}.json` | `readFile()` → `jsonParse()` | LLM 提取的 goal/outcome/satisfaction/friction 分类 |

### 二、环境变量

| # | 变量 | 用途 |
|---|------|------|
| 6 | `USER_TYPE` | 与 `'ant'` 比较，控制远程 homespace、S3 上传、Team Feedback |
| 7 | `SAFEUSER` / `USER` | 报告元数据 username、S3 上传路径（fallback chain） |
| 8 | `ANTHROPIC_DEFAULT_OPUS_MODEL` | 通过 `getDefaultOpusModel()` 覆盖 insights LLM 模型 |

### 三、配置与常量

| # | 数据源 | 来源 | 内容 |
|---|--------|------|------|
| 9 | Claude config home | `getClaudeConfigHomeDir()` | 所有缓存/数据目录的根路径 |
| 10 | EXTENSION_TO_LANGUAGE | insights.ts 内硬编码 | 13 种扩展名 → 语言名映射 |
| 11 | AGENT_TOOL_NAME / LEGACY | `../tools/AgentTool/constants.js` | 识别 Task Agent 使用 |
| 12 | INSIGHT_SECTIONS | insights.ts 内定义 | 8 个 section 的 name/prompt/maxTokens |
| 13 | 批量常量 | insights.ts 内定义 | META_BATCH=50, MAX_SESSIONS=200, LOAD_BATCH=10 |
| 14 | Facets 阈值 | insights.ts 内定义 | 压缩 30000 chars, chunk 25000, output 4096 tokens |

### 四、LLM API（远程）

| # | 用途 | 调用 | 模型 |
|---|------|------|------|
| 15 | Facets 提取 | `queryWithModel()` per session | Opus |
| 16 | Transcript 摘要压缩 | `queryWithModel()` per chunk | Opus |
| 17 | 8 个并行 section | `queryWithModel()` × 8 | Opus |
| 18 | At a Glance 摘要 | `queryWithModel()` × 1（串行） | Opus |

### 五、远程主机（仅 `USER_TYPE=ant`）

| # | 数据源 | 方式 | 返回 |
|---|--------|------|------|
| 19 | Coder API | `ssh` → `curl https://coder.anthropic.com/api/v2/users/me/workspaces` | 运行中的 homespace 名称 |
| 20 | 远程 session 文件 | `scp -rq {hs}.coder:/root/.claude/projects/ tempDir` | JSONL 文件批量复制 |

### 六、外部工具

| # | 工具 | 用途 |
|---|------|------|
| 21 | `ssh` | 连远程 homespace 查 workspace |
| 22 | `scp` | 复制远程 session 到本地 |
| 23 | `ff`（S3 CLI） | 上传 HTML 报告到 S3（ant only） |

### 七、NPM 依赖

| # | 包 | 用途 |
|---|---|------|
| 24 | `diff` | `diffLines()` 计算 Edit 的 lines added/removed |

### 八、写入目标

| # | 目标 | 路径 |
|---|------|------|
| 25 | Session Meta 缓存 | `{configHome}/usage-data/session-meta/{sessionId}.json` |
| 26 | Facets 缓存 | `{configHome}/usage-data/facets/{sessionId}.json` |
| 27 | HTML 报告 | `{configHome}/usage-data/report.html` |
| 28 | S3 远程 | `s3://anthropic-serve/atamkin/cc-user-reports/{filename}` |
| 29 | 临时目录 | `mkdtemp(join(tmpdir(), 'claude-hs-'))` |

---

## 指标采集

### `extractToolStats(log)` 详细口径

遍历 `log.messages`，只处理 `assistant` 和 `user` 两类消息：

#### 工具统计（assistant message → tool_use blocks）

| 指标 | 采集方式 |
|------|----------|
| `toolCounts` | `block.name` 原样计数 |
| `languages` | `input.file_path` → `extname().toLowerCase()` → 查 `EXTENSION_TO_LANGUAGE` 映射表 |
| `linesAdded/Removed`（Edit） | `diffLines(old_string, new_string)` 逐段统计 |
| `linesAdded`（Write） | `countCharInString(content, '\n') + 1`（整体视为新增） |
| `filesModified` | Edit/Write 的 `input.file_path` 进 `Set` |
| `gitCommits` | `input.command.includes('git commit')` |
| `gitPushes` | `input.command.includes('git push')` |
| `usesTaskAgent` | toolName === `AGENT_TOOL_NAME` 或 `LEGACY_AGENT_TOOL_NAME` |
| `usesMcp` | `toolName.startsWith('mcp__')` |
| `usesWebSearch` | toolName === `'WebSearch'` |
| `usesWebFetch` | toolName === `'WebFetch'` |
| `inputTokens/outputTokens` | `msg.message.usage.input_tokens / output_tokens` |

**语言映射表**：`.ts/.tsx`→TypeScript、`.js/.jsx`→JavaScript、`.py`→Python、`.rb`→Ruby、`.go`→Go、`.rs`→Rust、`.java`→Java、`.md`→Markdown、`.json`→JSON、`.yaml/.yml`→YAML、`.sh`→Shell、`.css`→CSS、`.html`→HTML

#### 用户行为统计（user message）

| 指标 | 采集方式 |
|------|----------|
| `userInterruptions` | 文本含 `[Request interrupted by user` 子串 |
| `userResponseTimes` | `(userTimestamp - lastAssistantTimestamp) / 1000`，仅保留 2s < t < 3600s |
| `messageHours` | `new Date(timestamp).getHours()` |
| `userMessageTimestamps` | 原始时间戳数组（供 multi-clauding 检测） |

#### 错误统计（user message → tool_result blocks）

`is_error === true` 时按内容子串分类：

| 子串匹配 | 分类 |
|----------|------|
| `exit code` | Command Failed |
| `rejected` / `doesn't want` | User Rejected |
| `string to replace not found` / `no changes` | Edit Failed |
| `modified since read` | File Changed |
| `exceeds maximum` / `too large` | File Too Large |
| `file not found` / `does not exist` | File Not Found |
| 其他 | Other |

### `aggregateData()` 全局聚合

在 `extractToolStats` 基础上额外计算：
- `days_active`、`messages_per_day`
- `multi_clauding`（30min 窗口检测并行使用）
- `median_response_time`、`avg_response_time`

---

## LLM 在 insights 中的角色

`/insights` 大量使用 LLM（通过 `queryWithModel`），不是纯统计工具：

| 用途 | 说明 |
|------|------|
| **Facets 提取** | 对每个 session transcript 生成 goal/outcome/friction 分类 |
| **Transcript 压缩** | 长 transcript 先摘要再送 LLM 分析 |
| **8 个并行 section** | 每个 section 一个独立 LLM 调用，prompt 包含聚合数据 |
| **At a Glance** | 最后一个 LLM 调用，读取所有 section 输出，生成 4 段摘要 |

每个 section prompt 要求返回**严格 JSON**（`RESPOND WITH ONLY A VALID JSON OBJECT`），maxTokens 8192。

---

## System Prompt 逐项拆解

以下是 insights 功能使用的全部 LLM prompt 模板，来源于 `.tweakcc/system-prompts/`。

### Session Facets 提取 prompt

**文件**：`system-prompt-insights-session-facets-extraction.md`
**调用时机**：每个未缓存的 session 单独调一次
**模型**：Opus（`getInsightsModel()`）

提取 3 类结构化维度：

| 维度 | 规则 |
|------|------|
| `goal_categories` | **只计用户显式请求**："can you..."、"please..."、"I need..."。不计 Claude 自主探索 |
| `user_satisfaction_counts` | 基于显式信号分级：`happy`（"Yay!"）→ `satisfied`（"looks good"）→ `likely_satisfied`（无投诉继续）→ `dissatisfied`（"try again"）→ `frustrated`（"I give up"） |
| `friction_counts` | 5 个类别：`misunderstood_request` / `wrong_approach` / `buggy_code` / `user_rejected_action` / `excessive_changes` |

特殊规则：极短 session 或纯 warmup 用 `warmup_minimal` 归类。

### Friction Analysis prompt

**文件**：`system-prompt-insights-friction-analysis.md`
**输入**：聚合后的 usage data
**输出 JSON 结构**：

```json
{
  "intro": "1 sentence summarizing friction patterns",
  "categories": [
    {
      "category": "Concrete category name",
      "description": "1-2 sentences, use 'you' not 'the user'",
      "examples": ["Specific example with consequence", "Another example"]
    }
  ]
}
```

固定生成 **3 个摩擦类别**，每个 2 个具体 example。

### Suggestions prompt

**文件**：`system-prompt-insights-suggestions.md`
**输入**：聚合 usage data
**输出 3 部分**：

#### 1. `claude_md_additions`
- 具体的 CLAUDE.md 条目建议
- **优先级规则**：多次重复出现的用户指令是首要候选（"不应让用户重复自己"）
- 每条含 `addition`（内容）、`why`（理由）、`prompt_scaffold`（放在 CLAUDE.md 哪个位置）

#### 2. `features_to_try`
从 5 个 CC 特性中选 2-3 个推荐：

| 特性 | 适用场景 |
|------|----------|
| MCP Servers | 数据库查询、Slack、GitHub issue、内部 API |
| Custom Skills | 重复工作流：/commit、/review、/test、/deploy |
| Hooks | 自动格式化、类型检查、规范强制 |
| Headless Mode | CI/CD、批量修复、自动 review |
| Task Agents | 代码探索、理解复杂系统 |

#### 3. `usage_patterns`
每条含 `title`、`suggestion`、`detail`（3-4 句）和 `copyable_prompt`。

### On the Horizon prompt

**文件**：`system-prompt-insights-on-the-horizon.md`
**输入**：聚合 usage data
**输出 JSON 结构**：

```json
{
  "intro": "1 sentence about evolving AI-assisted development",
  "opportunities": [
    {
      "title": "Short title (4-8 words)",
      "whats_possible": "2-3 ambitious sentences about autonomous workflows",
      "how_to_try": "1-2 sentences mentioning relevant tooling",
      "copyable_prompt": "Detailed prompt to try"
    }
  ]
}
```

固定 3 个机会。指令要求 "Think BIG — autonomous workflows, parallel agents, iterating against tests"。

### At a Glance prompt（最后生成）

**文件**：`system-prompt-insights-at-a-glance-summary.md`
**输入**：7 个变量，全部来自前序 section 的输出

| 变量 | 来源 |
|------|------|
| `AGGREGATED_USAGE_DATA` | `aggregateData()` |
| `PROJECT_AREAS` | Section 2 "What You Work On" 输出 |
| `BIG_WINS` | Section 4 "Impressive Things" 输出 |
| `FRICTION_CATEGORIES` | Section 5 "Where Things Go Wrong" 输出 |
| `FEATURES_TO_TRY` | Section 6 "Features to Try" 输出 |
| `USAGE_PATTERNS_TO_ADOPT` | Section 7 "New Ways" 输出 |
| `ON_THE_HORIZON` | Section 8 输出 |

**输出 JSON**：

```json
{
  "whats_working": "2-3 sentences, user's unique style + impactful work",
  "whats_hindering": "Split: (a) Claude's fault, (b) user-side friction",
  "quick_wins": "Specific CC features to try",
  "ambitious_workflows": "Prep for 3-6 month model capability leap"
}
```

**风格约束**：coaching tone、不提具体数字、不提 underlined_categories、每段 2-3 句不长。

### Learning Mode Insights（附属功能）

**文件**：`system-prompt-learning-mode-insights.md`
**说明**：不属于 `/insights` 命令本身，而是 learning mode 开启时在普通对话中插入的教育性 insight 格式：

```
`★ Insight ─────────────────────────────────────`
[2-3 key educational points]
`─────────────────────────────────────────────────`
```

要求关注代码库或当前代码的具体 insight，而非泛泛的编程概念。

---

## 最终 Prompt 构造

`getPromptForCommand()` 返回给 Claude 的完整模板：

```
The user just ran /insights to generate a usage report analyzing their Claude Code sessions.

Here is the full insights data:
{pretty-printed insights JSON}

Report URL: {reportUrl}
HTML file: {htmlPath}
Facets directory: {facetsDir}

Here is what the user sees:
# Claude Code Insights
{stats line} · {date range}
{optional ant remote info}

## At a Glance
**What's working:** ... See _Impressive Things You Did_.
**What's hindering you:** ... See _Where Things Go Wrong_.
**Quick wins to try:** ... See _Features to Try_.
**Ambitious workflows:** ... See _On the Horizon_

Your full shareable insights report is ready: {reportUrl}

Now output the following message exactly:
<message>
Your shareable insights report is ready:
{reportUrl}{uploadHint}

Want to dig into any section or try one of the suggestions?
</message>
```

### Report URL 规则

| 环境 | URL 形式 |
|------|----------|
| 普通用户 | `file://{htmlPath}` |
| `USER_TYPE=ant` + S3 上传成功 | `https://s3-frontend.infra.ant.dev/anthropic-serve/atamkin/cc-user-reports/{filename}` |
| `USER_TYPE=ant` + S3 上传失败 | 回退 `file://`，`uploadHint` 提示手动 `ff cp` |

### 导出数据结构（`buildExportData()`）

```typescript
type InsightsExport = {
  metadata: {
    username, generated_at, claude_code_version,
    date_range, session_count, remote_hosts_collected?
  }
  aggregated_data: AggregatedData  // 40+ 字段
  insights: InsightResults         // 9 个 section 输出
  facets_summary?: {
    total, goal_categories, outcomes,
    satisfaction, friction
  }
}
```

---

## 访问控制

| 条件 | 效果 |
|------|------|
| `USER_TYPE !== 'ant'` | 命令本身可用，但无远程 homespace 收集、无 Team Feedback section |
| `USER_TYPE === 'ant'` | 完整功能：远程收集、S3 上传、Team Feedback |
| `--homespaces` 参数 | 仅 ant 用户有效，通过 ssh/scp 收集远程 session |

无 feature flag、无 GrowthBook、无订阅级别门控。

---

## 关键文件

| 文件 | 角色 |
|------|------|
| `src/commands/insights.ts` | 主实现（3200 行） |
| `src/commands.ts` | 注册入口（lazy import shim） |
| `src/utils/sessionStorage.ts` | session JSONL 读写 |
| `src/utils/stats.ts` | 通用 stats 聚合（`opencode stats` 共享） |
| `src/utils/statsCache.ts` | stats 缓存持久化 |
| `src/services/api/claude.ts` | `queryWithModel`（LLM 调用） |
| `src/tools/AgentTool/constants.ts` | tool name 常量 |

---

## OpenCode 生态对标

OpenCode 没有等价的内置 `/insights`。最接近的是：

| 项目 | 说明 |
|------|------|
| `opencode stats` (内置) | CLI 命令：token/cost 统计，`--days`/`--tools`/`--models` |
| [OpenCode Monitor](https://ocmonitor.vercel.app/) | 实时 CLI dashboard，token/cost tracking |
| [@ramtinj95/opencode-tokenscope](https://github.com/ramtinJ95/opencode-tokenscope) | 插件：token analysis + context breakdown |
| [iceprosurface/opencode-usage-cli](https://github.com/iceprosurface/opencode-usage-cli) | 独立 CLI：session usage + costs |

**关键差距**：这些都是纯统计工具。Claude Code 的 `/insights` 独特之处在于用 LLM 生成个性化分析——项目分类、工作流建议、摩擦点诊断——不只是数字 dashboard。

---

## OpenCode 数据存储架构

### 主存储：SQLite

OpenCode 的会话数据**落在 SQLite 数据库**中，不是散落的 JSON/JSONL 文件。

| 项 | 值 |
|----|-----|
| 默认路径 | `~/.local/share/opencode/opencode.db` |
| 大小（实测） | 1.3 GB |
| 覆盖 env | `OPENCODE_DB` |
| Channel 模式 | `opencode-<channel>.db` |

旧版 JSON 存储（`~/.local/share/opencode/storage/`）会自动迁移进 SQLite。本地实测只剩 7 个 session 目录 / 2501 个 JSON 文件（10 MB），占全量 2447 sessions 的 0.3%。

### 数据库表结构

| 表 | 行数（实测） | 关键列 |
|---|---:|------|
| `session` | 2,447 | id, project_id, directory, title, version, summary_additions/deletions/files, time_created/updated |
| `message` | 68,281 | id, session_id, time_created, **data** (JSON blob) |
| `part` | （malformed） | id, message_id, session_id, **data** (JSON blob) |
| `todo` | — | session 级 todo |
| `permission` | — | project 级权限规则 |
| `project` | — | 项目元数据 |
| `session_share` | — | 分享链接 |
| `workspace` | — | 工作区 |
| `event` / `event_sequence` | — | 事件溯源 |
| `account` / `account_state` / `control_account` | — | 账号与控制 |

### 与 Claude Code 的存储差异

| 维度 | Claude Code | OpenCode |
|------|-------------|----------|
| **主存储** | JSONL 文件（一个 session = 一个 `.jsonl`） | SQLite 数据库（所有 session 在同一个 DB） |
| **消息位置** | 嵌在 JSONL 行内 | DB `message` 表的 `data` JSON blob |
| **工具调用** | message content 里的 `tool_use` block | DB `part` 表的 `data` JSON blob |
| **缓存** | 独立 JSON 文件（session-meta / facets） | 无独立缓存层（DB 即权威） |
| **扫描方式** | `readdir` + `stat` mtime | `SELECT * FROM session` |
| **增量更新** | 比较 mtime 决定是否重新解析 | DB 事务保证一致性 |

---

## 数据源逐项对标表

### 一、Session 数据

| # | Claude Code 数据源 | OpenCode 对等物 | 备注 |
|---|-------------------|----------------|------|
| 1 | `~/.claude/projects/{cwd}/{sid}.jsonl` | `SELECT data FROM message WHERE session_id=?` | OC 用 DB 查询，不需遍历文件 |
| 2 | `readdir(projectsDir)` 扫项目目录 | `SELECT DISTINCT project_id FROM session` | OC 直接查表 |
| 3 | `getSessionFilesWithMtime()` | `SELECT id, time_updated FROM session` | OC 的 `time_updated` 对标 mtime |
| 4 | Session Meta 缓存 JSON | **无需**——DB `session` 表自带 `summary_additions/deletions/files` | 省去单独缓存层 |
| 5 | Facets 缓存 JSON | **不存在**——OC 没有 facets 概念 | 需要从零构建 |

### 二、环境变量

| # | Claude Code | OpenCode 对等物 |
|---|-------------|----------------|
| 6 | `USER_TYPE` (ant/外部) | **无对等**——OC 不区分内外部用户 |
| 7 | `SAFEUSER` / `USER` | `process.env.USER` 或 OC 无内置 username 字段 |
| 8 | `ANTHROPIC_DEFAULT_OPUS_MODEL` | `OPENCODE_ENABLE_EXPERIMENTAL_MODELS` + config `small_model` / provider 配置 |

### 三、配置与路径

| # | Claude Code | OpenCode 对等物 |
|---|-------------|----------------|
| 9 | `getClaudeConfigHomeDir()` → `~/.claude` | `~/.config/opencode/`（配置）+ `~/.local/share/opencode/`（数据） |
| 10 | EXTENSION_TO_LANGUAGE 映射表 | 需自建（OC 无内置语言映射） |
| 11 | AGENT_TOOL_NAME 常量 | part.data 中 `tool` 字段的 tool name |
| 12 | INSIGHT_SECTIONS 数组 | 需自建 |
| 13 | 批量常量 | 不需要——DB 查询天然支持批量 |

### 四、LLM API

| # | Claude Code | OpenCode 对等物 |
|---|-------------|----------------|
| 14-17 | `queryWithModel()` → Opus | 通过 OC 的 provider API 调用，或直接用 Anthropic SDK |

### 五、远程与外部工具

| # | Claude Code | OpenCode 对等物 |
|---|-------------|----------------|
| 18-22 | ssh/scp/ff（ant homespace、S3） | **无对等**——OC 没有远程 homespace 或 S3 上传 |

### 六、NPM 依赖

| # | Claude Code | OpenCode 对等物 |
|---|-------------|----------------|
| 23 | `diff` (diffLines) | 不需要——OC session 表自带 `summary_additions/deletions` |

### 七、写入目标

| # | Claude Code | OpenCode 对等物 |
|---|-------------|----------------|
| 24 | Session Meta 缓存 | 可选写 DB 或插件自有缓存 |
| 25 | Facets 缓存 | 需新建（OC 无此概念） |
| 26 | HTML 报告 | 同样生成到 `~/.local/share/opencode/` 或自定义路径 |

---

## OpenCode Message 数据模型

### Session（`session` 表）

```typescript
{
  id: string                    // "ses_xxx"
  project_id: string            // 项目 hash
  parent_id?: string            // 父 session（fork）
  slug: string
  directory: string             // 项目路径
  title: string                 // 自动生成标题
  version: string               // OC 版本号
  share_url?: string
  summary_additions: number     // ★ 已预计算的代码增加行数
  summary_deletions: number     // ★ 已预计算的代码删除行数
  summary_files: number         // ★ 已预计算的修改文件数
  summary_diffs?: string        // diff 摘要
  time_created: number          // Unix ms
  time_updated: number
  time_compacting?: number
  time_archived?: number
  workspace_id?: string
}
```

### Message（`message` 表 `data` JSON blob）

Assistant message 示例：
```json
{
  "role": "assistant",
  "parentID": "msg_xxx",
  "modelID": "claude-sonnet-4-20250514",
  "providerID": "4142",
  "agent": "sisyphus-junior",
  "path": { "cwd": "/path/to/project", "root": "/path/to/project" },
  "cost": 0.003,
  "tokens": {
    "total": 26001,
    "input": 107,
    "output": 166,
    "reasoning": 0,
    "cache": { "read": 25728, "write": 0 }
  },
  "time": { "created": 1770906010275, "completed": 1770906016617 },
  "finish": "tool-calls"
}
```

### Part（`part` 表 `data` JSON blob）

Part types（discriminated union）：
`text` | `subtask` | `reasoning` | `file` | `tool` | `step-start` | `step-finish` | `snapshot` | `patch` | `agent` | `retry` | `compaction`

Tool part 示例：
```json
{
  "type": "tool",
  "tool": "Edit",
  "callID": "call_xxx",
  "state": {
    "input": { "file_path": "...", "old_string": "...", "new_string": "..." },
    "output": "Applied edit",
    "metadata": { ... }
  }
}
```

---

## OpenCode 环境变量（完整清单）

### 配置与路径
`OPENCODE_CONFIG` · `OPENCODE_CONFIG_DIR` · `OPENCODE_CONFIG_CONTENT` · `OPENCODE_TUI_CONFIG` · `OPENCODE_DISABLE_PROJECT_CONFIG` · `OPENCODE_DB` · `OPENCODE_SKIP_MIGRATIONS` · `OPENCODE_DISABLE_CHANNEL_DB` · `OPENCODE_GIT_BASH_PATH` · `OPENCODE_PLUGIN_META_FILE`

### 服务器/权限
`OPENCODE_SERVER_PASSWORD` · `OPENCODE_SERVER_USERNAME` · `OPENCODE_PERMISSION`

### 运行控制
`OPENCODE_DISABLE_AUTOUPDATE` · `OPENCODE_DISABLE_PRUNE` · `OPENCODE_DISABLE_TERMINAL_TITLE` · `OPENCODE_DISABLE_MOUSE` · `OPENCODE_DISABLE_EMBEDDED_WEB_UI` · `OPENCODE_DISABLE_AUTOCOMPACT` · `OPENCODE_DISABLE_LSP_DOWNLOAD` · `OPENCODE_DISABLE_DEFAULT_PLUGINS` · `OPENCODE_ENABLE_QUESTION_TOOL` · `OPENCODE_AUTO_SHARE`

### Provider / 模型
`OPENCODE_ENABLE_EXPERIMENTAL_MODELS` · `OPENCODE_DISABLE_MODELS_FETCH` · `OPENCODE_MODELS_URL` · `OPENCODE_MODELS_PATH` · `OPENCODE_ENABLE_EXA`

### 实验性功能
`OPENCODE_EXPERIMENTAL` · `OPENCODE_EXPERIMENTAL_FILEWATCHER` · `OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS` · `OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX` · `OPENCODE_EXPERIMENTAL_LSP_TOOL` · `OPENCODE_EXPERIMENTAL_PLAN_MODE` · `OPENCODE_EXPERIMENTAL_WORKSPACES` · `OPENCODE_EXPERIMENTAL_MARKDOWN`

### Claude Code 兼容开关
`OPENCODE_DISABLE_CLAUDE_CODE` · `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` · `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` · `OPENCODE_DISABLE_EXTERNAL_SKILLS`

---

## 插件 API 可访问数据

插件函数接收的输入：`client` · `project` · `directory` · `worktree` · `serverUrl` · `$`（Bun shell）

可监听的事件：`session.created` · `session.updated` · `session.deleted` · `session.compacted` · `message.updated` · `message.part.updated` · `message.part.removed` · `tool.*`

**关键差距**：插件 API 没有直接暴露 session history 查询或 usage stats 聚合接口。要做 insights，需直接查 SQLite DB。

---

## OpenCode 复刻仓库对标

### 搜索方法论

通过 Exa、Tavily、GitHub Code Search 多源并行搜索，检索关键词包括 "opencode insights"、"opencode session analytics"、"opencode-insights"、"opencode analytics dashboard" 等。共发现 8 个候选仓库，经逐一分析后确认：**只有 1 个是真正复刻 Claude Code `/insights` 的项目**，其余均为 token/cost tracking 工具（对标的是 `/cost` 或 `opencode stats`，不是 `/insights`）。

### 排除的仓库（token/cost tracking，不是 `/insights` 复刻）

| 仓库 | 方向 | 排除原因 |
|------|------|----------|
| `ramtinJ95/opencode-tokenscope` | token/cost 细分分析器 | 对标 `/cost` + context window，无 narrative/wins/friction |
| `Ainsley0917/opencode-token-monitor` | token_stats/history/export 工具 | 纯统计工具，无 LLM 分析、无 HTML 报告 |
| `slkiser/opencode-quota` | 多 provider quota + /tokens_* 命令族 | quota tracking，不是洞察报告 |
| `opgginc/opencode-bar` | macOS menu bar 实时监控（Swift） | 实时仪表盘，非历史分析报告 |
| `Shlomob/ocmonitor-share` | 统计 dashboard | 偏 session/daily/weekly 统计，无 narrative |
| `IgorWarzocha/Opencode-Context-Analysis-Plugin` | /context 命令 token 分析 | 单会话 context window 分析 |
| `sujankapadia/claude-code-analytics` | Claude Code 对话分析（Python+TS） | 针对 Claude Code 不是 OpenCode |

### 相关 OpenCode 官方 Issue

| Issue | 标题 | 状态 |
|-------|------|------|
| #12981 | `/insights` should be a first-class built-in feature | closed |
| #6767 | Implement /stats command for visual usage insights | open |
| #5555 | Session-specific stats command and exit summary | open |
| #1634 | Track Overall Token Usage (Usage Stats) | open |
| #15100 | Total usage statistics | open |
| #17056 | Enhance Message List Details & Fix Cost/Token Statistics | open |

---

## 唯一复刻仓库：rapidrabbit76/OpenCodeInsights

### 基本信息

| 项 | 值 |
|----|-----|
| 仓库 | `rapidrabbit76/OpenCodeInsights` |
| npm 包名 | `opencode-insights` |
| Stars | 4 |
| Issues | 0 |
| 最新 commit | `3b4155d` (2026-04-04) |
| 技术栈 | TypeScript（插件入口）+ Python 3（采集+渲染）+ HTML/CSS/JS（报告） |
| Python 依赖 | stdlib only（sqlite3, json, datetime, argparse, html, collections, pathlib） |
| TS 依赖 | `@opencode-ai/plugin` |
| 定位 | "A custom /insights command for OpenCode ... same format as Claude Code's /insights" |

### 数据源

从 OpenCode SQLite 数据库读取，默认路径 `~/.local/share/opencode/opencode.db`。

查询的表：

| 表 | 用途 |
|----|------|
| `session` | 会话元数据、时间范围、项目关联 |
| `message` | 消息内容、token 统计、model/agent 分布 |
| `part` | 工具调用细节、输入输出 |
| `todo` | 任务完成率统计 |
| `project` | 项目列表（按 project_id 过滤用） |

过滤条件支持 `--days N`（按 time_created 过滤）和 `--project ID`（按 project_id 过滤），默认排除标题含 `subagent` 的 session。

### 入口命令

三种运行方式：

1. **OpenCode 插件**：`opencode.json` 配置 `"opencode-insights"`，自动注册 `/insights` 命令 + `insights_collect` / `insights_generate` 两个 tools
2. **一键安装脚本**：`curl .../install.sh | bash`，将 `insights.md` 写入 `~/.config/opencode/command/`
3. **手动 CLI**：`python3 src/collector.py --days 14 -o output/raw_metrics.json` → `python3 src/generator.py -i output/report_data.json -o output/report.html`

### 处理流程

```
opencode.db → collector.py → raw_metrics.json
                                    ↓
                            LLM (via insights.md prompt)
                                    ↓
                            narratives.json
                                    ↓
                    raw_metrics.json + narratives.json
                                    ↓
                            generator.py → report.html
```

关键：**LLM 不在代码内直接调用 API**。`insights.md` 作为 prompt 模板，由 OpenCode 的 AI 根据 raw_metrics 生成 `narratives.json`，然后 `generator.py` 将 metrics + narratives 渲染为 HTML。

### 统计指标（5 类）

#### Session Metrics
`total_sessions` · `date_range` · `active_days` · `lines.added/deleted` · `total_files_changed` · 每个 session 的 duration/additions/deletions/files_changed

#### Message Metrics
`total_messages` · `user/assistant_messages` · `messages_per_day` · `agent_distribution` · `model_distribution` · `hour_distribution` · `user/assistant_response_time`（median/average/distribution）· `session_types` · `tokens`（input/output/reasoning/cache_read/cache_write）· `total_cost`

#### Tool Metrics
`tool_usage[]` · `tool_errors[]` · `languages[]`（从文件路径后缀映射，支持 30+ 语言）

#### Multi-Clauding Metrics
`overlap_events` · `sessions_involved` · `pct_sessions`（检测并行 session 时间重叠）

#### Todo Metrics
`total_todos` · `completed/in_progress/pending/cancelled` · `completion_rate`

### LLM 生成的 Narratives 结构

`insights.md` 要求 LLM 生成的 `narratives.json` 包含：

- `subtitle` · `at_a_glance` · `project_areas` · `usage_narrative`
- `wins_intro` · `wins[]` · `friction_intro` · `friction_categories[]`
- `what_you_wanted` · `what_helped_most` · `outcomes`
- `friction_types` · `satisfaction`
- `claude_md_suggestions[]`（AGENTS.md 建议）
- `features_to_try[]` · `new_patterns[]`
- `horizon_intro` · `horizon[]`
- `fun_ending` · `feedback.team` · `feedback.model`

### HTML 报告 Section 结构

最终 `report.html` 包含以下 section（按顺序）：

1. Title / Subtitle
2. At a Glance（总览卡片）
3. What You Work On（项目领域分布）
4. What You Wanted / Top Tools Used
5. Languages / Session Types
6. How You Use OpenCode
7. User Response Time Distribution
8. Multi-Clauding（并行 session 检测）
9. User Messages by Time of Day / Tool Errors Encountered
10. Impressive Things You Did（wins）
11. What Helped Most / Outcomes
12. Where Things Go Wrong（friction）
13. Friction Types / Inferred Satisfaction
14. Suggested AGENTS.md Additions
15. Features to Try
16. New Ways to Use OpenCode
17. On the Horizon
18. Team Feedback（team + model 维度）
19. Fun Ending

报告特性：dark/light theme toggle、clipboard copy buttons、collapsible sections、timezone selector、client-side JS 重渲染。

### 与 Claude Code `/insights` 的对比

#### 高重叠的 Section

| Claude Code `/insights` Section | OpenCodeInsights 对应 |
|---|---|
| At a Glance Summary | At a Glance |
| Impressive Things You Did | Impressive Things You Did (wins) |
| Where Things Go Wrong | Where Things Go Wrong (friction) |
| Suggestions | Features to Try + New Ways to Use |
| On the Horizon | On the Horizon |
| Tool Usage Stats | Top Tools Used + Tool Errors |
| Session Activity / Time Distribution | Messages by Time of Day + Response Time |

#### OpenCodeInsights 新增的 Section（Claude Code 没有）

| Section | 说明 |
|---------|------|
| Suggested AGENTS.md Additions | 直接给 OpenCode 的 AGENTS.md 写配置建议 |
| Multi-Clauding | 检测并行 session 时间重叠 |
| Team Feedback | 分 team / model 维度的观察 |
| New Ways to Use OpenCode | OpenCode features 导向的建议 |
| Todo Metrics | 任务完成率统计 |

#### Claude Code `/insights` 有但 OpenCodeInsights 弱化的

| Claude Code 能力 | 差距 |
|---|---|
| 6 个独立 system prompt 分别驱动 6 个 LLM 并行生成 | OpenCodeInsights 用单个 `insights.md` prompt，LLM 一次生成所有 narratives |
| `generateParallelInsights()` 并发 6 路 | 无并行，串行处理 |
| Session Facets Extraction（per-session 标签抽取） | 无独立 facets 系统，靠 session_summaries 替代 |
| Remote Homespace 收集 | 无（OpenCode 无此概念） |
| Learning Mode Insights | 无 |
| 缓存机制（24h + 文件锁） | 无缓存（每次重新采集） |
| 原生 UI 集成（命令内渲染） | 外部 HTML 文件 |

### 综合判断

OpenCodeInsights 是目前唯一一个以 "复刻 Claude Code `/insights`" 为明确目标的 OpenCode 项目。它在报告结构、narrative 风格、HTML 交互化方面已经做到了高度相似，同时加入了 AGENTS.md 建议、multi-clauding、todo metrics 等 OpenCode 特化内容。

主要差距在于：
- **LLM 调用架构**：Claude Code 用 6 个独立 prompt 并行生成，OpenCodeInsights 用单 prompt 串行
- **数据精度**：Claude Code 有 per-session facets extraction 做细粒度标签，OpenCodeInsights 靠 session summaries
- **成熟度**：4 stars、0 issues、最近 commit 为文档修正，属于早期可用原型
- **缓存与增量**：无缓存机制，每次全量重算
