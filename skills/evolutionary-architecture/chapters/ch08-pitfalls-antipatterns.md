# Chapter 8: Evolutionary Architecture Pitfalls and Antipatterns

## Core Idea
**Antipatterns** 一开始看起来像好主意，但最后会证明是错误选择（而且本来存在更好的替代方案）。**Pitfalls** 则是看上去像好主意，但一落地就会立刻暴露为坏路径。两者都会伤害 evolvability。

## Frameworks Introduced

### Technical Architecture Antipatterns & Pitfalls
- **Antipattern: Vendor King** — 整个 architecture 围绕某个 vendor product 构建，会让组织以病态方式耦合到这个工具上。
  - When spotted: 当某个 vendor product 位于 architecture 的核心位置时
  - Escape: 把所有 software 都视为 integration points；构建 anticorruption layers
  - Symptom: "Let's Stop Working and Call It A Success" —— sunk cost 让团队不敢承认失败

- **Pitfall: Leaky Abstractions** — 所有非平凡 abstraction 都会 leak；tech stack 越复杂，debugging 就越困难。
  - When spotted: 当错误在 UI 层显现，但根因来自 stack 深处时
  - Mitigation: 至少理解自己工作层下面的一层；对脆弱的 join points 用 fitness functions 保护

- **Antipattern: Last 10% Trap** — 工具或 frameworks 往往能很快帮你做完前 80%，接下来的 10% 会极其困难，最后 10% 则根本做不到。2nd edition 新增 **Low-Code/No-Code** 作为 Last 10% Trap 的典型变体：可视化拖拽工具快速搭建原型，但遇到复杂业务逻辑时无法扩展。
  - When spotted: 当围绕某个工具限制出现越来越多 hacks 和 workarounds 时；或当 low-code 平台无法表达关键业务规则时
  - Escape: 回到 general-purpose languages；承认没有哪个 framework 或 low-code 平台能覆盖一切

- **Code Reuse Case Study** — PenultimateWidgets 案例展示 services 之间共享 code 如何制造 coupling。这是 reuse trade-off，不是本章命名的 antipattern。
  - When spotted: 当 shared component team 变成瓶颈时
  - Escape: 在 microservices 语境下，宁可 duplication 也不要 coupling；当 coupling 阻碍 evolution 时，直接 fork 或复制

- **Pitfall: Resume-Driven Development** — 选择 architecture 或 frameworks 是因为它们“很酷”，而不是因为它们真正解决问题。
  - When spotted: 当 architecture choice 无法由 problem domain analysis 支撑时
  - Escape: 先理解 problem domain，再决定 architecture

### Incremental Change Antipatterns
- **Antipattern: Inappropriate Governance** — 在资源已经 cheap 且 isolated 的时代，仍强制所有项目使用同一套 technology stack。Chad Fowler/Wunderlist 案例刻意让 teams 使用不同 stacks，因为避免 accidental coupling 的价值高于 developer portability。
  - When spotted: 当所有项目无论复杂度如何都必须使用同样沉重的 stack 时；或当团队用不同语言来"强制"解耦时
  - Escape: **Just Enough Governance** —— 提供少量经过支持的 stack choices，让团队按问题规模选择

- **Pitfall: Lack of Speed to Release** — Release cycle 太慢会直接阻断 evolution。"Speed of evolution is a function of cycle time."
  - When spotted: 当 release 依赖专门岗位和正式流程时
  - Escape: 引入 continuous deployment practices；并把 cycle time 作为 fitness function 跟踪

### Business Concerns Pitfalls
- **Pitfall: Product Customization** — 为每个 customer 单独构建、长期保留 feature toggles，或进行过度 customization，会让 testing permutations 指数增长。
  - When spotted: 当 testing 负担增长速度快过 feature 增长时
  - Escape: 现实评估 customization cost；优先 product-driven customization，而不是 one-off builds

