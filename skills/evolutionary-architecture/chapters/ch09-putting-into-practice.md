# Chapter 9: Putting Evolutionary Architecture into Practice

## Core Idea
要真正落地 evolutionary architecture，需要组织结构变化（cross-functional teams、Team Topologies、product over project）、文化转向（experimentation、ownership），以及业务层对齐（把 cycle time 当指标、fitness functions 作为实验媒介、构建 enterprise fitness functions）。2nd edition 新增 Team Topologies、cognitive load、hypothesis-driven development 等内容。切入点应按组织环境选择。

## Frameworks Introduced
- **Team Topologies** (2nd ed 新增, Manuel Pais and Matthew Skelton): 四种团队类型:
  - **Stream-aligned**: 按价值流组织，端到端交付
  - **Enabling**: 帮助其他团队提升能力（如 coaching）
  - **Complicated-subsystem**: 处理需要深度专业知识的子系统
  - **Platform**: 提供自助式内部平台，降低 stream-aligned 团队的认知负担
  - When to use: 设计组织结构时
  - How: 识别价值流 → 为每条流设 stream-aligned team → 需要时设 enabling/platform/subsystem team

- **Cognitive Load Balance** (2nd ed 新增): 团队认知负担是有限的。Team Topologies 的核心约束——每个团队的认知负荷不应超载。如果团队需要理解太多 domain，应拆分或提供 platform 支持。
  - When to use: 评估团队是否能真正 owning 一个 service
  - How: 观察团队是否因承担过多 domain 而超载；超载时缩小边界或提供 platform 支持

- **Cross-Functional Teams**: 围绕 domain 组织团队，把所有角色（BA、dev、QA、DBA、ops）放进同一个 team。
  - When to use: 为 evolutionary architecture 设计团队结构时
  - How: 让 team mirror service boundaries（Inverse Conway Maneuver）；Amazon two-pizza teams

- **Product over Project**: Products 长期存在，由持续稳定的 teams 负责；projects 结束后 hand off 给 ops 的模式会切断质量责任。
  - When to use: 从 project-based 转向 product-based 时
  - How: cross-functional team 持续跟随 product → "you build it, you run it"

- **Team Connection Formula**: `connections = n(n-1)/2`。20 人 = 190 条连接；50 人 = 1225 条。
  - When to use: 决定 team size 时
  - How: 保持 teams 小而精（two-pizza rule）；同时 cross-functional 以消除 silo friction

- **Fitness Functions as Experimental Media** (2nd ed 新增): FFs 不只是约束，还可以用来做实验。通过 FFs 测试不同架构决策的影响——例如用 UDP 通信 FF 测试网络性能，用 security dependency FF 测试漏洞影响范围，用 concurrency FF 测试并行模型，用 fidelity FF 测试重构一致性。
  - When to use: 需要验证架构决策假设时
  - How: 为待验证的假设定义 FF，运行实验；依据结果确认或否定假设，并指导下一步

- **Hypothesis-Driven Development** (2nd ed 强化): 把 feature change 表述成 hypothesis，用 experiments 验证。Facebook 通过修改 offensive-photo flagging 文案降低海量 false positives；mobile.de 对累积复杂度已伤害销售的 UI 测试三个版本。
  - When to use: 不想只靠直觉决定 feature 时
  - How: Hypothesis → experiment → measure → validate or reject

- **Zero-Day Security as Fitness Function** (2nd ed 新增): Equifax/Struts 案例说明 enterprise pipeline 应能接收精确的 framework/version 检查，令受影响 builds 失败并通知 security。Dependabot/snyk 是相关的现代 supply-chain tools，但不是该历史案例中的方案。
  - When to use: 依赖第三方库的场景
  - How: temporal FF 扫描依赖 → 发现已知漏洞 → 阻断部署 → 修复后自动放行

- **Where to Start** (4 approaches):
  1. **Low-Hanging Fruit**: 先做最容易的变化——建立信心和 proof
  2. **Highest-Value**: 先打最关键的业务区域——风险最高但收益最大
  3. **Testing**: 先改善 test infrastructure——为后续一切打底
  4. **Infrastructure**: 先建设 deployment pipelines 和 automation——所有实践的基础

