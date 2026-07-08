# Cheatsheet — Building Evolutionary Architectures

## Core Decision Rules

| When... | Do... | Because... |
|---|---|---|
| Choosing between predictability and evolvability | 选择 evolvable 的方案 | 在持续变化的生态里，predictability 只是幻觉 (Ch 6) |
| Deciding service granularity | 先从较大的 services 开始，后续再拆小 | 如果过早把 quantum 拆得太小，会破坏 transactional contexts (Ch 4, 6) |
| Choosing between libraries and frameworks | 优先选择 libraries | frameworks 会形成更高 coupling（framework 调你的代码）；libraries 更偏工具性 (Ch 6) |
| Updating frameworks vs. libraries | Frameworks = push（尽快更新）；Libraries = pull（按需更新） | framework coupling 会让延迟升级变得非常痛苦 (Ch 6) |
| Managing external dependencies | 使用 pull model（internal repo 作为 proxy） | 外部变化不应该破坏你的 builds (Ch 6) |
| Versioning service endpoints | 用 internal versioning，不用 version numbering | callers 不该理解 version numbers；并发最多支持 2 个版本 (Ch 6) |
| Code reuse across services | duplication 优先于 coupling | shared code 会把 services 绑在一起；reuse 更像器官移植，不像搭 Lego (Ch 7) |
| Standardizing technology stacks | 采用 Goldilocks：3 个选项（simple/intermediate/complex） | 单一栈会让简单场景过度设计；无限栈又会损害 portability (Ch 7) |
| Organizing teams | 围绕 business capabilities，而不是 job functions | Conway's Law：团队结构会映射成架构结构 (Ch 1, 8) |
| Reporting needs | 通过 event streaming 拆出独立 reporting services | 把 reports 直接耦合到 DB schema 会摧毁 evolvability (Ch 7) |

## Fitness Function Quick Selection

| Characteristic | Category | Example Mechanism |
|---|---|---|
| Coupling directionality | Atomic + Triggered | 在 CI 中运行 JDepend unit test |
| Performance SLA | Atomic + Triggered | 针对每个 service 做 response time test |
| Transaction speed | Atomic + Continual | 在 production 中监控 transaction 性能 |
| Resiliency | Holistic + Continual | Chaos Monkey |
| Code quality | Atomic + Triggered + Static | 设定 cyclomatic complexity threshold |
| Security | Holistic + Triggered | 在 pipeline 中运行 penetration test |
| Regulatory compliance | Manual + Triggered | 加入独立 accountant review 阶段 |
| Dependency staleness | Temporal | 通过 break-upon-upgrade test 检测 |
| Integration integrity | Atomic + Triggered | Consumer-driven contracts |
| Cycle time | Process + Continual | 为 pipeline duration 设置 alarm threshold |

## Architecture Style → Evolvability Score

| Style | Quantum | Incremental Change | Best For |
|---|---|---|---|
| Big Ball of Mud | Entire system | ❌ Terrible | 没有合适场景——应立即重构 |
| Layered Monolith | Application | ⚠️ Moderate | 简单应用、稳定领域 |
| Modular Monolith | Application | ✅ Good (if disciplined) | 作为迈向 microservices 之前的起点 |
| Microkernel | Core + plug-in | ✅ Good | 需要可扩展性的工具类系统（如 IDEs、browsers） |
| Microservices | Single service | ✅✅ Excellent | 以 domain 为中心、变化频繁的系统 |
| Service-based | Large service | ⚠️ Moderate | 从 monolith 迁移、或 transaction 密集型系统 |

## Tells & Smells

| Smell | You're probably... | Fix |
|---|---|---|
| Shared component team is a bottleneck | 过度滥用 code reuse | fork 或直接 duplication；拆掉 coupling |
| Hacks proliferate around a tool | 陷入 Last 10% Trap | 回到更通用的 tools |
| Releases require specialized formal process | 缺少快速 release 的能力 | 上 Continuous Deployment；把 cycle time 当作 FF 跟踪 |
| Report designers bypass architecture layers | 命中了 reporting antipattern | 用 event streaming 拆出独立 reporting |
| Teams defend outdated plans despite evidence | 计划周期过长 / sunk cost 影响判断 | 把交付拆得更小 |
| All projects forced to use same heavy stack | 治理方式不合适 | 采用 Goldilocks Governance（3 stacks） |
| Vendor product dictates all decisions | 落入 Vendor King | 把它当成 integration point；增加 anticorruption layer |
| Errors at UI originate deep in stack | abstraction 泄漏 | 先理解下一层；再用 fitness functions 做保护 |

## Cycle Time Formula
```
v ∝ 1/c
```
- v = 变更速度（evolution speed）
- c = cycle time
- **Cycle time 越快，evolution 越快。应把 cycle time 作为 fitness function 持续跟踪。**
