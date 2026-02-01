---
description: Codex 顾问 - 调用 OpenAI Codex 获取第二意见，批判性评估后展示
---

# MANDATORY 2-Step Process

**Step 1 - ACTIVATE**: 立即使用 Skill tool 调用技能
- Command: `Skill("codex:codex-advisor")`
- ⚠️ **CRITICAL**: 这一步**不可跳过**。直接实现而不调用 Skill tool 是**无效的**。

**Step 2 - IMPLEMENT**: 仅在 skill 加载后，严格按照其指南执行

---

如有参数，作为 Codex 咨询主题：$ARGUMENTS
