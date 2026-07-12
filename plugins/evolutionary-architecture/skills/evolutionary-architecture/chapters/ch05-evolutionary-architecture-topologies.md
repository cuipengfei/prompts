# Chapter 5: Evolutionary Architecture Topologies

## Core Idea
2nd edition 把 "Architectural Coupling" 改为 "Evolutionary Architecture Topologies"——不再只讨论 coupling，而是引入 **connascence** 作为更精确的耦合度量框架，并扩展 architectural quantum 定义到包含 dynamic coupling 的三维空间。新增 Data Mesh、service mesh、sidecar pattern 等拓扑结构。

## Frameworks Introduced
- **Connascence** (Page-Jones): 比 "coupling" 更精确的度量体系。分 static 和 dynamic 两类。
  - Static connascence (编译期可见):
    - **CoN (Name)**: 多个组件依赖同一名称（函数名、类名）
    - **CoT (Type)**: 依赖同一类型定义
    - **CoM (Meaning/Convention)**: 依赖同一约定含义（如 magic number）
    - **CoP (Position)**: 依赖参数位置顺序
    - **CoA (Algorithm)**: 依赖同一算法实现
  - Dynamic connascence (运行期可见):
    - **CoE (Execution)**: 执行顺序依赖
    - **CoTi (Timing)**: 执行时间约束
    - **CoV (Values)**: 多个相关值必须一起变化，系统才保持有效
    - **CoI (Identity)**: 多个组件必须引用同一个实体实例
  - Connascence properties: **strength**（strong→weak 越好）、**locality**（近距强耦合可接受）、**degree**（影响范围）
  - Rules: 尽量把 strong connascence 转为 weak；connascence 应随距离增大而减弱
  - When to use: 评估模块间耦合的精确程度时

- **Architectural Quantum** (2nd ed 扩展): 可独立部署 + 高功能内聚 + 高静态耦合 + 同步动态耦合的最小组件。包含所有依赖（代码、数据、基础设施）。
  - Quantum size = 增量变更的下限；更小的 quantum 可能缩短 cycle time，也会增加 coordination 与 operational cost
  - When to use: 评估架构可演进性
  - How: 找最小 deployable unit，确认包含所有依赖

- **Dynamic Quantum Coupling** (2nd ed 新增): 量子间动态耦合的三维空间:
  - **Communication**: sync（同步调用）vs async（事件驱动）
  - **Consistency**: atomic（强一致）vs eventual（最终一致）
  - **Coordination**: orchestration（中央编排）vs choreography（分散协调）
  - When to use: 评估微服务间交互模式对演进性的影响

- **Contract Spectrum**: 服务间契约从 strict 到 loose 的频谱:
  - 书中用 RMI、gRPC、REST、GraphQL 与 name/value JSON 展示不同 contract strictness；具体强弱取决于 schema 与使用方式
  - 越 strict = 类型安全但耦合更强；越 loose = 灵活但需更多验证
  - When to use: 选择服务间通信协议时

- **Sidecar Pattern + Service Mesh** (2nd ed 新增): 把 operational concerns 放到 sidecar proxy 中，与业务代码正交解耦；service mesh 协调这些 sidecars。
  - When to use: 微服务数量增多后统一管理 operational coupling
  - How: 每个服务旁部署 sidecar proxy → 业务代码只管业务逻辑

- **Data Mesh** (2nd ed 新增, Zhamak Dehghani): 去中心化数据架构。四大原则:
  1. Domain ownership: 数据归产生它的 domain 团队
  2. Data as product: 数据被当作具有明确消费者与质量责任的产品
  3. Self-serve platform: 平台团队提供自助数据基础设施
  4. Federated governance: 联邦式数据治理
  - When to use: 大规模组织的数据架构需要跨域演进时

