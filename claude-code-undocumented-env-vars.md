# Claude Code 未记录环境变量参考

> 从 `@anthropic-ai/claude-code` CLI 源码提取，通过 GitHub 搜索和 Exa 搜索验证。
>
> 说明：✅ = 已验证（有来源）| ⚠️ = 推断（基于命名/上下文）| ❓ = 未知

---

## API 和 Provider 配置

### API_MAX_INPUT_TOKENS ⚠️
API 请求的最大输入 token 数限制。

```bash
export API_MAX_INPUT_TOKENS="150000"
```

### API_TARGET_INPUT_TOKENS ⚠️
目标输入 token 数，用于上下文管理优化。

```bash
export API_TARGET_INPUT_TOKENS="100000"
```

---

## Bash 和命令执行

### CLAUDE_BASH_NO_LOGIN ✅
跳过 Bash 工具的登录 shell 初始化。加快命令执行速度。

```bash
export CLAUDE_BASH_NO_LOGIN="1"
```
**来源**: CHANGELOG.md v1.0.124

---

## 权限和安全

### CLAUDE_CODE_ADDITIONAL_PROTECTION ⚠️
启用额外的安全保护机制。

```bash
export CLAUDE_CODE_ADDITIONAL_PROTECTION="1"
```

### CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK ✅
禁用命令注入安全检查（Haiku preflight）。**加速 bash 命令执行，但降低安全性**。

```bash
export CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK="1"
```
**来源**: 源码验证

---

## 界面和显示

### CLAUDE_CODE_FORCE_FULL_LOGO ⚠️
强制显示完整 logo。

```bash
export CLAUDE_CODE_FORCE_FULL_LOGO="1"
```

---

## 上下文和内存管理

### CLAUDE_CODE_CONTEXT_LIMIT ⚠️
自定义上下文窗口限制。

```bash
export CLAUDE_CODE_CONTEXT_LIMIT="150000"
```

### DISABLE_MICROCOMPACT ✅
禁用微压缩（将大工具输出卸载到磁盘）。

```bash
export DISABLE_MICROCOMPACT="1"
```
**来源**: GitHub Issue #7176

---

## 远程和 IDE 集成

### CLAUDE_CODE_SSE_PORT ⚠️
Server-Sent Events 通信端口。

```bash
export CLAUDE_CODE_SSE_PORT="8080"
```

---

## 调试和日志

### CLAUDE_CODE_PROFILE_STARTUP ⚠️
启用启动性能分析。

```bash
export CLAUDE_CODE_PROFILE_STARTUP="1"
```

---

## Hooks 和插件

### CLAUDE_ENV_FILE ✅
SessionStart hook 专用。用于持久化环境变量。

```bash
# 在 hook 脚本中使用
echo "export MY_VAR=value" >> "$CLAUDE_ENV_FILE"
```
**来源**: plugin-dev hook-development skill

---

## 功能开关

### CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION ⚠️
启用提示建议功能。

```bash
export CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION="1"
```

### CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT ⚠️
启用 token 使用量附件。

```bash
export CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT="1"
```

---

## MCP 配置

### ENABLE_EXPERIMENTAL_MCP_CLI ⚠️
启用实验性 MCP CLI 功能。

```bash
export ENABLE_EXPERIMENTAL_MCP_CLI="1"
```

### ENABLE_MCP_CLI ⚠️
启用 MCP CLI。

```bash
export ENABLE_MCP_CLI="1"
```

### ENABLE_MCP_CLI_ENDPOINT ⚠️
启用 MCP CLI 端点。

```bash
export ENABLE_MCP_CLI_ENDPOINT="1"
```

### ENABLE_MCP_LARGE_OUTPUT_FILES ⚠️
允许 MCP 输出大文件。

```bash
export ENABLE_MCP_LARGE_OUTPUT_FILES="1"
```

### MCP_CONNECTION_NONBLOCKING ⚠️
非阻塞 MCP 连接。

```bash
export MCP_CONNECTION_NONBLOCKING="1"
```

### MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE ⚠️
远程 MCP 服务器连接批量大小。

```bash
export MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE="5"
```

### MCP_SERVER_CONNECTION_BATCH_SIZE ⚠️
MCP 服务器连接批量大小。

```bash
export MCP_SERVER_CONNECTION_BATCH_SIZE="10"
```

---

## 命令禁用

### DISABLE_AUTO_MIGRATE_TO_NATIVE ✅
禁用自动迁移到原生版本的提示。

**默认值**: 未设置（自动迁移功能启用）
**禁用方式**: 设置为 `"1"`, `"true"`, `"yes"`, 或 `"on"`

