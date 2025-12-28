# Proposal: Enhance improve-prompt and session-recall

## Why

### 1. improve-prompt 当前问题

| 问题 | 影响 |
|------|------|
| **缺少工具推荐** | 改写后不提示哪些 tool/skill/MCP 可能有帮助，用户需自行判断 |
| **触发条件隐式** | 没有借鉴 EARS 方法论的"触发条件显式化"优势 |
| **与 Gemini 版本差异** | Gemini 的 improve-prompt.toml 几乎相同，但两者都缺少工具推荐能力 |

**核心定位不变**: 我们的 improve-prompt 是"结构优化器"（保持原意），daymade/prompt-optimizer 是"需求规格化器"（扩展为 EARS）。两者目标不同，不应合并。

### 2. session-recall 当前问题

| 问题 | 影响 |
|------|------|
| **数据源过窄** | 仅查询 Memory MCP，忽略了 Project/User CLAUDE.md（自动加载但可能被遗忘） |
| **触发场景单一** | 仅针对"用户沮丧/重复"，不支持常规查询 |
| **与 session-learn 不对应** | session-learn 三层分类，但 recall 只查一层 |

## What Changes

### 变更 1: improve-prompt 增强

**新增功能**: 工具/技能推荐模块

在改写完成后，分析增强版提示词并推荐可能有帮助的 skill/tool/MCP：

```markdown
### 💡 推荐工具

基于任务分析，以下工具可能有帮助：
- `/openspec:proposal` - 任务涉及设计变更
- `sequential-thinking` - 任务涉及多步推理
- `mcp__memory__search_nodes` - 任务涉及历史知识
```

**保持不变**:
- "结构优化不扩展"的铁律
- 改写→执行的流程
- 输出格式

**借鉴 EARS 的一个点**: 在"隐含步骤显式化"时，可选择性地使用 EARS 的触发条件模式（When/While/If），但**不强制**，不改变原意。

### 变更 2: session-recall 全范围召回

| 维度 | 当前 | 目标 |
|------|------|------|
| 数据源 | Memory MCP | Project CLAUDE.md + User CLAUDE.md + Memory MCP |
| 触发场景 | 用户沮丧 | 任何召回需求（沮丧 + 常规查询） |
| 优先级 | 无 | Project > User > Memory（越具体越优先） |

**新增功能**: 三层召回
1. 先检查 Project CLAUDE.md（项目特定规则/约定）
2. 再检查 User CLAUDE.md（用户偏好/习惯）
3. 最后查询 Memory MCP（交互模式/历史经验）

**触发场景扩展**:
- 原有：用户沮丧（"你又忘了"、"我说过了"）
- 新增：常规查询（"有没有关于 X 的记录"、"之前怎么处理的"）

## References

### 本地参考
- `/mnt/d/code/prompts/plugins/improve-prompt/commands/improve-prompt.md`
- `/mnt/d/code/prompts/.gemini/commands/improve-prompt.toml`
- `/mnt/d/code/prompts/plugins/session-learn/skills/session-recall/SKILL.md`
- `/mnt/d/code/prompts/plugins/session-learn/skills/session-learning/SKILL.md`

### 外部参考 (daymade/claude-code-skills/prompt-optimizer)
- `SKILL.md` - EARS 六步优化流程，Role/Skills/Workflows/Examples/Formats 框架
- `ears_syntax.md` - EARS 五种模式（Ubiquitous, Event-driven, State-driven, Conditional, Unwanted）
- `domain_theories.md` - 40+ 理论映射 10 领域（Productivity, Behavior Change, UX, Security...）
- `examples.md` - 4 个完整转换示例
- `advanced_techniques.md` - 多利益相关者、非功能性需求、复杂条件逻辑

## Design Decisions

### 为什么不完全采用 EARS？

| 考量 | 决策 |
|------|------|
| 目标不同 | 我们是"结构优化"，EARS 是"需求规格化" |
| 铁律冲突 | EARS 会扩展范围（添加 When/If 条件），违反我们的"禁止扩展"原则 |
| 复杂度 | EARS 六步流程对简单提示词过重 |
| **折中方案** | 仅借鉴"触发条件显式化"思想，作为可选增强，不强制 |

### 为什么召回要三层？

| 层级 | 自动加载 | 需要 /recall |
|------|----------|--------------|
| Project CLAUDE.md | ✅ | 当用户说"你忘了项目规则" |
| User CLAUDE.md | ✅ | 当用户说"我偏好是什么" |
| Memory MCP | ❌ | 当需要历史经验/交互模式 |

虽然 CLAUDE.md 自动加载，但长对话中可能被"遗忘"（上下文窗口压力），/recall 提供主动刷新机制。

## Scope

- **In scope**:
  - `plugins/improve-prompt/commands/improve-prompt.md`
  - `plugins/session-learn/skills/session-recall/SKILL.md`
- **Out of scope**:
  - 其他插件
  - session-learn 的 /learn 命令
  - 底层存储机制

## Risks

| 风险 | 缓解措施 |
|------|----------|
| 工具推荐可能不准确 | 使用"推荐"而非"必须"的语气，让用户决定 |
| 三层查询可能过慢 | 按优先级顺序，找到相关内容即可停止 |
| CLAUDE.md 查找关键词困难 | 使用 section 标题匹配，而非全文搜索 |
