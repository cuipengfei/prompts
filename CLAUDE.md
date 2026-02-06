<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code 插件市场项目 - 19 个独立可选安装的插件，每个插件包含单一功能组件。

## Project Structure

```
.claude-plugin/
└── marketplace.json       # 19 个独立插件条目

plugins/
├── improve-prompt/         # Command: 提示词优化
├── desktop-notify/         # Hook: Stop + Notification 通知 (Bun WebSocket)
├── structured-responder/   # Output-style: 结构化响应
├── natural-writing/        # Output-style: 自然写作
├── session-learn/          # Command + Skill: 会话学习
├── codex/                  # Command + Skill: Codex 顾问
├── debate/                 # Command + Skill: 辩论插件
├── deep-research/          # Command + Skill: 深度研究
├── foundational-principles/ # Skill: 基础原则
├── quality-standards/      # Skill: 质量标准
├── programming-workflow/   # Skill: TDD 工作流
├── testing-guidelines/     # Skill: 测试指南
├── planning-workflow/      # Skill: 规划工作流
├── ba-collaboration/       # Skill: BA 协作
├── memory-bank/            # Skill: 记忆库
├── response-guidelines/    # Skill: 响应指南
├── sequential-thinking/    # Skill: 顺序思维
├── shortcut-system/        # Skill: 快捷命令
└── zellij-control/         # Skill: Zellij 控制
```

## Plugin Development Best Practices

### ✅ DOs

1. **Auto-discovery > Explicit declaration**
   - Plugin.json **不需要** `skills/commands/outputStyles` 数组
   - Claude Code 自动从文件系统发现组件
   - plugin.json 只包含元数据

2. **参考官方插件实现**
   ```bash
   # 查看官方插件结构
   ls ~/.claude/plugins/marketplaces/claude-code-plugins/plugins/
   cat ~/.claude/.../hookify/.claude-plugin/plugin.json
   ```

3. **使用官方验证脚本**
   ```bash
   # 验证 hooks.json (需提取内层)
   jq '.hooks' hooks/hooks.json > /tmp/inner.json
   bash ~/.claude/.../validate-hook-schema.sh /tmp/inner.json

   # 验证 SKILL.md frontmatter
   bash ~/.claude/.../parse-frontmatter.sh skills/*/SKILL.md
   ```

4. **正确的 plugin.json 格式**
   ```json
   {
     "name": "plugin-name",
     "version": "1.0.0",
     "description": "...",
     "author": {
       "name": "Name",
       "email": "email@example.com"
     },
     "license": "MIT",
     "repository": "https://github.com/..."
   }
   ```

5. **Hooks wrapper format**
   - Plugin hooks: `{"hooks": {"Stop": [...]}}`
   - User settings: 直接 `{"Stop": [...]}`

6. **版本管理**
   - **任何修改必须 bump version**:
     - 修改 plugin.json、SKILL.md、hooks.json 等任何文件
     - 包括 description、keywords 等元数据字段
     - 即使是文档性修改也应递增 PATCH 版本

   - **语义化版本规则**:
     - PATCH (x.y.Z): 修复、文档、描述优化
     - MINOR (x.Y.0): 新增功能、新增 skill/command
     - MAJOR (X.0.0): 破坏性变更、API 变更

   - **技术原因**:
     - `claude plugin update` 通过版本号判断是否需要更新
     - 缓存路径 `~/.claude/plugins/cache/{plugin}/{version}/`
     - 版本相同 → 跳过更新，使用旧缓存
     - 用户需手动 uninstall + install 才能看到变更

   - **最佳实践**:
     - 修改文件前先 bump version
     - git commit 包含 version 变更
     - 避免让已安装用户看到过时内容

### Skill 编写经验

1. **目标读者清晰**: Skill 由主代理加载，所有指令应以主代理视角编写
   - ❌ "子代理应请求信息" — 目标读者不明确
   - ✅ "告知子代理：若上下文不足，请自主寻找并报告" — 主代理视角

2. **避免硬编码代理类型**: 使用 `general-purpose` 或让主代理动态选择
   - ❌ `backend-development:backend-architect` — 其他用户可能没有
   - ✅ "根据主题从可用 subagent_type 中选择" — 通用

3. **内容放置合理**: 相关指令放在使用它的地方附近
   - ❌ "质量期望"放在文件末尾
   - ✅ "告知子代理"放在准备 Task prompt 的步骤中

4. **子代理自主性**: 信任 SOTA 模型，让子代理自主寻找而非被动等待
   - ❌ "若上下文不足，请先请求信息"
   - ✅ "若上下文不足，请自主寻找相关文件并报告"

### ❌ DON'Ts

1. **不要在 plugin.json 中声明组件数组**
   ```json
   // ❌ 错误
   {"skills": [{"name": "...", "description": "..."}]}

   // ✅ 正确 - 移除，自动发现
   {"name": "...", "author": {...}}
   ```

2. **不要打包不相关功能**
   - 一个插件 = 一个功能单元
   - 11 个 skills 应该是 11 个插件

3. **不要用字符串作为 author**
   ```json
   // ❌ "author": "name"
   // ✅ "author": {"name": "...", "email": "..."}
   ```

4. **不要假设验证脚本支持所有格式**
   - `validate-hook-schema.sh` 只支持 direct format
   - Plugin wrapper format 需要先提取 `.hooks`

