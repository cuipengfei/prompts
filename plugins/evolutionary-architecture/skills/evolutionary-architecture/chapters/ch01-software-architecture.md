# Chapter 1: Software Architecture

## Core Idea
Architecture 包含业务需求以及 architectural characteristics（"-ilities"）。作者提出把 **evolvability** 增加为一种新的 meta-characteristic——它像一层外壳，在系统演进过程中保护其他所有特征不被侵蚀。

## Frameworks Introduced
- **Evolutionary Architecture**: 支持跨多个维度进行 guided、incremental change。它并不是无约束的变化——变化要由 fitness functions 引导。
  - When to use: 任何会持续面对生态变化的系统都适用（也就是所有系统）
  - How: 把 incremental change、fitness functions 和 appropriate coupling 作为基础支柱来构建

- **Dynamic Equilibrium**: 软件开发生态（工具、frameworks、practices）会形成一种不断移动的平衡，就像一个骑独轮车还抱着箱子的人。每一次新创新都会打破平衡，直到新的平衡再次形成。
  - When to use: 用来理解为什么静态的 5 年规划一定会失效
  - How: 在做架构时默认技术环境一定会变化

- **Evolvability as Meta-Characteristic**: Evolvability 会包裹并保护其他所有 architectural characteristics。比如你为 scalability 做了设计，evolvability 负责保证这种 scalability 不会随着时间退化。
  - When to use: 当你在定义 architecture 应该保护什么时
  - How: 把 evolvability 与 scalability、security 等并列，当作一等 "-ility"

## Key Concepts
- **"-ilities"**: 一组 architectural characteristics（如 accessibility、scalability、auditability 等）——architect 必须挑出真正重要的，并平衡彼此对立的力量
- **Architectural Dimensions**: Technical、Data、Security、Operational/System——每个维度都是一种在演进过程中必须被保留的视角
- **Software Development Ecosystem**: 包含所有 tools、frameworks、libraries、best practices——整体形成一种 dynamic equilibrium
- **Bit Rot**: 当开发者绕过 architecture（例如为了 performance 直接跳过 layer）时，architectural characteristics 会逐渐被侵蚀

## Mental Models
- 思考生态变化时，使用 **cane toad** 隐喻：把变化引入一个高度动态的系统，结果常常不可预测
- 把 architecture 看成一个 **4D problem**：从 2D diagram（boxes/arrows）到 3D（specific technologies），再到 4D（随时间演进）
- 组织团队时使用 **Conway's Law**："Organizations which design systems are constrained to produce designs which are copies of the communication structures of these organizations"

## Worked Example
**PenultimateWidgets' Inverse Conway Maneuver**: 他们过去的 monolith 使用 layered architecture，团队则按技术职能分仓（UI devs 在一起、DBAs 单独分开、ops 外包）。当他们转向 microservices（按 domain 划分，而不是按技术划分）后，协调成本急剧上升，因为一次 domain change 会横跨所有 silo。解决方案：按 service boundary 重组团队——每个 service team 都包含 service owner、developers、BA、DBA、QA 和 ops person。团队结构开始镜像目标 architecture。

## Key Takeaways
1. Architecture = requirements + "-ilities"；architect 必须平衡相互冲突的 characteristics
2. Software development ecosystem 一直在变化——静态规划注定失败
3. Evolvability 是一种 meta-characteristic，用来保护其他所有 characteristics
4. Evolutionary architecture = incremental change + fitness functions + appropriate coupling
5. Team structure 会影响 architecture（Conway's Law）——可以用 Inverse Conway Maneuver 主动塑形
6. 应该说 "evolutionary"，而不是 "adaptable"——是朝着目标 guided change，不是临时拼凑的补丁

## Connects To
- **Ch 2**: Fitness functions 提供 guided change 里的 "guided"
- **Ch 3**: Incremental change 需要 Continuous Delivery engineering practices
- **Ch 4**: Appropriate coupling 决定 architecture 能多容易演进
- **Ch 8**: Inverse Conway Maneuver 会在团队组织层面被 operationalize
