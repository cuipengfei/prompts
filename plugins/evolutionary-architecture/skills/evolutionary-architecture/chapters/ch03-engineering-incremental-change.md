# Chapter 3: Engineering Incremental Change

## Core Idea
Incremental change——无论发生在 development 还是 deployment——都是 evolutionary architecture 的机械引擎。Continuous Delivery practices（deployment pipelines、service discovery、feature toggles）是前提条件，只有具备这些机制，architecture 才能安全演进。

## Frameworks Introduced
- **Deployment Pipeline**: 一种多阶段 build mechanism（不只是 CI），通过越来越复杂的 stage 验证系统是否具备 production readiness。每个 stage 都可以运行 fitness functions。
  - When to use: 始终都该使用——它是自动执行 fitness functions 的基础机制
  - How: 把验证任务拆进不同 stage：unit tests → container build → atomic FFs → holistic FFs → manual gates → deploy

- **Fan Out / Fan In**: pipeline 并行运行多个验证作业（fan out），再汇总结果（fan in）做 deployment decision。
  - When to use: 当一次 change 必须同时在多个 scenario 下被验证时
  - How: pipeline 触发并行 jobs（测试 current state + 测试 future state）→ 统一评估 → 汇总

- **Feature Toggles**: 把新功能藏在 production 中的可配置 flag 后面，让团队可以在 production 做 QA，并把 deployment 与 release 解耦。
  - When to use: 当 business 想 staged release，而 engineering 想 continuous deployment 时
  - How: 部署代码但先关闭 feature → 只把 QA 用户路由过去 → 在 production 测试 → 准备好后打开 toggle

- **Hypothesis-Driven Development**: 把 feature change 表述成 hypothesis（“如果我们把图片做大，销量会提升 5%”），再通过 A/B experiments 验证。
  - When to use: 当你不想只靠 business analyst intuition 来决定 feature 时
  - How: Hypothesis → experiment → measure → validate or reject

- **Scientist Framework** (GitHub): 在 production 中让新代码与旧代码并行运行，并比较结果。对用户始终返回旧行为；如果有差异则记录下来供分析。
  - When to use: 以高 deployment frequency 重构关键基础设施、同时又要保持高信心时
  - How: `use` block（control/old）+ `try` block（candidate/new）→ Scientist 比较、记录，并返回 control value

## Key Concepts
- **4D Architecture**: 2D（diagram）→ 3D（specific technologies）→ 4D（随时间演进）。"Architecture is abstract until operationalized, when it becomes a living thing."
- **Continuous Deployment**: 只要 pipeline 成功就自动部署到 production——这是理想状态，但需要高度成熟的协调机制
- **Monitoring-Driven Development (MDD)**: 不只靠 tests，而是使用 production monitors 来评估技术健康度与业务健康度
- **Cycle Time**: 一个工作单元从启动到完成的 elapsed time——这是与演进速度成反比的关键指标（cycle time 越短，evolution 越快）

## Mental Models
- 把 deployment pipeline 看成 evolutionary architecture 的 **central nervous system**——所有 fitness functions 都通过它汇报
- 把 **GitHub's Scientist** 当成 holistic continual fitness functions 的样板——新旧并跑、对比结果
- 思考 **nested feedback loops**：testing → CI → iterations → 与真实用户进行 hypothesis experiments

## Worked Example
**PenultimateWidgets' Invoicing Service Pipeline**（6 个 stages）：
1. **Replicating CI** —— unit + functional tests
2. **Containerize and Deploy** —— build containers，部署到 test environment
3. **Atomic Fitness Functions** —— scalability tests、security penetration testing、auditability metrics
4. **Holistic Fitness Functions** —— 针对 integration points 做 contract testing，以及进一步的 scalability tests
5a. **Security Review** (manual) —— 由 security group review code
5b. **Auditing** (manual) —— 由州法规要求的独立 accountant 做验证
6. **Deployment** —— automated，只有当前两个 manual stages 都通过后才会触发

每周会自动生成 report，追踪 fitness function 的 success/failure rates、health 和 cadence。把 security 与 audit 都放进 pipeline stage 后，瓶颈会变得可见——如果 audit 每月一次，而 security 每周一次，那么更快发布的真正约束显然就是 audit stage。

**GitHub's merge refactoring**: 他们把基于 shell-script 的 Git merge 替换成 libgit2。过渡期间用 Scientist 在 1% traffic 上并行运行新实现，持续 4 天。连续 24 小时 zero mismatches 后，旧代码被删除。整个过渡期间，他们仍然保持每天 60 次 deployment。

## Key Takeaways
1. Deployment pipelines（不是单纯的 CI servers）才是承载 fitness functions 的正确机制
2. 不同 fitness function category 的组合（atomic+triggered、holistic+continual 等）会映射到不同 pipeline stages
3. Feature toggles 让 deployment 与 release 解耦，从而可以在 production 做 QA
4. Hypothesis-driven development 把 users 纳入 feedback loop
5. Scientist-style refactoring 会把 legacy code 变成一致性测试——这是改动 critical path 最安全的方式
6. Manual pipeline stages 完全合理——它们能让 bottleneck 变得可见，并且可与 automated stages 横向比较

## Connects To
- **Ch 2**: Fitness function categories（atomic/holistic × triggered/continual）决定它们应该放在哪个 pipeline stage
- **Ch 4**: Incremental change 需要小型 architectural quanta——service granularity 很关键
- **Ch 6**: Deployment pipelines 是 3-step mechanics 里的第 3 步
- **Ch 7**: Cycle time 与 evolution speed 成反比（v ∝ 1/c）——它本身也是一个关键的 process fitness function
