# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.11.3] - 2026-05-09

### Fixed

- **`oc-tweaks memory migrate` CLI route**：`oc-tweaks memory migrate --root <dir> --scope <global|project>` 现在会调用 auto-memory migration，而不是误回退到 `init`。

## [0.11.2] - 2026-05-09

### Fixed

- **disabled memory recall**：`memory_recall` 现在会跳过 `disabled: true` 的 memory entry，且不会为 disabled entry 写入 `usage_count` / `last_usage`。
- **disabled coverage**：新增 registry 与 recall 双层测试，覆盖扫描阶段跳过 disabled entry，以及直接传入 disabled entry 时不召回、不写回。

## [0.11.1] - 2026-05-09

### Fixed

- **F1/F4 final audit gaps**：补齐 plan 验收剩余问题（Must Have 15/15、Must NOT Have 16/16、Tasks 18/18 全部 APPROVE）。
- **collector test pollution**：`__tests__/insights/collector.test.ts` 修复测试间状态污染，确保独立运行通过。
- **writer usage writeback**：`auto-memory/writer.ts` 在写入成功后更新使用计数，避免 `maxWritesPerSession` 计数失真。
- **notify toast wire**：`auto-memory/notify.ts` 接通 toast → notify 退化链，与 T10 setToastSender 注册机制对齐。
- **recall robustness**：`auto-memory/recall.ts` 增加 disabled frontmatter 跳过、降级日志与边界保护。
- **injector / frontmatter**：`auto-memory/injector.ts`、`auto-memory/frontmatter.ts` 处理 disabled frontmatter 与 system-reminder 注入边界。

### Added

- **`recall` 自定义工具**：`auto-memory.ts` 通过 `@opencode-ai/plugin` 的 `tool()` 注册 memory recall tool，模型可按需召回 memory。
- **`oc-tweaks memory diag` CLI 子命令**：`cli/init.ts` 新增 `memory diag` 子命令（支持 `--root` / `--global-root` / `--project-root`），输出 memory 配置与文件健康报告。
- **disabled frontmatter 支持**：memory 文件可通过 frontmatter 标记 `disabled` 跳过注入与召回。
- **system-reminder 注入路径**：auto-memory 注入新增 system-reminder 通道，统一退化体验。


## [0.11.0] - 2026-05-09

### Fixed

- **T7**：补齐 `DEFAULT_CONFIG.autoMemory.enabled` 默认键（`false`），避免插件初始化时读取到 undefined。
- **T11**：`writer.ts` 增加 `assertDiffLines` 保护，防止单次超大 diff 直接写入 memory 文件。
- **T10**：`notify.ts` 实现 `setToastSender` 注册机制，让 toast → notify 退化链真正可用。
- **T9**：`recall.ts` 增加 `filterTags` OR 过滤；V1 hit 写回失败时降级为 stderr log，不再静默吞错。
- **T12**：移除 `experimental.session.compacting` hook（违反 plan Must NOT 约束）；recall 改为接入 `experimental.chat.system.transform` pipeline。

### Added

- `config.ts` 新增 `maxDiffLines` 配置项（默认 `500`），用于约束单次 diff 写入规模。
- `frontmatter.ts` `MemoryMeta` 增加 `tags?: string[]` 字段，为 `recall.filterTags` 提供数据基础。

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
