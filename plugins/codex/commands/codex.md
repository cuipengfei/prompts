---
description: Codex 顾问 - 调用 OpenAI Codex 获取第二意见，批判性评估后展示
---

# MANDATORY 3-Step Process

**Step 1 - EVALUATE**: 确认此 skill 适用于当前任务
- Answer: YES - 用户请求 Codex 第二意见/审查/评估

**Step 2 - ACTIVATE**: 使用 Skill tool 调用技能
- Command: `Skill("codex:codex-advisor")`
- ⚠️ **CRITICAL**: 这一步**不可跳过**。直接实现而不调用 Skill tool 是**无效的**。

**Step 3 - IMPLEMENT**: 仅在 skill 加载后，严格按照其指南执行

---

如有参数，作为 Codex 咨询主题：$ARGUMENTS
