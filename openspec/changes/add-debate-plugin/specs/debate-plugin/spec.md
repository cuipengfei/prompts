# Spec: debate-plugin

> Debate 插件规格定义

## ADDED Requirements

### Requirement: Debate Command

系统 SHALL 提供 `/debate` 命令启动主代理与子代理的辩论。

#### Scenario: 用户提供辩论主题

Given 用户调用 `/debate "是否应该用 microservices"`
When 命令执行
Then 主代理陈述对该主题的观点
And 启动子代理进行质疑

#### Scenario: 用户无参数调用

Given 用户调用 `/debate` 无参数
When 命令执行
Then 主代理询问具体辩论主题

### Requirement: Dynamic Agent Selection

系统 SHALL 根据辩论主题动态选择最合适的 subagent_type。

#### Scenario: 选择专业代理

Given 辩论主题有明确专业领域
When 主代理启动辩论
Then 评估可用的 subagent types
And 选择最匹配主题的专业代理

#### Scenario: 通用话题

Given 辩论主题无明确专业领域
When 主代理启动辩论
Then 选择 `general-purpose` 代理

#### Scenario: 代理选择失败回退

Given 主代理选择的专业代理不可用或响应异常
When 启动子代理失败
Then 回退到 `general-purpose` 代理
And 在辩论记录中记录回退原因

### Requirement: Concrete Context for Sub-Agent

系统 SHALL 为子代理提供具体上下文，确保辩论基于事实而非抽象讨论。

#### Scenario: 代码设计辩论

Given 辩论涉及代码设计
When 主代理启动子代理
Then Task prompt 包含文件路径
And 包含关键代码片段或让子代理自行读取

#### Scenario: 架构决策辩论

Given 辩论涉及架构决策
When 主代理启动子代理
Then Task prompt 包含相关文件结构
And 包含依赖关系说明

#### Scenario: PR 审查辩论

Given 辩论涉及代码变更
When 主代理启动子代理
Then Task prompt 告知子代理运行 git diff
And 包含变更文件列表

#### Scenario: 避免空泛辩论

Given 主代理启动子代理
When 存在上下文可能不足的风险
Then 主代理在 Task prompt 中说明"若上下文不足，请自主寻找并报告"
And 子代理应自主探索而非空泛辩论

### Requirement: Dialectic Partner Role

系统 SHALL 将子代理设置为"dialectic partner"角色，而非简单的"反对者"。

#### Scenario: 子代理质疑方式

Given 主代理陈述观点
When 子代理响应
Then 子代理应质疑隐含假设
And 提出边界情况或反例
And 探索替代方案
But 保持建设性而非敌对

#### Scenario: 辩论目标

Given 辩论进行中
When 子代理提出质疑
Then 目标是帮助发现更好答案
And 不是证明对方错误

### Requirement: Resume Mechanism

系统 SHALL 使用 Task + resume 机制实现多轮辩论。

#### Scenario: 多轮对话

Given 首轮辩论完成
When 主代理需要继续辩论
Then 使用 Task 工具的 resume 参数
And 传入上一轮返回的 agentId
And 子代理保持完整上下文

#### Scenario: 模式灵活性

Given 辩论中任意一轮
When 需要切换执行模式
Then 可在前台/后台模式间自由切换
And resume 机制正常工作

#### Scenario: 跨会话续辩

Given 上一次会话的辩论未完成
When 用户在新会话中希望继续
Then 主代理读取 `.debates/*.md` 历史文件恢复上下文
And 启动新的子代理继续辩论
But agentId 不跨会话保留（会话级资源）

### Requirement: Natural Conclusion

系统 SHALL 让辩论自然发展，不预设固定轮数。

#### Scenario: 达成共识

Given 辩论进行中
When 双方观点趋于一致
Then 主代理可提议总结
And 呈现共识点和关键洞察

#### Scenario: 保持分歧

Given 辩论进行中
When 双方无法达成共识
Then 主代理总结各方立场
And 呈现分歧点供用户参考

#### Scenario: 用户介入

Given 辩论进行中
When 用户发送新消息
Then 暂停当前辩论轮次
And 响应用户需求
And 用户可引导辩论方向

#### Scenario: Soft Limit 提醒

