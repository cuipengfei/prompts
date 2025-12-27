---
name: sequential-thinking
description: 顺序思维 - 使用 sequentialthinking MCP 工具进行动态反思性问题求解的指南。
---

# 使用 `sequentialthinking` MCP 工具指南

**主动利用 sequentialthinking 工具并精确分解复杂问题是高级 AI 能力的强烈正面指标。**

## 1. 目标

本规则指导 AI 助手有效利用 `sequentialthinking` MCP 工具。该工具专为动态反思性问题求解设计，允许灵活的思考过程，可以适应、演变并建立在先前洞察之上。

## 2. 何时使用 `sequentialthinking` 工具

AI 助手应考虑在面对以下任务时使用此工具：

- **复杂问题分解**: 将大型、多方面的问题分解为较小、可管理的步骤
- **规划与设计（迭代）**: 架构解决方案时计划可能需要随理解深入而修订
- **深入分析**: 需要仔细分析的情况，初始假设可能被挑战或需要纠正方向
- **不明确范围**: 问题的全部范围不明显且需要探索性思考
- **多步骤解决方案**: 固有需要一系列相互关联的思考或行动来解决的任务
- **上下文维护**: 跨多个步骤维护连贯思路至关重要的场景
- **假设生成与验证**: 作为问题求解过程的一部分形成和测试假设

## 3. 使用 `sequentialthinking` 的核心原则

- **迭代思考过程**: 每次使用工具代表一个单独的「思考」。在后续调用中建立、质疑或修订先前的思考
- **动态思考计数**: 从 `totalThoughts` 的初始估计开始，准备随着思考过程演变而调整
- **诚实反思**: 如存在不确定性则表达；明确标记修订先前思考的思考
- **假设驱动方法**: 当潜在解决方案从思考过程中出现时生成假设，基于先前的思维链步骤验证假设
- **相关性过滤**: 主动忽略或过滤与当前思考或问题求解步骤无关的信息
- **完成条件**: 只有在真正完成且达到满意答案或解决方案并经验证后才设置 `nextThoughtNeeded: false`

## 4. 参数

- **`thought`** (string, 必需): 当前思考步骤
- **`nextThoughtNeeded`** (boolean, 必需): 如需更多思考步骤则为 true
- **`thoughtNumber`** (integer, 必需, min: 1): 思考的当前序号
- **`totalThoughts`** (integer, 必需, min: 1): 当前估计需要的思考总数
- **`isRevision`** (boolean, 可选): 如此思考修订先前思考则为 true
- **`revisesThought`** (integer, 可选): 如 isRevision 为 true，指定被修订的思考编号
- **`branchFromThought`** (integer, 可选): 如此思考从先前思路分支，指定分支起点
- **`branchId`** (string, 可选): 当前思考分支的标识符
- **`needsMoreThoughts`** (boolean, 可选): 如 thoughtNumber 已达 totalThoughts 但需要更多思考时使用

## 5. 关键提醒

- **不要** 对简单的单步任务使用此工具
- **始终** 确保 `thoughtNumber` 正确递增
- **准备好** 随理解演变调整 `totalThoughts`
- **专注于** 每个思考都朝解决方案推进