- **Data Product Quantum (DPQ)** (2nd ed 新增): 数据产品的量子单元。三种类型:
  - Source-aligned: 对齐源系统数据
  - Aggregate: 聚合多源数据
  - Fit-for-purpose: 为特定消费场景定制
  - When to use: 数据产品化时的粒度设计

- **Cooperative Quantum** (2nd ed 新增): operationally separate 的 quanta 通过 asynchronous communication 与 eventual consistency 协作；它们可保持紧密 contract coupling，但不共享部署边界

## Key Concepts
- **Modularity Hierarchy** (1st ed): Module（logical grouping）→ Component（physical packaging）→ Architectural Quantum（deployable、cohesive unit）
- **Functional Cohesion**: 业务概念在语义上绑定系统不同部分——必须与 technical coupling 一起考虑
- **Bounded Context (DDD)**: domain 相关内容在内部可见，对其他 context opaque。在 microservices 中 = quantum boundary
- **Stamp Coupling** (antipattern): 传递包含多余字段的数据结构——接收方只用部分字段，但所有字段都成了隐性契约
- **Share Nothing Architecture**: services 间不共享会妨碍独立演进的 implementation coupling；必要的 contract coupling 仍然存在
- **Microservices as Evolutionary Architecture** (7 principles, 2nd ed 新增):
  1. Modeled around business domains
  2. Hide implementation details
  3. Culture of automation
  4. Highly decentralized
  5. Independently deployable
  6. Isolate failure
  7. Highly observable
- **Software Reuse**: "software reuse is like organ transplant not Lego"——复用代价高，需谨慎

## Mental Models
- **Quantum size sets a change boundary**: 较小 quantum 可独立变化，但必须同时评估 coordination、transactions 与 operational cost
- **Connascence distance rule**: 近距 strong connascence 可接受，远距必须降为 weak
- **Service mesh as orthogonal coupling**: sidecar 把 operational coupling 从业务 coupling 中分离出来——两种耦合独立演进
- **Data Mesh inverts data ownership**: 从中心 data team 拥有所有数据 → domain team 拥有自己的数据产品

## Worked Example
**Monolithic Listing case study** (1st ed): 一次技术重构把 `Listing` 拆出 `Vendor`，技术结构更整齐，却违背 business analysts 使用的 ubiquitous language。团队最终恢复单一 `Listing`，改用 CI notification 协调相关团队。教训：不要为了 technical modularity 破坏 domain cohesion；有些 coordination problem 应由 engineering practice 解决。

## Key Takeaways
1. Connascence 比 "coupling" 更精确——用 9 种类型 + 3 个属性（strength、locality、degree）量化耦合
2. Architectural quantum 定义扩展：独立部署 + 高内聚 + 高静态耦合 + 同步动态耦合
3. 动态耦合三维空间（communication、consistency、coordination）帮你选择服务间交互模式
4. Contract strictness 是 coupling 决策；协议名称本身不能替代对实际 schema 与 consumer behavior 的分析
5. Stamp Coupling 是隐性契约陷阱——只传需要的字段
6. Service mesh 把 operational coupling 从业务耦合中正交分离
7. Data Mesh 去中心化数据所有权——domain team 管自己的数据产品
8. "Software reuse is like organ transplant not Lego"——复用有代价
9. Microservices 7 principles 是 evolutionary architecture 的一种具体实现
10. Technical modularity 不能凌驾于 domain language；必要时用 engineering practice 解决协作问题

## Connects To
- **Ch 1**: Quantum 概念建立在三大支柱之上
- **Ch 4**: Connascence principle 可转化为项目特定 fitness functions；JDepend/ArchUnit 主要测量 dependency structure
- **Ch 6**: Data coupling（尤其 transactional coupling）是最难拆开的维度；Data Mesh 关联到数据演进
- **Ch 7**: 从 monolith 迁移到 services 必须尊重 quantum boundaries
- **Ch 8**: 滥用 code reuse 会制造 inappropriate coupling（Stamp Coupling）
