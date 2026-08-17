# Cheatsheet

## 设计一个 harness control

| 问题 | 选择 | 示例 |
|---|---|---|
| 何时起作用？ | Guide（feedforward，前馈）——在 agent 行动之前 | AGENTS.md、skills、约定、code-mod tooling |
| | Sensor（feedback，反馈）——在 agent 行动之后 | tests、linters、reviews、monitors |
| 怎么执行？ | Computational（计算式）——确定性、快速、CPU | type checkers、structural tests、dependency rules |
| | Inferential（推断式）——语义、非确定性、GPU | AI code review、modularity review、LLM-as-judge |
| 在哪里跑？ | 会话内 → pipeline → 定时 drift 检查 → 生产 | keep quality left；越早 = 修得越便宜 |

绝不只跑一个方向：只有 feedback → 重复犯错；只有 feedforward → 规则从不验证。

## 判断 harness 健康

| 观察 | 可能含义 | 行动 |
|---|---|---|
| Sensor 从不触发 | 可能是检测不足，而不是质量高 | 测试 sensor；检查控制系统的覆盖 |
| Sensor 随时间失败变少 | guides 或模型在改进 | 考虑进一步强化 guide |
| 同一个 sensor 持续失败 | 对应的 guide 弱 | Steer harness：改进 guide |
| 规则互相矛盾（如 max-lines 与 max-lines-per-function） | Sensor 冲突把复杂度挤到别处 | 显式定取舍；警惕过度工程漩涡 |
| Agent 绕过 sensor 检查 | 集成太弱（只有 guide） | 迁移到 hooks、git hooks 或 harness extension |

## 选择自主性级别

| 出错概率 | 漏掉的影响 | 可检测性 | 默认 |
|---|---|---|---|
| 低 | 低 | 高 | 探索或 vibe coding 可以；让输出可丢弃。 |
| 混合 | 任意 | 混合 | 缩小范围、加检查、用 human-in-the-loop review。 |
| 高 | 高 | 低 | 不用无人监督执行；要求显式设计、确定性检查与人工批准。 |

## 处理不可靠输出

| 信号 | 行动 |
|---|---|
| 有快速可信的检查 | 接受输出前先跑它。 |
| 覆盖不确定 | 要边界情况、加测试或缩小范围。 |
| 修订不收敛 | 结束 timebox；转确定性调查。 |
| 反馈慢或含糊 | 降低自主性，要求人工 review。 |

## 修复 context 漂移

| 症状 | 行动 |
|---|---|
| Agent 在猜或用过时约定 | 替换过期 reference 材料，声明当前约束。 |
| Agent 找不到证据 | 提供显式路径或可靠的 search/read interface。 |
| Prompt 含宽泛无关材料 | 只为下一次决策保留任务相关 context。 |

## 评估本地编码模型

| 阶段 | 通过条件 | 停止或收窄当 |
|---|---|---|
| 内存适配 | 模型权重与工作 context 装得进 RAM 或 VRAM。 | 装不上或留下不足的工作内存。 |
| 响应速度 | 简单请求支撑得了预期工作流。 | 等待让交互或 agent 工作不可行。 |
| 工具调用 | 真实 harness 能可靠读改文件。 | 调用失败、恢复差或不可观察。 |
| 功能正确性 | 有界的代表性任务通过检查。 | 输出过不了确定性检查。 |
| context 与任务规模 | 持续对话与更大工作保持在已验证极限内。 | context 劣化，或新增探索/文件数量破坏工作流。 |
| review 负担 | review 与修正工作量仍配得上编码速度。 | 人工修正抹掉了表面吞吐增益。 |
