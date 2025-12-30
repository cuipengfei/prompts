---
description: 会话学习 - 分析当前会话，将学习分类并持久化到三层存储
---

# MANDATORY 3-Step Process

**Step 1 - EVALUATE**: 确认此 skill 适用于当前任务
- Answer: YES - 用户请求会话学习/分析/持久化

**Step 2 - ACTIVATE**: 使用 Skill tool 调用技能
- Command: `Skill("session-learn:session-learning")`
- ⚠️ **CRITICAL**: 这一步**不可跳过**。直接实现而不调用 Skill tool 是**无效的**。

**Step 3 - IMPLEMENT**: 仅在 skill 加载后，严格按照其指南执行

---

如有参数，则聚焦该主题进行分析：$ARGUMENTS
