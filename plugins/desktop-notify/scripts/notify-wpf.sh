#!/bin/bash
# Desktop notification for WSL/Docker → Windows WPF Popup
# Cross-virtual-desktop support using WS_EX_TOOLWINDOW
# Reads context from Claude Code hook stdin (JSON)

HOOK_TYPE="${1:-Stop}"
DEFAULT_MSG="${2:-Task completed}"
DURATION="${3:-10000}"  # milliseconds
LOG_FILE="$HOME/.claude/hooks/hook-input.log"

###########################################
# INPUT/OUTPUT Functions
###########################################

read_hook_input() {
  if [ -t 0 ]; then
    echo ""
  else
    cat
  fi
}

###########################################
# LOGGING Functions
###########################################

trim_log() {
  [ -f "$LOG_FILE" ] && tail -n 100 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
}

log_input() {
  local hook_type="$1"
  local input="$2"
  {
    echo "=== $(date) === HOOK: $hook_type ==="
    echo "$input"
    echo ""
  } >> "$LOG_FILE"
}

log_notification() {
  local title="$1"
  local text="$2"
  local color="$3"
  {
    echo "  → Sending WPF Notification:"
    echo "     Title: $title"
    echo "     Text: $text"
    echo "     Color: $color"
  } >> "$LOG_FILE"
}

###########################################
# DATA EXTRACTION Functions
###########################################

has_jq() {
  command -v jq &>/dev/null
}

extract_project_name() {
  local input="$1"
  if ! has_jq || [ -z "$input" ]; then
    echo ""
    return
  fi
  local cwd
  cwd=$(echo "$input" | jq -r '.cwd // empty' 2>/dev/null)
  if [ -n "$cwd" ]; then
    basename "$cwd"
  else
    echo ""
  fi
}

extract_transcript_path() {
  local input="$1"
  if ! has_jq || [ -z "$input" ]; then
    echo ""
    return
  fi
  echo "$input" | jq -r '.transcript_path // empty' 2>/dev/null
}

extract_notification_message() {
  local input="$1"
  if ! has_jq || [ -z "$input" ]; then
    echo ""
    return
  fi
  echo "$input" | jq -r '.message // empty' 2>/dev/null
}