Given 辩论已进行 10 轮
When 主代理判断是否继续
Then 主动建议总结辩论
But 不强制结束，用户可选择继续

### Requirement: Minimal Skill Content

系统 SHALL 保持 skill 内容简洁，信任 SOTA 模型能力。

#### Scenario: Skill 核心内容

Given dialectic-partner skill 加载
When skill 内容被读取
Then 包含目的说明、角色定义、质量标准
And 可包含操作流程和机制说明（如 Task + resume 使用、记录持久化）
And 不包含辩论技巧教程或逻辑谬误清单
But 信任模型已知如何进行高质量辩论

#### Scenario: 避免重复

Given 系统指令已包含思维原则
When skill 设计
Then 简要引用而非重复
And 保持 DRY 原则

### Requirement: User Participation

系统 SHALL 通过 AskUserQuestion 让用户全程参与辩论。

#### Scenario: 辩论开始前

Given 用户调用 /debate 命令
When 辩论即将开始
Then 使用 AskUserQuestion 确认主题和关注重点
And 询问用户是否有初始倾向

#### Scenario: 每轮结束后

Given 一轮辩论交换完成
When 主代理判断需要用户输入
Then 使用 AskUserQuestion 提供选项
And 选项包括：继续辩论、补充观点、引导方向、总结结束

#### Scenario: 关键分歧点

Given 辩论出现重大分歧
When 需要额外信息或用户决策
Then 使用 AskUserQuestion 请求用户输入
And 用户可提供额外上下文或表态

#### Scenario: 用户补充纳入辩论

Given 用户通过 AskUserQuestion 补充观点
When 辩论继续
Then 用户输入纳入辩论上下文
And 子代理可针对用户观点回应

#### Scenario: 用户选择跳过

Given 主代理通过 AskUserQuestion 询问用户
When AskUserQuestion 显示选项
Then 选项中应包含"让代理自行决定"或"继续辩论"
And 用户可选择此项让主代理自行推进

### Requirement: Debate History Persistence

系统 SHALL 实时更新辩论历史 Markdown 文件，防止长对话上下文丢失。

#### Scenario: 辩论开始时创建文件

Given 辩论开始
When 主代理陈述初始观点
Then 创建 `.debates/YYYY-MM-DD-topic-slug.md` 文件
And 写入元数据（日期、Status: in-progress、参与者）
And 写入 Round 1 内容
And 提示用户辩论将记录到该文件

#### Scenario: 每轮结束后追加

Given 一轮辩论交换完成
When 子代理响应完毕
Then 追加该轮内容到文件
And 包括主代理观点、子代理质疑、用户输入（如有）

#### Scenario: 上下文过长时重新读取

Given 对话上下文过长
When 代理可能遗忘早期内容
Then 代理可读取辩论文件恢复上下文

#### Scenario: 辩论结束询问

Given 辩论结束
When 主代理总结完毕
Then 追加 Conclusion 部分
And 使用 AskUserQuestion 询问是否保留记录

#### Scenario: 用户选择保留

Given 用户选择保留记录
When 确认保留
Then 更新 Status 为 completed
And 填写 Outcome（consensus | partial | disagreement）

#### Scenario: 用户选择删除

Given 用户选择不保留记录
When 确认删除
Then 删除辩论文件

### Requirement: Main Agent Isolation

系统 SHALL 确保主代理不会在用户同意前根据子代理建议修改代码或文件。

#### Scenario: 子代理提出修改建议

Given 子代理在辩论中提出代码修改建议
When 主代理收到建议
Then 主代理只能展示建议内容
And 不得自动执行任何修改
And 必须使用 AskUserQuestion 询问用户是否采纳

#### Scenario: 用户同意修改

Given 子代理提出修改建议
When 用户通过 AskUserQuestion 明确同意
Then 主代理可以执行修改
And 在辩论记录中注明"用户已同意"

#### Scenario: 用户拒绝修改

Given 子代理提出修改建议
When 用户拒绝或未响应
Then 主代理不得执行任何修改
And 辩论继续进行

#### Scenario: 违反隔离原则

Given 主代理在未获用户同意前执行了子代理建议的修改
When 检测到此行为
Then 视为严重错误
And 应立即停止并向用户报告