## Key Concepts
- **Culture of Experimentation** (2nd ed 扩展): kaizen（持续改进）、spike and stabilize（快速探索后稳定化）、innovation time（创新时间）、set-based development（多方案并行探索后择优）、connecting engineers with end users（让工程师直接接触用户）
- **Three Strikes and You Refactor**: 第一次直接做；第二次皱眉但先复制；第三次再 refactor
- **Building Enterprise Fitness Functions**: 跨越单个 service 的组织级 FFs——全局 cycle time、统一 security baseline
- **Internal Platform**: 演进成 platform——各 team 建立在 shared services（monitoring、deployment、logging）之上
- **Future of FFs** (2nd ed 新增): AI fitness functions（用 ML 自动发现架构退化）、generative testing（自动生成测试用例验证 FF）
- **Carving Bounded Contexts**: 在现有集成中切出 bounded context——逐步隔离，而非一次性重构
- **Adaptation vs Evolution** (2nd ed 新增): Adaptation 往往保留并行 legacy behavior、累积 technical debt；evolution 在 fitness functions 保护下原地改变，并移除过时行为

## Mental Models
- 用 **Team Topologies** 思考组织——不是所有团队都该是 stream-aligned，platform/enabling/subsystem 团队同样关键
- 用 **cognitive load** 作为团队拆分信号——超载就拆分或提供 platform
- 用 **two-pizza team** 思考组织规模——模仿小型灵长类群体的协作模式
- 牢记 **"measure me and I'll behave"**——你衡量什么，人们就会优化什么
- 把 **FFs 当成实验媒介**而非只当约束——用它们做架构决策实验
- 把 **cycle time** 当成 business metric：cycle time 越快，evolution 越快，竞争优势越强

## Worked Example
**Enterprise fitness functions case**: 一家大型组织梳理出 62 项 architecture criteria，再把可自动化的 criteria 实现为 enterprise fitness functions。重点不是复制固定清单，而是把组织真正关心的 characteristics 转成持续、可执行的验证。

**Hypothesis-Driven Development**: Facebook 的 offensive-photo flagging 产生大量 false positives，压垮人工 review。团队实验不同文案以减少误报。mobile.de 则发现累积的 UI complexity 正在伤害销售，并比较三个 UI 版本。

**Zero-Day Security — Equifax/Struts case study**: 已知漏洞出现后，enterprise fitness function 可携带精确 framework/version 条件进入 pipelines，使受影响 builds 失败并通知 security。核心能力是组织级快速传播可执行检查，而不是事后依赖人工通知链。

## Key Takeaways
1. Team Topologies 提供四种团队类型：stream-aligned、enabling、complicated-subsystem、platform
2. Cognitive load 是团队拆分的信号——超载就拆分或提供 platform 支持
3. 团队应围绕 business capabilities 组织（Inverse Conway Maneuver）
4. Product over project：稳定持续的 teams 才能真正拥有长期质量责任
5. Where-to-start 四种策略应按环境选择：low-hanging fruit、highest-value、testing、infrastructure
6. Culture of experimentation 是必需品——kaizen、spike and stabilize、set-based development
7. FFs 不只是约束——它们是实验媒介，可用于架构决策实验
8. Hypothesis-driven development 把用户纳入 feedback loop
9. Zero-day security 应该是 temporal FF——自动检测、阻断部署、直到修复
10. 未来：AI fitness functions 和 generative testing 将进一步自动化架构治理

## Connects To
- **Ch 1**: Inverse Conway Maneuver 在此操作化——team structure mirror architecture
- **Ch 2**: Enterprise fitness functions 是 individual fitness functions 的组织级放大版
- **Ch 3**: Deployment pipelines 是 infrastructure-first approach 的起点；Hypothesis-driven development 关联 Ch 3 的 QA in production
- **Ch 4**: Governance 自动化——enterprise FFs 是组织级 governance 的具体实现
- **Ch 5**: Team Topologies 关联到 architectural quantum——platform team 降低 stream-aligned team 的认知负担
- **Ch 7**: 5 building principles（含 Postel's Law）在此被 operationalize
- **Ch 8**: 本章实践本质上是在修复 Ch 8 中的 antipatterns 和 pitfalls
