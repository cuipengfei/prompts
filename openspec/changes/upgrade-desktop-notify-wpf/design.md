# Design: desktop-notify-wpf Plugin

## Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐
│   Claude Code       │     │   Windows Host      │
│   (Container/WSL)   │     │                     │
├─────────────────────┤     ├─────────────────────┤
│                     │     │                     │
│  Hook fires         │     │  PowerShell         │
│       ↓             │     │  FileWatcher        │
│  Write JSON to      │────▶│       ↓             │
│  shared directory   │     │  Read JSON          │
│                     │     │       ↓             │
│                     │     │  WPF Popup          │
│                     │     │  (cross-desktop)    │
└─────────────────────┘     └─────────────────────┘
```

## Key Technical Decisions

### 1. FileWatcher 通信机制

通过共享目录传递 JSON 文件：

- Hook 端写入 JSON 文件到共享目录
- Windows 端 FileSystemWatcher 检测新文件
- 读取后立即删除，不积累临时文件

### 2. WPF 跨虚拟桌面

使用 Windows API 设置窗口样式：

```csharp
int style = GetWindowLong(hwnd, GWL_EXSTYLE);
style = style | WS_EX_TOOLWINDOW;    // 工具窗口样式
style = style & ~WS_EX_APPWINDOW;    // 移除应用窗口样式
SetWindowLong(hwnd, GWL_EXSTYLE, style);
```

效果：
- 窗口在所有虚拟桌面可见
- 不在任务栏显示
- 保持 TopMost 置顶

## UI Design

### 视觉规格

```
╭──────────────────────────────────────────╮
│▌  ✅  Project Name                       │
│▌      消息内容...                         │
│▌      Click to dismiss                   │
╰──────────────────────────────────────────╯
```

| 属性 | 值 |
|------|---|
| 宽度 | 420px |
| 高度 | 105px |
| 圆角 | 14px |
| 背景 | #101018 (95% opacity) |
| 阴影 | 20px blur, 0.7 opacity |
| 左侧条 | 5px, 颜色随类型变化 |

### 颜色主题

| Hook 类型 | 主色 | 图标 |
|-----------|------|------|
| Stop | #4ADE80 (绿) | ✅ |
| Notification | #FBBF24 (橙) | ⏳ |

### 交互行为

| 行为 | 规格 |
|------|------|
| 默认超时 | 10 秒自动关闭 |
| 手动关闭 | 点击窗口任意位置 |
| 位置 | 屏幕中央 |

## Data Flow

### Stop Hook

```
1. Claude Code 触发 Stop hook
2. notify-client.ts 读取 stdin JSON
3. 从 transcript_path 提取最后助手消息
4. 写入共享目录:
   {
     "title": "✅ project-name",
     "text": "提取的消息...",
     "color": "#4ADE80",
     "duration": 10000
   }
5. FileWatcher 检测 → WPF 弹窗 → 删除文件
```

### Notification Hook

```
1. Claude Code 触发 Notification hook
2. notify-client.ts 读取 stdin JSON
3. 使用 message 字段作为通知内容
4. 写入共享目录:
   {
     "title": "⏳ project-name",
     "text": "Claude needs your permission...",
     "color": "#FBBF24",
     "duration": 10000
   }
5. FileWatcher 检测 → WPF 弹窗 → 删除文件
```

## JSON Message Format

```json
{
  "title": "string",      // 标题（含图标）
  "text": "string",       // 消息内容
  "icon": "string",       // emoji 图标（可选，用于显示）
  "color": "#hex",        // 主题色
  "duration": 10000       // 超时毫秒，0=不自动关闭
}
```

## Implementation Examples

> **Note:** C# 代码可以通过 PowerShell 的 `Add-Type -TypeDefinition @'...'@ -Language CSharp` 内联编译运行，编译后的类型可直接调用如 `[VDesktop]::MakeGlobalWindow($hwnd)`。

### Windows API for Cross-Virtual-Desktop

```csharp
// C# P/Invoke declarations
[DllImport("user32.dll", SetLastError = true)]
public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

[DllImport("user32.dll", SetLastError = true)]
public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

public const int GWL_EXSTYLE = -20;
public const int WS_EX_TOOLWINDOW = 0x00000080;
public const int WS_EX_APPWINDOW = 0x00040000;

public static void MakeGlobalWindow(IntPtr hwnd) {
    int style = GetWindowLong(hwnd, GWL_EXSTYLE);
    style = style | WS_EX_TOOLWINDOW;    // 添加工具窗口样式
    style = style & ~WS_EX_APPWINDOW;    // 移除应用窗口样式
    SetWindowLong(hwnd, GWL_EXSTYLE, style);
}
```

### WPF XAML Template

```xml
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        Topmost="True" ShowInTaskbar="False" WindowStartupLocation="CenterScreen"
        Width="420" Height="105">
    <Border CornerRadius="14" Background="#F0101018" Margin="10">
        <Border.Effect>
            <DropShadowEffect BlurRadius="20" ShadowDepth="2" Opacity="0.7"/>
        </Border.Effect>
        <Grid>
            <!-- 左侧彩色条 -->
            <Border CornerRadius="14,0,0,14" Background="{COLOR}" Width="5" HorizontalAlignment="Left"/>
            <StackPanel Orientation="Horizontal" Margin="22,0,16,0" VerticalAlignment="Center">
                <TextBlock Text="{ICON}" FontSize="30" VerticalAlignment="Center" Margin="0,0,15,0"/>
                <StackPanel VerticalAlignment="Center" MaxWidth="320">
                    <TextBlock Text="{TITLE}" Foreground="{COLOR}" FontSize="14" FontWeight="SemiBold"/>
                    <TextBlock Text="{TEXT}" Foreground="#AAA" FontSize="11" Margin="0,4,0,0" TextWrapping="Wrap"/>
                    <TextBlock Text="Click to dismiss" Foreground="#555" FontSize="9" Margin="0,4,0,0"/>
                </StackPanel>
            </StackPanel>
        </Grid>
    </Border>
</Window>
```

### PowerShell FileWatcher Pattern

```powershell
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $WatchPath
$watcher.Filter = "*.json"
$watcher.EnableRaisingEvents = $true

Register-ObjectEvent $watcher "Created" -Action {
    $filePath = $Event.SourceEventArgs.FullPath
    $json = Get-Content $filePath -Raw | ConvertFrom-Json
    Remove-Item $filePath -Force  # 读取后删除
    Show-Notification -Title $json.title -Text $json.text -Color $json.color
} | Out-Null
```
