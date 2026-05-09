# SDK Spike — OpenCode plugin 接口探针

时间：2026-05-09  
范围：`@opencode-ai/plugin` 1.4.3 / `oc-tweaks` 0.9.0。证据来自本仓库源码、安装在 `packages/oc-tweaks/node_modules/` 下的 SDK type，以及本地 `bun -e` 最小探针。凡未进入真实 OpenCode 主进程触发链路的结论，均标注为「未实测，仅 type 层推断」或「最小探针」。

## 1. `experimental.chat.system.transform` 入参出参真实形状

### 实测命令/代码片段

```bash
cd /mnt/d/code/prompts/packages/oc-tweaks
bun -e 'import { tool } from "@opencode-ai/plugin"; const plugin = async () => ({ "experimental.chat.system.transform": async (hookInput, output) => { console.log("TRANSFORM_INPUT", JSON.stringify(hookInput)); console.log("TRANSFORM_OUTPUT_BEFORE", JSON.stringify(output)); output.system.push("SYSTEM_APPEND"); console.log("TRANSFORM_OUTPUT_AFTER", JSON.stringify(output)); } }); const hooks = await plugin(); await hooks["experimental.chat.system.transform"]({ sessionID: "s1", model: { providerID: "anthropic", id: "claude", name: "Claude" } }, { system: ["BASE"] });'
```

静态证据：

- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:233-238` 定义 `experimental.chat.system.transform`：`input` 为 `{ sessionID?: string; model: Model }`，`output` 为 `{ system: string[] }`。
- `packages/oc-tweaks/src/plugins/auto-memory.ts:164-203` 当前实现将 memory guide 作为字符串 `output.system.push(...)` 注入。
- `packages/oc-tweaks/src/plugins/background-subagent.ts:95-101` 另一个现有实现同样向 `output.system.push(SUB_AGENT_DISPATCH_PROMPT)` 注入字符串。

### 实际输出

```text
TRANSFORM_INPUT {"sessionID":"s1","model":{"providerID":"anthropic","id":"claude","name":"Claude"}}
TRANSFORM_OUTPUT_BEFORE {"system":["BASE"]}
TRANSFORM_OUTPUT_AFTER {"system":["BASE","SYSTEM_APPEND"]}
```

### 结论（能/不能/降级方案）

- 能：V1 可把 memory 指令写入 `experimental.chat.system.transform` 的 `output.system: string[]`。
- 不能确认：该 hook 不是 messages 数组级接口；`system.transform` 自身没有 `messages` 入参，也没有 `role` 字段。messages 结构在另一个 hook：`experimental.chat.messages.transform`，见 `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:227-232`。
- 降级方案：若未来 `system.transform` 不可用，改用 `experimental.chat.messages.transform` 注入 synthetic text part，但这一路径对「伪 system」效果未实测。

## 2. `role=user` + `isMeta=true` + `<system-reminder>` 伪 system 提示

### 实测命令/代码片段

同一 `bun -e` 探针同时测试两种写法：

```ts
output.system.push(JSON.stringify({
  role: "user",
  isMeta: true,
  content: "<system-reminder>probe</system-reminder>",
}))

