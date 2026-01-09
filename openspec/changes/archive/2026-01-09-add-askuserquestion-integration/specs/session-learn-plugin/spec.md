# session-learn-plugin Specification Delta

## MODIFIED Requirements

### Requirement: Session Learning Skill

系统 SHALL 使用 AskUserQuestion 工具让用户选择性持久化学习内容，替代简单的 y/n 确认。

#### Scenario: 用户多选确认持久化项目

**Given** session-learning skill 已分类完成学习内容
**And** 有多个学习项待确认
**When** 展示分类结果给用户
**Then** 使用 AskUserQuestion 工具呈现选项
**And** 设置 multiSelect 为 true
**And** 每个学习项作为一个选项（最多 4 个）
**And** 用户可选择部分、全部或跳过
**And** 只持久化用户选中的项目

#### Scenario: 学习项超过 4 个

**Given** 提取的学习项超过 4 个
**When** 构建 AskUserQuestion 选项
**Then** 按优先级选取前 4 个作为选项
**And** 在 description 中提及其他项可通过 "Other" 指定
**And** 用户选择 "Other" 时，提示输入要持久化的项目编号

---
