---
description: 优化提示词 - 识别真实意图并结构化改写，补充可验证 Definition of Done，防止执行方向跑偏
---

# MANDATORY 2-Step Process

**Step 1 - ACTIVATE**: 立即使用 Skill tool 调用技能
- Command: `Skill("improve-prompt:improve-prompt")`
- ⚠️ **CRITICAL**: 这一步**不可跳过**。直接实现而不调用 Skill tool 是**无效的**。

**Step 2 - IMPLEMENT**: 仅在 skill 加载后，严格按照其指南执行

---

如有参数，作为需要优化的提示词：$ARGUMENTS
