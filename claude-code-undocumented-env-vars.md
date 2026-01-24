# Claude Code 未记录环境变量参考

> 从 `@anthropic-ai/claude-code` CLI 源码提取，通过 GitHub 搜索、Exa 搜索、grep.app 和 DeepWiki 验证。
>
> 说明：✅ = 已验证（有来源）| ⚠️ = 推断（基于命名/上下文）| ❓ = 未知

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

## API 和 Provider 配置

### API_MAX_INPUT_TOKENS ✅
API 请求的最大输入 token 数限制。

**默认值**: `180000`

**行为**: 仅在启用 `USE_API_CLEAR_TOOL_RESULTS` 或 `USE_API_CLEAR_TOOL_USES` 时生效；作为 `clear_tool_uses_20250919` 的 `trigger.input_tokens` 阈值，并与 `API_TARGET_INPUT_TOKENS` 一起计算 `clear_at_least`（`J - X`）。

**用户体验影响**: 当启用 API 清理逻辑时，值越小越早触发清理，工具输出/上下文更早被裁剪；值越大则保留更多上下文，但更晚触发清理。

```bash
export API_MAX_INPUT_TOKENS="150000"
```
**来源**: @anthropic-ai/claude-code/cli.js:546

### API_TARGET_INPUT_TOKENS ✅
目标输入 token 数，用于上下文管理优化。

**默认值**: `40000`

**行为**: 仅在启用 `USE_API_CLEAR_TOOL_RESULTS` 或 `USE_API_CLEAR_TOOL_USES` 时生效；与 `API_MAX_INPUT_TOKENS` 一起用于 `clear_tool_uses_20250919` 的 `clear_at_least` 计算（`J - X`）。

**用户体验影响**: 当启用 API 清理逻辑时，值越大，清理至少值（`J - X`）越小，清理力度更弱；值越小，清理更激进。

```bash
export API_TARGET_INPUT_TOKENS="100000"
```
**来源**: @anthropic-ai/claude-code/cli.js:546

---

## Bash 和命令执行

### CLAUDE_BASH_NO_LOGIN ✅
跳过 Bash 工具的登录 shell 初始化。**性能优化常用变量**。

**默认值**: `false` (使用登录 Shell)

**行为**: 设为 `"1"` 时，执行 Bash 命令跳过 `-l`（login shell）标志。

**用户体验影响**:
| 设置 | 效果 |
|------|------|
| 默认（false） | ✅ 加载完整环境（PATH、别名等） ⚠️ 每个命令启动略慢 |
| 启用（1） | ⚡ 命令执行更快 ⚠️ 可能缺少 ~/.bash_profile 中定义的 PATH 或环境变量 |

**典型问题**: 启用后可能出现 "command not found" 错误，因为某些工具的 PATH 在登录 shell 初始化时才设置。

**社区验证**: 3rd/ccc 配置中默认启用此变量以提升性能。

```bash
export CLAUDE_BASH_NO_LOGIN="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:1637 | 3rd/ccc

---

## 权限和安全

### CLAUDE_CODE_ADDITIONAL_PROTECTION ✅
启用额外的安全保护机制（添加 `x-anthropic-additional-protection` 头）。

**默认值**: `false` (禁用)

**行为**: 若为 truthy，向 API 请求头注入 `x-anthropic-additional-protection: true`。

**用户体验影响**: 仅改变请求头；具体启用哪些服务端保护策略在 CLI 源码中未体现，效果取决于服务端实现。

```bash
export CLAUDE_CODE_ADDITIONAL_PROTECTION="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:1075

### CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK ✅
禁用命令注入安全检查。**⚠️ 安全相关，谨慎使用**。

**默认值**: `false` (检查已启用)

**行为**:
- 默认情况下，对 Bash 命令进行注入模式检测（如 `${...}`、复合命令等）
- 检测到危险模式时触发 `ask/deny` 权限提示
- 设为 `"1"` 跳过所有检查

