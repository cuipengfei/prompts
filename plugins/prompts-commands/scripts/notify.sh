#!/bin/bash
# Desktop notification for WSL/Docker → Windows Toast
# Reads context from Claude Code hook stdin (JSON)

HOOK_TYPE="${1:-Stop}"
DEFAULT_MSG="${2:-Task completed}"
DURATION="${3:-long}"
LOG_FILE="$HOME/.claude/hooks/hook-input.log"

###########################################
# INPUT/OUTPUT Functions
###########################################

# Read JSON input from stdin
# Returns: JSON string or empty
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

# Keep only last 100 lines of log file
trim_log() {
  [ -f "$LOG_FILE" ] && tail -n 100 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
}

# Log hook input to file
# Args: hook_type, input_json
log_input() {
  local hook_type="$1"
  local input="$2"
  {
    echo "=== $(date) === HOOK: $hook_type ==="
    echo "$input"
    echo ""
  } >> "$LOG_FILE"
}

# Log final notification details
# Args: title, line2, line3
log_notification() {
  local title="$1"
  local line2="$2"
  local line3="$3"
  {
    echo "  → Sending Toast Notification:"
    echo "     Title: $title"
    echo "     Line2: $line2"
    if [ -n "$line3" ]; then
      echo "     Line3: $line3"
    fi
  } >> "$LOG_FILE"
}

###########################################
# DATA EXTRACTION Functions
###########################################

# Check if jq command is available
# Returns: 0 if available, 1 otherwise
has_jq() {
  command -v jq &>/dev/null
}

# Extract project name from cwd field
# Args: hook_input_json
# Returns: project name or empty
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

# Build notification title from project name
# Args: project_name
# Returns: formatted title
build_title() {
  local project="$1"
  if [ -n "$project" ]; then
    echo "cc: $project"
  else
    echo "cc"
  fi
}

# Extract transcript path from hook input
# Args: hook_input_json
# Returns: transcript file path or empty
extract_transcript_path() {
  local input="$1"
  if ! has_jq || [ -z "$input" ]; then
    echo ""
    return
  fi
  echo "$input" | jq -r '.transcript_path // empty' 2>/dev/null
}

# Extract last assistant message from transcript
# Args: transcript_file_path
# Returns: last text message or empty
extract_last_assistant_message() {
  local transcript="$1"
  if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
    echo ""
    return
  fi

  tac "$transcript" 2>/dev/null | \
    grep -a '"role":"assistant"' | \
    head -5 | \
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
    sed 's/^[[:space:]]*//; s/[[:space:]]*$//'  # Trim leading and trailing spaces
}

# Truncate text to max length
# Args: text, max_chars
# Returns: truncated text
truncate_text() {
  local text="$1"
  local max_chars="${2:-400}"
  echo "$text" | head -c "$max_chars"
}

###########################################
# MESSAGE BUILDING Functions
###########################################

# Clean markdown formatting from text
# Args: text
# Returns: cleaned text
clean_markdown() {
  local text="$1"
  echo "$text" | sed 's/[`*#]//g'
}

# Build message based on hook type
# Args: hook_type, default_msg, summary
# Returns: formatted message
format_message_for_hook_type() {
  local hook_type="$1"
  local default_msg="$2"
  local summary="$3"

  case "$hook_type" in
    Stop)
      if [ -n "$summary" ]; then
        echo "✓ ${summary}"
      else
        echo "✓ Task completed"
      fi
      ;;
    Notification)
      echo "⏳ Waiting for your input..."
      ;;
    *)
      echo "$default_msg"
      ;;
  esac
}

