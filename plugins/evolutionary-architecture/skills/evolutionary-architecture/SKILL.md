---
name: evolutionary-architecture
description: "Knowledge base from \"Building Evolutionary Architectures\" by Neal Ford, Rebecca Parsons, Patrick Kua. Use when applying fitness functions, architectural quanta, incremental change, or evolutionary architecture concepts."
---

<!-- argument-hint: [topic, framework name, or chapter number] -->

# Building Evolutionary Architectures
**Author**: Neal Ford, Rebecca Parsons, Patrick Kua | **Pages**: ~217 | **Chapters**: 8 | **Generated**: 2026-07-08

## How to Use This Skill

- **无参数** — 加载核心框架供参考
- **按主题** — 问 `fitness functions`、`quantum`、`expand/contract` 等主题，找到并读取对应章节
- **按章节** — 问 `ch05`，加载该章节摘要
- **浏览** — 问 "有哪些章节" 查看完整索引

当查询 Core Frameworks 未覆盖的主题时，会先读取对应章节文件再回答。

---

## Core Frameworks & Mental Models

### Evolutionary Architecture（进化式架构）
当系统面临持续生态变化时使用。三大支柱：增量变更、适应性函数、适当耦合。不是无约束变更——由 fitness functions 引导，朝架构目标演进。Prefer evolutionary over adaptable——guided change toward a goal, not jury-rigged patches。

### Fitness Functions（适应性函数）
为每个要保护的架构特性定义。当架构演进时，用客观完整性评估防止特性退化。七条分类轴：atomic/holistic、triggered/continual、static/dynamic、automated/manual、temporal、intentional/emergent、domain-specific。优先按 Key/Relevant/Not Relevant 分级。Wire into deployment pipelines。至少每年 review 一次。

### Architectural Quantum（架构量子）
评估架构可演进性时使用。最小可独立部署 + 高功能内聚的组件，包含所有依赖（代码、数据、基础设施）。Quantum size = 增量变更的下限。Smaller quanta = faster evolution。Transactions act as strong nuclear force binding quanta——它们定义最小服务粒度。

### Incremental Change（增量变更）
开发侧（小步变更）和部署侧（模块化/解耦）两端都需要。Use when Continuous Delivery practices are in place：deployment pipelines、service discovery、feature toggles。Cycle time 与 evolution speed 成反比：`v ∝ 1/c`（cycle time 越短，evolution 越快）。Refactoring critical infrastructure 时用 Scientist framework。

### Expand/Contract Pattern（扩展/收缩模式）
当外部系统依赖的 database schema 需要变更时使用。Expand（加新列/表）→ 用 triggers 维护新旧两套 → 等消费者迁移 → Contract（删旧）。Parallel change 的子集，适用于所有 backward-incompatible interface 变更。

### Deployment Pipeline（部署流水线 + 适应性函数）
替代 CI server 作为 fitness functions 的执行机制。Stages：unit tests → container build → atomic FFs → holistic FFs → manual gates → deploy。Fan out/fan in 实现并行验证。Manual stages 使瓶颈可见——把 security review 和 audit 都当 pipeline stage，瓶颈一目了然。

### Conway's Law & Inverse Conway Maneuver
当组织团队结构时使用。"Organizations which design systems are constrained to produce designs which are copies of the communication structures." Fix：用 Inverse Conway Maneuver——让团队结构匹配目标架构，而非反过来。

### Guidelines for Building Evolutionary Architectures
1. Remove Needless Variability — 用 immutable infrastructure 锁定可变项
2. Make Decisions Reversible — 用 feature toggles、routing proxies 避免不可逆决策
3. Prefer Evolvable over Predictable — 冲突时选 evolvable
4. Build Anticorruption Layers — 隔离外部系统和集成点
5. Build Sacrificial Architectures — 接受某些架构是一次性的
6. Mitigate External Change — 用 pull model 管理依赖，不让外部变更破坏构建
7. Update Frameworks Aggressively, Libraries Passively — 框架高耦合→push update；库低耦合→pull update
8. Prefer Continuous Delivery over Snapshots — fluid dependencies > static snapshots

