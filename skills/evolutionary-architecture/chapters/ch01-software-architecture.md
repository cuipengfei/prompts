# Chapter 1: Evolving Software Architecture

## Core Idea
Architecture 包含业务需求以及 architectural characteristics（"-ilities"）。作者提出把 **evolvability** 增加为一种新的 meta-characteristic——它像一层外壳，在系统演进过程中保护其他所有特征不被侵蚀。2nd edition 标题加入 "Evolving"，强调 governance 与架构演进的重叠。

## Frameworks Introduced
- **Evolutionary Architecture**: 支持跨多个维度进行 guided、incremental change。它并不是无约束的变化——变化要由 fitness functions 引导。
  - When to use: 当系统需要在持续变化的生态中保护关键 architectural characteristics 时
  - How: 明确变化目标，以 incremental change 推进，并用多个维度的 fitness functions 引导变化

- **Dynamic Equilibrium**: 软件开发生态（工具、frameworks、practices）会形成一种不断移动的平衡，就像一个骑独轮车还抱着箱子的人。每一次新创新都会打破平衡，直到新的平衡再次形成。
  - When to use: 用来理解为什么静态的 5 年规划一定会失效
  - How: 在做架构时默认技术环境一定会变化

- **Evolvability as Meta-Characteristic**: Evolvability 会包裹并保护其他所有 architectural characteristics。比如你为 scalability 做了设计，evolvability 负责保证这种 scalability 不会随着时间退化。
  - When to use: 当你在定义 architecture 应该保护什么时
  - How: 把 evolvability 与 scalability、security 等并列，当作一等 "-ility"

- **Evolutionary vs Adaptable vs Emergent**: 三个易混概念。Evolutionary = guided change toward a goal（有目标的引导式变化）。Adaptable = 能改但无方向（jury-rigged patches）。Emergent = 自底向上自然涌现的模式，无中央设计。
  - When to use: 团队争论 "我们已经很灵活了" 时澄清概念
  - How: 区分受 fitness functions 引导的持续演进、为新环境叠加兼容行为的 adaptation，以及由局部设计自然形成的 emergent architecture

## Key Concepts
- **"-ilities"**: 一组 architectural characteristics（如 accessibility、scalability、auditability 等）——architect 必须挑出真正重要的，并平衡彼此对立的力量
- **Architectural Dimensions**: 2nd edition 明确列出四个维度——Technical、Data、Security、Operational/System——每个维度都是一种在演进过程中必须被保留的视角
- **Software Development Ecosystem**: 包含所有 tools、frameworks、libraries、best practices——整体形成一种 dynamic equilibrium
- **Bit Rot**: 当开发者绕过 architecture（例如为了 performance 直接跳过 layer）时，architectural characteristics 会逐渐被侵蚀
- **Governance Overlap**: 2nd edition 强调 architecture governance 与 evolution 不是分离的——governance 定义目标，evolution 朝目标演进

## Mental Models
- 把 architecture 看成处于 **dynamic equilibrium** 的系统：工具、实践和业务环境持续移动，architecture 也必须能被引导着改变
- 把 evolvability 看成保护其他 architectural characteristics 的外层机制，而不是独立追求的终点

## Key Takeaways
1. Architecture = requirements + "-ilities"；architect 必须平衡相互冲突的 characteristics
2. Software development ecosystem 一直在变化——静态规划注定失败
3. Evolvability 是一种 meta-characteristic，用来保护其他所有 characteristics
4. Evolutionary architecture 通过 guided、incremental change 跨多个维度演进
5. Evolutionary、adaptable 与 emergent 描述不同的变化方式，不应混用

## Connects To
- **Ch 2**: Fitness functions 提供 guided change 里的 "guided"
- **Ch 3**: Incremental change 需要 Continuous Delivery engineering practices
- **Ch 4**: Governance 的自动化——FFs 嵌入 pipeline 成为可执行的 governance
- **Ch 5**: Appropriate coupling 决定 architecture 能多容易演进
- **Ch 9**: Inverse Conway Maneuver 会在团队组织层面被 operationalize
