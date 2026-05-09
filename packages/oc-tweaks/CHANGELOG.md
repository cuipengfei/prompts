# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Memory 系统从 v1 full-concat 注入模式升级至 v2 summary/index 注入 + 按需召回模式。
以下条目对应 ADR [0001-no-sandbox-v1](docs/adr/0001-no-sandbox-v1.md)、
[0002-no-embedding-v1](docs/adr/0002-no-embedding-v1.md)、
[0003-write-and-notify-default](docs/adr/0003-write-and-notify-default.md)。

### Added

- **Memory v2 注入模式**：上下文注入改为 summary/index 摘要，不再将所有 memory 文件原文塞入 context window；按需召回时通过 grep + frontmatter 过滤定位具体文件（参见 [0002-no-embedding-v1](docs/adr/0002-no-embedding-v1.md)）。
- **4 个新 config 字段**：
  - `autoWrite`：控制模型触发写入时的行为，默认值 `notify`（参见 [0003-write-and-notify-default](docs/adr/0003-write-and-notify-default.md)）。
  - `maxBytesPerFile`：单个 memory 文件大小上限。
  - `maxWritesPerSession`：单次会话内最大自动写入次数。
  - `summaryTokenBudget`：摘要注入的 token 预算上限。
- **`/memory-migrate` 命令**：一次性迁移工具，将旧版 memory 文件结构升级为 v2 格式；迁移不自动运行，须用户手动执行一次。
- **`memory diag` 命令**：诊断命令，输出当前 memory 配置、文件列表及健康状态，便于排查注入/召回问题。

### Changed

- **注入策略**：移除 legacy full-concat 注入（将全部 memory 文件内容拼接注入 context）；改为仅注入 summary/index 摘要，大幅减少 token 消耗。
- **`autoWrite` 默认值**：从不写入（`off`）改为写入前通知用户确认（`notify`），兼顾自动化便利与用户控制权（参见 [0003-write-and-notify-default](docs/adr/0003-write-and-notify-default.md)）。
- **进程模型**：V1 不引入 worker/sandbox 隔离，写入操作在主进程内完成；该决策记录于 [0001-no-sandbox-v1](docs/adr/0001-no-sandbox-v1.md)，后续版本可重新评估。

### Removed

- **Legacy full-concat 注入逻辑**：旧版将 memory root 下所有文件内容完整拼接后注入，已移除；由 summary/index 注入替代。
- **无 embedding/向量检索**：V1 明确不引入嵌入模型和向量索引；召回仅依赖 grep + frontmatter 过滤（参见 [0002-no-embedding-v1](docs/adr/0002-no-embedding-v1.md)）。
