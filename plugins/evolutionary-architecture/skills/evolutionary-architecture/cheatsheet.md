# Cheatsheet — Building Evolutionary Architectures (2nd Edition)

## Core Decision Rules

| When... | Do... | Because... |
|---|---|---|
| Choosing predictability vs evolvability | 选 evolvable | 持续变化生态里 predictability 是幻觉 (Ch 7) |
| Deciding service granularity | 先从较大 services 开始 | 过早拆小会破坏 transactional contexts (Ch 5, 7) |
| Choosing libraries vs frameworks | 优先 libraries | frameworks 高 coupling（调你的代码）(Ch 7) |
| Updating frameworks vs libraries | Frameworks = push（尽快）；Libraries = pull（按需） | framework coupling 让延迟升级痛苦 (Ch 7) |
| Managing external dependencies | 用 pull model（internal repo 作 proxy） | 外部变化不应破坏 builds (Ch 7) |
| Versioning service endpoints | Internal versioning + Postel's Law | 非 breaking change 不 version (Ch 7) |
| Code reuse across services | duplication 优先于 coupling | reuse 像器官移植，不像 Lego (Ch 5, 8) |
| Standardizing technology stacks | Just Enough Governance：少量受支持选项 | 避免 one-size-fits-all 与无约束 polyglot (Ch 8) |
| Organizing teams | Team Topologies + business capabilities | Conway's Law：团队结构映射架构 (Ch 1, 9) |
| Reporting needs | Event streaming + 独立 reporting services 或 Data Mesh | 直接耦合 DB schema 摧毁 evolvability (Ch 8) |
| Choosing service communication protocol | 按 Contract Spectrum 的 coupling trade-offs 选 | 协议不是普适线性排名 (Ch 5) |
| Evaluating module design balance | 画 A-I 散点图，查 Zone of Pain/Uselessness | D = |A + I - 1| (Ch 4) |
| Microservices operational complexity增长 | 用 Service Mesh + Sidecar | 正交分离 operational 和业务 coupling (Ch 5) |
| Data architecture需跨域演进 | 用 Data Mesh | 去中心化数据所有权 (Ch 5) |
| Team 认知负担超载 | 拆分 team 或提供 platform 支持 | cognitive load 超载 = 质量下降 (Ch 9) |
| Refactoring critical path | 用 Scientist framework 做 fidelity FF | 行为一致性验证后才能安全切换 (Ch 4) |

## Fitness Function Quick Selection

| Characteristic | Category | Example Mechanism |
|---|---|---|
| Coupling directionality | Atomic + Triggered | ArchUnit layer check in CI |
| Performance SLA | Atomic + Triggered | Response time test per service |
| Transaction speed | Atomic + Continual | Production transaction monitoring |
| Resiliency | Holistic + Continual | Chaos Monkey/Gorilla/Kong |
| Code quality | Atomic + Triggered + Static | Cyclomatic complexity threshold |
| Security | Holistic + Triggered | Pipeline penetration test |
| Regulatory compliance | Manual + Triggered | Independent accountant review stage |
| Dependency staleness | Temporal | Dependabot/snyk scan |
| Integration integrity | Atomic + Triggered | Consumer-driven contracts (Pact) |
| Cycle time | Process + Continual | Pipeline duration alarm threshold |
| Fidelity (refactoring) | Atomic + Continual | Scientist framework comparison |
| Architecture governance | Atomic + Triggered | ArchUnit package/class/layer checks |
| A11y compliance | Atomic + Triggered | Pa11y automated check |
| License compliance | Temporal + Triggered | Black Duck scan |
| Communication patterns | Holistic + Continual | Log parsing FFs for microservices |

## Connascence Decisions

- 先评估 **type、locality、degree**，不要依赖单一总排序。
- 尽量把 strong connascence 限制在局部；距离越远，允许的 connascence 应越弱。
- 典型改善：CoP 改 named parameters；CoM 改 constants/enums；dynamic connascence 优先缩小 degree 与传播距离。

## Team Topologies Selection

| 团队类型 | 职责 | 何时设立 |
|---|---|---|
| Stream-aligned | 端到端交付价值流 | 默认——每条价值流一个 |
| Enabling | 帮助其他团队提升能力 | 团队需要 coaching 时 |
| Complicated-subsystem | 深度专业知识子系统 | 子系统需要专家时 |
| Platform | 自助式内部平台 | stream-aligned 团队认知超载时 |

## Tells & Smells

| Smell | You're probably... | Fix |
|---|---|---|
| Shared component team is bottleneck | 过度滥用 code reuse | fork 或 duplication；拆 coupling |
| Hacks proliferate around a tool | Last 10% Trap | 回到通用 tools |
| Low-code platform can't express business rules | Last 10% Trap (low-code 变体) | 回到 general-purpose language |
| Releases require specialized formal process | 缺少快速 release 能力 | 上 CD；cycle time 当 FF 跟踪 |
| Report designers bypass architecture layers | reporting antipattern | event streaming 拆出独立 reporting |
| Teams defend outdated plans despite evidence | planning horizon 过长 / sunk cost | 拆更小 deliverables |
| All projects forced to use same heavy stack | governance 不合适 | Just Enough Governance |
| Vendor product dictates all decisions | Vendor King | 当成 integration point；加 anticorruption layer |
| Errors at UI originate deep in stack | abstraction 泄漏 | 理解下一层；用 FFs 保护 |
| Module in Zone of Pain | low A + low I；concrete 且 rigid | 沿 main sequence 重平衡 abstraction/stability |
| Module in Zone of Uselessness | high A + high I；抽象无 dependents | 增加实际依赖或减少无用抽象 |
| Old incident cited without current evidence | Frozen Caveman | 恢复原始上下文；用可执行 FF 替代恐惧规则 |
| Teams use different stacks to "force" decoupling | 可能是刻意 trade-off，不自动判错 | 比较 accidental coupling 风险与 portability 成本 |
| Pass data structs with unused fields | Stamp Coupling | 只传需要的字段 |

## Cycle Time Rule

- 原书叙述：缩短 cycle time 会提高 evolution speed，应把 cycle time 作为 fitness function 持续跟踪。
- 原书印刷公式与该叙述冲突；不要把公式作为决策依据。
