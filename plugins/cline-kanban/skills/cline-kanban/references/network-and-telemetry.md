# 网络行为与遥测

## 本地通信

runtime 使用 Node 原生 `http` + tRPC standalone handler，默认监听 `127.0.0.1:3484`。

| 端点 | 协议 | 用途 |
|------|------|------|
| `/api/trpc/*` | HTTP | tRPC API 入口（task/hooks/workspace 操作） |
| `/api/runtime/ws` | WebSocket | runtime 状态/事件推送 |
| `/api/terminal/io` | WebSocket | 终端 I/O 桥接 |
| `/api/terminal/control` | WebSocket | 终端控制 |
| `/auth/callback` | HTTP | OAuth 回调（临时监听） |

hooks `notify`/`ingest` 通过 HTTP POST 发送到本地 runtime 的 `/api/trpc` 端点，超时 3s。

---

## 外部网络请求

### 自动更新

每次启动时检查 npm registry 上的最新版本：

- **URL**：`https://registry.npmjs.org/kanban/latest`（或 `/nightly`）
- **方法**：GET，无请求体，2.5s 超时
- **更新方式**：检测到新版后 spawn detached 子进程执行 `npm install -g kanban@latest` 或 `bun add -g kanban@latest`
- **禁用**：`KANBAN_NO_AUTO_UPDATE=1`
- **自动禁用场景**：`CI=true`、`NODE_ENV=test`、`VITEST=true`

### Sentry 崩溃上报

- **目标**：`o4511098366263296.ingest.us.sentry.io`
- **DSN**：硬编码在源码中
- **发送内容**：异常堆栈、release 版本、environment tag
- **触发条件**：运行时异常
- **禁用**：⚠️ **无官方禁用开关**（无 env var、无 CLI flag、无 config 选项）
- `SENTRY_NODE_ENVIRONMENT` 仅控制 environment 标签，不是禁用开关

### OpenTelemetry

源码包含 OTEL 基础设施，构建时 bake 了以下变量：

| 变量 | 说明 |
|------|------|
| `OTEL_TELEMETRY_ENABLED` | 遥测总开关 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP 导出端点 |
| `OTEL_METRICS_EXPORTER` | metrics 导出器 |
| `OTEL_LOGS_EXPORTER` | logs 导出器 |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | 导出协议 |
| `OTEL_METRIC_EXPORT_INTERVAL` | 导出间隔 |
| `OTEL_EXPORTER_OTLP_HEADERS` | 导出请求头 |

默认 OTLP 端点指向 `localhost:4318`（HTTP）/ `localhost:4317`（gRPC），未确认是否默认对外发送。

### Provider API（按需触发）

仅在配置了对应 provider 时才会发起请求：

| Provider | 默认 Base URL |
|----------|---------------|
| OpenAI | `https://api.openai.com/v1` |
| Anthropic | `https://api.anthropic.com` |
| Gemini | `https://generativelanguage.googleapis.com` |
| Cline | `https://api.cline.bot/api/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Ollama | `http://localhost:11434/v1`（本地） |
| LM Studio | `http://localhost:1234/v1`（本地） |
| LiteLLM | `http://localhost:4000/v1`（本地） |

不配置 provider 即不触发任何外部 API 请求。

---

## 隐私小结

| 行为 | 默认开启？ | 可禁用？ |
|------|:---:|:---:|
| 自动更新检查 | 是 | ✅ `KANBAN_NO_AUTO_UPDATE=1` |
| Sentry 崩溃上报 | 是 | ❌ 无官方开关 |
| OTEL 遥测 | 未确认 | 可通过 OTEL 标准变量控制 |
| Provider API | 否（按需） | 不配置即不触发 |
| 本地 tRPC | 是 | 纯本地，无隐私风险 |