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

- **Consumer-Driven Contracts** (2nd ed 强化): 消费者定义期望的 API 契约，提供者验证是否满足。Pact 是典型工具。
  - When to use: 微服务间集成，避免提供者变更破坏消费者
  - How: 消费者写 contract test → 提供者在 pipeline 中验证 contract → 契约不匹配则阻断部署

- **API Consistency Validation** (2nd ed 新增): 把 API consistency checks 作为 deployment pipeline 的多个验证阶段；Spectral 可 lint OpenAPI specification，OpenAPI.Tools 汇集相关工具。
  - When to use: API 数量增多后保持设计一致性
  - How: 定义 API style guide → 用 Spectral 在 CI 中 lint OpenAPI spec

- **Auto-Disintegration** (2nd ed 新增): 自动发现并清理不再使用的 infrastructure resources；Swabbie 是书中的实现例子。
  - When to use: 微服务生态中服务生命周期管理
  - How: 检测未使用资源 → 通知 owner → 超期自动清理

## Key Concepts
- **Continuous Deployment**: 只要 pipeline 成功就自动部署到 production——这是理想状态，但需要高度成熟的协调机制
- **QA in Production** (2nd ed 强调): 不只在 staging 测试，而是在 production 中用 feature toggles、synthetic transactions 和 canary releases 持续验证
- **Service Discovery**: 微服务自动发现彼此位置的机制——让增量部署不需要硬编码 endpoint

## Mental Models
- 把 deployment pipeline 看成 evolutionary architecture 的 **central nervous system**——所有 fitness functions 都通过它汇报
- 用 nested feedback loops 思考 pipeline：便宜、快速的检查先执行，昂贵或人工检查后执行

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

## Key Takeaways
1. Deployment pipelines（不是单纯的 CI servers）才是承载 fitness functions 的正确机制
2. 不同 fitness function category 的组合（atomic+triggered、holistic+continual 等）会映射到不同 pipeline stages
3. Feature toggles 让 deployment 与 release 解耦，从而可以在 production 做 QA
4. Consumer-driven contracts 让 provider change 在破坏 consumer 前被 pipeline 捕获
5. Manual pipeline stages 完全合理——它们能让 bottleneck 变得可见，并且可与 automated stages 横向比较

## Connects To
- **Ch 2**: Fitness function categories（atomic/holistic × triggered/continual）决定它们应该放在哪个 pipeline stage
- **Ch 4**: Governance 自动化——FFs 嵌入 pipeline 成为可执行的 governance
- **Ch 5**: Incremental change 需要小型 architectural quanta——service granularity 很关键
- **Ch 7**: Deployment pipelines 是 3-step mechanics 里的第 3 步
- **Ch 8**: Cycle time 本身可成为 process fitness function