output.messages.push({
  info: { id: "probe-user", sessionID: "s1", role: "user", time: { created: 1 } },
  parts: [{
    id: "part1",
    sessionID: "s1",
    messageID: "probe-user",
    type: "text",
    text: "<system-reminder>probe</system-reminder>",
    synthetic: true,
    metadata: { isMeta: true },
  }],
})
```

静态证据：

- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:227-232` 的 messages transform 输出是 `{ messages: { info: Message; parts: Part[] }[] }`。
- `packages/oc-tweaks/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts:142-156` 的 `TextPart` 支持 `synthetic?: boolean` 与 `metadata?: { [key: string]: unknown }`。
- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:233-238` 的 system transform 只支持 `system: string[]`，不支持 `role` / `isMeta` 结构化字段。

### 实际输出

```text
TRANSFORM_OUTPUT_AFTER {"system":["BASE","SYSTEM_APPEND","{\"role\":\"user\",\"isMeta\":true,\"content\":\"<system-reminder>probe</system-reminder>\"}"]}
MESSAGES_OUTPUT_AFTER {"messages":[{"info":{"id":"m1","sessionID":"s1","role":"user","time":{"created":1}},"parts":[{"id":"p1","sessionID":"s1","messageID":"m1","type":"text","text":"hello"}]},{"info":{"id":"probe-user","sessionID":"s1","role":"user","time":{"created":1}},"parts":[{"id":"part1","sessionID":"s1","messageID":"probe-user","type":"text","text":"<system-reminder>probe</system-reminder>","synthetic":true,"metadata":{"isMeta":true}}]}]}
```

### 结论（能/不能/降级方案）

- 能：最小探针能把 `role=user` message 与 `<system-reminder>` text part 放进 `experimental.chat.messages.transform` 的 `output.messages`。
- 不能确认：未在真实 OpenCode 主进程里验证该 message 会被模型当作 Claude Code 风格 `isMeta` system-reminder；SDK type 也没有在 `Message.info` 上暴露 `isMeta` 字段。
- V1 结论：不要选择 `role=user + isMeta=true` 作为主注入位置；选择 `experimental.chat.system.transform` 的 `output.system.push(string)`。
- 降级方案：若必须模拟 Claude Code system-reminder，可在 messages transform 中使用 `TextPart.synthetic=true` + `metadata.isMeta=true`，并明确标注为实验降级路径。

## 3. Custom tool 注册接口（recall tool 入口）

### 实测命令/代码片段

```ts
import { tool } from "@opencode-ai/plugin"

const hooks = {
  tool: {
    recall: tool({
      description: "Recall memory",
      args: { query: tool.schema.string() },
      async execute(args, context) {
        return JSON.stringify({ args, contextKeys: Object.keys(context).sort(), pid: process.pid })
      },
    }),
  },
}
```

静态证据：

- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:147-149` 定义 `Hooks.tool?: { [key: string]: ToolDefinition }`。
- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/tool.d.ts:33-45` 定义 `tool({ description, args, execute })` 与 `ToolContext`。
- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/tool.js:2-5` 运行时代码显示 `tool(input) { return input }` 且挂载 `tool.schema = z`。
- `packages/oc-tweaks/src/__tests__/auto-memory.test.ts:62-66` 证明当前 auto-memory hook 已注册 system/compacting，但没有注册 `tool`。
- `packages/oc-tweaks/scripts/smoke-test.ts:162` 也断言当前 `autoMemory` 不注册 custom tool。

### 实际输出

```text
TOOL_KEYS ["recall"]
TOOL_DEF {"description":"Recall memory","argKeys":["query"]}
TOOL_EXEC {"args":{"query":"pref"},"contextKeys":["abort","agent","ask","directory","messageID","metadata","sessionID","worktree"],"pid":87010}
```

### 结论（能/不能/降级方案）

- 能：V2/后续任务可在 plugin 返回对象上增加 `tool.recall = tool(...)` 注册 recall tool。
- 能：`execute` 可拿到 `sessionID`、`messageID`、`agent`、`directory`、`worktree`、`abort`、`metadata`、`ask`。
- 降级方案：如果工具入口不适合 V1，可继续沿用当前 `/remember` command 文件注入路径；当前实现创建 command 的证据是 `packages/oc-tweaks/src/plugins/auto-memory.ts:51-67`。

## 4. UI 通知通道：toast / status bar / stderr / 下条 system-reminder

### 实测命令/代码片段

本任务未在真实 TUI 中实测 toast/status bar。取证范围为 type、现有 notify 实现与测试：

```ts
// 当前 notify plugin
if (event?.type === "session.idle") {
  const message = await extractIdleMessage(client, sessionId)
  await sendToast(projectName, message, "Stop")
}
```

静态证据：