内部使用 `a1()` truthy 检查函数：
- 未设置/空值 → false → 迁移提示启用
- 设置为 truthy 值 → true → 迁移提示禁用

```bash
export DISABLE_AUTO_MIGRATE_TO_NATIVE="1"
```
**来源**: cli.js 源码验证

### DISABLE_EXTRA_USAGE_COMMAND ⚠️
禁用额外的 usage 命令。

```bash
export DISABLE_EXTRA_USAGE_COMMAND="1"
```

---

## 性能和限制

### CLAUDE_CODE_EFFORT_LEVEL ⚠️
Opus 4.5 的 effort 参数（low/medium/high）。控制 token 使用量和响应深度。

```bash
export CLAUDE_CODE_EFFORT_LEVEL="medium"
```
**来源**: GitHub Issue #12376（功能请求）

### CLAUDE_CODE_LOOPY_MODE ⚠️
循环模式（具体含义未知，可能与迭代行为相关）。

```bash
export CLAUDE_CODE_LOOPY_MODE="1"
```

### CLAUDE_CODE_MAX_RETRIES ⚠️
请求失败时的最大重试次数。

```bash
export CLAUDE_CODE_MAX_RETRIES="3"
```

### CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY ⚠️
工具使用的最大并发数。

```bash
export CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY="5"
```

### MAX_STRUCTURED_OUTPUT_RETRIES ⚠️
结构化输出的最大重试次数。

```bash
export MAX_STRUCTURED_OUTPUT_RETRIES="3"
```

---

## 文件和附件

### CLAUDE_CODE_DISABLE_ATTACHMENTS ⚠️
禁用附件功能。

```bash
export CLAUDE_CODE_DISABLE_ATTACHMENTS="1"
```

### CLAUDE_CODE_DISABLE_CLAUDE_MDS ⚠️
禁用 CLAUDE.md 文件加载。

```bash
export CLAUDE_CODE_DISABLE_CLAUDE_MDS="1"
```

### CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING ⚠️
禁用文件检查点功能。

```bash
export CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING="1"
```

### CLAUDE_CODE_USE_NATIVE_FILE_SEARCH ⚠️
使用原生文件搜索。

```bash
export CLAUDE_CODE_USE_NATIVE_FILE_SEARCH="1"
```

---

## 容器和沙箱

### CLAUDE_CODE_BUBBLEWRAP ⚠️
使用 Bubblewrap 沙箱。

```bash
export CLAUDE_CODE_BUBBLEWRAP="1"
```

### CLAUDE_CODE_CONTAINER_ID ⚠️
容器 ID 标识。

```bash
export CLAUDE_CODE_CONTAINER_ID="container-123"
```

### CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE ⚠️
覆盖阻塞限制。

```bash
export CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE="100"
```

---

## 内部/实验性

### CLAUDE_CODE_ENTRYPOINT ⚠️
自定义入口点。用于特殊部署场景。

```bash
export CLAUDE_CODE_ENTRYPOINT="sdk-py"
```
**来源**: claude-agent-sdk-python

### CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION ⚠️
环境运行器版本。

```bash
export CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION="1.0.0"
```

### CLAUDE_CODE_EXTRA_BODY ⚠️
API 请求的额外 JSON 数据。

```bash
export CLAUDE_CODE_EXTRA_BODY='{"custom_field": "value"}'
```

### CLAUDE_CODE_GIT_BASH_PATH ⚠️
Windows 上 Git Bash 可执行文件路径。

```bash
export CLAUDE_CODE_GIT_BASH_PATH="C:\\Program Files\\Git\\bin\\bash.exe"
```

### CLAUDE_CODE_TAGS ⚠️
自定义标签。

```bash
export CLAUDE_CODE_TAGS="dev,experimental"
```

### CLAUDE_CODE_TEST_FIXTURES_ROOT ⚠️
测试 fixtures 根目录。

```bash
export CLAUDE_CODE_TEST_FIXTURES_ROOT="/path/to/fixtures"
```

### CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR ⚠️
WebSocket 认证文件描述符。

```bash
export CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR="4"
```

---

## Plan 模式

### CLAUDE_CODE_PLAN_V2_AGENT_COUNT ⚠️
Plan V2 模式的 agent 数量。

```bash
export CLAUDE_CODE_PLAN_V2_AGENT_COUNT="3"
```

### CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT ⚠️
Plan V2 模式的 explore agent 数量。

```bash
export CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT="2"
```

---

## 调查和反馈

### CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY ⚠️
禁用反馈调查。

```bash
export CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY="1"
```

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

---

*最后更新: 2026-01-24*
*基于 Claude Code v2.1.x*