**用户体验影响**:
| 设置 | 效果 |
|------|------|
| 默认（启用检查） | 🔒 更安全，但某些复杂命令可能触发权限提示 |
| 禁用检查 | ⚡ 命令执行更快、更少提示 ⚠️ 降低安全保护，可能执行危险命令 |

**检测的模式**（来自 shareAI-lab/Kode-cli 源码）:
- 变量扩展：`${...}`
- 不安全的复合命令
- 潜在的命令注入模式

**社区验证**: shareAI-lab/Kode-cli、shcv/claude-investigations 均记录此变量。

```bash
# ⚠️ 仅在受信任环境中使用
export CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:3134 | shareAI-lab/Kode-cli

---

## 界面和显示

### CLAUDE_CODE_FORCE_FULL_LOGO ✅
强制显示完整 logo。

**默认值**: `false` (禁用)

**行为**: UI 渲染分支中，当该变量未启用且特定条件（`H`/`Y`）为 false 时，仅渲染简化头部；启用后强制渲染完整 Logo。

**用户体验影响**: 开启后顶部品牌区域更完整、更占空间；关闭时更紧凑。

```bash
export CLAUDE_CODE_FORCE_FULL_LOGO="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:3727

---

## 上下文和内存管理

### CLAUDE_CODE_CONTEXT_LIMIT ✅
自定义上下文窗口限制。**这是最常用的未记录变量之一**。

**默认值**: `200000`（部分模型如 claude-sonnet-4 可达 `1_000_000`）

**行为**:
- 优先读取该环境变量
- 未设置时，若模型匹配特定条件（如 `claude-sonnet-4` 且启用 1M 上下文），返回 `1_000_000`
- 否则返回 `200000`

**用户体验影响**:
| 设置 | 效果 |
|------|------|
| 调高（如 500000） | ✅ 可处理更长对话/更大文件 ⚠️ 可能触发更早的 compaction |
| 调低（如 100000） | ⚡ 响应更快、成本更低 ❌ 大文件/长对话可能被截断 |

**社区验证**: Piebald-AI/tweakcc 通过运行时补丁实现该功能。

```bash
export CLAUDE_CODE_CONTEXT_LIMIT="500000"
```
**来源**: @anthropic-ai/claude-code/cli.js:8 | Piebald-AI/tweakcc

### DISABLE_MICROCOMPACT ✅
禁用微压缩（将大工具输出卸载到磁盘）。

**默认值**: `false` (微压缩已启用)

**行为**: 若为 truthy，跳过 microcompact 处理，保留原始 messages。

**用户体验影响**:
| 设置 | 效果 |
|------|------|
| 启用（默认） | ⚡ 大工具输出被写入临时文件，上下文更精简 |
| 禁用（设为 1） | ✅ 保留完整工具输出在上下文中 ⚠️ 可能导致上下文膨胀，触发更早的 compaction |

**典型使用场景**: 调试时需要查看完整工具输出，或希望 Claude 能引用完整的先前输出。

**社区验证**: 多个配置项目（如 ryoppippi/dotfiles、yutkat/dotfiles）使用此变量。

```bash
export DISABLE_MICROCOMPACT="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:3273

---

## 远程和 IDE 集成

### CLAUDE_CODE_SSE_PORT ✅
Server-Sent Events 通信端口。**IDE 集成的核心变量**。

**默认值**: `null` (自动选择端口)

**行为**: 指定 Claude Code 与 IDE 扩展通信的 SSE 端口。

**用户体验影响**:
| 设置 | 效果 |
|------|------|
| 未设置 | Claude Code 自动选择可用端口，IDE 扩展自动发现 |
| 指定端口（如 8080） | 固定端口通信，适用于防火墙/代理配置场景 |

**IDE 集成**:
- **Neovim**: claudecode.nvim 使用此变量启动 Claude 时传递端口
- **Emacs**: claude-code-ide.el 通过此变量建立连接
- **VS Code**: 原生支持，通常自动配置

**社区验证**: coder/claudecode.nvim、manzaltu/claude-code-ide.el 等项目广泛使用。

```bash
# 通常由 IDE 扩展自动设置，手动设置示例：
export CLAUDE_CODE_SSE_PORT="12345"
export ENABLE_IDE_INTEGRATION="true"
```
**来源**: @anthropic-ai/claude-code/cli.js:3195 | coder/claudecode.nvim

---

## 调试和日志

### CLAUDE_CODE_PROFILE_STARTUP ✅
启用启动性能分析。

**默认值**: `false` (禁用)

**行为**: 设为 `"1"` 会强制启用启动性能分析（`idA`/`OH1` 为 true）；未设置时仍有概率采样（`ES9=0.005`、`z77=0.05`）。启用后会记录 `tengu_startup_perf`，并在 headless 路径输出 `[headlessProfiler]` 指标日志。

**用户体验影响**: 启用时会产生额外性能统计与日志输出，可能轻微增加启动开销；未设置时仅小比例采样，影响很小。

```bash
export CLAUDE_CODE_PROFILE_STARTUP="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:12,3331