- **Antipattern: Reporting** — 让 reports 直接耦合 database schema，会摧毁 schema 的 evolvability。2nd edition 引用 Data Mesh 作为解决方案之一。
  - When spotted: 当 report designers 绕过 architecture layers 直接访问 data 时
  - Escape: 通过 event streaming 把 domain services 与 reporting services 分离；填充一个为 reporting 优化的 denormalized reporting database；或采用 Data Mesh 让数据成为产品

- **Pitfall: Planning Horizons** — 过长的 planning cycle 会在信息极少时迫使团队做出不可逆决策；而 sunk cost fallacy 又会让人对这些 artifacts 产生非理性依恋。
  - When spotted: 当团队即使面对相反证据，仍坚持过时计划时
  - Escape: 把大型 program 拆成更小的 deliverables；保持 options open；避免 upfront 大额投入

## Key Concepts
- **Just Enough Governance**: 提供少量标准 technology stacks——既按问题规模匹配，又保留组织可支持的一致性
- **Primordial Abstraction Ooze**: 当低层 abstraction 破裂时，问题会沿着各层一路蔓延，制造意外破坏
- **Irrational Artifact Attachment**: 在 planning 上投入越多时间和精力，人就越容易在它已经错了的时候仍执意维护它

## Mental Models
- 把 **software reuse** 想成 **organ transplant，而不是 Lego blocks** —— reuse 很难、必须刻意设计，而且一定带着 coupling cost
- 当 standardization pressure 与 right-sizing 冲突时，用 **Just Enough Governance**：不是 one stack，也不是无限多，而是少量可支持的选择
- 把 **cycle time** 当成 fitness function：原书强调缩短 cycle time 会提高 evolution speed；书中印刷公式与该叙述存在冲突，因此不要依赖公式决策

## Worked Example
**Just Enough Governance at PenultimateWidgets**:
| Tier | Stack | Use Case |
|---|---|---|
| Small | Ruby on Rails + MySQL | Simple projects, no stringent scalability needs |
| Medium | GoLang + Cassandra/MongoDB/MySQL | Medium projects, variable data requirements |
| Large | Java + Oracle | Large projects, complex architecture concerns |

**Reporting antipattern solution**: Domain microservices 负责自己的 "system of record" data。另一组 reporting services 监听同一条 event stream/message queue，并填充一个为 reporting 优化的 denormalized reporting database。通过 eventual consistency，domain services 不再需要为 reporting 协调自身行为 —— 不同用途就使用不同抽象。

## Key Takeaways
1. Antipatterns 起初看似合理但最终是错误；pitfalls 则是很快就会暴露的问题 —— 两者都会破坏 evolvability
2. Vendor King 的解法是：把所有 software 都视为 integration points，并构建 anticorruption layers
3. Code reuse 会制造 coupling —— 在 microservices 中，宁可 duplication 也不要 coupling
4. Last 10% Trap 告诉我们：没有哪个 framework 能覆盖一切 —— 必要时回到 general-purpose tools
5. Just Enough Governance：不是 1 套，也不是无限多套，而是少量受支持的选择
6. Cycle time 是一个 fitness function —— 要持续跟踪，并在它悄悄上升时报警
7. Reporting 应该通过 event streaming 与 domain services 分离
8. 过长的 planning horizons 会制造对 artifacts 的非理性依恋 —— 要把工作拆成更小的 deliverables

## Connects To
- **Ch 2**: Temporal fitness functions 可以捕捉 stale dependencies 等随时间出现的问题
- **Ch 4**: Frozen Caveman antipattern — 过度 governance；Code reuse abuse 会在 quanta 之间制造不恰当的 coupling
- **Ch 5**: Code reuse abuse 会制造 Stamp Coupling；Connascence 度量可检测不恰当耦合
- **Ch 7**: Anticorruption layers 和 dependency pull model 是摆脱 Vendor King 与 leaky abstractions 的主要手段
- **Ch 9**: Team Topologies、product over project 与 experimentation culture 提供避免本章组织性 pitfalls 的实践路径
