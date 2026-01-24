# Claude Code 未记录环境变量参考（精选 28 项）

> 从 `@anthropic-ai/claude-code` CLI 源码提取的 28 个常用/实用**未记录**环境变量。
>
> ⚠️ **重要**: 这些变量**均未在官方文档中记录**，可能随版本更新变更或移除。
>
> 说明：✅ = 已验证（有来源）| ⭐ = 精选推荐

---

## 验证来源

### 官方仓库
- [anthropics/claude-code](https://github.com/anthropics/claude-code) - 官方 CLI 仓库 (CHANGELOG.md)
- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) - GitHub Action

### 逆向工程 / 研究项目
- [shcv/claude-investigations](https://github.com/shcv/claude-investigations) - 功能分析和 changelog 归档
- [Piebald-AI/tweakcc](https://github.com/Piebald-AI/tweakcc) - 上下文限制补丁和提示词提取
- [shareAI-lab/Kode-cli](https://github.com/shareAI-lab/Kode-cli) - 开源 Claude Code 兼容 CLI

### 社区集成项目
- [coder/claudecode.nvim](https://github.com/coder/claudecode.nvim) - Neovim 集成
- [manzaltu/claude-code-ide.el](https://github.com/manzaltu/claude-code-ide.el) - Emacs 集成
- [cline/cline](https://github.com/cline/cline) - VS Code 扩展
- [3rd/ccc](https://github.com/3rd/ccc) - Claude Code 配置管理

---
## 界面和显示
### CLAUDE_CODE_FORCE_FULL_LOGO ✅ ⭐
强制使用完整欢迎框布局，防止终端 resize 时界面闪烁。

**默认值**: `false` (禁用)

**什么是"欢迎框"**: Claude Code 启动时顶部的带边框区域，包含：
- 品牌标识 "Claude Code vX.X.X"
- 模型名称、工作目录
- 输入提示区

**两种布局模式** (视觉示意):

**`compact` 模式** (终端较窄，~70列以下):
```
╭─ Claude Code ────────────────────────╮
│         Welcome to Claude!           │
│                                      │
│           ┌─────────┐                │
│           │  >_     │ ← 输入框       │
│           └─────────┘                │
│                                      │
│      claude-sonnet-4-20250514        │
│             API · Pro                │
│         agent · ~/project            │
╰──────────────────────────────────────╯
```

**`horizontal` 模式** (终端较宽):
```
╭─── Claude Code v2.1.x ───────────────────────────────────────────────────╮
│                                                                          │
│   Welcome to Claude!              ┌──────────────────────────────────┐   │
│                                   │ >_                               │   │
│   claude-sonnet-4-20250514        │                                  │   │
│   API · Pro                       │                                  │   │
│   agent · ~/project               └──────────────────────────────────┘   │
│                                                                          │
╰──────────────────────────────────────────────────────────────────────────╯
```

**行为**:
- 默认：根据终端宽度自动切换布局模式
- 启用后：强制使用 `horizontal` 布局，不随宽度切换
- 主要解决问题：resize 终端时布局模式频繁切换导致的视觉闪烁

**为什么你可能看不到差异**:
- 终端足够宽时，默认就是 `horizontal` 模式
- 有 Release Notes 时也会强制完整布局
- 效果主要在 resize 时体现，静态状态下差异不明显

**社区反馈**:
- [schpet/dotfiles](https://github.com/schpet/dotfiles) 注释 "doesn't seem to work"
- [panoptes](https://github.com/ivan-brko/panoptes) 用于 "防止 resize 到 ~70 列边界时的闪烁"

```bash
export CLAUDE_CODE_FORCE_FULL_LOGO="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:3727 | [kill136/claude-code-open](https://github.com/kill136/claude-code-open) | [ivan-brko/panoptes](https://github.com/ivan-brko/panoptes/commit/e369a3e3)

---
## 上下文和内存管理
### CLAUDE_CODE_CONTEXT_LIMIT ⭐
自定义上下文窗口限制。

⚠️ **注意**: 此变量**需要 [tweakcc](https://github.com/Piebald-AI/tweakcc) 补丁**才能生效，官方 CLI 不原生支持。

**默认值**: `200000`（官方硬编码）

**tweakcc 补丁行为**:
- 在 `getContextLimit()` 函数开头注入检查
- 若设置了环境变量，直接返回该值，绕过官方逻辑
- 官方逻辑：部分模型（如带 `[1m]` 标记）返回 `1_000_000`，其他返回 `200000`

**用户体验影响**:
| 设置 | 效果 |
|------|------|
| 调高（如 500000） | ✅ 可处理更长对话/更大文件 ⚠️ 可能触发更早的 compaction |
| 调低（如 100000） | ⚡ 响应更快、成本更低 ❌ 大文件/长对话可能被截断 |

```bash
# 需要先安装 tweakcc: npx tweakcc
export CLAUDE_CODE_CONTEXT_LIMIT="500000"
```
**来源**: [Piebald-AI/tweakcc](https://github.com/Piebald-AI/tweakcc) (非官方补丁)

### DISABLE_MICROCOMPACT ✅ ⭐
禁用微压缩（Microcompact）功能。**v1.0.68 引入**。

**默认值**: `false` (微压缩已启用)

**什么是 Microcompact**: 一种智能上下文管理机制，在不触发完整 compaction 的情况下选择性清理旧的工具输出：

**工作流程**:
```
1. 工具输出 → 保存到磁盘临时文件
2. 上下文中替换为 "Tool result saved to: /path/to/file"
3. 保留最近 3 个工具结果的完整内容
4. 旧结果被清理，但可通过文件路径访问
```

**Microcompact vs Auto-Compact vs /compact**:
| 类型 | 触发 | 使用模型？ | 行为 |
|------|------|----------|------|
| **Microcompact** | 自动（后台） | ❌ 无（纯代码逻辑） | 只清理旧工具输出，保留对话流 |
| **Auto-Compact** | 自动（~78% 容量） | ✅ 当前模型 | 完整对话摘要，压缩整个消息历史 |
| **/compact** | 手动 | ✅ 当前模型 | 用户控制的摘要，可指定保留重点 |

**触发条件** (需同时满足):
| 条件 | 阈值 |
|------|------|
| 总 token 数 | > 40,000 |
| 可节省 token 数 | > 20,000 |
| 保留最近工具结果数 | 3 个 |

**受影响的工具** (只清理这些工具的输出):
- `Read`, `Bash`, `Grep`, `Glob`
- `WebSearch`, `WebFetch`
- `Edit`, `Write`

**行为对比**:
| 设置 | 效果 |
|------|------|
| 启用（默认） | ⚡ 旧工具输出被清理，延迟 full compaction，会话更长 |
| 禁用（`=1`） | ✅ 保留所有工具输出在上下文中 ⚠️ 上下文膨胀更快，更早触发 full compaction |

**典型使用场景**:
- 需要 Claude 引用早期工具的完整输出
- 调试时需要查看完整的历史工具结果
- 排查 compaction 相关问题

**社区验证**: [yutkat/dotfiles](https://github.com/yutkat/dotfiles), [katsusuke/dotfiles](https://github.com/katsusuke/dotfiles) 等配置项目使用此变量。

```bash
export DISABLE_MICROCOMPACT="1"
```
**来源**: @anthropic-ai/claude-code/cli.js | [decodeclaude.com](https://decodeclaude.com/claude-code-compaction/) | [claudelog.com](https://www.claudelog.com/faqs/what-is-micro-compact/) | [kill136/claude-code-open](https://github.com/kill136/claude-code-open)

---
# 通常由 IDE 扩展自动设置，手动设置示例：
---
## 功能开关
### CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION ✅ ⭐
启用提示建议功能（响应完成后显示的 "Tab to accept" 建议）。

**默认值**: `true` (启用)
**禁用方式**: 设置为 `"false"`

**什么是 Prompt Suggestion**: Claude 响应完成后，输入框显示的上下文建议（如 "Try: 运行测试"），按 Tab 接受。

**工作原理**:
```
响应完成 → 检查是否启用 → Fork Query（单独 API 调用）→ 生成建议 → 过滤无效建议 → 显示
```

**技术细节**:
- **不是本地生成** — 通过单独的 API 调用（Fork Query）生成
- **Feature Flag**: `tengu_prompt_suggestion`（`tengu` 为内部代号/命名空间）
- **模型选择**: 公开资料未披露具体模型；逆向资料显示存在 `tengu-capable-model-config`（Statsig Dynamic Config）用于判定可用模型，但未明确与 Prompt Suggestion 绑定（置信度：低）
- **最小间隔**: 60 秒（避免频繁显示）
- **最大长度**: 100 字符

**tengu 是什么**:
- `tengu` 通常被认为是 Claude Code 的内部代号/事件与 feature flag 命名空间，不是公开功能名

**过滤条件**（以下建议会被抑制）:
| 条件 | 示例 |
|------|------|
| 空文本 | `""` |
| 字面 "done" | `"done"` |
| 超过 100 字符 | 长建议 |
| 包含格式符号 | `*`, `**`, `\n`, `` ` `` |
| 上下文限制错误 | "context limit", "too many tokens" |
| 感谢/结束语 | "thanks", "that's all", "good job" |

**已知问题**: [#14629](https://github.com/anthropics/claude-code/issues/14629) - 即使禁用，有时仍会出现建议

**行为对比**:
| 设置 | 效果 |
|------|------|
| 启用（默认） | 响应后显示 "Try: xxx" 建议 |
| 禁用（`=false`） | 不显示建议，界面更干净 ⚡ 减少 API 调用 |

```bash
export CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION="false"
```
**来源**: @anthropic-ai/claude-code/cli.js | [jeremedia/claude-code-log-format](https://github.com/jeremedia/claude-code-log-format/blob/main/source-docs/PROMPT_SUGGESTIONS.md) | [Issue #14629](https://github.com/anthropics/claude-code/issues/14629) | https://aiengineerguide.com/blog/claude-code-prompt/ | https://leehanchung.github.io/blogs/2025/03/07/claude-code/

### CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT ✅ ⭐
启用 token 使用量附件。

**默认值**: `false` (禁用)

**行为**: 仅当该变量为 truthy 时，`G97()` 会返回 `token_usage` 附件（`used/total/remaining`）。

**用户体验影响**: 启用后在响应中附带 token 使用量信息；未启用则不展示。

```bash
export CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:3198

---
## MCP 配置
### ENABLE_EXPERIMENTAL_MCP_CLI ✅ ⭐
启用实验性 MCP CLI 功能。

**默认值**: `false` (禁用)

**行为**: `k9A()` 中若为 truthy，外部 MCP 模式返回 `"mcp-cli"`；若为 falsy 且被 `iX()` 判定为禁用，则返回 `"standard"`；否则默认 `"tst-auto"`。

**用户体验影响**: 启用后会将外部工具搜索模式切换到 `mcp-cli` 分支（同时 `isToolSearchEnabledOptimistic()` 对该模式返回 `false`），影响后续 tool search 决策路径。

```bash
export ENABLE_EXPERIMENTAL_MCP_CLI="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:1179

### ENABLE_MCP_CLI ✅ ⭐
启用 MCP CLI。

**默认值**: `false` (禁用)

**行为**: 当该变量为 truthy（`1/true/yes/on`）时，`getExternalMcpMode()`/`getMcpMode()` 返回 `"mcp-cli"`；当显式设置为 falsey（`0/false/no/off`）时返回 `"standard"`；并影响 tool search 决策（`mcp-cli` 模式下 `isToolSearchEnabledOptimistic()` 返回 `false`）。

**用户体验影响**: 启用后进入 MCP CLI 模式，工具搜索走 `mcp-cli` 分支且不启用 optimistic tool search；显式禁用则强制使用 standard 分支。

```bash
export ENABLE_MCP_CLI="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:1179

### ENABLE_MCP_CLI_ENDPOINT ✅ ⭐
启用 MCP CLI 端点。

**默认值**: `true` (当 MCP CLI 启用时)

**行为**: 在 `mcp-cli` 模式下，若该变量未显式设置为 falsey（`0/false/no/off`），`ue()` 返回 `true` 允许 endpoint；显式设为 falsey 则禁用 endpoint。

**用户体验影响**: 禁用后 MCP CLI endpoint 不可用，相关调用路径会被关闭。

```bash
export ENABLE_MCP_CLI_ENDPOINT="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:4992

### MCP_CONNECTION_NONBLOCKING ✅ ⭐⭐⭐
非阻塞 MCP 连接模式。

**默认值**: `false` (阻塞模式 — 等待所有 MCP 服务器连接完成后才启动会话)

**问题背景**:
默认情况下，Claude Code 启动时会**阻塞等待所有 MCP 服务器初始化完成**，这可能导致：
- 用户看到 20-35 秒的 "Connecting..." 界面
- 一个慢速 MCP 服务器会拖慢整个启动过程
- ACP/SDK 客户端（Zed、Neovim、自定义 TUI）体验极差

**真实案例**（来自 [#13329](https://github.com/anthropics/claude-code/issues/13329)）:
| MCP 服务器 | 初始化时间 |
|------------|-----------|
| sequential-thinking | 1.2s |
| memory | 1.3s |
| fetch (uvx) | 1.6s |
| context7 (HTTP) | 2.3s |
| iMCP (Bonjour discovery) | **31.1s** |
| **总计（串行阻塞）** | **32.7s** |

**行为对比**:
| 设置 | 启动行为 | 工具可用性 |
|------|---------|-----------|
| `false`（默认） | 阻塞等待所有 MCP 服务器连接 | 启动后立即全部可用 |
| `true` | 立即返回，后台连接 | 渐进可用（工具随服务器就绪而出现）|

**启用后的用户体验**:
```
用户打开 Claude Code
  │
  ├── "Ready!" (0.1s) ← 立即可交互！
  │       ↓
  │   用户: "你好，Claude"
  │   Claude: "我可以帮你..."
  │       ↓
  │   [状态: 3/6 工具加载中...]
  │       ↓
  │   [状态: 5/6 工具加载中...]
  │       ↓
  │   [状态: 全部工具就绪 ✓] (32s，但用户未等待)
```

**典型使用场景**:
- ACP 客户端（Zed、Neovim）的 `session/new` 不阻塞
- SDK 应用中 `query()` 立即返回
- MCP 服务器数量多或含慢速服务器时改善启动体验
- 调试/开发时快速迭代

**注意事项**:
- 启用后需检查工具是否已就绪再使用
- 部分工具调用可能失败（服务器尚未连接）
- 社区功能请求：[#13329](https://github.com/anthropics/claude-code/issues/13329)（Non-Blocking Session Creation）

```bash
export MCP_CONNECTION_NONBLOCKING="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:5526 | [Issue #13329](https://github.com/anthropics/claude-code/issues/13329) | [decodeclaude.com](https://decodeclaude.com/) | [deepwiki/steipete/claude-code-mcp](https://deepwiki.com/steipete/claude-code-mcp/6.2-environment-variables)

### MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE ✅ ⭐⭐⭐
远程 MCP 服务器连接批量大小。

**默认值**: `20`

**行为**: `parseInt` 读取该值，非法则回退 `20`；用于远程 MCP 服务器的批量连接大小。

**用户体验影响**: 值越小连接更平滑但更慢；值越大并发更高、可能更快但更吃资源。

```bash
export MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE="5"
```
**来源**: @anthropic-ai/claude-code/cli.js:3194

### MCP_SERVER_CONNECTION_BATCH_SIZE ✅ ⭐⭐⭐
控制 MCP 服务器**并发连接数**。当有多个 MCP 服务器时，Claude Code 会分批连接而非全部同时连接。

**引入版本**: v1.0.53

**默认值**: `3`

**源码实现** (逆向工程):
```javascript
// cli.js
return parseInt(process.env.MCP_SERVER_CONNECTION_BATCH_SIZE || "", 10) || 3;
```

**工作原理**:
1. Claude Code 启动时发现 N 个 MCP 服务器
2. 按 batch size 分组并发连接
3. 一批完成后再连接下一批

```
场景: 9 个 MCP 服务器, batch size = 3

Batch 1: [server1, server2, server3] → 并发连接
Batch 2: [server4, server5, server6] → 等 Batch 1 完成后连接
Batch 3: [server7, server8, server9] → 等 Batch 2 完成后连接
```

**与 MCP_CONNECTION_NONBLOCKING 的关系**:
| 环境变量 | 作用 |
|---------|------|
| `MCP_CONNECTION_NONBLOCKING=1` | MCP 初始化**异步执行**（不阻塞启动） |
| `MCP_SERVER_CONNECTION_BATCH_SIZE=N` | 在异步/同步过程中**每批连接多少个** |

两者可以组合使用：
- `NONBLOCKING=1` + `BATCH_SIZE=10` = 异步 + 高并发（最快）
- `NONBLOCKING=1` + `BATCH_SIZE=3` = 异步 + 保守并发（默认）
- `NONBLOCKING=0` + `BATCH_SIZE=10` = 同步阻塞但高并发

**调优建议**:
| MCP 服务器数量 | 建议值 | 说明 |
|---------------|-------|------|
| 1-5 | `3` (默认) | 足够了 |
| 6-15 | `5-8` | 加快连接，仍然稳定 |
| 16+ | `10-15` | 激进但可能触发速率限制 |

**注意事项**:
- 值太大可能导致网络拥塞或 API 速率限制
- Remote MCP 服务器比 local stdio 服务器更敏感
- 如果遇到 MCP 连接超时，尝试**降低**此值

```bash
# 推荐配置（与 NONBLOCKING 配合使用）
export MCP_CONNECTION_NONBLOCKING="1"
export MCP_SERVER_CONNECTION_BATCH_SIZE="5"
```

**来源**:
- cli.js 逆向工程: `rodion-m/cc`, `sirvan3tr/reverse_claude_code`
- Changelog v1.0.53: `shcv/claude-investigations`
- Gist: `unkn0wncode/f87295d055dd0f0e8082358a0b5cc467`

---
## 命令禁用
### DISABLE_AUTO_MIGRATE_TO_NATIVE ✅ ⭐
禁用自动迁移到原生版本的提示。

**默认值**: `false` (提示已启用)
**禁用方式**: 设置为 `"1"`, `"true"`, `"yes"`, 或 `"on"`

**行为**: 若为 truthy，`AC1()` 直接返回 `false`，阻止自动迁移到原生版本的提示/流程。

**用户体验影响**: 不再弹出自动迁移提示。

```bash
export DISABLE_AUTO_MIGRATE_TO_NATIVE="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:5223

### DISABLE_EXTRA_USAGE_COMMAND ✅ ⭐
禁用额外的 usage 命令。

**默认值**: `false` (命令已启用)

**行为**: 当该变量存在（非空）时，`/extra-usage` 的 `isEnabled()` 返回 `false`。

**用户体验影响**: 命令不可用/不显示。

```bash
export DISABLE_EXTRA_USAGE_COMMAND="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:2327

---
## 性能和限制
### CLAUDE_CODE_EFFORT_LEVEL ✅ ⭐⭐⭐
Opus 4.5 的 effort 参数。控制 token 使用量和响应深度。

**默认值**: `"high"`

**有效值**: `"low"` | `"medium"` | `"high"` （**字符串**，不是整数）

**仅支持模型**: Claude Opus 4.5（`claude-opus-4-5-20251101`）

**API 要求**:
- 需要 beta header: `anthropic-beta: effort-2025-11-24`
- 设置为 `"unset"` 可忽略此参数

**effort 对 token 使用的影响**:
| Effort | 文本响应 | 工具调用 | Extended Thinking |
|--------|---------|---------|-------------------|
| `low` | 更短、更省 | 更少调用 | 思考量减少 |
| `medium` | 平衡 | 平衡 | 平衡 |
| `high` | 更深入、更详尽 | 更多调用 | 更深入思考 |

**典型使用场景**:
| 场景 | 推荐 Effort |
|------|------------|
| 快速问答 / 简单任务 | `low` |
| 日常开发辅助 | `medium` |
| 复杂架构设计 / 深度分析 | `high` |

**注意事项**:
- 非 Opus 4.5 模型忽略此参数
- Claude Code 内部可能通过 `CLAUDE_CODE_EXTRA_BODY` 或直接 API 设置
- 社区请求: [#12376](https://github.com/anthropics/claude-code/issues/12376) - 请求官方 Claude Code 支持

```bash
export CLAUDE_CODE_EFFORT_LEVEL="high"
```
**来源**: @anthropic-ai/claude-code/cli.js:3275 | [Anthropic API Docs](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking#the-effort-parameter) | [Issue #12376](https://github.com/anthropics/claude-code/issues/12376)

### CLAUDE_CODE_LOOPY_MODE ✅ ⭐⭐
自主循环执行模式（与 Ralph Wiggum 插件相关）。

**默认值**: 禁用

**⚠️ 注意**: 官方 CLI **没有** `--loopy` 参数。`-p` 是 `--print`（非交互输出模式）。

**什么是 Loopy Mode**:
- 自主循环执行，Claude 持续迭代直到满足退出条件
- 不是在"认为完成"时停止，而是验证条件后才停止
- 主要由 **Ralph Wiggum 插件** 内部设置

**工作原理**:
```
普通模式:  任务 → Claude 执行 → "完成了" → 停止（可能只完成 60%）
Loopy 模式: 任务 → 执行 → 检查退出条件 → 未满足 → 继续迭代 → 满足 → 停止
```

**如何启用**:
1. **Ralph Wiggum 插件**（推荐）:
   ```bash
   # 安装插件
   claude plugin install ralph-wiggum
   # 使用
   /ralph-loop "修复 auth.ts" --promise "测试通过时输出 FIXED"
   ```

2. **原生任务管理**（2025年1月+）:
   - `CLAUDE_CODE_TASK_LIST_ID` — 任务列表 ID
   - 支持依赖、阻塞器、多会话协调

**行为**: 当 loopy 模式启用时，CLI 内部将该变量设为 `"true"` 并记录事件。**用户不应手动设置**。

```bash
# ⚠️ 不建议手动设置，由插件/内部机制管理
# export CLAUDE_CODE_LOOPY_MODE="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:5478 | [Ralph Wiggum Plugin](https://github.com/anthropics/claude-code-plugins) | [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code)

### CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY ✅ ⭐
工具使用的最大并发数。

**默认值**: `10`

**行为**: `parseInt` 读取该变量，非法则回退 `10`；用于工具调用并发上限。

**用户体验影响**: 值越小并发更低、响应更稳但更慢；值越大并发更高、响应更快但资源占用更高。

```bash
export CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY="5"
```
**来源**: @anthropic-ai/claude-code/cli.js:3333

### MAX_STRUCTURED_OUTPUT_RETRIES ✅ ⭐
结构化输出的最大重试次数。

**默认值**: `5`

**行为**: 读取该变量并 `parseInt`，默认 `5`；当结构化输出重试次数达到该阈值时触发 `error_max_structured_output_retries`。

**用户体验影响**: 值越大允许更多重试，失败更晚；值越小更快失败返回。

```bash
export MAX_STRUCTURED_OUTPUT_RETRIES="3"
```
**来源**: @anthropic-ai/claude-code/cli.js:3362

---
## 文件和附件
### CLAUDE_CODE_DISABLE_ATTACHMENTS ✅ ⭐
禁用附件功能。

**默认值**: `false` (附件已启用)

**行为**: 若为 truthy，附件收集流程直接返回空数组（不再收集 at_mentioned_files/mcp_resources 等）。

**用户体验影响**: 不再自动附加文件/资源，响应上下文可能变少。

```bash
export CLAUDE_CODE_DISABLE_ATTACHMENTS="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:3196

### CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING ✅ ⭐⭐⭐
禁用文件检查点功能。

**默认值**: `false` (检查点已启用)

**行为**: 若为 truthy，则 `vG()` 返回 `false`，文件检查点逻辑整体关闭（SDK 路径也受影响）。

**用户体验影响**: 不再生成/使用文件检查点，回滚或恢复功能可能受限。

```bash
export CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:2636

### CLAUDE_CODE_USE_NATIVE_FILE_SEARCH ✅ ⭐⭐⭐
使用原生文件搜索。

**默认值**: `false` (使用 git/rg)

**行为**: 若为 truthy，改用原生文件搜索 `B$7()`；否则使用 `rg --files` 路径。

**用户体验影响**: 启用后文件扫描方式变化，结果/性能可能与 `rg` 不同。

```bash
export CLAUDE_CODE_USE_NATIVE_FILE_SEARCH="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:4730

---
## 容器和沙箱
### CLAUDE_CODE_BUBBLEWRAP ✅ ⭐
使用 Bubblewrap 沙箱。

**默认值**: `false` (禁用)

**行为**: 仅在 Linux 上且该变量为 `"1"` 时返回 `true`，启用 bubblewrap 沙箱路径。

**用户体验影响**: 在 Linux 上启用更强隔离，可能带来额外启动/权限限制。

```bash
export CLAUDE_CODE_BUBBLEWRAP="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:120

### CLAUDE_CODE_CONTAINER_ID ✅ ⭐
容器 ID 标识。

**默认值**: `undefined`

**行为**: 若设置该变量，会被加入环境上下文（`claudeCodeContainerId`）并上报。

**用户体验影响**: 主要影响遥测/上下文标识，对 CLI 功能无直接影响。

```bash
export CLAUDE_CODE_CONTAINER_ID="container-123"
```
**来源**: @anthropic-ai/claude-code/cli.js:236

### CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE ✅ ⭐⭐⭐
覆盖阻塞限制。

**默认值**: 动态

**行为**: 读取该变量并 `parseInt`，若为正数则作为阻塞阈值覆盖默认计算值。

**用户体验影响**: 阈值越小越早触发“阻塞限制”提示；阈值越大则更晚触发。

```bash
export CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE="100"
```
**来源**: @anthropic-ai/claude-code/cli.js:3275

---
## 内部/实验性
### CLAUDE_CODE_ENTRYPOINT ✅ ⭐
自定义入口点。用于特殊部署场景。

**默认值**: `"cli"`

**行为**: `H91()` 默认返回 `process.env.CLAUDE_CODE_ENTRYPOINT ?? "cli"`；启动时 `B_7()` 会根据运行模式（`mcp`/GitHub Action/`sdk-cli`/`cli`）设置该值；该值会被写入 `envContext`/遥测并参与功能集合选择（非 `sdk-ts/sdk-py/sdk-cli` 时启用特定功能）。

**用户体验影响**: 影响 clientType/遥测标签以及部分功能开关（SDK 入口点下交互特性更少）。

```bash
export CLAUDE_CODE_ENTRYPOINT="sdk-py"
```
**来源**: @anthropic-ai/claude-code/cli.js:5477,912,2257,236

### CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION ✅ ⭐
环境运行器版本。

**默认值**: `undefined`

**行为**: 若设置该变量，会在环境运行器请求头中加入 `x-environment-runner-version`。

**用户体验影响**: 主要影响服务端识别/遥测，无直接 UI 变化。

```bash
export CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION="1.0.0"
```
**来源**: @anthropic-ai/claude-code/cli.js:5350

### CLAUDE_CODE_EXTRA_BODY ✅ ⭐⭐⭐
API 请求的额外 JSON 数据。

**默认值**: `{}`

**行为**: 尝试解析该值为 JSON 对象；解析成功且为对象时并入请求体；否则记录错误日志。

**用户体验影响**: 可为请求添加额外字段；无效 JSON 会触发错误日志但不改变请求。

```bash
export CLAUDE_CODE_EXTRA_BODY='{"custom_field": "value"}'
```
**来源**: @anthropic-ai/claude-code/cli.js:4650

---
## Plan 模式
### CLAUDE_CODE_PLAN_V2_AGENT_COUNT ✅ ⭐
Plan V2 模式的 agent 数量。

**默认值**: 取决于订阅层级 (1-3)

**行为**: 若设置该变量且为 1-10 的整数则直接使用；否则根据订阅层级决定（max/enterprise/team 为 3，其他为 1）。

**用户体验影响**: 值越大计划阶段并行 agent 越多、探索覆盖面更高，但开销也更大。

```bash
export CLAUDE_CODE_PLAN_V2_AGENT_COUNT="3"
```
**来源**: @anthropic-ai/claude-code/cli.js:4815

### CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT ✅ ⭐
Plan V2 模式的 explore agent 数量。

**默认值**: `3`

**行为**: 若设置该变量且为 1-10 的整数则直接使用；否则回退默认值 `3`。

**用户体验影响**: 值越大探索 agent 越多、覆盖更广；值越小更节省资源。

```bash
export CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT="2"
```
**来源**: @anthropic-ai/claude-code/cli.js:4815

---
## 搜索记录

- ✅ `rg "<ENV_VAR>" cli.js` / GrepTool 精确匹配变量名，输出可控。
- ✅ `rg -n "<ENV_VAR>" cli.js` 后配合 `Read` 读取小片段，避免一次性读全行。
- ⚠️ 在 minified 的 `cli.js` 上使用大型 `VAR1|VAR2|...` 正则，会命中超长单行并导致输出截断/上下文过大。
- ⚠️ 使用 `rg "process.env" cli.js` 命中过多，容易注入大量无关内容。
- ✅ 若命中单行过长：先 `rg` 定位，再用小片段截取（而不是读取整行）。

---

## 来源参考

1. **anthropics/claude-code** - 官方 CLI 仓库 CHANGELOG.md
2. **anthropics/claude-code-action** - GitHub Action 源码
3. **anthropics/anthropic-sdk-python** - Python SDK
4. **anthropics/anthropic-sdk-typescript** - TypeScript SDK
5. **anthropics/claude-agent-sdk-python** - Agent SDK
6. **unkn0wncode/f87295d055dd0f0e8082358a0b5cc467** - 社区 Gist 解释
7. **decodeclaude.com** - 社区文档
8. **GitHub Issues** - 功能请求和讨论
9. **@anthropic-ai/claude-code/cli.js** - 源码分析验证

---

*最后更新: 2026-01-24*
*基于 Claude Code v2.1.x*
