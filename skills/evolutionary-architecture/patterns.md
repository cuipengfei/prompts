# Patterns & Techniques — Building Evolutionary Architectures (2nd Edition)

## 3-Step Mechanics for Building Evolutionary Architecture
**When to use**: 在任何 evolutionary architecture 项目启动时
**How**:
1. 识别会受 evolution 影响的维度（technical、data、security 等）
2. 为每个维度定义 fitness function(s)
3. 用 deployment pipelines 自动化这些 fitness functions
**Trade-offs**: 持续活动，不是一次性做；FFs 会在开发过程中逐步浮现

## Expand/Contract Pattern (Database Refactoring)
**When to use**: 需要修改其他系统依赖的 database schema 时
**How**:
1. Expand：在旧结构旁加新 columns/tables
2. 迁移现有 data
3. 通过 triggers 同时维护两套结构
4. 等待所有 consumers 迁移
5. Contract：删除旧结构
**Trade-offs**: 过渡态可能持续数天到数月；需维护双 schema

## Connascence Analysis
**When to use**: 评估模块间耦合的精确程度时
**How**:
1. 识别组件间的 connascence 类型（9 种 static + dynamic）
2. 评估 strength、locality、degree
3. 将 strong connascence 转为 weak（如 CoP→CoN，用 named params）
4. 确保远距组件间只有 weak connascence
**Trade-offs**: 可用分析工具辅助，但核心是对类型、距离和 degree 的设计判断

## Dynamic Quantum Coupling (3D Space)
**When to use**: 评估微服务间交互模式对演进性的影响
**How**: 在三维空间中定位服务间交互：
- Communication: sync vs async
- Consistency: atomic vs eventual
- Coordination: orchestration vs choreography
**Trade-offs**: 各维度组合改变 coupling、consistency 与 coordination 成本；没有普适最优端点

## Sidecar Pattern + Service Mesh
**When to use**: 微服务数量增多后统一管理 operational coupling
**How**:
1. 每个服务旁部署 sidecar proxy
2. 业务代码只管业务逻辑
3. Service mesh 管理所有 sidecar
4. 监控、路由、断路、安全由 sidecar 处理
**Trade-offs**: 增加 sidecar 运维开销；但 operational coupling 与业务 coupling 正交分离

## Data Mesh Implementation
**When to use**: 大规模组织的数据架构需要跨域演进
**How**:
1. Domain ownership: 数据归产生它的 domain 团队
2. Data as product: 把数据作为有明确消费者与质量责任的产品
3. Self-serve platform: 平台团队提供自助数据基础设施
4. Federated governance: 联邦式数据治理
**Trade-offs**: 去中心化增加协调成本；但消除中心 data team bottleneck

## Internal Service Versioning
**When to use**: service APIs 需要在存在 breaking changes 时继续演化
**How**: 版本判断逻辑内建到 endpoint，根据 caller context 返回正确版本；并发最多 2 个版本；结合 Postel's Law：非 breaking change 不 version
**Trade-offs**: 增加 proxy 复杂度；但 callers 无需理解 version numbers

## Scientist Framework (Fidelity Fitness Function)
**When to use**: 重构关键路径时验证行为不变
**How**: `use` block（control/old）+ `try` block（candidate/new）→ Scientist 比较、记录，返回 control value。确认零 mismatch 后切换。
**Trade-offs**: 需同时运行两条 code path；额外开销；需监控 mismatches

## Consumer-Driven Contracts
**When to use**: services 需要集成，又希望独立演化时
**How**: consumer 编写 contract test → 交给 provider → provider pipeline 中运行所有 consumers 的 tests
**Trade-offs**: provider 须维护所有 consumers 的 test suites；对工程成熟度要求高

## Herding Governance
**When to use**: 现有代码暂时无法满足目标 threshold 时
**How**: 先以 warning 暴露违例 → 随代码改善逐步收紧 threshold → 最终升级为 failing FF
**Trade-offs**: 放宽初始 threshold 可降低迁移阻力，但必须持续收紧，不能永久容忍退化

## Code-Based Fitness Functions (Architecture Metrics)
**When to use**: 评估模块设计的平衡性
**How**: 用 JDepend/ArchUnit 计算 afferent coupling (Ca)、efferent coupling (Ce)、abstractness (A)、instability (I)、distance from main sequence (D)，画在 A-I 散点图上
**Trade-offs**: 度量本身不改善架构；需配合 governance 流程

## Documenting Fitness Functions
**When to use**: FF 数量增多后需要可追溯文档
**How**: ADR 记录 FF 存在原因 → Cucumber/BDD 描述 FF 行为 → Jupyter + jQAssistant + Neo4j 做图查询分析
**Trade-offs**: 文档维护成本；但比口头传承可靠

## Migrate Method from Database
**When to use**: 从共享数据库迁移到独立数据库时
**How**: 识别需要跨新边界工作的 stored procedures/triggers → 渐进迁移逻辑 → 用 FF 验证完整性 → 移除已被替代的旧机制
**Trade-offs**: 应用层逻辑与分布式一致性成本增加；仅在 decomposition 收益值得时采用

## Just Enough Governance
**When to use**: 标准化压力与技术栈按问题规模选型的需求冲突时
**How**: 提供少量受支持的 technology stacks → teams 按问题规模选择
**Trade-offs**: 比单一栈一致性弱；但比完全 polyglot 易管理

## Dependency Pull Model
**When to use**: external dependency volatility 会威胁可重复构建时
**How**: 内部 repo 充当 third-party store → 外部变更以 PR 形式进入 → pipeline 执行 build + smoke tests → 通过则接受
**Trade-offs**: 需维护内部 repo；每次外部更新增加 pipeline 开销

## Feature Toggles for Evolutionary Change
**When to use**: 需要把 deployment 与 release 解耦
**How**: 关闭状态部署 → QA users 放量 → production 验证 → 打开 toggle
**Trade-offs**: 永久 toggles 变成 customization 负担；测试排列组合增长

## Database Migration (Immutable Migrations)
**When to use**: 任何 schema 变更
**How**: 编写 delta SQL → 工具执行 → 永不修改历史 migrations → 回滚写新 migration
**Trade-offs**: migration history 不断增长；需 migration tool

## Team Topologies
**When to use**: 设计组织结构时
**How**: 识别价值流 → 为每条流设 stream-aligned team → 需要时设 enabling/platform/subsystem team → 平衡 cognitive load
**Trade-offs**: 四种团队类型需要不同技能和思维模式；platform team 需要前期投入

## Hypothesis-Driven Development
**When to use**: 不想只靠直觉决定 feature 时
**How**: Hypothesis → A/B experiment → measure → validate or reject
**Trade-offs**: 需要实验基础设施；实验周期可能较长

## API Consistency Validation
**When to use**: API 数量增多后保持设计一致性
**How**: 定义 API style guide → 用 Spectral 在 CI 中 lint OpenAPI spec
**Trade-offs**: 需维护 style guide；但比 ad hoc review 一致性更强

## Fan Out / Fan In Pipeline Verification
**When to use**: 一个变更必须在多场景下同时验证时
**How**: pipeline 触发并行 jobs → 分别执行评估 → 汇总结果 → 全部通过后部署
**Trade-offs**: 并行执行增加复杂度；需相应 pipeline tooling

## Anticorruption Layers
**When to use**: 集成外部系统或 COTS systems，这些系统本身不易演化时
**How**: 在 architecture 与 integration points 间构建隔离层 → vendor tools 限制在边界内
**Trade-offs**: 增加一层 abstraction；该层本身需维护