5. **不要在 plugin.json 中使用 `$schema` 字段**
   ```json
   // ❌ 错误 - Claude Code 验证器不接受额外字段
   {"$schema": "https://...", "name": "..."}

   // ✅ 正确 - 只用官方支持的字段
   {"name": "...", "version": "...", ...}
   ```
   - Claude Code 使用**严格模式**验证 plugin.json
   - 不识别的字段会导致安装失败：`Unrecognized key: "$schema"`

## Validation Commands

```bash
# 验证所有 plugin.json
for f in plugins/*/.claude-plugin/plugin.json; do
  jq . "$f" > /dev/null && echo "✓ $(basename $(dirname $(dirname $f)))" || echo "✗ FAIL"
done

# 验证 SKILL.md (11 个)
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/plugin-settings/scripts/parse-frontmatter.sh plugins/*/skills/*/SKILL.md

# 验证 hooks.json
jq '.hooks' plugins/desktop-notify/hooks/hooks.json > /tmp/hooks.json
bash ~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/hook-development/scripts/validate-hook-schema.sh /tmp/hooks.json
```

## Key Architecture Patterns

### 单一职责插件
每个插件目录只包含一个组件类型：
- `commands/` - 斜杠命令
- `skills/skill-name/` - 单个 skill
- `hooks/` - 事件钩子
- `output-styles/` - 输出风格

### Skills 结构
每个 skill 包含：
- **知识定义** - 原则、标准、流程
- **执行指导** - 触发条件、检查清单（如 quality-standards、programming-workflow）

### Command 调用 Skill 的可靠模式

当 command 依赖外部 skill 时，简单指令（如 "使用 xxx 技能"）只有 ~20% 成功率。使用 **Forced Eval 2-Step 模式**可达 ~84%：

```markdown
# MANDATORY 2-Step Process

**Step 1 - ACTIVATE**: 立即使用 Skill tool 调用技能
- Command: `Skill("plugin:skill-name")`
- ⚠️ **CRITICAL**: 这一步**不可跳过**。直接实现而不调用 Skill tool 是**无效的**。

**Step 2 - IMPLEMENT**: 仅在 skill 加载后，严格按照其指南执行
```

**原理**: 用户调用 command 时意图已明确，无需形式化的"评估"步骤。强制调用 Skill tool 创建 commitment mechanism，确保 skill 被正确加载而非被忽略。

### Skill 命名规范

当同一插件包含 command 和 skill 时，**skill 名称应避免包含 command 名称的子串**：

| ❌ 冲突命名 | ✅ 清晰命名 |
|------------|------------|
| command: `learn`, skill: `session-learning` | command: `learn`, skill: `auto-extract` |
| command: `recall`, skill: `session-recall` | command: `recall`, skill: `knowledge-fetch` |

**原因**: Claude Code 使用模糊匹配，子串包含关系会导致调用混淆。

### Hooks 配置
```json
{
  "description": "...",
  "hooks": {
    "Stop": [{"matcher": ".*", "hooks": [{...}]}],
    "Notification": [{"matcher": ".*", "hooks": [{...}]}]
  }
}
```

### Hooks 开发注意事项

**Notification hook matchers**（官方支持的类型）:
- `permission_prompt` - 权限请求
- `idle_prompt` - 空闲 60 秒后
- `auth_success` - 认证成功
- `elicitation_dialog` - MCP 工具输入

**Bun WebSocket pub/sub 注意事项**:
- `server.publish()` 返回**字节数**，不是客户端数
- 使用 `server.subscriberCount(topic)` 获取真实客户端数
- 在 `close` handler 中显式 `ws.unsubscribe(topic)` 清理订阅

**测试 hooks 时复制到 cache**:
```bash
cp -r plugins/xxx/* ~/.claude/plugins/cache/prompts/xxx/{version}/
```

## Marketplace Schema

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "prompts",
  "owner": {...},
  "plugins": [
    {
      "name": "plugin-name",
      "description": "...",
      "source": "./plugins/plugin-name",
      "category": "development|productivity|learning|tools|collaboration"
    }
  ]
}
```

**注意**: `source` 不是 `path`

## Communication Standards

- **内部推理**: 英语
- **用户交流**: 中文
- **技术术语**: 保持英语
- **SKILL.md 内容**: 使用中文，与项目其他插件保持一致

## OpenSpec Conventions

- **proposal 格式要求**：必须包含 `## Why` 和 `## What Changes` sections
- **不要忽略验证警告**：即使标记为 "non-blocking" 也应处理
- **spec.md Requirement 格式**（重要，常犯错误）：
  ```markdown
  ### Requirement: Short Name    ← 标题用简短名称，不含 SHALL

  系统 SHALL 做某事...           ← SHALL 必须在标题下第一行描述中

  #### Scenario: 场景名
  ```
  - ❌ 错误：`### Requirement: 系统 SHALL 提供...`（SHALL 在标题里）
  - ✅ 正确：`### Requirement: Codex Command` + 下一行 `系统 SHALL...`
  - 验证器检查描述行，不是标题行
  - 参考格式：`openspec/specs/session-learn-plugin/spec.md`
- **新建 spec 用 ADDED**：不能用 `MODIFIED`（目标 spec 不存在时）
- **Delta 类型选择**：检查目标 spec 中该 requirement 是否已存在
  - requirement 不存在 → `ADDED`
  - requirement 已存在 → `MODIFIED`
  - 否则 archive 会失败："header not found"