---

## Hooks 和插件

### CLAUDE_ENV_FILE ✅
SessionStart hook 专用。**用于在 hook 中持久化环境变量到会话**。

**默认值**: `undefined`（由 Claude Code 在 hook 执行时自动设置）

**行为**:
- Claude Code 启动时创建临时文件，路径通过此变量传递给 SessionStart hook
- Hook 脚本可将 `export VAR=value` 写入该文件
- Claude Code 会读取文件内容并加载到会话环境

**用户体验影响**:
| 使用场景 | 效果 |
|----------|------|
| 项目类型检测 | Hook 检测 package.json/Cargo.toml 等，设置 PROJECT_TYPE 变量 |
| 工具版本缓存 | 避免每次命令都检测 Node/Python 版本 |
| 自定义环境 | 根据项目自动设置 API keys、配置路径等 |

**典型用法**（来自官方 plugin-dev 示例）:
```bash
#!/bin/bash
# SessionStart hook 示例
if [ -f "package.json" ]; then
  echo "export PROJECT_TYPE=nodejs" >> "$CLAUDE_ENV_FILE"
fi
if [ -f "tsconfig.json" ]; then
  echo "export USES_TYPESCRIPT=true" >> "$CLAUDE_ENV_FILE"
fi
```

**社区验证**: anthropics/claude-code 官方插件、ddev/ddev、onetimesecret/onetimesecret 等项目使用。

**来源**: @anthropic-ai/claude-code/cli.js:1636,3028 | anthropics/claude-code plugins

---

## 功能开关

### CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION ✅
启用提示建议功能。

**默认值**: `true` (启用)
**禁用方式**: 设置为 `"false"`

**行为**: 若不为 `"false"`，调用 `W19()` 生成提示建议；在 `uH1()` 初始化中，`"false"` 会直接禁用并记录日志，`"1"` 强制启用，其余情况受特性开关 `ROA(wG7)` 与环境条件影响。

**用户体验影响**: 启用时会在交互中出现提示建议；禁用后不展示建议，交互更“干净”。

```bash
export CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION="false"
```
**来源**: @anthropic-ai/claude-code/cli.js:3333,3364

### CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT ✅
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

### ENABLE_EXPERIMENTAL_MCP_CLI ✅
启用实验性 MCP CLI 功能。

**默认值**: `false` (禁用)

**行为**: `k9A()` 中若为 truthy，外部 MCP 模式返回 `"mcp-cli"`；若为 falsy 且被 `iX()` 判定为禁用，则返回 `"standard"`；否则默认 `"tst-auto"`。

**用户体验影响**: 启用后会将外部工具搜索模式切换到 `mcp-cli` 分支（同时 `isToolSearchEnabledOptimistic()` 对该模式返回 `false`），影响后续 tool search 决策路径。

```bash
export ENABLE_EXPERIMENTAL_MCP_CLI="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:1179

### ENABLE_MCP_CLI ✅
启用 MCP CLI。

**默认值**: `false` (禁用)

**行为**: 当该变量为 truthy（`1/true/yes/on`）时，`getExternalMcpMode()`/`getMcpMode()` 返回 `"mcp-cli"`；当显式设置为 falsey（`0/false/no/off`）时返回 `"standard"`；并影响 tool search 决策（`mcp-cli` 模式下 `isToolSearchEnabledOptimistic()` 返回 `false`）。

**用户体验影响**: 启用后进入 MCP CLI 模式，工具搜索走 `mcp-cli` 分支且不启用 optimistic tool search；显式禁用则强制使用 standard 分支。

```bash
export ENABLE_MCP_CLI="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:1179

