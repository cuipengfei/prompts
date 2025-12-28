# Design: enhance-prompt-and-recall

## 1. improve-prompt 工具推荐模块设计

### 推荐逻辑

基于关键词匹配任务类型，推荐相关工具：

```
任务关键词 → 推荐工具映射

| 关键词模式 | 推荐工具 | 理由 |
|------------|----------|------|
| proposal, spec, design, plan | `/openspec:proposal` | 涉及设计变更 |
| complex, multi-step, analyze | `sequential-thinking` | 需要多步推理 |
| history, previous, remember | `mcp__memory__*` | 涉及历史知识 |
| learn, recall | `/session-learn:*` | 涉及会话学习 |
| commit, pr, push | `/commit-commands:*` | 涉及版本控制 |
| test, tdd, verify | `tdd-workflows` | 涉及测试 |
| explore, understand, codebase | `Explore agent` | 涉及代码探索 |
```

### 输出格式

```markdown
### 💡 推荐工具

基于任务分析，以下工具可能有帮助：
- `/openspec:proposal` - 任务涉及设计变更
- `sequential-thinking` - 任务涉及多步推理

*这些是建议，非必须。根据实际情况选择使用。*
```

### 集成位置

在现有"🔍 改进说明"之后添加：

```markdown
### 🔍 改进说明
- **结构优化**: ...
- **逻辑补充**: ...

### 💡 推荐工具
- ...

---

## 执行改写后的任务
...
```

## 2. session-recall 三层召回设计

### 架构

```
/recall [关键词]
    │
    ├─ Layer 1: Project CLAUDE.md
    │   └─ 搜索: {repo}/CLAUDE.md 或 {repo}/.claude/CLAUDE.md
    │   └─ 匹配: section 标题 + 关键词
    │
    ├─ Layer 2: User CLAUDE.md
    │   └─ 搜索: ~/.claude/CLAUDE.md
    │   └─ 匹配: section 标题 + 关键词
    │
    └─ Layer 3: Memory MCP
        └─ 工具: mcp__memory__search_nodes
        └─ 匹配: entity name + observations
```

### 查询优先级

1. **Project CLAUDE.md** (最具体)
   - 项目特定规则、约定、工具链
   - 示例："这个项目用 Vitest 测试"

2. **User CLAUDE.md** (用户级)
   - 跨项目偏好、习惯
   - 示例："用户偏好 bun 而非 npm"

3. **Memory MCP** (历史经验)
   - 交互模式、问题解决方法
   - 示例："调试时先查日志"

### 触发场景扩展

| 场景 | 示例 | 处理 |
|------|------|------|
| 用户沮丧 | "你又忘了"、"我说过了" | 主动道歉 + 召回 |
| 常规查询 | "有没有关于 X 的记录" | 直接召回 |
| 主动刷新 | "/recall" (无参数) | 展示所有层级摘要 |

### 输出格式

```markdown
## 召回结果

### 📁 项目规则 (CLAUDE.md)
找到 2 条相关规则：
- **Plugin Development**: plugin.json 不需要 skills 数组...
- **Communication**: 用户交流使用中文...

### 👤 用户偏好 (~/.claude/CLAUDE.md)
找到 1 条相关偏好：
- **包管理器**: 优先使用 bun 而非 npm

### 🧠 历史经验 (Memory MCP)
找到 1 条相关记录：
- **interaction_pattern**: 动手前先问清楚需求

---

**应用到当前情况**: 基于这些召回，我会...
```

## 3. 与 session-learn 的一致性

| session-learn 分类 | session-recall 查询 |
|--------------------|---------------------|
| Project CLAUDE.md | Layer 1 |
| User CLAUDE.md | Layer 2 |
| Memory MCP | Layer 3 |

确保双向一致：学习时分类到哪层，召回时就从哪层查询。
