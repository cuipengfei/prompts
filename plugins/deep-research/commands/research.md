---
description: 深度研究 - 多源搜索、交叉验证、结构化输出
---

# 强制 2 步流程

**第 1 步 - 激活**: 立即使用 Skill tool 调用技能
- 命令: `Skill("deep-research:multi-source-inquiry")`
- **关键**: 这一步不可跳过。直接实现而不调用 Skill tool 是无效的。

**第 2 步 - 执行**: 仅在 skill 加载后，严格按照其指南执行

---

如有参数，作为研究主题：$ARGUMENTS

## 使用示例

```
/research "Temporal vs Inngest 对比"
/research "2025 年 RAG 最佳实践"
/research  # 无参数时会询问研究主题
```
