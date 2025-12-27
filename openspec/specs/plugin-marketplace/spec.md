# plugin-marketplace Specification

## Purpose
TBD - created by archiving change transform-to-plugin-marketplace. Update Purpose after archive.
## Requirements
### Requirement: Marketplace 元数据

系统 SHALL 在仓库根目录提供 `.claude-plugin/marketplace.json` 文件，定义可用插件目录。

#### Scenario: 用户添加 Marketplace

- **WHEN** 用户执行 `/plugin marketplace add owner/prompts`
- **THEN** Claude Code 应成功解析 marketplace.json 并注册可用插件列表

#### Scenario: Marketplace 元数据包含必需字段

- **WHEN** 系统读取 marketplace.json
- **THEN** 文件 MUST 包含 `name`、`owner`、`plugins` 字段
- **AND** 每个 plugin entry MUST 包含 `name`、`source`、`description`

---

### Requirement: 插件目录结构

每个插件 SHALL 遵循 Claude Code 官方插件结构规范。

#### Scenario: 插件包含有效清单

- **WHEN** 用户安装插件
- **THEN** 插件目录 MUST 包含 `.claude-plugin/plugin.json`
- **AND** plugin.json MUST 包含 `name`、`version`、`description` 字段

#### Scenario: 组件目录位置正确

- **WHEN** 插件包含 commands、agents、skills 或 output-styles
- **THEN** 这些目录 MUST 位于插件根目录
- **AND** 不得位于 `.claude-plugin/` 目录内

---

### Requirement: Agents 插件

系统 SHALL 提供 `prompts-core-agents` 插件，包含核心专业化代理。

#### Scenario: 安装 Agents 插件

- **WHEN** 用户执行 `/plugin install prompts-core-agents@prompts-marketplace`
- **THEN** 以下代理应可用：`code-specialist`、`memory-manager`、`planning-analyst`、`tdd-coach`

#### Scenario: 代理调用格式

- **WHEN** 用户通过 Task 工具调用代理
- **THEN** 代理名称应遵循 `prompts-core-agents:agent-name` 格式

---

### Requirement: Commands 插件

系统 SHALL 提供 `prompts-commands` 插件，包含通用斜杠命令。

#### Scenario: 安装 Commands 插件

- **WHEN** 用户执行 `/plugin install prompts-commands@prompts-marketplace`
- **THEN** `/prompts-commands:improve-prompt` 命令应可用

---

### Requirement: Output Styles 插件

系统 SHALL 提供 `prompts-output-styles` 插件，包含输出样式模板。

#### Scenario: 安装 Output Styles 插件

- **WHEN** 用户执行 `/plugin install prompts-output-styles@prompts-marketplace`
- **THEN** `structured-responder` 输出样式应可用

---

### Requirement: Skills 插件

系统 SHALL 提供 `prompts-skills` 插件，包含从指令框架转化的技能集。

#### Scenario: 安装 Skills 插件

- **WHEN** 用户执行 `/plugin install prompts-skills@prompts-marketplace`
- **THEN** 以下技能应可用：
  - `foundational-principles`
  - `quality-standards`
  - `programming-workflow`
  - `testing-guidelines`
  - `planning-workflow`
  - `ba`（业务分析）
  - `memory-bank`
  - `response-guidelines`
  - `sequential-thinking`
  - `shortcut-system`

#### Scenario: Skill 格式符合规范

- **WHEN** Claude 读取 skill 目录
- **THEN** 每个 skill 目录 MUST 包含 `SKILL.md` 文件
- **AND** SKILL.md MUST 包含 YAML frontmatter 定义 `name` 和 `description`

---

### Requirement: 向后兼容性

系统 SHALL 保持与现有项目级配置的兼容性。

#### Scenario: 项目级配置继续工作

- **WHEN** 用户克隆仓库并在其中使用 Claude Code
- **THEN** `.claude/` 目录中的配置应继续作为项目级配置生效
- **AND** 用户无需安装插件即可使用现有功能

#### Scenario: 插件与项目配置共存

- **WHEN** 用户同时拥有项目级配置和已安装的插件
- **THEN** 两者应能共存
- **AND** 插件命令使用命名空间前缀区分

