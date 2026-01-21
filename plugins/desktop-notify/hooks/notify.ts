#!/usr/bin/env bun
/**
 * Desktop Notify - WebSocket-based notification system
 *
 * Usage:
 *   Server mode: bun notify.ts --serve
 *   Client mode: echo '{"cwd":"/path/to/project"}' | bun notify.ts Stop
 */

import { spawn } from "bun";

const PORT = Number(process.env.CC_NOTIFY_PORT) || 9998;
const TOPIC = "notify";

// ============================================================================
// Message Formatting
// ============================================================================

interface HookInput {
  cwd?: string;
  transcript_path?: string;
  hook_event_name?: string;
}

interface NotifyMessage {
  title: string;
  text: string;
}

async function extractLastAssistantMessage(transcriptPath?: string): Promise<string> {
  if (!transcriptPath) return "";

  try {
    const file = Bun.file(transcriptPath);
    const content = await file.text();
    const lines = content.trim().split("\n");

    // Find the last assistant message (JSONL format)
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === "assistant" && entry.message?.content) {
          // Extract text from content blocks
          const textParts = entry.message.content
            .filter((block: { type: string }) => block.type === "text")
            .map((block: { text: string }) => block.text)
            .join(" ");

          if (textParts) {
            // Clean up and truncate
            let text = textParts
              .replace(/<[^>]+>/g, "")        // remove HTML/XML tags
              .replace(/\s+/g, " ")            // normalize whitespace
              .replace(/[#*`_\[\]]/g, "")      // remove markdown
              .trim();

            // Windows notification limit
            if (text.length > 120) {
              text = text.slice(0, 117) + "...";
            }
            return text;
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File read error
  }

  return "";
}

function formatMessage(project: string, hookType: string, messageText: string): NotifyMessage {
  const isStop = hookType === "Stop";
  const icon = isStop ? "✓" : "⏳";
  const title = `${icon} ${project}`;

  // Use extracted message or fallback
  const text = messageText || (isStop ? "任务完成" : "等待输入");

  return { title, text };
}

function extractProjectName(cwd?: string): string {
  if (!cwd) return "claude";
  const parts = cwd.split(/[/\\]/);
  return parts[parts.length - 1] || "claude";
}

// ============================================================================
// HTML Page
// ============================================================================

const HTML = `<!DOCTYPE html>
<html>
<head>
  <title>cc notify</title>
  <meta charset="utf-8">
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
    .container { text-align: center; }
    #status { font-size: 14px; padding: 8px 16px; border-radius: 4px; }
    #status.connected { color: #4a4; background: #1a2a1a; }
    #status.disconnected { color: #a44; background: #2a1a1a; }
    #log {
      margin-top: 20px;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
      text-align: left;
      padding: 10px;
      background: #252525;
      border-radius: 4px;
      min-width: 300px;
    }
    .buttons { margin-top: 15px; }
    button {
      padding: 8px 16px;
      margin: 0 5px;
      cursor: pointer;
      border: 1px solid #444;
      background: #333;
      color: #ccc;
      border-radius: 4px;
    }
    button:hover { background: #444; }
  </style>
</head>
<body>
  <div class="container">
    <h2 style="color:#888">cc notify</h2>
    <div id="status" class="disconnected">Connecting...</div>
    <div class="buttons">
      <button onclick="requestPerm()">Request Permission</button>
      <button onclick="testNotif()">Test Notification</button>
    </div>
    <div id="log"></div>
  </div>
  <script>
    const status = document.getElementById('status');
    const log = document.getElementById('log');
    const addLog = (msg) => {
      log.innerHTML = '<div>' + new Date().toLocaleTimeString() + ' ' + msg + '</div>' + log.innerHTML;
    };

    function requestPerm() {
      Notification.requestPermission().then(p => {
        addLog('Permission: ' + p);
        if (p === 'granted') {
          new Notification('cc notify', { body: 'Notifications enabled!' });
        }
      });
    }

    function testNotif() {
      if (Notification.permission === 'granted') {
        new Notification('cc notify', { body: 'Test notification' });
        addLog('Test notification sent');
      } else {
        alert('Permission not granted. Click "Request Permission" first.');
      }
    }

    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(protocol + '//' + location.host + '/ws');

      ws.onopen = () => {
        status.textContent = '● Listening';
        status.className = 'connected';
        addLog('Connected');
      };

      ws.onmessage = (e) => {
        addLog('Received: ' + e.data);
        if (Notification.permission === 'granted') {
          try {
            const data = JSON.parse(e.data);
            new Notification('Claude Code', {
              body: data.text || e.data,
              tag: 'cc-notify'
            });
          } catch {
            new Notification('Claude Code', { body: e.data, tag: 'cc-notify' });
          }
        }
      };

      ws.onclose = () => {
        status.textContent = '○ Reconnecting...';
        status.className = 'disconnected';
        addLog('Disconnected, reconnecting in 3s...');
        setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
      };
    }

    // Auto-request permission on load
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => addLog('Permission: ' + p));
    }

    connect();
  </script>
</body>
</html>`;

// ============================================================================
// Server Mode
// ============================================================================

function serverMode() {
  const server = Bun.serve({
    port: PORT,
    fetch(req, srv) {
      const url = new URL(req.url);

      if (url.pathname === "/") {
        return new Response(HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      if (url.pathname === "/health") {
        return new Response("ok");
      }

      if (url.pathname === "/ws") {
        const upgraded = srv.upgrade(req);
        if (upgraded) return undefined;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      if (url.pathname === "/notify" && req.method === "POST") {
        return req.text().then((body) => {
          const msg = body || JSON.stringify({ text: "Notification" });
          const count = srv.publish(TOPIC, msg);
          console.log(`[${new Date().toISOString()}] Sent to ${count} clients: ${msg}`);
          return new Response(`sent to ${count} clients`);
        });
      }

      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      open(ws) {
        ws.subscribe(TOPIC);
        console.log(`[${new Date().toISOString()}] Client connected`);
      },
      message(_ws, message) {
        console.log(`[${new Date().toISOString()}] Received:`, message);
      },
      close(_ws) {
        console.log(`[${new Date().toISOString()}] Client disconnected`);
      },
    },
  });

  console.log(`
╔══════════════════════════════════════════════════╗
║  cc notify server                                ║
╠══════════════════════════════════════════════════╣
║  Open in browser: http://localhost:${PORT}         ║
║  Health check:    http://localhost:${PORT}/health  ║
╚══════════════════════════════════════════════════╝
`);
}

// ============================================================================
// Client Mode
// ============================================================================

async function clientMode() {
  const hookType = process.argv[2] || "Stop";

  // Read hook input from stdin
  let input: HookInput = {};
  try {
    const text = await Bun.stdin.text();
    if (text.trim()) {
      input = JSON.parse(text);
    }
  } catch {
    // Ignore parse errors, use defaults
  }

  const project = extractProjectName(input.cwd);
  const messageText = await extractLastAssistantMessage(input.transcript_path);
  const message = formatMessage(project, hookType, messageText);

  // Check if server is running
  const alive = await fetch(`http://localhost:${PORT}/health`)
    .then((r) => r.ok)
    .catch(() => false);

  // Start server if not running
  if (!alive) {
    console.log("Starting notify server...");
    spawn(["bun", import.meta.path, "--serve"], {
      detached: true,
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    });
    // Wait for server to start
    await Bun.sleep(800);
  }

  // Send notification
  const res = await fetch(`http://localhost:${PORT}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  }).catch((e) => ({ ok: false, text: () => e.message }));

  if (res.ok) {
    console.log(`Notified: ${message.text}`);
  } else {
    console.error("Failed to send notification");
  }
}

// ============================================================================
// Entry Point
// ============================================================================

if (process.argv.includes("--serve")) {
  serverMode();
} else {
  clientMode();
}
