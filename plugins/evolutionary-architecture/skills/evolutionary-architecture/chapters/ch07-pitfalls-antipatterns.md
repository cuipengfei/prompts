# Chapter 7: Evolutionary Architecture Pitfalls and Antipatterns

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

- **Antipattern: Last 10% Trap** — 工具或 frameworks 往往能很快帮你做完前 80%，接下来的 10% 会极其困难，最后 10% 则根本做不到。
  - When spotted: 当围绕某个工具限制出现越来越多 hacks 和 workarounds 时
  - Escape: 回到 general-purpose languages；承认没有哪个 framework 能覆盖一切（infinite regress problem）

- **Antipattern: Code Reuse Abuse** — 在 services 之间共享 code 会制造 coupling；“the more reusable code is, the less usable it is.”
  - When spotted: 当 shared component team 变成瓶颈时
  - Escape: 在 microservices 语境下，宁可 duplication 也不要 coupling；当 coupling 阻碍 evolution 时，直接 fork 或复制

- **Pitfall: Resume-Driven Development** — 选择 architecture 或 frameworks 是因为它们“很酷”，而不是因为它们真正解决问题。
  - When spotted: 当 architecture choice 无法由 problem domain analysis 支撑时
  - Escape: 先理解 problem domain，再决定 architecture

### Incremental Change Antipatterns
- **Antipattern: Inappropriate Governance** — 在资源已经 cheap 且 isolated 的时代，仍强制所有项目使用同一套 technology stack。
  - When spotted: 当所有项目无论复杂度如何都必须使用同样沉重的 stack 时
  - Escape: **Goldilocks Governance** —— 预设 3 套 stack（simple、intermediate、complex），让团队自行选择

- **Pitfall: Lack of Speed to Release** — Release cycle 太慢会直接阻断 evolution。"Speed of evolution is a function of cycle time."
  - When spotted: 当 release 依赖专门岗位和正式流程时
  - Escape: 引入 continuous deployment practices；并把 cycle time 作为 fitness function 跟踪

### Business Concerns Pitfalls
- **Pitfall: Product Customization** — 为每个 customer 单独构建、长期保留 feature toggles，或进行过度 customization，会让 testing permutations 指数增长。
  - When spotted: 当 testing 负担增长速度快过 feature 增长时
  - Escape: 现实评估 customization cost；优先 product-driven customization，而不是 one-off builds

- **Antipattern: Reporting** — 让 reports 直接耦合 database schema，会摧毁 schema 的 evolvability。
  - When spotted: 当 report designers 绕过 architecture layers 直接访问 data 时
  - Escape: 通过 event streaming 把 domain services 与 reporting services 分离；填充一个为 reporting 优化的 denormalized reporting database

- **Pitfall: Planning Horizons** — 过长的 planning cycle 会在信息极少时迫使团队做出不可逆决策；而 sunk cost fallacy 又会让人对这些 artifacts 产生非理性依恋。
  - When spotted: 当团队即使面对相反证据，仍坚持过时计划时
  - Escape: 把大型 program 拆成更小的 deliverables；保持 options open；避免 upfront 大额投入

## Key Concepts
- **Goldilocks Governance**: 预设 3 套标准 technology stacks（simple/intermediate/complex）—— 既能按需匹配，又保留一定一致性
- **Primordial Abstraction Ooze**: 当低层 abstraction 破裂时，问题会沿着各层一路蔓延，制造意外破坏
- **Infinite Regress Problem**: 试图把一切都规定到最终细节层级 —— 但永远还有下一层
- **Irrational Artifact Attachment**: 在 planning 上投入越多时间和精力，人就越容易在它已经错了的时候仍执意维护它

## Mental Models
- 把 **software reuse** 想成 **organ transplant，而不是 Lego blocks** —— reuse 很难、必须刻意设计，而且一定带着 coupling cost
- 当 standardization pressure 与 right-sizing 冲突时，用 **Goldilocks Governance**：不是 one stack，也不是无限多，而是三种选择
- 把 **cycle time** 当成 fitness function：`v ∝ 1/c` —— evolution speed 与 cycle time 成反比

## Worked Example
**Goldilocks Governance at PenultimateWidgets**:
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
5. Goldilocks Governance：不是 1 套，也不是无限多套，而是 3 套 —— 让技术规模与问题规模匹配
6. Cycle time 是一个 fitness function：`v ∝ 1/c` —— 要持续跟踪，并在它悄悄上升时报警
7. Reporting 应该通过 event streaming 与 domain services 分离
8. 过长的 planning horizons 会制造对 artifacts 的非理性依恋 —— 要把工作拆成更小的 deliverables

## Connects To
- **Ch 2**: Fitness function categories（temporal、domain-specific）可以捕捉 stale dependencies 等 antipatterns
- **Ch 4**: Code reuse abuse 会在 architectural quanta 之间制造不恰当的 coupling
- **Ch 6**: Anticorruption layers 和 dependency pull model 是摆脱 Vendor King 与 leaky abstractions 的主要手段
- **Ch 8**: Inappropriate governance 和 planning horizons 都是会阻断 evolution 的组织层因素
