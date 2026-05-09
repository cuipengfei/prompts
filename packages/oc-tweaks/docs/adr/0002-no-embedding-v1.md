# ADR 0002：V1 召回用 grep + frontmatter 过滤，不做 embedding/向量检索

## Status

Accepted

## Context

语义向量检索是成熟的 memory 召回方案：
把 memory 文件内容拆分为 chunk，调用嵌入模型生成向量，存入向量索引（如 hnswlib / faiss / SQLite-vec），
查询时对用户输入做同样的嵌入，再做近似最近邻搜索取 top-k。

相比之下，grep + frontmatter tag 过滤是朴素的精确匹配：
遍历 memory root 下所有 `.md` 文件，
先用 frontmatter 的 `type`、`scope`、`disabled` 字段做前置过滤，
再用查询词对文件内容做 substring/regex 匹配，
按匹配数量或 `usage_count` 排序返回结果。

根据 plan 头部 Interview Summary（§ Scope V1 = Balanced V1，行 40）：

> embedding / state DB / cross-session job / global lock 全部排除到 V2。

以及 Metis Review 补充的召回算法结论（plan 行 60）：

> 召回算法 V1 = grep + frontmatter tag 过滤。

SDK spike 笔记（`packages/oc-tweaks/docs/sdk-spike-notes.md`）的调研范围是
OpenCode plugin 接口的注入点与通知通道；
spike 本身没有评估向量库可行性，也未找到 OpenCode 内置的嵌入 API。

V1 采用向量检索需要：
1. 一个本地嵌入模型（llama.cpp / ollama / 调用远端 API）或嵌入库（transformers.js）。
2. 向量索引的序列化与增量更新（memory 文件新增/修改时需要重新嵌入对应 chunk）。
3. 索引文件的位置管理与版本迁移。
4. 嵌入调用的延迟（本地模型需要加载时间，远端 API 引入网络依赖）。

这些依赖显著增加了安装体积与启动延迟，与 oc-tweaks 作为轻量 plugin 的定位不符。

## Decision

V1 召回实现为 grep + frontmatter tag 过滤，不引入任何嵌入模型或向量索引依赖。

具体流程：
1. 扫描 memory root 下所有 `*.md` 文件，解析 frontmatter（`frontmatter.ts`）。
2. 按 `disabled: true`、`scope` 不匹配当前项目等条件过滤。
3. 将 recall tool 收到的查询字符串做 case-insensitive 子串匹配，
   同时匹配 frontmatter `tags` 字段。
4. 按 `usage_count`（降序）+ 匹配命中数排序，返回前 N 个文件的 body。

查询词匹配在本地进程内完成，零网络调用，零额外依赖，召回延迟在文件数量 <100 时可忽略不计。

## Consequences

**正面**

- 安装体积不变，无嵌入模型下载或本地 inference 环境要求。
- 完全离线可用，不依赖第三方嵌入 API 的可用性或计费。
- 代码可读性高，grep 逻辑易于单测和调试。
- `tags` + `type` 字段给用户提供了手动干预召回的杠杆（不完全依赖算法）。

**负面**

- 语义相似但措辞不同的内容无法被召回（如"节流"和"rate limit"不互相匹配）。
- 文件数量增大（>500）时遍历开销会线性增长；需要关注实测性能。
- 无法做跨文件的语义聚合摘要；依赖用户手动维护 frontmatter `tags`。

**不受影响**

- Summary 注入路径（`experimental.chat.system.transform`，spike 笔记 §1 结论，行 31）不涉及召回算法。
- `usage_count` / `last_usage` 字段在 frontmatter schema 中预留，V2 向量方案可复用。

## Alternatives Considered

### 方案 A：transformers.js 本地嵌入

用 Hugging Face 的 `@xenova/transformers` 在进程内做嵌入，无需外部服务。

拒绝原因：包体积 ~500MB（含模型权重），首次加载需要数秒，与 plugin 轻量定位冲突；
模型选择本身需要额外 spike。

### 方案 B：调用 OpenCode 配置的 LLM API 生成嵌入

复用用户已配置的 LLM 后端（copilot-api / claude API）做嵌入。

拒绝原因：嵌入请求会消耗用户 API 额度；
OpenCode plugin SDK 目前没有暴露"在 recall 路径上调用 LLM"的非会话 API；
spike 未找到此接口（spike 笔记 §3 自定义 tool 接口，行 82-137 范围内无此能力）。

### 方案 C：SQLite FTS5 全文检索

用 `better-sqlite3` 或 Bun 内置 SQLite 做 FTS5 索引，精度优于 naive grep。

评估结论：V1 文件数量预期 <100，FTS5 的增量维护复杂度高于收益；
可作为 V2 性能优化路径，在不引入嵌入依赖的前提下提升匹配质量。

### 方案 D：V2 再做 embedding（本 ADR 采用）

V1 用 grep，V2 在用户量增加或文件量增大后再评估嵌入方案。
frontmatter 字段（`summary`、`tags`、`usage_count`）为 V2 迁移预留扩展点。
