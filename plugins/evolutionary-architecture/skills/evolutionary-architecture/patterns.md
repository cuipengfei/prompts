# Patterns & Techniques — Building Evolutionary Architectures

## 3-Step Mechanics for Building Evolutionary Architecture
**When to use**: 在任何 evolutionary architecture 项目启动时使用，无论是 greenfield 还是 retrofit
**How**:
1. 识别会受 evolution 影响的维度（technical、data、security 等）
2. 为每个维度定义 fitness function(s)
3. 用 deployment pipelines 自动化这些 fitness functions
**Trade-offs**: 这是一项持续活动，而不是只在 inception 阶段做一次；fitness functions 会在开发过程中逐步浮现

## Expand/Contract Pattern (Database Refactoring)
**When to use**: 当需要修改其他系统依赖的 database schema 时
**How**:
1. Expand：在旧结构旁边加入新 columns/tables
2. 将现有 data 迁移到新结构
3. 在过渡期间通过 triggers 同时维护两套结构
4. 等待所有 consumers 完成迁移
5. Contract：删除旧 columns/tables
**Trade-offs**: 过渡态可能持续数天到数月；需要同时维护双 schema

## Internal Service Versioning
**When to use**: 当 service APIs 需要在存在 breaking changes 的情况下继续演化时
**How**: 把版本判断逻辑内建到 endpoint 中，根据 caller context 返回正确版本；临时最多支持 2 个版本；当所有 callers 都迁移后移除旧版本
**Trade-offs**: 会增加 proxy 复杂度；并发版本数被限制为 2；但 callers 无需理解 version numbers

## Scientist Framework (Refactoring Critical Infrastructure)
**When to use**: 在高频部署环境下重构关键基础设施时
**How**: `use` block（control/old behavior）+ `try` block（candidate/new）→ Scientist 比较结果、记录不一致，并始终返回 control value
**Trade-offs**: 需要同时运行两条 code path；会带来额外开销；需要对 mismatches 做监控

## Consumer-Driven Contracts
**When to use**: 当 services 需要集成，但又希望彼此独立演化时
**How**: consumer 先为自己需要的行为编写 test suite → 交给 provider → provider 运行所有 consumers 的 tests 以及自己的 tests → 只要全部通过，provider 就可以自由演化
**Trade-offs**: provider 必须维护所有 consumers 的 test suites；对工程成熟度要求较高

## Goldilocks Governance
**When to use**: 当标准化压力与“技术栈应按问题规模选型”的需求发生冲突时
**How**: 预先定义 3 套 technology stacks（simple/intermediate/complex）→ 让 teams 根据 service 需求自行选择
**Trade-offs**: 比单一栈的一致性更弱；但比完全放开的 polyglot 方案更易管理

## Dependency Pull Model
**When to use**: 始终适用——用于管理 external dependencies
**How**: 内部 version-control repo 充当 third-party component store → 外部变更以 pull request 形式进入 → deployment pipeline 执行 build + smoke tests → 通过则接受，失败则拒绝
**Trade-offs**: 需要维护内部 repo；每次外部更新都会增加 pipeline 开销

## Feature Toggles for Evolutionary Change
**When to use**: 当需要把 deployment 与 release 解耦，或需要在 production 中做 QA 时
**How**: 先以关闭状态部署功能代码 → 仅向 QA users 放量 → 在 production 中验证 → 准备就绪后再打开 toggle
**Trade-offs**: 永久保留的 toggles 会变成 customization 负担；测试排列组合也会持续增长

## Database Migration (Immutable Migrations)
**When to use**: 任何 schema 变更
**How**: 编写 delta SQL → 由工具执行 → 永远不要修改历史 migrations → 如果要回滚，就写新的 migration
**Trade-offs**: migration history 会不断增长；需要 migration tool；回滚依赖新 migration，而不是删除旧 migration

## Fan Out / Fan In Pipeline Verification
**When to use**: 当一个变更必须在多个场景下同时验证时
**How**: pipeline 触发并行 jobs → 分别执行评估 → 汇总结果 → 全部通过后再部署
**Trade-offs**: 并行执行会增加复杂度；需要相应的 pipeline tooling（如 GoCD）

## Anticorruption Layers
**When to use**: 当需要集成外部系统或 COTS systems，而这些系统本身不易演化时
**How**: 在你的 architecture 与 integration points 之间构建隔离层 → 把 vendor tools 限制在边界内部
**Trade-offs**: 会增加一层额外 abstraction；而且这层本身也需要维护
