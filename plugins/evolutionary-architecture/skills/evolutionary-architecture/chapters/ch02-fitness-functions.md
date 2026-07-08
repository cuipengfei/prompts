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

- **Fitness Function Categories** (7 axes):
  - **Atomic vs. Holistic**: 在单一上下文中测试，还是在共享上下文中测试组合效应
  - **Triggered vs. Continual**: 由事件触发验证，还是持续不断地验证
  - **Static vs. Dynamic**: 结果固定，还是定义会随上下文变化
  - **Automated vs. Manual**: 由 pipeline 驱动，还是由人类验证（例如 regulatory）
  - **Temporal**: 基于时间的检查（例如 library staleness、break-upon-upgrade）
  - **Intentional vs. Emergent**: 在项目初期定义，还是在开发中逐渐发现
  - **Domain-specific**: 某些特殊领域关注（security、regulatory）

## Key Concepts
- **Tradeoffs**: architect 最头痛的问题——fitness functions 让 tradeoffs 变得显性、可比较
- **Key/Relevant/Not Relevant**: 用于给 fitness functions 排优先级的分类——Key 维度决定 architecture 选择；Relevant 在 feature 级别考虑；Not Relevant 不影响设计
- **Fitness Function Review**: 定期会议（至少每年一次）用来更新 fitness functions——检查 relevancy、scale、measurement approaches，并发现新的 fitness functions

## Mental Models
- 把 fitness functions 想成 **dog breeding，而不是 random mutation**——这是带约束的 guided evolution，会主动限制不想要的方向
- 使用 **apples-to-apples** 模型：fitness functions 把 security、performance、scalability 等看似不同的关注点统一到一种机制里，因此才能横向比较
- 把每个 fitness function 看成某种 "-ility" 的 **protection mechanism**——每一个都在防止某个 characteristic 退化

## Worked Example
**PenultimateWidgets' Enterprise Spreadsheet**: architect 把期望的 characteristics（scalability、security、resiliency 等）列在 spreadsheet 里。问题是：开发者持续加 feature 时，怎么确保这些特征不退化？方案是：为每个 concern 建立 fitness functions，把它们重写成满足 objective evaluation criteria 的形式，并接入 deployment pipeline。这样一来，不再依赖偶尔的 ad hoc verification，而是每次代码变更都会触发 automated fitness function checks。

Example fitness function（原书 JDepend 示例重构，非原文照搬）:
```java
// Reconstructed example: 原书 Ch 2 用 JDepend 验证 package 依赖方向性
// 此处为精简重构，保留核心 API 调用结构，非逐行复制原文
public void testMatch() {
    DependencyConstraint constraint = new DependencyConstraint();
    JavaPackage persistence = constraint.addPackage("com.xyz.persistence");
    JavaPackage web = constraint.addPackage("com.xyz.web");
    JavaPackage util = constraint.addPackage("com.xyz.util");
    persistence.dependsUpon(util);
    web.dependsUpon(util);
    jdepend.analyze();
    assertEquals("Dependency mismatch", true, jdepend.dependencyMatch(constraint));
}
```
如果开发者不小心从 persistence import 到 util，这个 unit test 会在 commit 前失败——也就是说，architecture violation 会被当成可执行 artifact 捕获，而不是落成一套官僚式 guideline。

## Key Takeaways
1. Fitness functions = 对 architectural characteristics 的 objective integrity assessment
2. 不是所有 tests 都是 fitness functions——只有验证 architecture characteristics 的才算
3. 七个 category axes 能帮助你分类并组合 fitness functions
4. 用 Key/Relevant/Not Relevant 分类，给设计精力排优先级
5. 应尽早识别 fitness functions——越早识别，越能优先处理高风险工作
6. 至少每年 review 一次 fitness functions——业务变化会要求它们同步更新
7. Manual fitness functions 也是有效的（例如 regulatory certification）——能自动化就自动化，但不要因为不能自动化就跳过

## Connects To
- **Ch 1**: Fitness functions 提供 evolutionary architecture 定义里的 "guided"
- **Ch 3**: Deployment pipelines 会把 fitness functions operationalize——定义跑哪些、何时跑、跑多频繁
- **Ch 6**: Fitness functions 是构建 evolutionary architecture 的 3-step mechanics 里的第 2 步
- **Ch 7**: 不恰当的 governance 可能制造出过多或错误的 fitness functions