# Split message into two lines for Toast display
# Args: message, split_point (default 200)
# Returns: line2|line3 (pipe-separated)
split_for_toast() {
  local message="$1"
  local split_point="${2:-200}"
  local len=${#message}

  if [ "$len" -le "$split_point" ]; then
    # Short message, no split needed
    echo "$message|"
    return
  fi

  # Find a good break point (space) near split_point
  local break_at="$split_point"
  local search_start=$((split_point - 30))
  [ "$search_start" -lt 0 ] && search_start=0

  # Look for last space before split_point
  local substr="${message:$search_start:$((split_point - search_start))}"
  local last_space_pos=$(echo "$substr" | grep -bo ' ' | tail -1 | cut -d: -f1)

  if [ -n "$last_space_pos" ]; then
    break_at=$((search_start + last_space_pos + 1))
  fi

  local line2="${message:0:$break_at}"
  local line3="${message:$break_at}"

  # Trim leading space from line3
  line3=$(echo "$line3" | sed 's/^[[:space:]]*//')

  echo "$line2|$line3"
}

###########################################
# XML PROCESSING Functions
###########################################

# Escape special characters for XML
# Args: text
# Returns: XML-safe text
escape_xml() {
  local text="$1"
  echo "$text" | sed \
    -e 's/&/\&amp;/g' \
    -e 's/</\&lt;/g' \
    -e 's/>/\&gt;/g' \
    -e 's/"/\&quot;/g' \
    -e "s/'/\&apos;/g"
}

# Build toast XML template
# Args: title, line2, line3, duration
# Returns: XML string
build_toast_xml() {
  local title="$1"
  local line2="$2"
  local line3="$3"
  local duration="$4"

  cat << EOF
<toast duration="${duration}">
  <visual>
    <binding template="ToastText04">
      <text id="1">${title}</text>
      <text id="2">${line2}</text>
      <text id="3">${line3}</text>
    </binding>
  </visual>
  <audio src="ms-winsoundevent:Notification.Default"/>
</toast>
EOF
}

###########################################
# TOAST NOTIFICATION Functions
###########################################

# Send Windows Toast notification via PowerShell
# Args: title, line2, line3, hook_type, duration
send_toast_notification() {
  local title="$1"
  local line2="$2"
  local line3="$3"
  local hook_type="$4"
  local duration="$5"

  # Escape for XML
  title=$(escape_xml "$title")
  line2=$(escape_xml "$line2")
  line3=$(escape_xml "$line3")

  # Build XML
  local xml_template
  xml_template=$(build_toast_xml "$title" "$line2" "$line3" "$duration")

  # Send via PowerShell
  powershell.exe -NoProfile -Command "
try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

  \$template = @'
${xml_template}
'@

  \$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  \$xml.LoadXml(\$template)

  \$toast = [Windows.UI.Notifications.ToastNotification]::new(\$xml)

  # Set Tag and Group for notification management
  \$toast.Tag = '${hook_type}'
  \$toast.Group = 'cc'

  # Set expiration time (5 minutes from now)
  \$toast.ExpirationTime = [DateTimeOffset]::Now.AddMinutes(5)

  # Create notifier and show toast
  \$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('cc')
  \$notifier.Show(\$toast)

} catch {
  # Silently fail - don't block hook execution
  Write-Error \"Toast notification failed: \$_\" -ErrorAction SilentlyContinue
}
" 2>/dev/null &
}

###########################################
# ORCHESTRATION Functions
###########################################

# Process hook input and prepare notification data
# Args: hook_input_json
# Returns: pipe-separated values (title|line2|line3)
prepare_notification_data() {
  local hook_input="$1"

  # Extract project and build title
  local project
  project=$(extract_project_name "$hook_input")
  local title
  title=$(build_title "$project")

  # Extract and process message
  local line2 line3
  if has_jq && [ -n "$hook_input" ]; then
    # Extract summary from transcript
    local transcript
    transcript=$(extract_transcript_path "$hook_input")
    local summary
    summary=$(extract_last_assistant_message "$transcript")
    summary=$(truncate_text "$summary" 600)

    # Build and format message
    local message
    message=$(format_message_for_hook_type "$HOOK_TYPE" "$DEFAULT_MSG" "$summary")
    message=$(clean_markdown "$message")

    # Split message into Line2 and Line3 for more display space
    local split_result
    split_result=$(split_for_toast "$message" 150)
    line2=$(echo "$split_result" | cut -d'|' -f1)
    line3=$(echo "$split_result" | cut -d'|' -f2)
  else
    # Fallback when no jq or input
    line2="$DEFAULT_MSG"
    line3=""
  fi

  # Output as pipe-separated values for easy parsing
  echo "$title|$line2|$line3"
}

###########################################
# MAIN Function
###########################################

main() {
  # Trim log to last 100 lines
  trim_log

  # Read input
  local hook_input
  hook_input=$(read_hook_input)

  # Log input
  log_input "$HOOK_TYPE" "$hook_input"

  # Prepare notification data
  local notification_data
  notification_data=$(prepare_notification_data "$hook_input")

  # Parse notification data
  local title line2 line3
  title=$(echo "$notification_data" | cut -d'|' -f1)
  line2=$(echo "$notification_data" | cut -d'|' -f2)
  line3=$(echo "$notification_data" | cut -d'|' -f3)

  # Log notification
  log_notification "$title" "$line2" "$line3"

  # Send toast
  send_toast_notification "$title" "$line2" "$line3" "$HOOK_TYPE" "$DURATION"
}

main
exit 0
