# Tasks: add-debate-plugin

> 按顺序执行的任务清单

## 准备阶段

- [ ] **T1: 创建插件目录结构**
  - 创建 `plugins/debate/.claude-plugin/`
  - 创建 `plugins/debate/commands/`
  - 创建 `plugins/debate/skills/dialectic-partner/`
  - 创建 `.debates/` 目录（辩论历史存储）
  - 添加 `.debates/.gitignore`（默认忽略辩论记录，用户可选择提交）
  - 验证：目录结构存在

## 元数据阶段

- [ ] **T2: 创建 plugin.json**
  - 路径：`plugins/debate/.claude-plugin/plugin.json`
  - 包含：name, version, description, author, license, repository
  - 遵循：auto-discovery 原则，不声明组件数组
  - 验证：`jq . plugin.json` 通过

## 命令阶段

- [ ] **T3: 创建 debate.md 命令**
  - 路径：`plugins/debate/commands/debate.md`
  - frontmatter：description
  - 内容：调用 dialectic-partner skill 的 3-Step 模式
  - 验证：frontmatter 可解析

## Skill 阶段

- [ ] **T4: 创建 SKILL.md**
  - 路径：`plugins/debate/skills/dialectic-partner/SKILL.md`
  - frontmatter：name, description
  - 核心内容：
    - 目的说明（发现盲点，不是赢）
    - 角色定义（批判性思考伙伴）
    - 动态代理选择指导
    - 用户参与时机（AskUserQuestion）
    - 辩论历史持久化流程
    - 使用 Task + resume 机制的指导
  - 保持简洁，信任模型能力
  - 验证：frontmatter 可解析

## 注册阶段

- [ ] **T5: 更新 marketplace.json**
  - 路径：`.claude-plugin/marketplace.json`
  - 添加 debate 插件条目
  - category: collaboration
  - 验证：JSON 有效

## 验证阶段

- [ ] **T6: 端到端验证**
  - 复制插件到缓存目录测试
  - 验证 /debate 命令可调用
  - 验证 skill 正确加载
  - 验证 Task + resume 机制工作
  - 验证 AskUserQuestion 交互正常
  - 验证辩论记录保存到 .debates/

## 依赖关系

```
T1 → T2 → T3 → T4 → T5 → T6
     ↓
   (T3, T4 可并行)
```

## 并行机会

- T3 (command) 和 T4 (skill) 可并行开发
- 两者都依赖 T2 (plugin.json) 完成
