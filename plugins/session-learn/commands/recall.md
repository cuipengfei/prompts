---
description: 会话召回 - 查询 Memory MCP 召回历史学习，用于 Claude Code 似乎忘记了什么的时候
---

# MANDATORY 3-Step Process

**Step 1 - EVALUATE**: 确认此 skill 适用于当前任务
- Answer: YES - 用户请求召回历史学习/你似乎忘记了之前学过的东西

**Step 2 - ACTIVATE**: 使用 Skill tool 调用技能
- Command: `Skill("session-learn:knowledge-fetch")`
- ⚠️ **CRITICAL**: 这一步**不可跳过**。直接实现而不调用 Skill tool 是**无效的**。

**Step 3 - IMPLEMENT**: 仅在 skill 加载后，严格按照其指南执行

---

用户调用此命令可能是因为感到烦躁——你似乎忘记了之前学过的东西。
不要让他们重复解释，自己找到相关上下文。

如有参数，将其作为搜索主题：$ARGUMENTS
