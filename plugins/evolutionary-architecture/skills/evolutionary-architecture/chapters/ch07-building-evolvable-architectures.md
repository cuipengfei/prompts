# Chapter 7: Building Evolvable Architectures

## Core Idea
构建 evolutionary architecture 的机制可以归纳为一个 3-step process：识别 dimensions → 定义 fitness functions → 通过 deployment pipelines 自动化。2nd edition 新增 5 项 building principles（含 Postel's Law）和 Fitness Function-Driven Architecture 概念。对于 existing systems，retrofit 还必须同时处理 coupling、engineering maturity，以及 fitness function 的设计问题。

## Frameworks Introduced
- **5 Building Principles** (2nd ed 扩展为 5 项):
  1. **Last Responsible Moment**: 不要过早决定，但也不要错过最后负责任的时机
  2. **Architect/Develop for Evolvability**: 把可演进性作为一等设计目标
  3. **Postel's Law** (2nd ed 新增): "Be conservative in what you send, liberal in what you accept." 对 evolutionary contracts：只发送必要数据，consumer 只依赖自己需要的 fields；breaking change 时才 version。
     - When to use: 设计 service API 契约时
     - How: 最小化发送内容 → consumer 忽略无关 fields → 仅 breaking change 时引入新版本
  4. **Architect for Testability**: 可测试性是一等 concern——FFs 需要可测试的架构
  5. **Conway's Law**: 团队结构影响架构——用 Inverse Conway Maneuver 主动塑形

- **3-Step Mechanics**:
  1. 识别会被 evolution 影响的 dimensions（technical、data、security 等）
  2. 为每个 dimension 定义 fitness function(s)
  3. 使用 deployment pipelines 自动化这些 fitness functions
  - When to use: 适用于 greenfield 和 existing projects
  - How: 以迭代方式推进 —— 有些 fitness functions 会在开发过程中逐渐浮现，而不是一开始就全部确定

- **Guidelines for Building Evolutionary Architectures**:
  1. **Remove Needless Variability**: 例如 immutable infrastructure、开发环境等，应该把不该变化的东西锁定成常量
  2. **Make Decisions Reversible**: 借助 feature toggles、routing proxies 等手段，避免做出无法回头的 architectural decisions
  3. **Prefer Evolvable over Predictable**: 当 predictability 与 evolvability 冲突时，优先选择 evolvable
  4. **Build Anticorruption Layers**: 让架构与 external systems、integration points 保持隔离
  5. **Build Sacrificial Architectures**: 接受某些 architecture 本来就是 disposable 的，不要过度投资
  6. **Mitigate External Change**: 通过 pull model 管理 dependencies（内部 repo 作为 proxy），而不是被外部 push 牵着走
  7. **Update Frameworks Aggressively, Libraries Passively**: Frameworks = 高 coupling，应尽快升级；libraries = 低 coupling，按需要升级
  8. **Version Services Internally**: 在 service 内部暂时处理调用方版本差异，避免把版本协调负担永久推给 consumers

- **Internal Service Versioning**: 与其给 endpoint name 加 version，不如把识别 caller context 的逻辑做进 endpoint 内部，返回正确版本。相比 version numbering，这种方式更推荐。结合 Postel's Law：非 breaking change 不 version。
  - When to use: 当 service APIs 需要演进时
  - How: Proxy 检查 caller context → 路由到正确版本 → 临时最多并行支持 2 个版本

- **LCOM (Lack of Cohesion in Methods)** (2nd ed 新增, Chidamber & Kemerer): 衡量类内方法 cohesion 的指标。用于评估 service granularity——LCOM 高 = 类做了太多不相关的事 = 应拆分。
  - When to use: 评估 monolith 拆分边界时
  - How: 计算类内方法共享字段的程度 → 低 cohesion 的类是拆分候选

- **Fitness Function-Driven Architecture** (2nd ed 新增): LMAX Disruptor 的设计哲学——先定义性能 FFs（mechanical sympathy: 理解硬件特性来优化软件），再围绕 FFs 设计架构。
  - When to use: 极端性能要求场景
  - How: 定义硬性 FF 目标 → 理解硬件特性 → 架构围绕 FF 目标设计

- **Dependency Management — Pull Model**: 用内部 version-control repo 充当 third-party component store；外部变化以 pull request 的形式进入；如果某个 dependency 消失，就拒绝该 pull。
  - When to use: 当 external dependency volatility 会威胁可重复构建时
  - How: External update → internal repo 收到 PR → deployment pipeline 执行 build + smoke tests → 通过则接受，失败则拒绝

## Key Concepts
- **Refactoring vs. Restructuring**: Refactoring = 在不改变 external behavior 的前提下 restructuring；而 architecture pattern 的切换属于 restructuring（会改变行为或优先级），不算 refactoring
- **COTS (Commercial Off-The-Shelf)**: Package software 常带来 opacity、automation 与 coupling 限制；是否适合取决于目标 architecture characteristics 和隔离能力
- **Snowflake Servers**: 手工打造、彼此不同的 servers —— 必须被 immutable infrastructure 替代

## Mental Models
- 把它想成 **human brain evolution**：底层系统先处理 plumbing，新层级建立在其上 —— 不要一把推倒重来，而是适配现有部分
- 用 **frameworks = push updates, libraries = pull updates** 作为 dependency governance model
- 把 **transitive dependency management** 看成一次 **"Go To Statement Considered Harmful" moment** —— 只有真正意识到问题有多严重，才可能开始解决它

## Worked Example
**PenultimateWidgets star rating evolution** (internal versioning):
1. **Start**: StarRating service 使用 database column 存储 ratings（只支持 whole stars）
2. **Transition**: 增加 half-star flag 的新 column → 在 service boundary 增加 proxy component → proxy 判断 caller 请求哪个 version → 返回对应格式。这样 old callers 和 new callers 可以同时工作。
3. **End**: 等所有 callers 都迁移到 half-star 后，删除 old code path 和 proxy layer。

这里的关键是 **routing as evolutionary mechanism** —— service 可以在过渡态中存在任意长时间，而不强迫 callers 按固定时间表迁移。再结合数据层的 expand/contract（Ch 6），service 和 data 就能一起演进。

## Key Takeaways
1. 3-step mechanics 就是：识别 dimensions → 定义 fitness functions → 通过 pipelines 自动化
2. Fitness functions 会随着时间浮现 —— 要持续观察 architectural stress points，并补上保护机制
3. Immutable infrastructure（remove needless variability）是基础，它不是 evolvability 的对立面
4. 优先选择 libraries 而不是 frameworks —— coupling 更低，也更容易替换
5. 用 pull model 管理 dependencies —— 不要让外部变化冲击你的 builds
6. 在 service 内部做 versioning —— 不要强迫 callers 理解 version number
7. 从 monolith 迁移时，应先切出少数几个较大的 services，并尊重 transactional boundaries
8. COTS systems 可能限制 evolution —— 需按 architecture characteristics 评估，并用 anticorruption layers 隔离 integration points

## Connects To
- **Ch 1**: 3-step mechanics 将 guided change、incremental change 与 multiple dimensions of fitness functions 落到实践
- **Ch 3**: Deployment pipelines（mechanics 的第 3 步）是自动化引擎
- **Ch 5**: Migration steps 必须尊重 quantum boundaries —— 不要打破 transactional contexts
- **Ch 6**: 在 PenultimateWidgets routing 中，Expand/Contract pattern 会与 internal service versioning 搭配使用
- **Ch 8**: 本章这些 guidelines 一旦被违反，就会演化成 Ch 8 中的 antipatterns 与 pitfalls
