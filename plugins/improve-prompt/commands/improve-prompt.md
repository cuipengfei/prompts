---
description: 优化提示词：识别意图（含隐含 NFR）、结构化改写、分级可验证 DoD，防止执行跑偏
---

# MANDATORY 2-Step Process

**Step 1 - ACTIVATE**: 立即使用 Skill tool 调用技能
- Command: `Skill("improve-prompt:improve-prompt")`
- ⚠️ **CRITICAL**: 这一步**不可跳过**。直接实现而不调用 Skill tool 是**无效的**。

**Step 2 - FOLLOW**: skill 加载后严格遵循其指南；是否执行增强版提示词，由 skill 的同消息授权规则决定

---

如有参数，作为需要优化的提示词：$ARGUMENTS