### ENABLE_MCP_CLI_ENDPOINT ✅
启用 MCP CLI 端点。

**默认值**: `true` (当 MCP CLI 启用时)

**行为**: 在 `mcp-cli` 模式下，若该变量未显式设置为 falsey（`0/false/no/off`），`ue()` 返回 `true` 允许 endpoint；显式设为 falsey 则禁用 endpoint。

**用户体验影响**: 禁用后 MCP CLI endpoint 不可用，相关调用路径会被关闭。

```bash
export ENABLE_MCP_CLI_ENDPOINT="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:4992

### ENABLE_MCP_LARGE_OUTPUT_FILES ✅
允许 MCP 输出大文件。

**默认值**: `true` (启用)
**禁用方式**: 设置为 `"false"` 或 `"0"`

**行为**: 当 MCP 工具输出过大且为非图片内容时，默认会写入磁盘并返回文件引用；若显式设置为 falsey（`0/false/no/off`），则走 `hX0()` 直接内联输出路径，不写大文件。

**用户体验影响**: 启用时大输出更可能落盘、消息更短；禁用时输出直接内联，消息更长但不产生大文件。

```bash
export ENABLE_MCP_LARGE_OUTPUT_FILES="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:3194,1712

### MCP_CONNECTION_NONBLOCKING ✅
非阻塞 MCP 连接。

**默认值**: `false` (阻塞)

**行为**: 初始化 MCP 时，若该变量为 truthy，则不等待连接结果，直接返回空的 `clients/tools/commands`；否则阻塞等待连接完成。

**用户体验影响**: 启用后启动更快，但 MCP 工具可能暂不可用；禁用则在启动阶段等待 MCP 连接。

```bash
export MCP_CONNECTION_NONBLOCKING="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:5526

### MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE ✅
远程 MCP 服务器连接批量大小。

**默认值**: `20`

**行为**: `parseInt` 读取该值，非法则回退 `20`；用于远程 MCP 服务器的批量连接大小。

**用户体验影响**: 值越小连接更平滑但更慢；值越大并发更高、可能更快但更吃资源。

```bash
export MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE="5"
```
**来源**: @anthropic-ai/claude-code/cli.js:3194

### MCP_SERVER_CONNECTION_BATCH_SIZE ✅
MCP 服务器连接批量大小。

**默认值**: `3`

**行为**: `parseInt` 读取该值，非法则回退 `3`；用于 MCP 服务器的批量连接大小。

**用户体验影响**: 值越小连接更平滑但更慢；值越大并发更高、可能更快但更吃资源。

```bash
export MCP_SERVER_CONNECTION_BATCH_SIZE="10"
```
**来源**: @anthropic-ai/claude-code/cli.js:3194

---

## 命令禁用

### DISABLE_AUTO_MIGRATE_TO_NATIVE ✅
禁用自动迁移到原生版本的提示。

**默认值**: `false` (提示已启用)
**禁用方式**: 设置为 `"1"`, `"true"`, `"yes"`, 或 `"on"`

**行为**: 若为 truthy，`AC1()` 直接返回 `false`，阻止自动迁移到原生版本的提示/流程。

**用户体验影响**: 不再弹出自动迁移提示。

```bash
export DISABLE_AUTO_MIGRATE_TO_NATIVE="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:5223

### DISABLE_EXTRA_USAGE_COMMAND ✅
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

### CLAUDE_CODE_EFFORT_LEVEL ✅
Opus 4.5 的 effort 参数（low/medium/high）。控制 token 使用量和响应深度。

**默认值**: `"medium"`