### Goldilocks Governance（金发姑娘治理）
当标准化压力与 right-sizing 冲突时使用。选 3 个技术栈（simple/intermediate/complex），让团队按服务需求选。Not one（overengineers simple cases），not infinite（hurts portability）。

---

## Chapter Index

| # | Title | Key Frameworks |
|---|-------|----------------|
| [ch01](chapters/ch01-software-architecture.md) | Software Architecture | Evolutionary Architecture, Dynamic Equilibrium, Conway's Law |
| [ch02](chapters/ch02-fitness-functions.md) | Fitness Functions | Fitness Function Categories, Key/Relevant Classification |
| [ch03](chapters/ch03-engineering-incremental-change.md) | Engineering Incremental Change | Deployment Pipelines, Feature Toggles, Scientist, Hypothesis-Driven Dev |
| [ch04](chapters/ch04-architectural-coupling.md) | Architectural Coupling | Architectural Quantum, Modularity Hierarchy, Evolvability of Styles |
| [ch05](chapters/ch05-evolutionary-data.md) | Evolutionary Data | Expand/Contract, Database Migrations, Two-Phase Commit |
| [ch06](chapters/ch06-building-evolvable.md) | Building Evolvable Architectures | 3-Step Mechanics, 8 Guidelines, Internal Versioning, Pull Model |
| [ch07](chapters/ch07-pitfalls-antipatterns.md) | Pitfalls and Antipatterns | Vendor King, Last 10% Trap, Code Reuse Abuse, Goldilocks Governance |
| [ch08](chapters/ch08-putting-into-practice.md) | Putting into Practice | Cross-Functional Teams, Consumer-Driven Contracts, Consulting Judo |

## Topic Index

- **Adaptation vs. Evolution** → ch01
- **Anticorruption Layers** → ch06
- **Architectural Fitness Function** → ch02
- **Architectural Quantum** → ch04, ch05
- **Bit Rot** → ch01
- **Bounded Context** → ch04
- **Code Reuse Abuse** → ch07
- **Consumer-Driven Contracts** → ch08
- **Continuous Deployment** → ch03
- **Conway's Law** → ch01, ch08
- **Cycle Time** → ch03, ch07
- **Database Migration** → ch05
- **Deployment Pipeline** → ch03, ch06
- **Dynamic Equilibrium** → ch01
- **Expand/Contract** → ch05
- **Feature Toggles** → ch03
- **Fitness Functions** → ch02, ch03, ch06
- **Goldilocks Governance** → ch07
- **Holistic Fitness Function** → ch02
- **Hypothesis-Driven Development** → ch03
- **Immutable Infrastructure** → ch06
- **Incremental Change** → ch01, ch03
- **Internal Versioning** → ch06
- **Inverse Conway Maneuver** → ch01, ch08
- **Last 10% Trap** → ch07
- **Modularity** → ch04
- **Parallel Change** → ch05
- **PenultimateWidgets** → ch01, ch03, ch05, ch06, ch07, ch08
- **Pull Model (Dependencies)** → ch06
- **Reporting Antipattern** → ch07
- **Sacrificial Architecture** → ch06
- **Scientist Framework** → ch03
- **Service Templates** → ch04
- **Share Nothing** → ch04
- **Snowflake Servers** → ch06
- **Systemwide Fitness Function** → ch02
- **Three Strikes and You Refactor** → ch08
- **Two-Phase Commit** → ch05
- **Vendor King** → ch07

## Supporting Files

- [glossary.md](glossary.md) — 术语表与定义
- [patterns.md](patterns.md) — 模式与技术清单
- [cheatsheet.md](cheatsheet.md) — 决策速查表与判断指南

---

## Scope & Limits

本 skill 仅覆盖书中内容。在代码库中实施时，需结合项目特定工具。超出本书范围的主题，请查看相关 skill 或直接询问 agent。
