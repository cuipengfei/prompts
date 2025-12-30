# codex-plugin Specification

## Purpose
提供 Codex 集成插件，让 Claude Code 能够调用 OpenAI Codex 获取第二意见，并在展示前进行批判性评估。

## ADDED Requirements

### Requirement: Codex Command

系统 SHALL 提供 `/codex` 命令，使用 Forced Eval 3-Step 模式调用 codex-advisor skill。

#### Scenario: 用户调用 /codex 命令

**Given** 用户安装了 codex 插件
**When** 用户输入 `/codex 检查这个函数的实现`
**Then** Claude Code 执行 3-Step 流程：EVALUATE → ACTIVATE → IMPLEMENT
**And** 调用 `Skill("codex:codex-advisor")` 加载技能
**And** 按技能指南执行

#### Scenario: 用户无参数调用

**Given** 用户安装了 codex 插件
**When** 用户输入 `/codex`
**Then** Claude Code 根据当前会话上下文推断意图
**And** 对最近的工作进行整体评估

---

### Requirement: Intent Inference

codex-advisor skill SHALL 根据上下文自动推断用户意图，无需用户明确指定场景。

#### Scenario: 文件引用触发代码审查

**Given** 用户输入包含 `@src/auth.ts`
**When** skill 分析用户意图
**Then** 推断场景为"代码审查"
**And** 构建针对该文件的审查请求

#### Scenario: git diff 上下文触发变更审查

**Given** 当前有未提交的变更
**When** 用户请求审查变更
**Then** 推断场景为"变更审查"
**And** 将 git diff 内容嵌入请求

#### Scenario: 问句形式触发第二意见

**Given** 用户输入为问句形式（如 "这个设计合理吗？"）
**When** skill 分析用户意图
**Then** 推断场景为"第二意见"
**And** 构建开放性咨询请求

---

### Requirement: Context Passing

codex-advisor skill SHALL 使用多种方式组合传递上下文，确保 Codex 有足够信息做出有价值的反馈。

#### Scenario: 传递项目目录

**Given** 当前工作目录为 `/path/to/project`
**When** 调用 Codex MCP
**Then** 设置 `cwd` 参数为当前项目目录
**And** 设置 `sandbox` 为 `read-only`

#### Scenario: 注入项目规则

**Given** 项目有 CLAUDE.md 文件
**When** 构建 Codex 请求
**Then** 读取 CLAUDE.md 中的关键规则
**And** 通过 `base-instructions` 参数注入

---

### Requirement: Critical Evaluation

codex-advisor skill SHALL 对 Codex 返回的建议进行批判性评估，过滤 nitpick 和 over-engineering，不盲目信任结果。

#### Scenario: 识别并过滤 nitpick

**Given** Codex 返回了仅涉及风格偏好的建议
**When** 评估该建议
**Then** 判定为 nitpick
**And** 分类到"已过滤"类别
**And** 说明过滤原因

#### Scenario: 识别并过滤 over-engineering

**Given** Codex 建议引入不必要的抽象层
**When** 评估该建议
**Then** 判定为 over-engineering
**And** 分类到"已过滤"类别
**And** 说明过滤原因

#### Scenario: 保留有价值的建议

**Given** Codex 返回了有实际价值的建议（如发现 bug、性能问题）
**When** 评估该建议
**Then** 判定为有价值
**And** 分类到"采纳建议"类别

#### Scenario: 标记需讨论的建议

**Given** Codex 返回了可能有价值但需用户判断的建议
**When** 评估该建议
**Then** 分类到"需讨论"类别
**And** 说明为什么需要用户决定

---

### Requirement: Output Format

输出格式 SHALL 将 Codex 建议分为三类（采纳/需讨论/已过滤），并为每个分类说明理由。

#### Scenario: 完整输出结构

**Given** Codex 返回了多条建议
**When** 完成批判性评估
**Then** 输出包含三个分类区域：
  - ✅ 采纳建议（有价值）
  - 💬 需讨论（可能有价值）
  - ⏭️ 已过滤（nitpick/over-engineering）
**And** 每条建议附带分类理由
**And** 结尾询问用户想采纳哪些建议

---

### Requirement: Plugin Structure

codex 插件 SHALL 遵循项目的插件开发最佳实践。

#### Scenario: plugin.json 格式正确

**Given** 插件需要 plugin.json
**When** 创建 plugin.json
**Then** 包含 name, version, description, author, license, repository
**And** description 包含 `[Command + Skill]` 标签
**And** 通过 `jq . plugin.json` 验证

#### Scenario: Command 使用 Forced Eval 模式

**Given** command 需要调用 skill
**When** 创建 codex.md
**Then** 使用 MANDATORY 3-Step Process 结构
**And** Step 2 明确调用 `Skill("codex:codex-advisor")`