**行为**: 读取该环境变量；若为 `"unset"` 则忽略；若为数字且通过校验则使用数值；若为 `low/medium/high` 则使用对应档位；否则回退到配置 `effortLevel`，再回退 `"medium"`。

**用户体验影响**: 值越高响应更深入、token 使用更多；值越低更快更省。

```bash
export CLAUDE_CODE_EFFORT_LEVEL="medium"
```
**来源**: @anthropic-ai/claude-code/cli.js:3275

### CLAUDE_CODE_LOOPY_MODE ✅
循环模式。主要通过 `-p/--loopy` 标志设置。

**默认值**: 禁用 (内部)

**行为**: 当 loopy 模式启用时，CLI 会将该变量写为 `"true"` 并记录事件；在 `cli.js` 中未看到该变量被再次读取。

**用户体验影响**: loopy 模式会持续/循环执行（由 CLI 参数控制），该环境变量主要用于标记状态/传递给子进程。

```bash
export CLAUDE_CODE_LOOPY_MODE="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:5478

### CLAUDE_CODE_MAX_RETRIES ✅
请求失败时的最大重试次数。

**默认值**: `10`

**行为**: 优先使用请求参数 `maxRetries`；若未设置则读取该变量并 `parseInt`；否则回退内置默认值 `10`。

**用户体验影响**: 值越大失败时等待更久但更容易自动恢复；值越小更快失败返回。

```bash
export CLAUDE_CODE_MAX_RETRIES="3"
```
**来源**: @anthropic-ai/claude-code/cli.js:1076

### CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY ✅
工具使用的最大并发数。

**默认值**: `10`

**行为**: `parseInt` 读取该变量，非法则回退 `10`；用于工具调用并发上限。

**用户体验影响**: 值越小并发更低、响应更稳但更慢；值越大并发更高、响应更快但资源占用更高。

```bash
export CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY="5"
```
**来源**: @anthropic-ai/claude-code/cli.js:3333

### MAX_STRUCTURED_OUTPUT_RETRIES ✅
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

### CLAUDE_CODE_DISABLE_ATTACHMENTS ✅
禁用附件功能。

**默认值**: `false` (附件已启用)

**行为**: 若为 truthy，附件收集流程直接返回空数组（不再收集 at_mentioned_files/mcp_resources 等）。

**用户体验影响**: 不再自动附加文件/资源，响应上下文可能变少。

```bash
export CLAUDE_CODE_DISABLE_ATTACHMENTS="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:3196

### CLAUDE_CODE_DISABLE_CLAUDE_MDS ✅
禁用 CLAUDE.md 文件加载。

**默认值**: `false` (加载已启用)

**行为**: 若该变量存在（非空），`XD0()` 不会被调用，`claudeMd` 置空并记录 `claudemd_disabled`。

**用户体验影响**: 不再加载 CLAUDE.md 指令，行为只受全局/项目其他配置影响。

```bash
export CLAUDE_CODE_DISABLE_CLAUDE_MDS="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:1955

### CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING ✅
禁用文件检查点功能。

**默认值**: `false` (检查点已启用)

**行为**: 若为 truthy，则 `vG()` 返回 `false`，文件检查点逻辑整体关闭（SDK 路径也受影响）。

**用户体验影响**: 不再生成/使用文件检查点，回滚或恢复功能可能受限。

```bash
export CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:2636

### CLAUDE_CODE_USE_NATIVE_FILE_SEARCH ✅
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

### CLAUDE_CODE_BUBBLEWRAP ✅
使用 Bubblewrap 沙箱。

**默认值**: `false` (禁用)

**行为**: 仅在 Linux 上且该变量为 `"1"` 时返回 `true`，启用 bubblewrap 沙箱路径。

**用户体验影响**: 在 Linux 上启用更强隔离，可能带来额外启动/权限限制。

```bash
export CLAUDE_CODE_BUBBLEWRAP="1"
```
**来源**: @anthropic-ai/claude-code/cli.js:120

### CLAUDE_CODE_CONTAINER_ID ✅
容器 ID 标识。

**默认值**: `undefined`

**行为**: 若设置该变量，会被加入环境上下文（`claudeCodeContainerId`）并上报。

