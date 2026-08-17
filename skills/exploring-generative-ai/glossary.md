# Glossary

规范 harness 词汇遵循作者原词（ch26、ch32）。旧章节对同一概念用了不同说法时，在这里一次性说明映射。

- **Agentic coding** — 把编码工作委托给带工具与 feedback loop 的 agent 执行。（第 13、18、25-27 章）
- **Approved scenarios** — 半人工测试：人确认过的期望被「冻结」在专用 runner 里，违反时要求重新批准。（第 31 章）
- **Automation bias** — 偏向接受自动化建议，同时低估矛盾证据的倾向。（第 4 章）
- **Behaviour harness** — 针对功能行为的 regulation category：spec 作 guides，测试套件与 approved fixtures 作 sensors。最未被解决的一类。（第 26 章）
- **Computational control（计算式控制）** — 确定性、快速、由 CPU 运行的 guide 或 sensor：测试、linter、type checker、结构化分析。旧章节的「deterministic checks/controls」映射到这里。（第 26、32 章）
- **Context engineering（上下文工程）** — 刻意选择、加载与维护提供给 agent 的信息。guides（feedforward controls）的一个分支。（第 25 章）
- **Context interface** — agent 发现 workspace 文件、specification、reference 或可复用指导的可靠路径。（第 25 章）
- **Detectability（可检测性）** — 检查或 review 在伤害发生前抓住 AI 造成问题的可能性。（第 19、21 章）
- **Drift sensor（漂移传感器）** — 以慢节奏运行、处于变更生命周期之外、检测逐渐积累问题的 sensor（死代码、覆盖质量、依赖年龄）。（第 26、32 章）
- **Guide（feedforward control，前馈控制）** — 在 agent 行动**之前**引导它、提高第一次尝试就做对概率的 harness 元素：AGENTS.md、skills、约定、code-mod tooling。（第 26、32 章）
- **Harness engineering（驾驭工程）** — 围绕 agent 的外层 harness 的设计：它的 guides、sensors 与自我修正 loop。（第 26、32 章）
- **Harness template（驾驭模板）** — 把 agent 拴到常见服务拓扑的结构、约定与技术栈上的 guides 和 sensors 包。（第 26 章）
- **Harnessability（可驾驭性）** — codebase 属性（类型系统、模块边界、框架）在多大程度上支撑 guides 和 sensors。在最难构建的地方最需要。（第 26 章）
- **Impact radius（影响半径）** — agent 失误能保持不被发现多久：到提交、到团队迭代、还是到 codebase 生命周期。（第 13 章）
- **Inferential control（推断式控制）** — 基于 LLM、非确定性的 guide 或 sensor：AI code review、模块性 review、「LLM 当裁判」。更慢更贵；补上语义判断。（第 26、32 章）
- **In-line assistance（内联辅助）** — 编辑代码时 IDE 集成的建议。（第 3-4 章）
- **Local-model viability funnel（本地模型可用性漏斗）** — 从内存适配到 review 负担的分阶段评估。（第 29 章）
- **Local model（本地模型）** — 本地运行而非经远程托管服务的模型。（第 28-29 章）
- **Multi-file editing（多文件编辑）** — 跨多个源文件的协调编辑。（第 11 章）
- **Mutation testing（变异测试）** — 引入小的代码变异，检查测试套件是否抓到；AI 写测试时监控回归有效性的手段。（第 31、32 章）
- **Probability（出错概率）** — 任务、工具、模型与 context 组合产生错误的可能性。（第 19、21 章）
- **Reference application（参考应用）** — 用来锚定 agent 行为的当前可用示例。（第 22 章）
- **Regulation categories（调节类别）** — harness 像 cybernetic governor 一样调节的期望状态维度：maintainability、architecture fitness、behaviour。（第 26 章）
- **Risk assessment（风险评估）** — 对 probability、impact、detectability 的合并评估。（第 19、21 章）
- **Self-correction guidance（自我修正引导）** — 附带了帮助 agent 修复问题的指令的 sensor 信号——一种「正向 prompt injection」。（第 26、32 章）
- **Sensor（feedback control，反馈控制）** — 在 agent 行动**之后**观察、使自我修正成为可能的 harness 元素：测试、linter、review、监控。（第 26、32 章）
- **Spec-driven development（规格驱动开发）** — 把 specification 当作实现的一等约束。（第 23 章）
- **Steering loop（转向回路）** — 人对 harness 本身的迭代：问题重复出现时，改进 guides 和 sensors，让它更不可能发生。（第 26 章）
- **Timebox（时间盒）** — 尝试 assistant 交互的有界时间窗，超时即换方法。（第 8 章）
