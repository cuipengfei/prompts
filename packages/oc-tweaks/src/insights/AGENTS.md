# AGENTS.md — oc-tweaks insights

`src/insights/` 是 `oc-tweaks` 中最独立的子域：负责从 OpenCode session 数据采集、提取 facets、聚合统计、生成 section、渲染 HTML 报告并导出命令返回值。

## OVERVIEW

这不是薄入口层，而是一条完整 pipeline：collector → facets/cache → aggregator → generator → renderer/export → handler。

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| SQLite 采集 | `collector.ts` | 只读 OpenCode DB，别改 schema |
| facets 提取与过滤 | `facets.ts` / `cache.ts` | 缓存与“是否值得分析”逻辑在这里 |
| 全局聚合 | `aggregator.ts` | 汇总 cross-session 指标 |
| LLM section 生成 | `generator.ts` / `prompts/` | prompt 文案与 section 生成分离 |
| HTML 报告 | `renderer.ts` | dark/light 报告与图表生成 |
| 总编排 | `handler.ts` | pipeline、缓存命中、进度上报 |
| 插件入口 | `../plugins/insights.ts` | 这里只做 tool wiring |
| 集成验证 | `../__tests__/insights/` | tests 很集中，优先跟着读 |

## CONVENTIONS

- 优先保持 pipeline 分层，不要把 SQL、HTML、LLM prompt、OpenCode tool wiring 混进同一文件。
- `handler.ts` 负责 orchestration，不应吞并 renderer / collector / generator 的细节实现。
- `renderer.ts` 生成静态 HTML 字符串；文案转义与少量 markdown-like 格式处理要留在渲染层。
- `collector.ts` 面向 OpenCode SQLite：只读、容错、聚焦 session/message/part 三张表。
- `prompts/` 目录只存 LLM 提示模板，不放业务控制流。
- 这条链路已经有大量专属测试；改动优先补或改 `src/__tests__/insights/*`，不要只靠手工读 HTML。

## VALIDATION

```bash
bun test --cwd packages/oc-tweaks src/__tests__/insights
bun test --cwd packages/oc-tweaks --grep "insights"
bun run build --cwd packages/oc-tweaks
```

## ANTI-PATTERNS

- 不要修改 OpenCode SQLite DB；这里只读查询。
- 不要把 `insights` 内部元会话重新计入统计结果。
- 不要把 `renderer.ts` 变成数据聚合器，或把 `collector.ts` 变成 HTML 生成器。
- 不要在插件入口 `src/plugins/insights.ts` 堆业务逻辑；它应保持薄封装。