**用户体验影响**: 主要影响遥测/上下文标识，对 CLI 功能无直接影响。

```bash
export CLAUDE_CODE_CONTAINER_ID="container-123"
```
**来源**: @anthropic-ai/claude-code/cli.js:236

### CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE ✅
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

### CLAUDE_CODE_ENTRYPOINT ✅
自定义入口点。用于特殊部署场景。

**默认值**: `"cli"`

**行为**: `H91()` 默认返回 `process.env.CLAUDE_CODE_ENTRYPOINT ?? "cli"`；启动时 `B_7()` 会根据运行模式（`mcp`/GitHub Action/`sdk-cli`/`cli`）设置该值；该值会被写入 `envContext`/遥测并参与功能集合选择（非 `sdk-ts/sdk-py/sdk-cli` 时启用特定功能）。

**用户体验影响**: 影响 clientType/遥测标签以及部分功能开关（SDK 入口点下交互特性更少）。

```bash
export CLAUDE_CODE_ENTRYPOINT="sdk-py"
```
**来源**: @anthropic-ai/claude-code/cli.js:5477,912,2257,236

### CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION ✅
环境运行器版本。

**默认值**: `undefined`

**行为**: 若设置该变量，会在环境运行器请求头中加入 `x-environment-runner-version`。

**用户体验影响**: 主要影响服务端识别/遥测，无直接 UI 变化。

```bash
export CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION="1.0.0"
```
**来源**: @anthropic-ai/claude-code/cli.js:5350

### CLAUDE_CODE_EXTRA_BODY ✅
API 请求的额外 JSON 数据。

**默认值**: `{}`

**行为**: 尝试解析该值为 JSON 对象；解析成功且为对象时并入请求体；否则记录错误日志。

**用户体验影响**: 可为请求添加额外字段；无效 JSON 会触发错误日志但不改变请求。

```bash
export CLAUDE_CODE_EXTRA_BODY='{"custom_field": "value"}'
```
**来源**: @anthropic-ai/claude-code/cli.js:4650


### CLAUDE_CODE_TEST_FIXTURES_ROOT ✅
测试 fixtures 根目录。

**默认值**: 当前工作目录

**行为**: 当 fixtures 模式启用时，用该路径读取 `fixtures/*.json`；未设置则使用当前工作目录。

**用户体验影响**: 仅影响测试/fixture 读取路径，正常运行无影响。

```bash
export CLAUDE_CODE_TEST_FIXTURES_ROOT="/path/to/fixtures"
```
**来源**: @anthropic-ai/claude-code/cli.js:1076

### CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR ✅
WebSocket 认证文件描述符。

**默认值**: `undefined`

**行为**: 若设置该变量，会解析为文件描述符并用于 WebSocket 认证；值非法会记录错误并忽略。

**用户体验影响**: 影响远程/本地 WebSocket 认证来源，对普通交互无直接影响。

```bash
export CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR="4"
```
**来源**: @anthropic-ai/claude-code/cli.js:1708

---

## Plan 模式

### CLAUDE_CODE_PLAN_V2_AGENT_COUNT ✅
Plan V2 模式的 agent 数量。

**默认值**: 取决于订阅层级 (1-3)

**行为**: 若设置该变量且为 1-10 的整数则直接使用；否则根据订阅层级决定（max/enterprise/team 为 3，其他为 1）。

**用户体验影响**: 值越大计划阶段并行 agent 越多、探索覆盖面更高，但开销也更大。

```bash
export CLAUDE_CODE_PLAN_V2_AGENT_COUNT="3"
```
**来源**: @anthropic-ai/claude-code/cli.js:4815

### CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT ✅
Plan V2 模式的 explore agent 数量。

**默认值**: `3`

**行为**: 若设置该变量且为 1-10 的整数则直接使用；否则回退默认值 `3`。

**用户体验影响**: 值越大探索 agent 越多、覆盖更广；值越小更节省资源。

```bash
export CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT="2"
```
**来源**: @anthropic-ai/claude-code/cli.js:4815

---

## 调查和反馈

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
