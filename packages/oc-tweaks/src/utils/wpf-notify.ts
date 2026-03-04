import type { LoggerConfig } from "./logger"
import { log } from "./logger"
import type { NotifyStyle } from "./config"
import { calculatePosition } from "./wpf-position"

export type ShellExecutor = (strings: TemplateStringsArray, ...values: any[]) => Promise<any>

export type NotifySender =
  | { kind: "custom"; commandTemplate: string }
  | { kind: "wpf"; command: string }
  | { kind: "osascript" }
  | { kind: "notify-send" }
  | { kind: "tui"; showToast: (...args: any[]) => any }
  | { kind: "none" }

export interface WpfToastPosition {
  startupLocation: "Manual" | "CenterScreen"
  leftExpr?: string
  topExpr?: string
}

export interface SendWpfToastOptions {
  $: ShellExecutor
  sender: NotifySender
  title: string
  message: string
  tag: string
  style?: NotifyStyle
  logConfig?: LoggerConfig
  position?: WpfToastPosition
  icon?: string
  accentColor?: string
  showDismissHint?: boolean
  maxMessageLength?: number
  preserveMessageFormatting?: boolean
}

export async function detectNotifySender(
  $: ShellExecutor,
  client: any,
  logConfig?: LoggerConfig,
): Promise<NotifySender> {
  const isWindows = (globalThis as any)?.process?.platform === "win32"

  if (isWindows && (await commandExists($, "pwsh"))) {
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

export async function notifyWithSender(
  $: ShellExecutor,
  sender: NotifySender,
  title: string,
  message: string,
  tag: string,
  style?: NotifyStyle,
  _logConfig?: LoggerConfig,
  position?: WpfToastPosition,
  renderOptions?: {
    icon?: string
    accentColor?: string
    showDismissHint?: boolean
    maxMessageLength?: number
    preserveMessageFormatting?: boolean
  },
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
      await runWpfNotification($, sender.command, title, message, tag, style, position, renderOptions)
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

export async function sendWpfToast(options: SendWpfToastOptions): Promise<void> {
  await notifyWithSender(
    options.$,
    options.sender,
    options.title,
    options.message,
    options.tag,
    options.style,
    options.logConfig,
    options.position,
    {
      icon: options.icon,
      accentColor: options.accentColor,
      showDismissHint: options.showDismissHint,
      maxMessageLength: options.maxMessageLength,
      preserveMessageFormatting: options.preserveMessageFormatting,
    },
  )
}

export function escapeForPowerShell(text: string): string {
  return Buffer.from(text, "utf8").toString("base64")
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}...`
}

export function cleanMarkdown(text: string): string {
  return text
    .replace(/[`*#]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function commandExists(_$: ShellExecutor, command: string): Promise<boolean> {
  return Bun.which(command) !== null
}

async function runCustomCommand($: ShellExecutor, command: string): Promise<void> {
  const escaped = command.replace(/"/g, '\\"')
  await $`bun -e ${`const { exec } = require("node:child_process"); exec("${escaped}")`}`
}

export async function runWpfNotification(
  $: ShellExecutor,
  shellCommand: string,
  title: string,
  message: string,
  tag: string,
  style?: NotifyStyle,
  position?: WpfToastPosition,
  renderOptions?: {
    icon?: string
    accentColor?: string
    showDismissHint?: boolean
    maxMessageLength?: number
    preserveMessageFormatting?: boolean
  },
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
  const stylePosition = style?.position ?? "center"
  const shadow = style?.shadow !== false
  const idleColor = style?.idleColor ?? "#4ADE80"
  const errorColor = style?.errorColor ?? "#EF4444"
  const fadeOut = style?.fadeOut !== false
  const initialOpacity = style?.initialOpacity ?? 0.85
  const finalOpacity = style?.finalOpacity ?? 0.05
  const clickThrough = style?.clickThrough !== false
  const hoverDismissMs = style?.hoverDismissMs ?? 400
  const contentMaxWidth = Math.max(160, width - 120)

  const accentColor = renderOptions?.accentColor ?? (tag === "Error" ? errorColor : idleColor)
  const icon = renderOptions?.icon ?? (tag === "Error" ? "❌" : "✅")
  const showDismissHint = renderOptions?.showDismissHint !== false
  const normalizedStylePosition =
    stylePosition === "top-right" || stylePosition === "bottom-right" || stylePosition === "center"
      ? stylePosition
      : "center"

  const resolvedPosition =
    position ??
    (normalizedStylePosition === "center"
      ? { startupLocation: "CenterScreen" as const }
      : calculatePosition(0, {
          position: normalizedStylePosition,
          width,
          height,
        }))

  const startupLocation = resolvedPosition.startupLocation

  const titleB64 = escapeForPowerShell(title)
  const messageLimit =
    typeof renderOptions?.maxMessageLength === "number" && renderOptions.maxMessageLength > 0
      ? renderOptions.maxMessageLength
      : 400

  const normalizedMessage = renderOptions?.preserveMessageFormatting
    ? message
    : cleanMarkdown(message)

  const textB64 = escapeForPowerShell(truncateText(normalizedMessage, messageLimit))

  const shadowXaml = shadow
    ? '<Border.Effect><DropShadowEffect BlurRadius="16" ShadowDepth="0" Opacity="0.4" Color="Black"/></Border.Effect>'
    : ""

  // Close button: visible only when clickThrough is enabled (hover-to-dismiss)
  const closeBtnXaml = clickThrough
    ? [
        `            <Border Name="CloseBg" CornerRadius="4" Width="22" Height="22"`,
        `                    HorizontalAlignment="Right" VerticalAlignment="Top"`,
        `                    Margin="0,6,6,0" Background="Transparent">`,
        `                <TextBlock Name="CloseBtn" Text="&#x2715;" FontSize="13"`,
        `                           Foreground="#2A2A3A"`,
        `                           HorizontalAlignment="Center" VerticalAlignment="Center"`,
        `                           Margin="0,-1,0,0"/>`,
        `            </Border>`,
      ].join("\n")
    : ""

  // When clickThrough is on, no dismiss hint (hover-to-dismiss replaces it)
  const dismissHintXaml = showDismissHint && !clickThrough
    ? `                    <TextBlock Text="Click to dismiss" Foreground="#555555" FontSize="9" Margin="0,4,0,0"/>`
    : ""

  const xaml = [
    `<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"`,
    `        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"`,
    `        WindowStyle="None" AllowsTransparency="True" Background="Transparent"`,
    `        Topmost="True" ShowInTaskbar="False" ShowActivated="False"`,
    `        WindowStartupLocation="${startupLocation}"`,
    `        SizeToContent="Height" Width="${width}" MinHeight="${height}">`,
    `    <Border CornerRadius="${borderRadius}" Margin="10">`,
    `        <Border.Background>`,
    `            <SolidColorBrush Color="${backgroundColor}" Opacity="${backgroundOpacity}"/>`,
    `        </Border.Background>`,
    `        ${shadowXaml}`,
    `        <Grid>`,
    `            <Border CornerRadius="${borderRadius},0,0,${borderRadius}" Width="${colorBarWidth}" HorizontalAlignment="Left" Name="ColorBar"/>`,
    `            <StackPanel Orientation="Horizontal" Margin="22,12,${clickThrough ? 50 : 16},12" VerticalAlignment="Center">`,
    `                <TextBlock Name="IconText" FontSize="${iconFontSize}" VerticalAlignment="Center" Margin="0,0,15,0" Foreground="White"/>`,
    `                <StackPanel VerticalAlignment="Center" MaxWidth="${contentMaxWidth}">`,
    `                    <TextBlock Name="TitleText" FontSize="${titleFontSize}" FontWeight="SemiBold" TextWrapping="Wrap"/>`,
    `                    <TextBlock Name="ContentText" Foreground="${textColor}" FontSize="${contentFontSize}" Margin="0,4,0,0" TextWrapping="Wrap"/>`,
    dismissHintXaml,
    `                </StackPanel>`,
    `            </StackPanel>`,
    closeBtnXaml,
    `        </Grid>`,
    `    </Border>`,
    `</Window>`,
  ].join("\n")

  const manualPositionLines =
    resolvedPosition.startupLocation === "Manual" &&
    resolvedPosition.leftExpr &&
    resolvedPosition.topExpr
      ? [
          "$window.WindowStartupLocation = 'Manual'",
          `$window.Left = ${resolvedPosition.leftExpr}`,
          `$window.Top = ${resolvedPosition.topExpr}`,
        ]
      : []

  // Win32 interop: extended for click-through + hover detection
  const win32TypeDef = clickThrough
    ? [
        "Add-Type -TypeDefinition @'",
        "using System;",
        "using System.Runtime.InteropServices;",
        "",
        "[StructLayout(LayoutKind.Sequential)]",
        "public struct RECT { public int Left, Top, Right, Bottom; }",
        "",
        "[StructLayout(LayoutKind.Sequential)]",
        "public struct POINT { public int X, Y; }",
        "",
        "public static class VDesktop {",
        '    [DllImport("user32.dll", SetLastError = true)]',
        "    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);",
        "",
        '    [DllImport("user32.dll", SetLastError = true)]',
        "    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);",
        "",
        '    [DllImport("user32.dll")]',
        "    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);",
        "",
        '    [DllImport("user32.dll")]',
        "    public static extern bool GetCursorPos(out POINT lpPoint);",
        "",
        "    public const int GWL_EXSTYLE = -20;",
        "    public const int WS_EX_TOOLWINDOW = 0x00000080;",
        "    public const int WS_EX_NOACTIVATE = 0x08000000;",
        "    public const int WS_EX_APPWINDOW = 0x00040000;",
        "    public const int WS_EX_TRANSPARENT = 0x00000020;",
        "",
        "    public static void MakeGlobalWindow(IntPtr hwnd, bool transparent) {",
        "        int style = GetWindowLong(hwnd, GWL_EXSTYLE);",
        "        style = style | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;",
        "        style = style & ~WS_EX_APPWINDOW;",
        "        if (transparent) { style = style | WS_EX_TRANSPARENT; }",
        "        else { style = style & ~WS_EX_TRANSPARENT; }",
        "        SetWindowLong(hwnd, GWL_EXSTYLE, style);",
        "    }",
        "",
        "    public static bool IsCursorInTopRight(IntPtr hwnd, int zoneW, int zoneH) {",
        "        RECT r; POINT p;",
        "        if (!GetWindowRect(hwnd, out r)) return false;",
        "        if (!GetCursorPos(out p)) return false;",
        "        return (p.X >= r.Right - zoneW && p.X <= r.Right &&",
        "                p.Y >= r.Top && p.Y <= r.Top + zoneH);",
        "    }",
        "}",
        "'@ -ErrorAction SilentlyContinue",
      ]
    : [
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
        "    public static void MakeGlobalWindow(IntPtr hwnd, bool transparent) {",
        "        int style = GetWindowLong(hwnd, GWL_EXSTYLE);",
        "        style = style | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;",
        "        style = style & ~WS_EX_APPWINDOW;",
        "        SetWindowLong(hwnd, GWL_EXSTYLE, style);",
        "    }",
        "}",
        "'@ -ErrorAction SilentlyContinue",
      ]

  const hoverThreshold = Math.max(1, Math.round(hoverDismissMs / 100))

  // Hover-to-dismiss timer logic (only when clickThrough is enabled)
  const hoverDismissLines = clickThrough
    ? [
        "",
        "$script:hoverTicks = 0",
        `$hoverThreshold = ${hoverThreshold}`,
        "$brushConv = [System.Windows.Media.BrushConverter]::new()",
        "$closeBtnEl = $window.FindName('CloseBtn')",
        "$closeBgEl = $window.FindName('CloseBg')",
        "",
        "$hitTimer = New-Object System.Windows.Threading.DispatcherTimer",
        "$hitTimer.Interval = [TimeSpan]::FromMilliseconds(100)",
        "$hitTimer.Add_Tick({",
        "    if ($script:hwnd -eq [IntPtr]::Zero) { return }",
        "    $inZone = [VDesktop]::IsCursorInTopRight($script:hwnd, 80, 50)",
        "    if ($inZone) {",
        "        $script:hoverTicks++",
        "        $closeBtnEl.Foreground = $brushConv.ConvertFromString('#FFFFFF')",
        "        $closeBgEl.Background = $brushConv.ConvertFromString('#CC3344')",
        "        if ($script:hoverTicks -ge $hoverThreshold) {",
        "            $hitTimer.Stop()",
        "            $window.Close()",
        "        }",
        "    } else {",
        "        $script:hoverTicks = 0",
        "        $closeBtnEl.Foreground = $brushConv.ConvertFromString('#2A2A3A')",
        "        $closeBgEl.Background = $brushConv.ConvertFromString('Transparent')",
        "    }",
        "})",
      ]
    : []

  // Window loaded handler: set click-through, start fade and hover timer
  const loadedLines = clickThrough
    ? [
        "$window.Add_Loaded({",
        "    $script:hwnd = (New-Object System.Windows.Interop.WindowInteropHelper($window)).Handle",
        "    [VDesktop]::MakeGlobalWindow($script:hwnd, $true)",
        ...(fadeOut
          ? [
              `    $fadeAnim = New-Object System.Windows.Media.Animation.DoubleAnimation`,
              `    $fadeAnim.From = ${initialOpacity}`,
              `    $fadeAnim.To = ${finalOpacity}`,
              `    $fadeAnim.Duration = [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds($duration))`,
              `    $fadeAnim.Add_Completed({ $window.Close() })`,
              `    $window.BeginAnimation([System.Windows.UIElement]::OpacityProperty, $fadeAnim)`,
            ]
          : []),
        "    $hitTimer.Start()",
        "})",
        "",
        "$window.Add_Closed({ $hitTimer.Stop() })",
      ]
    : [
        "$window.Add_Loaded({",
        "    $script:hwnd = (New-Object System.Windows.Interop.WindowInteropHelper($window)).Handle",
        "    [VDesktop]::MakeGlobalWindow($script:hwnd, $false)",
        ...(fadeOut
          ? [
              `    $fadeAnim = New-Object System.Windows.Media.Animation.DoubleAnimation`,
              `    $fadeAnim.From = ${initialOpacity}`,
              `    $fadeAnim.To = ${finalOpacity}`,
              `    $fadeAnim.Duration = [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds($duration))`,
              `    $fadeAnim.Add_Completed({ $window.Close() })`,
              `    $window.BeginAnimation([System.Windows.UIElement]::OpacityProperty, $fadeAnim)`,
            ]
          : []),
        "})",
      ]

  // Fallback timer: only needed when fadeOut is disabled (fade handles close otherwise)
  const timerLines = !fadeOut
    ? [
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
      ]
    : []

  // Click-to-dismiss fallback (only when not click-through)
  const clickDismissLine = !clickThrough
    ? "$window.Add_MouseLeftButtonDown({ $window.Close() })"
    : ""

  const psScript = [
    "Add-Type -AssemblyName PresentationFramework",
    "Add-Type -AssemblyName PresentationCore",
    "Add-Type -AssemblyName WindowsBase",
    "Add-Type -AssemblyName System.Windows.Forms",
    "$targetScreen = [System.Windows.Forms.Screen]::FromPoint([System.Windows.Forms.Cursor]::Position).WorkingArea",
    "",
    ...win32TypeDef,
    "",
    `$title = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${titleB64}'))`,
    `$text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${textB64}'))`,
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
    ...manualPositionLines,
    ...(fadeOut ? [`$window.Opacity = ${initialOpacity}`] : []),
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
    clickDismissLine,
    ...hoverDismissLines,
    "",
    ...loadedLines,
    ...timerLines,
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

function escapeAppleScript(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}
