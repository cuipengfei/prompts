# Proposal: add-help-me-read-skill

## Why

当前仓库已有提示词优化、深度研究、记忆与辩论等插件，但缺少一个面向“原文精读”的阅读辅助 skill。用户需要的不是只看 AI 摘要，而是把网页全文按段落展开成“原文 + 信达雅翻译 + 轻量 commentary”的快速阅读版，以便在保留原文结构的同时提升理解速度。

## What Changes

- 新增独立插件 `help-me-read`，只承载一个同名 skill。
- 该 skill 接收一个或多个 URL，要求先抓取全文，再按段落输出阅读卡片。
- 若原文不是用户偏好语言，skill 要求提供逐段译文，并把 commentary 控制在不压过原文与译文的体量。
- 更新 marketplace 条目与 README 三语文档，使新插件可发现、可安装。

## Impact

- Affected specs: `plugin-marketplace`, `plugin-granularity`, `help-me-read-skill`
- Affected code: `plugins/help-me-read/`, `.claude-plugin/marketplace.json`, `README.md`, `README.en.md`, `README.guwen.md`
