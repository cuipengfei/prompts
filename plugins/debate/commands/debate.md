---
description: 辩论插件 - 主代理与子代理进行结构化辩论，发现盲点、探索多角度视角
---

# 强制 2 步流程

**第 1 步 - 激活**: 立即使用 Skill tool 调用技能
- 命令: `Skill("debate:dialectic-partner")`
- **关键**: 这一步不可跳过。直接实现而不调用 Skill tool 是无效的。

**第 2 步 - 执行**: 仅在 skill 加载后，严格按照其指南执行

---

如有参数，作为辩论主题：$ARGUMENTS

## 使用示例

```
/debate "我们应该用 microservices 还是 monolith？"
/debate  # 无参数时会询问主题
```

## 辩论流程

1. 主代理陈述初始观点
2. 子代理质疑和挑战
3. 多轮来回辩论
4. 通过 AskUserQuestion 让用户参与
5. 最终总结洞察和决策
