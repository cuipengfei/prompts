# Chapter 8: Putting Evolutionary Architecture into Practice

## Core Idea
要真正落地 evolutionary architecture，需要组织结构变化（cross-functional teams、product over project）、文化转向（experiment、ownership），以及业务层对齐（把 cycle time 当指标、构建 enterprise fitness functions）。最好的切入点，是从最痛的地方开始。

## Frameworks Introduced
- **Cross-Functional Teams**: 围绕 domain 组织团队，并把所有角色（BA、dev、QA、DBA、ops）放进同一个 team —— 这样可以消除 silo 之间的 coordination friction。
  - When to use: 当你在为 evolutionary architecture 设计团队结构时
  - How: 让 team mirror service boundaries（Inverse Conway Maneuver）；所有角色尽量齐备；若 shared resources 有限，就轮转分配

- **Product over Project**: Products 是长期存在的，应该由持续稳定的 teams 负责；projects 结束后再 hand off 给 ops 的模式，会把质量责任切断。Product teams 要长期拥有质量责任。
  - When to use: 当组织要从 project-based 转向 product-based 时
  - How: 让 cross-functional team 持续跟随 product；由 product owner 进行业务倡导；贯彻 "you build it, you run it"

- **Consumer-Driven Contracts**: Consumer 先写出自己需要 provider 满足的 tests；provider 承诺持续让这些 tests 通过。这是一种 atomic integration fitness function。
  - When to use: 当 services 彼此集成、又希望独立演进时
  - How: Consumer 编写 test suite → 交给 provider → provider 同时运行所有 consumers 的 tests 和自己的 tests → 只要 tests 通过，就可以自由演进

- **Team Connection Formula**: `connections = n(n-1)/2` —— team size 增长时，connections 会按平方级增长。20 人 = 190 条连接；50 人 = 1225 条连接。
  - When to use: 当你在决定 team size 时
  - How: 保持 teams 小而精（Amazon 的 "two-pizza" rule）；同时让 team 足够 cross-functional，以消除 silo friction

- **Where to Start** (4 approaches):
  1. **Low-Hanging Fruit**: 先做最容易的变化 —— 用来建立信心、势能和 proof
  2. **Highest-Value**: 先打最关键的业务区域 —— 风险最高，但收益也最高
  3. **Testing**: 先改善 test infrastructure —— 它会为后续一切打底
  4. **Infrastructure**: 先建设 deployment pipelines 和 automation —— 这是所有实践的基础

- **Consulting Judo**: 不要强推团队接受 evolutionary architecture，而是借用组织现有的优先事项作为杠杆 —— 把 evolutionary practices 包装成它们当前痛点的解法。

## Key Concepts
- **Culture of Experimentation**: 持续改进（kaizen）、spikes、hackathons、20% time、set-based development
- **Three Strikes and You Refactor**: 第一次直接做；第二次皱眉但先复制；第三次再 refactor
- **Building Enterprise Fitness Functions**: 跨越单个 service 的组织级 fitness functions —— 比如全局 cycle time、统一 security baseline
- **Platform as a Service (internal)**: PenultimateWidgets 最终演进成一个 platform —— 各 team 建立在 shared services（monitoring、deployment、logging）之上

## Mental Models
- 用 **"two-pizza team"** 来思考组织规模 —— 模仿小型灵长类群体的协作模式，利用天然的社会责任感
- 使用 **Consulting Judo**：不要硬推；先找到组织已经存在的动机，再把它转向 evolutionary practices
- 牢记 **"measure me and I'll behave"** —— 你衡量什么，人们就会优化什么
- 把 fitness functions（例如 consumer-driven contracts）想成 **engineering safety net**：正因为有了这张网，团队才敢放心演进

## Worked Example
> **注**：以下案例综合了原书 Ch 8 多个分散段落（组织结构、平台化、Consulting Judo 等）重构而成，非原书中单一连续叙事。
**Where to start — PenultimateWidgets' journey**:
1. 从 **Inverse Conway Maneuver** 开始 —— 先把 teams 重组为与 microservice boundaries 对齐
2. 为 invoicing service 识别 fitness functions（Ch 3 case study）—— 先证明概念可行
3. 构建带有 fitness function stages 的 deployment pipelines —— 建立基础设施
4. 进一步演化成 **platform approach**：提供 monitoring、deployment、logging 等 shared services，由各 team 消费
5. Enterprise architects 从 governance 角色转向 enablement 角色 —— 开始构建工具，而不是强压标准

**Consulting Judo example**: 不要直接对团队说 "you need fitness functions"，而是先问："你怎么确认自己的 change 没有破坏其他 services？" 当他们承认自己并不知道时，再把 consumer-driven contracts 作为解决真实痛点的方案引入。

## Key Takeaways
1. 团队应围绕 business capabilities，而不是 technical functions 来组织（Inverse Conway Maneuver）
2. Product over project：稳定持续的 teams 才能真正拥有长期质量责任
3. 团队要小 —— connections 会随着人数按平方级增长
4. Consumer-driven contracts 是 service evolution 的 engineering safety net
5. 从最痛的地方开始 —— low-hanging fruit 能建立信心，highest-value 能最大化影响
6. Culture of experimentation 是必需品 —— kaizen、spikes、set-based development 都是其中一部分
7. Enterprise fitness functions 超越单个 services —— 它们提供组织级保护
8. 使用 Consulting Judo：把 evolutionary practices 说成现有痛点的解法，而不是新的 mandate
9. 把 cycle time 当成 business metric：cycle time 越快，evolution 越快，竞争优势越强

## Connects To
- **Ch 1**: 这里把 Inverse Conway Maneuver 真正操作化 —— team structure mirror architecture
- **Ch 2**: Enterprise fitness functions 是 individual fitness functions 的组织级放大版
- **Ch 3**: Deployment pipelines（mechanics 的第 3 步）是 infrastructure-first approach 的起点
- **Ch 7**: 本章实践，本质上是在修复 Ch 7 中那些 antipatterns
