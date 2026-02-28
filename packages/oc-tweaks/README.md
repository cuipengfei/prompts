# oc-tweaks

[![npm version](https://img.shields.io/npm/v/oc-tweaks?color=a1b858&label=)](https://www.npmjs.com/package/oc-tweaks)

A collection of runtime enhancement plugins for [OpenCode](https://opencode.ai/).

## Introduction

`oc-tweaks` provides a set of plugins to enhance your OpenCode experience. These plugins are activated at runtime and can modify OpenCode's behavior, such as sending notifications, improving multi-language support, and enforcing best practices for sub-agent usage.

The currently available plugins are:
- **`notify`**: Sends desktop notifications when a task is completed or an error occurs, and can show WPF tool call transparency toasts (stack + queue).
- **`compaction`**: Injects a language preference prompt during session compaction to ensure summaries are in your preferred language.
- **`autoMemory`**: Smart memory assistant that injects memory context, detects memory trigger phrases, and supports active memory writes via `remember` tool and `/remember` command.
- **`backgroundSubagent`**: Adds a system prompt to encourage using background sub-agents for better responsiveness.
- **`leaderboard`**: Reports token usage to [claudecount.com](https://claudecount.com) for community leaderboards.

## Installation

Install the package from npm:
```bash
bun add oc-tweaks
# or
npm install oc-tweaks
```

Then, add it to your OpenCode configuration file (`~/.config/opencode/opencode.json`). Note the key is `plugin` (singular).

```json
{
  "plugin": ["oc-tweaks"]
}
```

## Quick Start

To generate a default configuration file, run the following command:

```bash
bunx oc-tweaks init
```

This will create `~/.config/opencode/oc-tweaks.json` with all plugins configured. You can edit this file to enable or disable plugins and customize their behavior.

## Configuration

All configurations are optional. By default, most plugins are enabled after running the `init` command.

### `notify`

This plugin sends desktop notifications upon task completion (session idle) or error.

It can also show **tool call transparency notifications** (WPF only) for each model tool invocation, including tool name and arguments, with vertical stacking and queueing (no drop).

- **Windows**: Uses a custom, non-intrusive WPF window that works across virtual desktops.
- **macOS**: Uses `osascript`.
- **Linux**: Uses `notify-send`.
- **Fallback**: Can use the built-in TUI toast if available.

**Configuration Options:**

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable or disable the plugin. |
| `notifyOnIdle` | boolean | `true` | Notify when a session becomes idle (task completion). |
| `notifyOnError` | boolean | `true` | Notify on session errors. |
| `command` | string | `null` | A custom command to run for notifications. `$TITLE` and `$MESSAGE` are available as placeholders. |
| `style` | object | `{...}` | Custom styles for the Windows WPF notification window. See below. |
| `toolCall` | object | `{...}` | Tool call transparency notification settings. See below. |

#### `notify.style` (Windows WPF)

Customize the appearance of the WPF notification window.

| Property | Default | Description |
|---|---|---|
| `backgroundColor` | `"#101018"` | Background color of the notification window. |
| `backgroundOpacity` | `0.95` | Background opacity (0 to 1). |
| `textColor` | `"#AAAAAA"` | Main text color. |
| `borderRadius` | `14` | Corner radius in pixels. |
| `colorBarWidth` | `5` | Width of the left accent bar in pixels. |
| `width` | `420` | Window width in pixels. |
| `height` | `105` | Window height in pixels. |
| `titleFontSize` | `14` | Font size for the title in points. |
| `contentFontSize` | `11` | Font size for the content in points. |
| `iconFontSize` | `30` | Font size for the icon (✅/❌) in points. |
| `duration` | `10000` | Time in milliseconds before the notification auto-closes. |
| `position` | `"center"` | Window position: `"center"`, `"top-right"`, or `"bottom-right"`. |
| `shadow` | `true` | Enable or disable the drop shadow effect. |
| `idleColor` | `"#4ADE80"` | Accent color for idle (success) notifications. |
| `errorColor` | `"#EF4444"` | Accent color for error notifications. |

#### `notify.toolCall` (Windows WPF)

Configure tool call transparency notifications. This feature is designed for visibility: every queued event is eventually shown.

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `false` | Enable tool call notifications. |
| `duration` | number | `3000` | Auto-close delay for each tool call toast (ms). |
| `position` | string | `"top-right"` | Window position: `"top-right"`, `"bottom-right"`, or `"center"`. |
| `maxVisible` | number | `3` | Maximum number of visible tool call toasts at the same time. |
| `maxArgLength` | number | `300` | Max characters for formatted argument JSON before truncation. |
| `filter.exclude` | string[] | `[]` | Tool names to skip (exact match). |

### `compaction`

This plugin ensures that when OpenCode compacts a session's context, the resulting summary is generated in your preferred language and writing style.

**Configuration Options:**

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable or disable the plugin. |
| `language` | string | session language | Target language for the compaction summary (e.g., `"繁体中文"`, `"French"`). Defaults to the language the user used most in the session. |
| `style` | string | `"concise and well-organized"` | Writing style for the compaction summary (e.g., `"毛泽东语言风格"`, `"academic"`). |

### `autoMemory`

This plugin provides an intelligent memory workflow:
- Injects global/project memory context into system prompt.
- Adds trigger phrases (Chinese + English) so the assistant remembers when to persist key information.
- Registers a custom `remember` tool for active memory writes.
- Creates `~/.config/opencode/commands/remember.md` automatically (if missing) so users can run `/remember` explicitly.

**Configuration Options:**

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable or disable the plugin. |

### `backgroundSubagent`

This plugin injects a policy into the system prompt, reminding the AI agent to use `run_in_background=true` by default when dispatching sub-agents. It helps maintain a responsive main conversation. If a foreground task is dispatched, a friendly reminder is shown.

**Configuration Options:**

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable or disable the plugin. |

### `leaderboard`

This plugin reports token usage statistics to the community-driven [claudecount.com](https://claudecount.com) leaderboard. It is disabled by default.

**Configuration Options:**

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `false` | Enable or disable the plugin. |
| `configPath` | string | `null` | Optional path to a custom `leaderboard.json` file. If not set, it searches standard locations (`~/.claude/leaderboard.json`, `~/.config/claude/leaderboard.json`). |

### `logging`

Configure logging for `oc-tweaks`.

**Configuration Options:**

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `false` | Enable writing logs to a file. |
| `maxLines` | number | `100` | Maximum number of lines to keep in the log file. Older lines are truncated. |

Logs are written to `~/.config/opencode/plugins/oc-tweaks.log`.

## Full Configuration Example

Here is an example of a `~/.config/opencode/oc-tweaks.json` file with all options shown.

```json
{
  "notify": {
    "enabled": true,
    "notifyOnIdle": true,
    "notifyOnError": true,
    // Example of a custom command to send notification to another machine via SSH
    // "command": "ssh my-desktop 'notify-send \"$TITLE\" \"$MESSAGE\"'",
    "style": {
      "backgroundColor": "#101018",
      "duration": 8000
    },
    "toolCall": {
      "enabled": true,
      "duration": 3000,
      "position": "top-right",
      "maxVisible": 3,
      "maxArgLength": 300,
      "filter": {
        "exclude": ["think_sequentialthinking"]
      }
    }
  },
  "compaction": {
    "enabled": true,
    "language": "繁体中文",
    "style": "毛泽东语言风格"
  },
  "autoMemory": {
    "enabled": true
  },
  "backgroundSubagent": {
    "enabled": true
  },
  "leaderboard": {
    "enabled": false
    // "configPath": "/path/to/my/leaderboard.json"
  },
  "logging": {
    "enabled": false,
    "maxLines": 200
  }
}
```

---

# oc-tweaks (中文)

[![npm version](https://img.shields.io/npm/v/oc-tweaks?color=a1b858&label=)](https://www.npmjs.com/package/oc-tweaks)

一套用于 [OpenCode](https://opencode.ai/) 的运行时增强插件。

## 简介

`oc-tweaks` 提供了一系列插件来增强你的 OpenCode 使用体验。这些插件在运行时激活，可以调整 OpenCode 的行为，例如发送桌面通知、改善多语言支持以及强制执行子代理使用的最佳实践。

目前可用的插件包括：
- **`notify`**: 在任务完成或发生错误时发送桌面通知，并支持 WPF 工具调用透明度弹窗（堆叠 + 排队）。
- **`compaction`**: 在会话上下文压缩期间注入语言偏好提示，以确保摘要使用你的首选语言。
- **`autoMemory`**: 智能记忆助手——自动注入 memory 上下文、识别触发词，并支持 `remember` tool 与 `/remember` 命令主动写入。
- **`backgroundSubagent`**: 添加系统提示，鼓励使用后台子代理以获得更好的响应性。
- **`leaderboard`**: 向 [claudecount.com](https://claudecount.com) 报告 token 用量，用于社区排行榜。

## 安装

通过 npm 安装该软件包：
```bash
bun add oc-tweaks
# 或
npm install oc-tweaks
```

然后，将其添加到你的 OpenCode 配置文件 (`~/.config/opencode/opencode.json`) 中。请注意，键是 `plugin` (单数)。

```json
{
  "plugin": ["oc-tweaks"]
}
```

## 快速开始

要生成默认配置文件，请运行以下命令：

```bash
bunx oc-tweaks init
```

这将在 `~/.config/opencode/oc-tweaks.json` 创建一个包含所有插件配置的文件。你可以编辑此文件来启用或禁用插件并自定义其行为。

## 配置说明

所有配置都是可选的。默认情况下，运行 `init` 命令后，大多数插件都是启用的。

### `notify`

此插件在任务完成（会话空闲）或出错时发送桌面通知。

它也支持**工具调用透明度通知**（仅 WPF）：每次模型调用工具都会显示工具名与参数，并支持垂直堆叠和排队（不丢通知）。

- **Windows**: 使用一个自定义的、无侵入性的 WPF 窗口，该窗口可跨虚拟桌面工作。
- **macOS**: 使用 `osascript`。
- **Linux**: 使用 `notify-send`。
- **备选方案**: 如果可用，可以使用内置的 TUI toast。

**配置选项:**

| 属性 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `enabled` | boolean | `true` | 启用或禁用此插件。 |
| `notifyOnIdle` | boolean | `true` | 当会话变为空闲时（任务完成）通知。 |
| `notifyOnError` | boolean | `true` | 在会话出错时通知。 |
| `command` | string | `null` | 用于发送通知的自定义命令。`$TITLE` 和 `$MESSAGE` 可作为占位符。 |
| `style` | object | `{...}` | 用于 Windows WPF 通知窗口的自定义样式。详见下文。 |
| `toolCall` | object | `{...}` | 工具调用透明度通知配置。详见下文。 |

#### `notify.style` (Windows WPF)

自定义 WPF 通知窗口的外观。

| 属性 | 默认值 | 描述 |
|---|---|---|
| `backgroundColor` | `"#101018"` | 通知窗口的背景颜色。 |
| `backgroundOpacity` | `0.95` | 背景不透明度 (0 到 1)。 |
| `textColor` | `"#AAAAAA"` | 主要文本颜色。 |
| `borderRadius` | `14` | 圆角半径 (像素)。 |
| `colorBarWidth` | `5` | 左侧强调色条的宽度 (像素)。 |
| `width` | `420` | 窗口宽度 (像素)。 |
| `height` | `105` | 窗口高度 (像素)。 |
| `titleFontSize` | `14` | 标题的字体大小 (pt)。 |
| `contentFontSize` | `11` | 内容的字体大小 (pt)。 |
| `iconFontSize` | `30` | 图标 (✅/❌) 的字体大小 (pt)。 |
| `duration` | `10000` | 通知自动关闭前的延迟时间 (毫秒)。 |
| `position` | `"center"` | 窗口位置: `"center"`, `"top-right"`, 或 `"bottom-right"`。 |
| `shadow` | `true` | 启用或禁用下拉阴影效果。 |
| `idleColor` | `"#4ADE80"` | 空闲 (成功) 通知的强调色。 |
| `errorColor` | `"#EF4444"` | 错误通知的强调色。 |

#### `notify.toolCall` (Windows WPF)

配置工具调用透明度通知。该能力以“可见性优先”为目标：进入队列的事件最终都会显示。

| 属性 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `enabled` | boolean | `false` | 启用工具调用通知。 |
| `duration` | number | `3000` | 每条工具调用弹窗自动关闭延迟（毫秒）。 |
| `position` | string | `"top-right"` | 窗口位置：`"top-right"`、`"bottom-right"` 或 `"center"`。 |
| `maxVisible` | number | `3` | 同时可见的工具调用弹窗最大数量。 |
| `maxArgLength` | number | `300` | 参数 JSON 格式化后截断前的最大字符数。 |
| `filter.exclude` | string[] | `[]` | 要跳过的工具名（精确匹配）。 |

### `compaction`

此插件确保当 OpenCode 压缩会话上下文时，生成的摘要使用你的首选语言和写作风格。

**配置选项:**

| 属性 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `enabled` | boolean | `true` | 启用或禁用此插件。 |
| `language` | string | 会话语言 | 压缩摘要的目标语言（如 `"繁体中文"`、`"French"`）。默认使用会话中用户最常使用的语言。 |
| `style` | string | `"concise and well-organized"` | 压缩摘要的写作风格（如 `"毛泽东语言风格"`、`"academic"`）。 |

### `autoMemory`

该插件提供智能记忆工作流：
- 自动把全局/项目 memory 上下文注入 system prompt。
- 内置中英文触发词，命中后优先执行记忆写入。
- 注册自定义 `remember` tool，支持 AI 主动写入 memory 文件。
- 自动创建 `~/.config/opencode/commands/remember.md`（若不存在），支持用户显式输入 `/remember`。

**配置选项:**

| 属性 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `enabled` | boolean | `true` | 启用或禁用此插件。 |

### `backgroundSubagent`

此插件向系统提示中注入一项策略，提醒 AI 代理在派发子代理时默认使用 `run_in_background=true`。这有助于保持主对话的响应性。如果派发了前台任务，则会显示一个友好的提醒。

**配置选项:**

| 属性 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `enabled` | boolean | `true` | 启用或禁用此插件。 |

### `leaderboard`

此插件向社区驱动的 [claudecount.com](https://claudecount.com) 排行榜报告 token 使用情况统计。默认禁用。

**配置选项:**

| 属性 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `enabled` | boolean | `false` | 启用或禁用此插件。 |
| `configPath` | string | `null` | 可选的自定义 `leaderboard.json` 文件路径。如果未设置，则会搜索标准位置 (`~/.claude/leaderboard.json`, `~/.config/claude/leaderboard.json`)。 |

### `logging`

为 `oc-tweaks` 配置日志记录。

**配置选项:**

| 属性 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `enabled` | boolean | `false` | 启用将日志写入文件。 |
| `maxLines` | number | `100` | 日志文件中保留的最大行数。旧行将被截断。 |

日志文件路径为 `~/.config/opencode/plugins/oc-tweaks.log`。

## 完整配置示例

这是一个 `~/.config/opencode/oc-tweaks.json` 文件的完整示例，展示了所有选项。

```json
{
  "notify": {
    "enabled": true,
    "notifyOnIdle": true,
    "notifyOnError": true,
    // 自定义命令示例：通过 SSH 向另一台机器发送通知
    // "command": "ssh my-desktop 'notify-send \"$TITLE\" \"$MESSAGE\"'",
    "style": {
      "backgroundColor": "#101018",
      "duration": 8000
    },
    "toolCall": {
      "enabled": true,
      "duration": 3000,
      "position": "top-right",
      "maxVisible": 3,
      "maxArgLength": 300,
      "filter": {
        "exclude": ["think_sequentialthinking"]
      }
    }
  },
  "compaction": {
    "enabled": true,
    "language": "繁体中文",
    "style": "毛泽东语言风格"
  },
  "autoMemory": {
    "enabled": true
  },
  "backgroundSubagent": {
    "enabled": true
  },
  "leaderboard": {
    "enabled": false
    // "configPath": "/path/to/my/leaderboard.json"
  },
  "logging": {
    "enabled": false,
    "maxLines": 200
  }
}
```
