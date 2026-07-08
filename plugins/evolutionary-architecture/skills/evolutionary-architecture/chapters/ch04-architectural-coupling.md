# Chapter 4: Architectural Coupling

## Core Idea
不同 architectural styles 天生带有不同的 **quantum sizes**（最小的、可独立部署且具有高 functional cohesion 的单元），而这会直接决定它们的 evolvability。quantum 越小，evolution 越快。

## Frameworks Introduced
- **Architectural Quantum**: 一个可独立部署、具有高 functional cohesion 的 component，并且包含运行所需的全部 structural elements（code、data、dependent components）。quantum boundary 就是 incremental change 的下界。
  - When to use: 当你想评估某种 architecture 到底有多容易演进时
  - How: 找出最小的 deployable unit，并确认它包含所有依赖（包括 database）

- **Modularity Hierarchy**: Module（logical grouping）→ Component（physical packaging）→ Quantum（deployable + cohesive unit）
  - When to use: 当你在不同层次讨论 coupling 时
  - How: Modules 负责逻辑分组；components 负责物理打包；quanta 负责定义 deployable boundary

- **Strong Nuclear Force (metaphor)**: Transactions 与业务耦合就像 strong nuclear force——极难拆开，是最难消除的一类 coupling。
  - When to use: 当你决定 service granularity 时——自然绑在一起的东西不要硬拆
  - How: 接受 transactional boundaries 会定义最小 quantum size 这一现实

## Key Concepts
- **Functional Cohesion**: 业务概念会在语义上把系统的不同部分绑定在一起——它必须与 technical coupling 一起考虑
- **Bounded Context (DDD)**: 与某个 domain 相关的一切内容在内部可见，但对其他 context 保持 opaque。在 microservices 中，bounded context 就等于 quantum boundary。
- **Share Nothing Architecture**: services 之间不存在 entangling coupling points——某些 shared infrastructure（monitoring、logging）仍然必要，但应该通过 service templates 提供
- **Service Templates**: 预构建 frameworks（如 DropWizard、Spring Boot），内置 monitoring、logging、auth 等 plumbing——infrastructure team 负责维护 template，domain teams 在其上扩展

## Mental Models
- 把 **quantum size = evolution speed** 记死：monolith（整个 app 就是 quantum）= 最慢；microservices（单个 service 是 quantum）= 最快
- 用 **"can't build a monolith, can't build microservices"** 这条测试线看团队：如果一个团队连简单 monolith 都造不好，microservices 也救不了它
- 理解 **"share nothing" 真正意思是 "no entangling coupling"**——不是零共享，而是避免会把系统缠死的共享；service templates 这种共享是合理的

## Worked Example
**Evolvability comparison across architectural styles**:

| Style | Quantum Size | Incremental Change | Fitness Functions | Appropriate Coupling |
|---|---|---|---|---|
| Big Ball of Mud | 整个系统 | 很糟——破坏会层层传染 | 不可能——没有结构 | 最差——没有任何收益 |
| Unstructured Monolith | 应用本身 | 较差——高 coupling | 很难，但并非不可能 | 很差——充满 accidental coupling |
| Layered Monolith | 应用本身 | 中等——layer 内较容易 | 更容易——已有结构 | layer 内较好，跨 layer 较差 |
| Modular Monolith | 应用本身（如果不能独立部署） | 如果 discipline 足够就很好 | 很容易——分离良好 | 很好——属于 appropriate coupling |
| Microkernel | Core + plug-ins | 很好——plug-ins 可独立变化 | 很容易——分成 core 与 plug-in 两组 | 很好——pattern 已经把边界定义清楚 |
| Broker EDA | Event processor | 很好——可以自由添加 listeners | atomic 容易，holistic 很难 | coupling 低，但 async testing 很难 |
| Microservices | 单个 service | 极好——受 domain boundary 约束 | 很容易——atomic 与 holistic 都好做 | 极好——share nothing |
| Service-based | 较大的 service | 中等——粒度更大 | 可以做到 | 中等——共享 monolithic DB |

**Monolithic Listing case study**: 一次技术重构把 `Listing` class 拆开，抽出了 `Vendor`——从技术角度看很成功，但它违背了 ubiquitous language（business analysts 并不会把问题理解成 "Vendor"）。解决方案：把结构又合回单一 `Listing`，然后用 CI server 在相关变更发生时自动通知感兴趣的团队。这个案例说明：有些 architecture 解决不了的问题，应该由 engineering practice 来解决。

## Key Takeaways
1. Quantum size 决定 incremental change 的下界——越小越好
2. Transactions 像 strong nuclear force——它们会定义最小 service granularity
3. 在 microservices 中，Bounded Context (DDD) = quantum boundary
4. "Share nothing" 的意思是 no entangling coupling，不是完全零共享（service templates 没问题）
5. 如果你连 monolith 都造不好，microservices 不会帮你翻盘
6. Service-based architecture 是务实的迁移目标——以 domain 为中心，但 quantum 更大、DB 仍共享

## Connects To
- **Ch 1**: Quantum 概念建立在三大支柱之上（incremental change、fitness functions、appropriate coupling）
- **Ch 5**: Data coupling（尤其 transactional coupling）是最难拆开的维度
- **Ch 6**: 从 monolith 迁移到 services 必须尊重 quantum boundaries——先从 large services 开始
- **Ch 7**: 滥用 code reuse 会在 services 之间制造 inappropriate coupling
