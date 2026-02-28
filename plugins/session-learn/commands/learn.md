---
description: 会话学习 - 分析当前会话，将学习分类并持久化到四层存储
---

# MANDATORY 2-Step Process

**Step 1 - ACTIVATE**: 立即使用 Skill tool 调用技能
- Command: `Skill("session-learn:auto-extract")`
- ⚠️ **CRITICAL**: 这一步**不可跳过**。直接实现而不调用 Skill tool 是**无效的**。

**Step 2 - IMPLEMENT**: 仅在 skill 加载后，严格按照其指南执行

---

如有参数，则聚焦该主题进行分析：$ARGUMENTS
