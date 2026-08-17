# Patterns

## Bounded Agent Loop（有界 agent loop）
**何时用**：任务能用具体证据检查。
**怎么做**：定义范围，给工具与当前 context，跑检查，review 完整 diff，然后停止或迭代。
**权衡**：设置更多；自主性更受控。

## Reliability Timebox（可靠性时间盒）
**何时用**：assistant 反复修订、反馈弱、或交互成本在上升。
**怎么做**：定义短收敛窗口与结束它的证据。证据没出现就停止，回到确定性调查或更小的任务。
**权衡**：可能放弃有前景的探索；防止无上限的时间浪费。

## Risk-Calibrated Oversight（按风险校准的监督）
**何时用**：决定 agent 能不能行动、能改什么、或 review 要多深。
**怎么做**：评估出错概率、失败影响与可检测性。只有工作有界、可逆、被强力检查时才用 outside-the-loop；否则用 in-the-loop 或 on-the-loop 控制。
**权衡**：更高审查拖慢低风险工作；它保护后果严重、难以检测的失败。

## Reference Anchoring（参考锚定）
**何时用**：约定重要，且存在当前可用示例。
**怎么做**：给出最小的相关 reference application 或模式；约定变更时刷新它，移除过期示例。
**权衡**：过期 reference 误导；当前 reference 减少歧义。

## Context Refresh（context 刷新）
**何时用**：agent 在猜、用被取代的约定、或没有抵达所需证据的可靠路径。
**怎么做**：命名当前任务边界，替换过期 reference，暴露 search/read interface，预加载不可或缺的约束，移除无关 context。
**权衡**：策展花时间；宽泛未策展的 context 花可靠性。Context 策展提高概率；它不保证 agent 行为。

## Local-Model Viability Funnel（本地模型可用性漏斗）
**何时用**：为真实编码 harness 评估本地模型。
**怎么做**：按序测试内存适配、速度、工具调用、功能正确性、持续 context、任务规模，再测 review 负担。
**权衡**：严格漏斗可能拒绝一个对简单工作有用的模型；它防止把 chat 成功外推到 agentic coding。

## Prototype Then Harden（先原型后加固）
**何时用**：探索有用但生产风险更高。
**怎么做**：快速探索，然后单独验证设计、安全、测试、可维护性与归属，再进入生产。
**权衡**：避免把探索产出当生产就绪。

## Guides + Sensors Pairing（guides 与 sensors 配对）
**何时用**：设计或扩展任何 agent harness。
**怎么做**：对每个 guide（feedforward）问哪个 sensor 验证它；对每个 sensor（feedback）问哪个 guide 阻止复发。绝不只跑 feedback-only（agent 重复犯错）或 feedforward-only（规则从不验证）。
**权衡**：两个方向都建前期成本更高；跳一个方向就有命名的失败模式。

## Self-Correction Guidance（自我修正引导）
**何时用**：sensor 的原始输出要给 agent，而不是给人的仪表盘。
**怎么做**：在信号里补充修复指令、允许的例外（例如带理由压制、略微上调阈值）与「好」的标准——一次正向 prompt injection。
**权衡**：需要自定义 formatter/parser；没有引导，agent 会消解 sensor 而不是修代码。

## Shift Feedback Left（反馈左移）
**何时用**：在交付生命周期里放置新检查。
**怎么做**：每次变更在会话内跑便宜的 computational sensors；在 pipeline 重跑；把慢的 drift 与 inferential sensors 排上节奏；在生产监控健康。失败抓得越早，修得越便宜。
**权衡**：会话内 sensors 必须保持快，否则它们拖累自己服务的 feedback loop。

## Regression Sensor via Mutation Testing（用变异测试做回归 sensor）
**何时用**：测试写作委托给 AI，coverage 看起来让人放心。
**怎么做**：跑 mutation testing（贵就增量跑）找缺失的断言；把 acceptance test 虚高的 coverage 当作未验证，直到 mutation score 确认。
**权衡**：资源密集；按节奏或对变更文件跑，而不是每次提交都跑。

## Refactor for Token Economy（为 token 经济重构）
**何时用**：agentic codebase 出现漂移：最大文件在变大、单次变更 files-touched 在上升。
**怎么做**：引导 agent 走严格的重构步骤（agent 独自不擅长选择与应用重构）；回报可测量——单次变更输入 token 下降，且节省在未来每次变更复现。
**权衡**：重构本身花 token（上限可能很大）；收益取决于内聚分解，而不是随意拆文件。