- `packages/oc-tweaks/src/plugins/notify.ts:19-68` 当前通知通道挂在 `event` hook，处理 `session.idle` 与 `session.error`。
- `packages/oc-tweaks/src/__tests__/notify.test.ts:183-205` 测试了无 shell notifier 时 fallback 到 `client.tui.showToast`。
- `packages/oc-tweaks/src/__tests__/notify.test.ts:225-236` 测试了没有 notifier 时静默降级且不抛错。
- `packages/oc-tweaks/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts:550-560` 定义事件 `tui.toast.show`，字段为 `title?`、`message`、`variant`、`duration?`。
- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/tui.d.ts:377-410` 显示 TUI plugin API 有 `command`、`route`、`ui`、`event`、`slots` 等入口；未在已读 type 中看到 server plugin 可直接写 status bar 的 hook。

### 实际输出

仓库测试/源码层输出摘录：

```text
packages/oc-tweaks/src/__tests__/notify.test.ts:203-205
// Bun.which returns null for all, falls back to tui
expect(toastCalls.length).toBe(1)

packages/oc-tweaks/src/__tests__/notify.test.ts:234-236
await expect(
  hooks.event({ event: { type: "session.error", properties: {} } }),
).resolves.toBeUndefined()
```

### 结论（能/不能/降级方案）

- 能：当前 server plugin 已可通过 shell notifier 或 `client.tui.showToast` 做 toast 类通知；这是已有实现与测试覆盖的通道。
- 未实测，仅 type 层推断：`tui.toast.show` 是事件类型，不等于 server plugin 可主动发 toast；真实主动发送仍以现有 `notify.ts` 的 shell/client.tui 路径为证据。
- 不能确认：status bar 写入通道未在 server plugin `Hooks` type 中找到；本 spike 不把 status bar 作为 V1 方案。
- Notify 通道降级序列：shell notifier（WPF/notify-send/osascript 等现有 detect 路径）→ `client.tui.showToast` → 静默 stderr/log → 下条 `system.transform` 内嵌 `<system-reminder>`。

## 5. hook 事件清单与触发时机

### 实测命令/代码片段

```ts
await hooks.event({ event: { type: "session.idle", properties: { sessionID: "s1" } } })
await hooks.event({ event: { type: "message.updated", properties: { info: { id: "m2", sessionID: "s1", role: "assistant" } } } })
await hooks["experimental.session.compacting"]({ sessionID: "s1" }, { context: [], prompt: "" })
```

静态证据：

- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:143-145` 定义通用 `event` hook。
- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:155-167` 定义 `chat.message` hook，注释为 “Called when a new message is received”。
- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:171-183` 定义 `chat.params` hook，注释为 “Modify parameters sent to LLM”。
- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:246-251` 定义 `experimental.session.compacting` hook；注释为 compaction 开始前调用，可追加 `context` 或替换 `prompt`。
- `packages/oc-tweaks/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts:413-424` 定义事件 `session.idle` 与 `session.compacted`。
- `packages/oc-tweaks/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts:129-134` 定义事件 `message.updated`。
- `packages/oc-tweaks/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts:602` 的 `Event` union 包含 `EventSessionIdle`、`EventSessionCompacted`、`EventMessageUpdated`；未出现 `chat.message` 作为 event type。
- `packages/oc-tweaks/scripts/smoke-test.ts:181-209` 现有 smoke 手动触发 `message.updated` 与 `session.idle`。

### 实际输出

```text
EVENT {"type":"session.idle","properties":{"sessionID":"s1"}}
EVENT {"type":"message.updated","properties":{"info":{"id":"m2","sessionID":"s1","role":"assistant"}}}
COMPACT_INPUT {"sessionID":"s1"}
COMPACT_OUTPUT {"context":["checkpoint"],"prompt":""}
```

### 结论（能/不能/降级方案）

- 能确认的 hook 名：`event`、`chat.message`、`chat.params`、`experimental.chat.messages.transform`、`experimental.chat.system.transform`、`experimental.session.compacting`、`tool.execute.before`、`tool.execute.after`、`tool.definition`。
- 能确认的 event type：`session.idle`、`session.compacted`、`message.updated`、`session.error`、`tui.toast.show` 等；`chat.message` 是 hook 名，不是 `Event.type`。
- 写入触发建议：V1 选择 `experimental.session.compacting` 作为 compaction 前 checkpoint 注入触发；显式保存仍走 `/remember` command 或未来 recall/write tool。`session.idle` 可做通知触发，不适合作为唯一写入触发。
- 降级方案：`experimental.session.compacting` → `chat.message`（新消息到达时轻提示）→ `session.idle`（空闲时通知）→ 显式 `/remember` command。

## 6. 插件运行进程模型

### 实测命令/代码片段

```ts
const parentPid = process.pid
const plugin = async () => ({
  pidCheck: async () => console.log("PID_CHECK", JSON.stringify({
    parentPid,
    currentPid: process.pid,
    sameProcess: parentPid === process.pid,
  })),
})
const hooks = await plugin(...)
await hooks.pidCheck()
```

静态证据：

- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:11-18` 的 `PluginInput` 直接提供 `client`、`project`、`directory`、`worktree`、`serverUrl`、`$`。
- `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:23` 定义 `Plugin = (input, options?) => Promise<Hooks>`，没有 worker/IPC 包装类型。
- `packages/oc-tweaks/src/plugins/auto-memory.ts:65-66` 当前插件初始化阶段直接 `mkdir` / `Bun.write` 创建 command 文件。
- `packages/oc-tweaks/src/plugins/auto-memory.ts:170-187` hook 内直接读目录与文件内容。

