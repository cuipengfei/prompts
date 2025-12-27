# plugin-granularity Specification

## Purpose
TBD - created by archiving change split-plugins-into-granular-components. Update Purpose after archive.
## Requirements
### Requirement: Independent Plugin Installation

系统 SHALL 允许用户独立安装每个功能组件（command、skill、hook、output-style）。

#### Scenario: 用户只需要 quality-standards

- **GIVEN** 用户浏览 marketplace
- **WHEN** 用户选择安装 `quality-standards` 插件
- **THEN** 系统只安装 `quality-standards` skill
- **AND** 不安装其他 10 个 skills

#### Scenario: 用户选择性安装多个 skills

- **GIVEN** 用户需要 TDD 相关功能
- **WHEN** 用户安装 `programming-workflow` 和 `testing-guidelines`
- **THEN** 系统只安装这 2 个 skills
- **AND** 不安装无关的 `zellij-control` 或 `ba-collaboration`

### Requirement: 每个插件一个功能组件

每个插件 SHALL 只包含一个功能组件（一个 command、一个 skill、一组相关 hooks、或一个 output-style）。

#### Scenario: improve-prompt 插件

- **GIVEN** `improve-prompt` 插件
- **WHEN** 检查其 plugin.json
- **THEN** `commands` 数组只有 1 项
- **AND** 没有 `skills`、`hooks`、`outputStyles` 数组

#### Scenario: quality-standards 插件

- **GIVEN** `quality-standards` 插件
- **WHEN** 检查其目录结构
- **THEN** 只有 `skills/quality-standards/` 目录
- **AND** plugin.json 的 `skills` 数组只有 1 项

### Requirement: Marketplace 清晰展示

marketplace.json SHALL 为每个可安装组件提供独立的插件条目，包含准确的名称和描述。

#### Scenario: marketplace 列表显示

- **GIVEN** 用户执行 `/plugin list`
- **WHEN** 查看 prompts marketplace
- **THEN** 显示 13+ 个独立插件条目
- **AND** 每个条目描述其单一功能
- **AND** 用户可以分别选择/取消选择每个插件

