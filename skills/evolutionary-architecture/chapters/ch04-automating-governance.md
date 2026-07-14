# Chapter 4: Automating Architectural Governance

## Core Idea
Fitness functions 就是 governance 的自动化机制——把架构约束从文档变成可执行、可度量的代码。2nd edition 将 governance 从 ch09 的组织层面提到独立章节，展示如何用代码度量、工具链和 deployment pipeline 自动化架构治理。

## Frameworks Introduced
- **Fitness Functions as Governance**: FFs 不是事后检查，而是 governance 的执行层。历史脉络：XP → CI → DevOps → governance automation。
  - When to use: 当架构约束需要持续执行而非依赖 review 时
  - How: 为每条约束定义可度量的 FF，嵌入 pipeline

- **Code-Based Fitness Functions**: 用代码度量指标作为架构 FFs。
  - Afferent coupling (Ca): 入向依赖数（被多少组件依赖）
  - Efferent coupling (Ce): 出向依赖数（依赖多少组件）
  - Abstractness (A): 抽象类/接口比例，`A = Na / (Na + Nc)`
  - Instability (I): `I = Ce / (Ca + Ce)`，I=0 完全稳定，I=1 完全不稳定
  - Distance from main sequence: `D = |A + I - 1|`，D=0 在主序列上（理想），D=1 在极端区
  - When to use: 评估模块设计的平衡性
  - How: 用 JDepend 等工具计算，画在 A vs I 散点图上

- **Zones of Pain / Zones of Uselessness**: A-I 图上的两个危险区域。
  - Zone of Pain: 高稳定+低抽象（I≈0, A≈0）——大量 concrete code 被许多组件依赖，因而难以修改
  - Zone of Uselessness: 高不稳定+高抽象（I≈1, A≈1）——抽象了但没人依赖
  - When to use: 评估架构组件是否放在了错误的位置

- **Directionality of Imports**: 架构依赖方向应由项目定义并通过工具持续验证；JDepend 与 ArchUnit 可把 directionality rule 变成 fitness function。
  - When to use: 分层架构中防止依赖倒流

- **"Herding" Governance**: 先以 warning 引入 metric threshold，再随代码改善逐步收紧阈值，最终把超限升级为 error。
  - When to use: 现有 codebase 无法立即满足目标阈值、但需要持续朝目标收敛时

- **Fidelity Fitness Functions**: 用 GitHub Scientist framework 对比新旧实现的行为一致性。先并行运行两套实现，收集差异，确认无 fidelity 问题后再切换。
  - When to use: 重构关键路径时验证行为不变
  - How: Scientist framework 同时调用旧路径和新路径，比对返回值

- **Documenting Fitness Functions**: FFs 应该被文档化以便团队理解。
  - ADR (Architecture Decision Records): 记录为什么定义这个 FF
  - Cucumber/BDD: 用 Given-When-Then 格式描述 FF 行为
  - Jupyter notebooks + jQAssistant + Neo4j: 用图查询分析代码结构
  - When to use: FF 数量增多后需要可追溯的文档

## Key Concepts
- **Governance vs Review**: 传统 governance 依赖人工 review（bottleneck），自动化 governance 用 FF 嵌入 pipeline
- **Turnkey Governance Tools**: 开箱即用的治理工具
  - **Black Duck**: 开源许可证合规扫描
  - **Pa11y**: 可访问性 (A11y) 自动化检查
  - **ArchUnit (Java)**: 包依赖、类依赖、继承关系、注解检查、layer 分层验证
  - **NetArchTest (.NET)**: ArchUnit 的 .NET 对应物
- **Linters as Governance**: ESLint (JS)、Cpplint (C++)、Staticcheck (Go)、sql-lint (SQL)——每个 linter 规则都是一条 governance FF
- **Chaos Engineering as DevOps Governance**: Netflix Simian Army
  - Chaos Monkey: 随机杀实例
  - Chaos Gorilla: 模拟整个 data center 故障
  - Chaos Kong: 模拟整个 availability region 故障
  - Doctor Monkey: 检查 instance health
  - Latency Monkey: 注入通信延迟
  - Janitor Monkey: 清理未使用资源
  - Conformity Monkey: 检查服务是否符合组织约定与治理规则
  - Security Monkey: 安全配置检查
  - Swabbie: 自动清理废弃资源（auto-disintegration）
- **Frozen Caveman Antipattern**: 过去事故形成的风险规则被永久固化；团队忘记原始情境，却继续阻止合理变化

## Mental Models
- 把 governance 想成 **pipeline stage 而非 committee meeting**：FF 在 pipeline 中执行，失败就阻断部署
- 用 **checklist 而非 stick** 来理解 FFs：FFs 不是惩罚工具，是帮团队做正确事的 checklist
- 把 **linting 规则当作最细粒度的 governance**：每条 lint rule = 一条 architectural fitness function

## Code Examples
**ArchUnit — layer dependency check (Java):**
```java
noClasses().that().resideInAPackage("..controller..")
    .should().dependOnClassesThat().resideInAPackage("..repository..");
```
- **What it demonstrates**: 用代码声明 controller 不能直接依赖 repository，强制经过 service 层

**ArchUnit — package dependency cycle prevention:**
```java
slices().matching("..penultimate.(*)..").should().beFreeOfCycles();
```
- **What it demonstrates**: 防止包之间出现循环依赖

## Worked Examples
- **Availability experiment**: 先测量 legacy system 的真实 availability，再用结果决定应自动化哪些保护，而不是先发明脱离现状的 SLA。
- **Canary load testing**: 把 load test 与 canary release 结合，在扩大流量前验证 scaling behavior。
- **What to port**: 通过 logging 收集 legacy feature 的实际使用数据，优先迁移仍有价值的行为。
- **Fidelity FF**: GitHub Scientist 同时执行 control 与 candidate，向用户返回 control，并记录结果差异；只有达到可接受 fidelity 后才切换。

## Key Takeaways
1. Fitness functions = governance 的自动化执行层，替代人工 review bottleneck
2. 代码度量（coupling、abstractness、instability）可量化为 FFs，用工具自动检查
3. A-I 散点图上的 Zone of Pain / Uselessness 帮你发现设计缺陷
4. ArchUnit 等工具可在测试阶段强制执行分层架构约束
5. Linters 是最细粒度的 governance——每条规则都是一条 FF
6. Chaos Engineering 用故障注入验证 resilience FFs
7. Scientist framework 提供 fidelity FFs——重构时的行为一致性验证
8. FFs 应该被文档化（ADR、BDD、notebook），以便团队理解为什么存在
9. FFs 是 checklist 不是 stick——帮团队做正确事，不是惩罚工具
10. Frozen Caveman 警告团队不要把过去事故形成的规则脱离情境永久固化

## Connects To
- **Ch 2**: Fitness functions 的分类体系在此被 operationalize
- **Ch 3**: Deployment pipeline 是 FFs 的执行环境
- **Ch 5**: 代码度量指标关联到 architectural quantum 和 connascence
- **Ch 7**: 8 guidelines 中的 "Build Anticorruption Layers" 是 governance 的一种形式
- **Ch 8**: Frozen Caveman antipattern 在此章引入，ch08 进一步展开
