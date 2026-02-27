import type { Plugin } from "@opencode-ai/plugin"

import { loadOcTweaksConfig, safeHook, log } from "../utils"
import type { LoggerConfig } from "../utils"
import type { NotifyStyle } from "../utils/config"

type ShellExecutor = (strings: TemplateStringsArray, ...values: any[]) => Promise<any>

type NotifySender =
  | { kind: "custom"; commandTemplate: string }
  | { kind: "wpf"; command: string }
  | { kind: "osascript" }
  | { kind: "notify-send" }
  | { kind: "tui"; showToast: (...args: any[]) => any }
  | { kind: "none" }

export const notifyPlugin: Plugin = async ({ $, directory, client }) => {
  // Cache the detected sender (system capability doesn't change at runtime)
  let cachedSender: NotifySender | null = null

  return {
    event: safeHook("notify:event", async ({ event }: { event: any }) => {
      const config = await loadOcTweaksConfig()
      if (!config || config.notify?.enabled !== true) return

      const logConfig = config.logging
      const notifyOnIdle = config.notify?.notifyOnIdle !== false
      const notifyOnError = config.notify?.notifyOnError !== false
      const configuredCommand =
        typeof config.notify?.command === "string" && config.notify.command.trim().length > 0
          ? config.notify.command.trim()
          : null
      const style = config.notify?.style

      const sender = configuredCommand
        ? ({ kind: "custom", commandTemplate: configuredCommand } as const)
        : (cachedSender ??= await detectNotifySender($ as ShellExecutor, client, logConfig))

      const sendToast = async (projectName: string, message: string, tag: string) => {
        const title = `oc: ${projectName}`
        await notifyWithSender($ as ShellExecutor, sender, title, message, tag, style, logConfig)
      }

      if (event?.type === "session.idle") {
        if (!notifyOnIdle) return

        const projectName = getProjectName(directory)
        const sessionId =
          (event.properties as { sessionID?: string; sessionId?: string } | undefined)
            ?.sessionID ??
          (event.properties as { sessionID?: string; sessionId?: string } | undefined)
            ?.sessionId

        const message = await extractIdleMessage(client, sessionId)
        await sendToast(projectName, message, "Stop")
        return
      }

      if (event?.type === "session.error") {
        if (!notifyOnError) return
        const projectName = getProjectName(directory)
        await sendToast(projectName, "❌ Session error", "Error")
      }
    }),
  }
}

function getProjectName(directory: string): string {
  const normalized = directory.replace(/\\/g, "/")
  const segments = normalized.split("/").filter(Boolean)
  return segments[segments.length - 1] || "opencode"
}

async function extractIdleMessage(client: any, sessionId?: string): Promise<string> {
  let message = "✓ Task completed"
  if (!sessionId || !client?.session?.messages) return message

  try {
    const result = await client.session.messages({ path: { id: sessionId } })
    const messages = result?.data
    if (!Array.isArray(messages)) return message

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i]
      if (msg?.info?.role !== "assistant" || !Array.isArray(msg?.parts)) continue
      for (const part of msg.parts) {
        if (part?.type === "text" && typeof part.text === "string") {
          message = `✓ ${truncateText(cleanMarkdown(part.text), 400)}`
          return message
        }
      }
    }

    return message
  } catch {
    return message
  }
}

async function detectNotifySender(
  $: ShellExecutor,
  client: any,
  logConfig?: LoggerConfig,
): Promise<NotifySender> {
  if (await commandExists($, "pwsh")) {
    return { kind: "wpf", command: "pwsh" }
  }

  if (await commandExists($, "powershell.exe")) {
    return { kind: "wpf", command: "powershell.exe" }
  }

  if (await commandExists($, "osascript")) {
    return { kind: "osascript" }
  }

  if (await commandExists($, "notify-send")) {
    return { kind: "notify-send" }
  }

  if (typeof client?.tui?.showToast === "function") {
    return { kind: "tui", showToast: client.tui.showToast }
  }

  await log(
    logConfig,
    "WARN",
    "[oc-tweaks] notify: no available notifier, set notify.command to override",
  )
  return { kind: "none" }
}

async function commandExists($: ShellExecutor, command: string): Promise<boolean> {
  try {
    await $`which ${command}`
    return true
  } catch {
    return false
  }
}