extract_last_assistant_message() {
  local transcript="$1"
  if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
    echo ""
    return
  fi

  tac "$transcript" 2>/dev/null | \
    grep -a '"role":"assistant"' | \
    while read -r line; do
      local text
      text=$(echo "$line" | jq -r '
        .message.content[]? |
        select(.type == "text") |
        .text
      ' 2>/dev/null)
      if [ -n "$text" ] && [ "$text" != "null" ]; then
        echo "$text"
        break
      fi
    done | \
    tr '\n' ' ' | \
    sed 's/  */ /g' | \
    sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

truncate_text() {
  local text="$1"
  local max_chars="${2:-250}"
  local len=${#text}
  if [ "$len" -gt "$max_chars" ]; then
    echo "${text:0:$max_chars}..."
  else
    echo "$text"
  fi
}

clean_markdown() {
  local text="$1"
  echo "$text" | sed 's/[`*#]//g'
}

###########################################
# NOTIFICATION BUILDING Functions
###########################################

build_notification_data() {
  local hook_input="$1"

  # Extract project name
  local project
  project=$(extract_project_name "$hook_input")

  local title text icon color

  case "$HOOK_TYPE" in
    Stop)
      icon="✅"
      color="#4ADE80"
      if [ -n "$project" ]; then
        title="$icon $project"
      else
        title="$icon Task Completed"
      fi

      # Extract from transcript
      local transcript
      transcript=$(extract_transcript_path "$hook_input")
      text=$(extract_last_assistant_message "$transcript")
      text=$(truncate_text "$text" 250)
      text=$(clean_markdown "$text")

      if [ -z "$text" ]; then
        text="Task completed successfully"
      fi
      ;;

    Notification)
      icon="⏳"
      color="#FBBF24"
      if [ -n "$project" ]; then
        title="$icon $project"
      else
        title="$icon Waiting for Input"
      fi

      # Use message field from hook input
      text=$(extract_notification_message "$hook_input")
      if [ -z "$text" ]; then
        text="Waiting for your input..."
      fi
      text=$(truncate_text "$text" 250)
      ;;

    *)
      icon="ℹ️"
      color="#60A5FA"
      title="$icon Notification"
      text="$DEFAULT_MSG"
      ;;
  esac

  # Escape for JSON (handle quotes and special chars)
  title=$(echo "$title" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
  text=$(echo "$text" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')

  # Output as JSON for PowerShell
  echo "{\"title\":\"$title\",\"text\":\"$text\",\"color\":\"$color\",\"duration\":$DURATION}"
}

###########################################
# WPF NOTIFICATION Function
###########################################

send_wpf_notification() {
  local title="$1"
  local text="$2"
  local color="$3"
  local duration="$4"

  # Escape for PowerShell string
  title=$(echo "$title" | sed "s/'/\`'/g")
  text=$(echo "$text" | sed "s/'/\`'/g")

  # Use subshell + full redirection to completely detach process
  (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# P/Invoke for cross-virtual-desktop
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class VDesktop {
    [DllImport(\"user32.dll\", SetLastError = true)]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport(\"user32.dll\", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_TOOLWINDOW = 0x00000080;
    public const int WS_EX_APPWINDOW = 0x00040000;

    public static void MakeGlobalWindow(IntPtr hwnd) {
        int style = GetWindowLong(hwnd, GWL_EXSTYLE);
        style = style | WS_EX_TOOLWINDOW;
        style = style & ~WS_EX_APPWINDOW;
        SetWindowLong(hwnd, GWL_EXSTYLE, style);
    }
}
'@ -ErrorAction SilentlyContinue

\$title = '$title'
\$text = '$text'
\$color = '$color'
\$duration = $duration

# Create XAML for WPF window
[xml]\$xaml = @'
<Window xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"
        xmlns:x=\"http://schemas.microsoft.com/winfx/2006/xaml\"
        WindowStyle=\"None\" AllowsTransparency=\"True\" Background=\"Transparent\"
        Topmost=\"True\" ShowInTaskbar=\"False\" WindowStartupLocation=\"CenterScreen\"
        Width=\"420\" Height=\"105\" Name=\"NotifyWindow\">
    <Border CornerRadius=\"14\" Margin=\"10\" Name=\"MainBorder\">
        <Border.Background>
            <SolidColorBrush Color=\"#101018\" Opacity=\"0.95\"/>
        </Border.Background>
        <Border.Effect>
            <DropShadowEffect BlurRadius=\"20\" ShadowDepth=\"2\" Opacity=\"0.7\" Color=\"Black\"/>
        </Border.Effect>
        <Grid>
            <Border CornerRadius=\"14,0,0,14\" Width=\"5\" HorizontalAlignment=\"Left\" Name=\"ColorBar\"/>
            <StackPanel Orientation=\"Horizontal\" Margin=\"22,0,16,0\" VerticalAlignment=\"Center\">
                <TextBlock Name=\"IconText\" FontSize=\"30\" VerticalAlignment=\"Center\" Margin=\"0,0,15,0\" Foreground=\"White\"/>
                <StackPanel VerticalAlignment=\"Center\" MaxWidth=\"320\">
                    <TextBlock Name=\"TitleText\" FontSize=\"14\" FontWeight=\"SemiBold\"/>
                    <TextBlock Name=\"ContentText\" Foreground=\"#AAAAAA\" FontSize=\"11\" Margin=\"0,4,0,0\" TextWrapping=\"Wrap\"/>
                    <TextBlock Text=\"Click to dismiss\" Foreground=\"#555555\" FontSize=\"9\" Margin=\"0,4,0,0\"/>
                </StackPanel>
            </StackPanel>
        </Grid>
    </Border>
</Window>
'@

# Create window
\$reader = New-Object System.Xml.XmlNodeReader \$xaml
\$window = [Windows.Markup.XamlReader]::Load(\$reader)

# Get elements
\$colorBar = \$window.FindName('ColorBar')
\$iconText = \$window.FindName('IconText')
\$titleText = \$window.FindName('TitleText')
\$contentText = \$window.FindName('ContentText')

# Parse icon from title (first character if emoji)
\$icon = if (\$title -match '^([\u{1F300}-\u{1F9FF}]|[✅⏳ℹ️])') { \$Matches[0] } else { '🔔' }
\$displayTitle = \$title -replace '^[\u{1F300}-\u{1F9FF}✅⏳ℹ️]\s*', ''

# Set content
\$colorBar.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString(\$color)
\$iconText.Text = \$icon
\$titleText.Text = \$displayTitle
\$titleText.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString(\$color)
\$contentText.Text = \$text

# Click to close
\$window.Add_MouseLeftButtonDown({ \$window.Close() })

# Apply cross-virtual-desktop style after window loads
\$window.Add_Loaded({
    \$hwnd = (New-Object System.Windows.Interop.WindowInteropHelper(\$window)).Handle
    [VDesktop]::MakeGlobalWindow(\$hwnd)
})

# Auto-close timer
if (\$duration -gt 0) {
    \$timer = New-Object System.Windows.Threading.DispatcherTimer
    \$timer.Interval = [TimeSpan]::FromMilliseconds(\$duration)
    \$timer.Add_Tick({
        \$window.Close()
        \$timer.Stop()
    })
    \$timer.Start()
}

# Show window
\$window.ShowDialog() | Out-Null
"
  ) </dev/null >/dev/null 2>&1 &
}

###########################################
# MAIN Function
###########################################

main() {
  trim_log

  local hook_input
  hook_input=$(read_hook_input)

  log_input "$HOOK_TYPE" "$hook_input"

  # Build notification data
  local notification_json
  notification_json=$(build_notification_data "$hook_input")

  # Parse JSON (simple extraction)
  local title text color
  if has_jq; then
    title=$(echo "$notification_json" | jq -r '.title')
    text=$(echo "$notification_json" | jq -r '.text')
    color=$(echo "$notification_json" | jq -r '.color')
  else
    # Fallback parsing
    title=$(echo "$notification_json" | sed 's/.*"title":"\([^"]*\)".*/\1/')
    text=$(echo "$notification_json" | sed 's/.*"text":"\([^"]*\)".*/\1/')
    color=$(echo "$notification_json" | sed 's/.*"color":"\([^"]*\)".*/\1/')
  fi

  log_notification "$title" "$text" "$color"

  # Final fallback if parsing failed
  [ -z "$title" ] && title="✅ Claude Code"
  [ -z "$text" ] && text="Task completed"
  [ -z "$color" ] && color="#4ADE80"

  send_wpf_notification "$title" "$text" "$color" "$DURATION"
}

main
exit 0
