# Design: Simplify Desktop Notify

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Container / WSL                                         │
│                                                          │
│  ┌──────────────┐       ┌─────────────────────────────┐ │
│  │ Claude Code  │       │     notify.ts               │ │
│  │              │       │                             │ │
│  │ Stop hook ───┼──────▶│  Client Mode:               │ │
│  │              │       │  1. Read stdin JSON         │ │
│  │ Notification │       │  2. Check /health           │ │
│  │ hook ────────┼──────▶│  3. Spawn server if needed  │ │
│  │              │       │  4. POST /notify            │ │
│  └──────────────┘       │                             │ │
│                         │  Server Mode (--serve):     │ │
│                         │  - GET / → HTML page        │ │
│                         │  - GET /health → "ok"       │ │
│                         │  - GET /ws → WebSocket      │ │
│                         │  - POST /notify → broadcast │ │
│                         └──────────────┬──────────────┘ │
└────────────────────────────────────────┼────────────────┘
                                         │ :9999
                                         │ (auto port mapping)
                                         ▼
┌─────────────────────────────────────────────────────────┐
│  Host OS (Windows/Mac/Linux)                             │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Browser Tab: http://localhost:9999                  │ │
│  │                                                      │ │
│  │  WebSocket('/ws')                                     │ │
│  │       │                                              │ │
│  │       ▼                                              │ │
│  │  onmessage → new Notification(...)                   │ │
│  │                                                      │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### notify.ts - Dual Mode Script

**Client Mode (default):**
```typescript
// 入口点：无 --serve 参数时
async function clientMode() {
  // 1. 读取 hook stdin
  const input = await Bun.stdin.json().catch(() => ({}));
  const project = input.cwd ? path.basename(input.cwd) : "claude";
  const hookType = process.argv[2] || "Stop";

  // 2. 健康检查
  const alive = await fetch("http://localhost:9999/health")
    .then(r => r.ok)
    .catch(() => false);

  // 3. 按需启动服务器
  if (!alive) {
    Bun.spawn(["bun", import.meta.path, "--serve"], {
      detached: true,
      stdout: "ignore",
      stderr: "ignore",
    });
    await Bun.sleep(500); // 等待服务器启动
  }

  // 4. 发送通知
  await fetch("http://localhost:9999/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, type: hookType }),
  });
}
```

**Server Mode (--serve):**
```typescript
// 入口点：有 --serve 参数时
function serverMode() {
  const clients = new Set<ReadableStreamController>();

  Bun.serve({
    port: Number(process.env.CC_NOTIFY_PORT) || 9999,
    fetch(req) {
      const url = new URL(req.url);

      switch (url.pathname) {
        case "/":
          return new Response(HTML, {
            headers: { "Content-Type": "text/html" }
          });

        case "/health":
          return new Response("ok");

        case "/events":
          return new Response(
            new ReadableStream({
              start(controller) { clients.add(controller); },
              cancel() { clients.delete(controller); },
            }),
            { headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            }}
          );

        case "/notify":
          if (req.method === "POST") {
            req.json().then(data => {
              const msg = formatMessage(data);
              for (const c of clients) {
                c.enqueue(`data: ${JSON.stringify(msg)}\n\n`);
              }
            });
            return new Response("sent");
          }
          break;
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log("Notify server listening on :9999");
}
```

### HTML Page (Embedded)

```html
<!DOCTYPE html>
<html>
<head>
  <title>cc notify</title>
  <style>
    body {
      font-family: system-ui;
      display: grid;
      place-items: center;
      height: 100vh;
      margin: 0;
      background: #1a1a1a;
      color: #666;
    }
    #status { font-size: 14px; }
    #status.connected { color: #4a4; }
    #log {
      margin-top: 20px;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <div>
    <div id="status">Connecting...</div>
    <div id="log"></div>
  </div>
  <script>
    const status = document.getElementById('status');
    const log = document.getElementById('log');

    // 请求通知权限
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // 连接 SSE
    const es = new EventSource('/events');

    es.onopen = () => {
      status.textContent = '● Listening';
      status.className = 'connected';
    };

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      new Notification('Claude Code', {
        body: data.text,
        icon: data.icon,
        tag: 'cc-notify', // 同 tag 会替换旧通知
      });
      log.innerHTML = `<div>${new Date().toLocaleTimeString()} - ${data.text}</div>` + log.innerHTML;
    };

    es.onerror = () => {
      status.textContent = '○ Disconnected - Reconnecting...';
      status.className = '';
    };
  </script>
</body>
</html>
```

## Message Format

```typescript
interface NotifyPayload {
  project: string;  // 从 cwd 提取的项目名
  type: "Stop" | "Notification";
}

interface NotifyMessage {
  text: string;  // "cc: prompts - ✓ 完成"
  icon: string;  // "✓" or "⏳"
}

function formatMessage(payload: NotifyPayload): NotifyMessage {
  const isStop = payload.type === "Stop";
  return {
    text: `cc: ${payload.project} - ${isStop ? "✓ 完成" : "⏳ 等待输入"}`,
    icon: isStop ? "✓" : "⏳",
  };
}
```

## Configuration

### Environment Variables

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CC_NOTIFY_PORT` | `9999` | 服务器监听端口 |

### hooks.json

```json
{
  "description": "桌面通知 - SSE 推送到浏览器",
  "hooks": {
    "Stop": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/notify.ts Stop",
        "timeout": 3
      }]
    }],
    "Notification": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bun ${CLAUDE_PLUGIN_ROOT}/hooks/notify.ts Notification",
        "timeout": 3
      }]
    }]
  }
}
```

## Trade-offs

### 选择 Bun 而非其他

| 选项 | 优点 | 缺点 |
|------|------|------|
| **Bun** ✓ | 快速启动、内置 HTTP、单文件 | 需安装 Bun |
| Node.js | 更普及 | 需要依赖包、启动慢 |
| Go binary | 零依赖 | 需编译、跨平台构建 |
| Python | 普及 | http.server 功能有限 |

**决定：** 用户已有 Bun（见 CLAUDE.md），启动快（<100ms），内置所有需要的 API。

### 选择 WebSocket 而非 SSE

| 选项 | 优点 | 缺点 |
|------|------|------|
| SSE | 简单、自动重连 | Bun 1.3.6 中 ReadableStream 不稳定，AbortError 崩溃 |
| **WebSocket** ✓ | Bun 原生 pub/sub、稳定 | 需手动重连（已实现） |

**决定：** 测试发现 SSE 在 Bun 中不稳定，WebSocket pub/sub 是 Bun 原生支持，更可靠。

### 选择浏览器通知而非系统托盘

| 选项 | 优点 | 缺点 |
|------|------|------|
| **Web Notification** ✓ | 跨平台、无需安装 | 需要浏览器 tab |
| System tray app | 原生体验 | 需要编译 GUI 程序 |

**决定：** 浏览器方案更轻量，满足需求。

## Error Handling

1. **Bun 未安装** → Hook 失败，不影响 Claude Code 主流程
2. **端口被占用** → 服务启动失败，通过 /health 检测，不重复启动
3. **浏览器 tab 关闭** → 通知不可达，SSE 客户端列表自动清理
4. **网络问题** → SSE 自动重连（EventSource 内置行为）

## File Structure

```
plugins/desktop-notify/
├── .claude-plugin/
│   └── plugin.json
└── hooks/
    ├── hooks.json
    └── notify.ts      # ~100 行，包含内嵌 HTML
```

删除旧文件：`notify.sh`
