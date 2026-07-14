# Chapter 2: Fitness Functions

## Core Idea
借用 evolutionary computing 的概念，**architectural fitness functions** 为 architectural characteristics 提供客观的完整性评估，避免系统在演进过程中让这些特征逐步退化。

## Frameworks Introduced
- **Architectural Fitness Function**: 对某个或某组 architectural characteristic(s) 进行客观完整性评估。它可以是 tests、metrics、monitoring——任何能验证 architecture 没有朝糟糕方向变化的机制都算。
  - When to use: 对每一个你想保护的重要 architectural characteristic 都应该使用
  - How: 识别 characteristic → 定义可度量的 objective → 接入 deployment pipeline

- **Systemwide Fitness Function**: 由一组 individual fitness functions 组成的统一视图。它用来比较和排序彼此竞争的特征之间的 tradeoffs（例如 performance vs. security）。
  - When to use: 当 architecting 需要权衡多个相互竞争的 "-ilities" 时
  - How: 它不会被直接 "evaluated"——而是作为 decision prioritization 的指导框架

- **Fitness Function Categories** (6 axes):
  - **Scope: Atomic vs. Holistic**: 在单一上下文中测试，还是在共享上下文中测试组合效应
  - **Cadence: Triggered vs. Continual vs. Temporal** (NEW: Temporal 独立): 由事件触发验证，持续不断验证，或基于时间维度检查（如 library staleness、break-upon-upgrade）。2nd edition 中 Dependabot/snyk 是 temporal FFs 的典型工具
  - **Result: Static vs. Dynamic**: 结果固定，还是定义会随上下文变化
  - **Invocation: Automated vs. Manual**: 由 pipeline 驱动，还是由人类验证（例如 regulatory）
  - **Proactivity: Intentional vs. Emergent**: 在项目初期定义，还是在开发中逐渐发现
  - **Coverage: Architecture vs. Domain**: fitness functions 通常只覆盖 architecture characteristics；domain behavior 应继续由 domain tests 验证

## Key Concepts
- **Tradeoffs**: architect 最头痛的问题——fitness functions 让 tradeoffs 变得显性、可比较
- **Synthetic Transactions**: 模拟真实用户行为并持续执行，用于 continual fitness functions；其 scope 取决于被验证的 architecture characteristic
- **Temporal FFs 工具**: Dependabot（GitHub）、snyk——自动检测依赖过期和已知漏洞，是 temporal cadence FFs 的典型工具

## Mental Models
- 把 fitness functions 想成 **dog breeding，而不是 random mutation**——这是带约束的 guided evolution，会主动限制不想要的方向
- 使用 **apples-to-apples** 模型：fitness functions 把 security、performance、scalability 等看似不同的关注点统一到一种机制里，因此才能横向比较
- 把每个 fitness function 看成某种 "-ility" 的 **protection mechanism**——每一个都在防止某个 characteristic 退化

## Code Example
**ArchUnit cycle fitness function**（根据本章示例精简）:
```java
slices().matching("..penultimate.(*)..")
    .should().beFreeOfCycles();
```
当 package dependency 形成 cycle 时，测试失败；architecture rule 因而成为可执行 artifact。

## Key Takeaways
1. Fitness functions = 对 architectural characteristics 的 objective integrity assessment
2. 不是所有 tests 都是 fitness functions——只有验证 architecture characteristics 的才算
3. 六个 category axes 能帮助你分类并组合 fitness functions
4. 应尽早识别 fitness functions，也要允许 emergent FF 在 stress point 出现后补入
5. Manual fitness functions 也是有效的（例如 regulatory certification）——能自动化就自动化，但不要因为不能自动化就跳过

## Connects To
- **Ch 1**: Fitness functions 提供 evolutionary architecture 定义里的 "guided"
- **Ch 3**: Deployment pipelines 会把 fitness functions operationalize——定义跑哪些、何时跑、跑多频繁
- **Ch 4**: Governance 自动化——FFs 作为代码度量、工具链和 pipeline 治理的执行层
- **Ch 7**: Fitness functions 是构建 evolutionary architecture 的 3-step mechanics 里的第 2 步
- **Ch 8**: 不恰当的 governance 可能制造出过多或错误的 fitness functions