async function notifyWithSender(
  $: ShellExecutor,
  sender: NotifySender,
  title: string,
  message: string,
  tag: string,
  style?: NotifyStyle,
  logConfig?: LoggerConfig,
): Promise<void> {
  try {
    if (sender.kind === "custom") {
      const command = sender.commandTemplate
        .replace(/\$TITLE/g, title)
        .replace(/\$MESSAGE/g, message)
      await runCustomCommand($, command)
      return
    }

    if (sender.kind === "wpf") {
      await runWpfNotification($, sender.command, title, message, tag, style)
      return
    }

    if (sender.kind === "osascript") {
      const script = `display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}"`
      await $`osascript -e ${script}`
      return
    }

    if (sender.kind === "notify-send") {
      await $`notify-send ${title} ${message}`
      return
    }

    if (sender.kind === "tui") {
      await showToastWithFallback(sender.showToast, title, message)
    }
  } catch {
    // Notification flow must stay non-blocking.
  }
}

async function runCustomCommand($: ShellExecutor, command: string): Promise<void> {
  const escaped = command.replace(/"/g, '\\"')
  await $`bun -e ${`const { exec } = require("node:child_process"); exec("${escaped}")`}`
}

async function runWpfNotification(
  $: ShellExecutor,
  shellCommand: string,
  title: string,
  message: string,
  tag: string,
  style?: NotifyStyle,
): Promise<void> {
  const backgroundColor = style?.backgroundColor ?? "#101018"
  const backgroundOpacity = style?.backgroundOpacity ?? 0.95
  const textColor = style?.textColor ?? "#AAAAAA"
  const borderRadius = style?.borderRadius ?? 14
  const colorBarWidth = style?.colorBarWidth ?? 5
  const width = style?.width ?? 420
  const height = style?.height ?? 105
  const titleFontSize = style?.titleFontSize ?? 14
  const contentFontSize = style?.contentFontSize ?? 11
  const iconFontSize = style?.iconFontSize ?? 30
  const duration = style?.duration ?? 10000
  const position = style?.position ?? "center"
  const shadow = style?.shadow !== false
  const idleColor = style?.idleColor ?? "#4ADE80"
  const errorColor = style?.errorColor ?? "#EF4444"

  const accentColor = tag === "Error" ? errorColor : idleColor
  const icon = tag === "Error" ? "❌" : "✅"
  const startupLocation = position === "center" ? "CenterScreen" : position

  const psTitle = title.replace(/'/g, "''")
  const psText = truncateText(cleanMarkdown(message), 400).replace(/'/g, "''")

  const shadowXaml = shadow
    ? '<Border.Effect><DropShadowEffect BlurRadius="20" ShadowDepth="2" Opacity="0.7" Color="Black"/></Border.Effect>'
    : ""

  const xaml = [
    `<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"`,
    `        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"`,
    `        WindowStyle="None" AllowsTransparency="True" Background="Transparent"`,
    `        Topmost="True" ShowInTaskbar="False" ShowActivated="False"`,
    `        WindowStartupLocation="${startupLocation}"`,
    `        Width="${width}" Height="${height}">`,
    `    <Border CornerRadius="${borderRadius}" Margin="10">`,
    `        <Border.Background>`,
    `            <SolidColorBrush Color="${backgroundColor}" Opacity="${backgroundOpacity}"/>`,
    `        </Border.Background>`,
    `        ${shadowXaml}`,
    `        <Grid>`,
    `            <Border CornerRadius="${borderRadius},0,0,${borderRadius}" Width="${colorBarWidth}" HorizontalAlignment="Left" Name="ColorBar"/>`,
    `            <StackPanel Orientation="Horizontal" Margin="22,0,16,0" VerticalAlignment="Center">`,
    `                <TextBlock Name="IconText" FontSize="${iconFontSize}" VerticalAlignment="Center" Margin="0,0,15,0" Foreground="White"/>`,
    `                <StackPanel VerticalAlignment="Center" MaxWidth="320">`,
    `                    <TextBlock Name="TitleText" FontSize="${titleFontSize}" FontWeight="SemiBold"/>`,
    `                    <TextBlock Name="ContentText" Foreground="${textColor}" FontSize="${contentFontSize}" Margin="0,4,0,0" TextWrapping="Wrap"/>`,
    `                    <TextBlock Text="Click to dismiss" Foreground="#555555" FontSize="9" Margin="0,4,0,0"/>`,
    `                </StackPanel>`,
    `            </StackPanel>`,
    `        </Grid>`,
    `    </Border>`,
    `</Window>`,
  ].join("\n")

  const psScript = [
    "Add-Type -AssemblyName PresentationFramework",
    "Add-Type -AssemblyName PresentationCore",
    "Add-Type -AssemblyName WindowsBase",
    "",
    "Add-Type -TypeDefinition @'",
    "using System;",
    "using System.Runtime.InteropServices;",
    "",
    "public static class VDesktop {",
    '    [DllImport("user32.dll", SetLastError = true)]',
    "    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);",
    "",
    '    [DllImport("user32.dll", SetLastError = true)]',
    "    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);",
    "",
    "    public const int GWL_EXSTYLE = -20;",
    "    public const int WS_EX_TOOLWINDOW = 0x00000080;",
    "    public const int WS_EX_NOACTIVATE = 0x08000000;",
    "    public const int WS_EX_APPWINDOW = 0x00040000;",
    "",
    "    public static void MakeGlobalWindow(IntPtr hwnd) {",
    "        int style = GetWindowLong(hwnd, GWL_EXSTYLE);",
    "        style = style | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;",
    "        style = style & ~WS_EX_APPWINDOW;",
    "        SetWindowLong(hwnd, GWL_EXSTYLE, style);",
    "    }",
    "}",
    "'@ -ErrorAction SilentlyContinue",
    "",
    `$title = '${psTitle}'`,
    `$text = '${psText}'`,
    `$accentColor = '${accentColor}'`,
    `$icon = '${icon}'`,
    `$duration = ${duration}`,
    "",
    "[xml]$xaml = @'",
    xaml,
    "'@",
    "",
    "$reader = New-Object System.Xml.XmlNodeReader $xaml",
    "$window = [Windows.Markup.XamlReader]::Load($reader)",
    "",
    "$colorBar = $window.FindName('ColorBar')",
    "$iconText = $window.FindName('IconText')",
    "$titleText = $window.FindName('TitleText')",
    "$contentText = $window.FindName('ContentText')",
    "",
    "$colorBar.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString($accentColor)",
    "$iconText.Text = $icon",
    "$titleText.Text = $title",
    "$titleText.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString($accentColor)",
    "$contentText.Text = $text",
    "",
    "$window.Add_MouseLeftButtonDown({ $window.Close() })",
    "",
    "$window.Add_Loaded({",
    "    $hwnd = (New-Object System.Windows.Interop.WindowInteropHelper($window)).Handle",
    "    [VDesktop]::MakeGlobalWindow($hwnd)",
    "})",
    "",
    "if ($duration -gt 0) {",
    "    $timer = New-Object System.Windows.Threading.DispatcherTimer",
    "    $timer.Interval = [TimeSpan]::FromMilliseconds($duration)",
    "    $timer.Add_Tick({",
    "        $window.Close()",
    "        $timer.Stop()",
    "    })",
    "    $timer.Start()",
    "}",
    "",
    "$window.ShowActivated = $false",
    "$window.Show()",
    "$frame = New-Object System.Windows.Threading.DispatcherFrame",
    "$window.Add_Closed({ $frame.Continue = $false })",
    "[System.Windows.Threading.Dispatcher]::PushFrame($frame)",
  ].join("\n")

  const jsCode = [
    "const proc = require('node:child_process').spawn(",
    `  ${JSON.stringify(shellCommand)},`,
    `  ['-NoProfile', '-Command', ${JSON.stringify(psScript)}],`,
    "  { detached: true, stdio: 'ignore' }",
    ");",
    "proc.unref();",
  ].join("\n")

  await $`bun -e ${jsCode}`
}

async function showToastWithFallback(
  showToast: (...args: any[]) => any,
  title: string,
  message: string,
): Promise<void> {
  try {
    await Promise.resolve(showToast({ title, message }))
    return
  } catch {
    // Try alternative signatures below.
  }

  try {
    await Promise.resolve(showToast({ title, description: message }))
    return
  } catch {
    // Try alternative signatures below.
  }

  await Promise.resolve(showToast(title, message))
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}...`
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/[`*#]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}


function escapeAppleScript(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
}