### 实际输出

```text
PID_CHECK {"parentPid":87010,"currentPid":87010,"sameProcess":true}
```

### 结论（能/不能/降级方案）

- 能：在本地 `bun -e` 最小加载模型中，插件 factory 与 hook 执行在同一进程，且可直接访问 `process.pid` 与 fs/Bun API。
- 未实测：真实 OpenCode 主进程是否另起 worker/插件宿主进程。本 spike 没有从 OpenCode runtime 进程树取证，因此不能把「与主进程同进程」写成事实。
- V1 决策：可在插件 hook 内直接 fs 写 memory，但必须保持当前 `safeHook` 风格，避免写入失败打断用户流程。
- 降级方案：如果真实运行时发现 worker/权限隔离，保留 `/remember` command + 内置 Write/Edit 工具路径，让 agent 自己执行持久化。

## 结论汇总表

| 决策点 | 结论 | 证据 | 降级序列 |
|---|---|---|---|
| 注入位置 | V1 选 `experimental.chat.system.transform` 的 `output.system.push(string)` | `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:233-238`；`packages/oc-tweaks/src/plugins/auto-memory.ts:164-203`；最小探针输出 `TRANSFORM_OUTPUT_AFTER {"system":[...]}` | `system.transform` → `messages.transform` synthetic text part → `/remember` command |
| Notify 通道 | V1 选现有 toast 路径：shell notifier 优先，`client.tui.showToast` 其次 | `packages/oc-tweaks/src/plugins/notify.ts:19-68`；`packages/oc-tweaks/src/__tests__/notify.test.ts:183-205` | shell notifier → `client.tui.showToast` → stderr/log 静默记录 → 下条 `system.transform` 内嵌 `<system-reminder>` |
| 写入触发 | V1 选 `experimental.session.compacting` 做 checkpoint/写入提醒；显式保存仍走 `/remember` command | `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:246-251`；`packages/oc-tweaks/src/plugins/auto-memory.ts:206-245`；探针输出 `COMPACT_OUTPUT {"context":["checkpoint"],...}` | `experimental.session.compacting` → `chat.message` → `session.idle` → 显式 `/remember` command |
| 伪 system-reminder | 不作为 V1 主路径；`role=user + isMeta=true` 未在真实 OpenCode runtime 验证 | `packages/oc-tweaks/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts:142-156` 仅支持 part `synthetic/metadata`；探针只能证明可 push message | system string 注入 → synthetic text part metadata → command 提醒 |
| Custom tool | 后续可注册 `tool.recall` | `packages/oc-tweaks/node_modules/@opencode-ai/plugin/dist/index.d.ts:147-149`；`tool.d.ts:33-45`；探针输出 `TOOL_KEYS ["recall"]` | custom tool → slash command → system 指令引导内置 Read/Edit/Write |
| 进程模型 | 最小探针同进程；真实 OpenCode 主进程模型未实测 | 探针输出 `PID_CHECK {"parentPid":87010,"currentPid":87010,"sameProcess":true}`；`Plugin = ... => Promise<Hooks>` type 无 worker 暴露 | 直接 fs 写 → safeHook 包裹 → `/remember` command + agent 内置写文件工具 |
