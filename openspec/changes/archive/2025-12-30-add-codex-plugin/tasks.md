# Tasks: add-codex-plugin

## Task List

### Phase 1: Plugin Scaffold

- [x] **T1**: 创建 `plugins/codex/.claude-plugin/plugin.json`
  - 版本 1.0.0
  - 描述包含 `[Command + Skill]` 标签
  - **验证**: `jq . plugin.json` 无错误 ✓

### Phase 2: Command Implementation

- [x] **T2**: 创建 `plugins/codex/commands/codex.md`
  - 使用 Forced Eval 3-Step 模式
  - 调用 `Skill("codex:codex-advisor")`
  - 支持 `$ARGUMENTS` 传递用户参数
  - **验证**: frontmatter 格式正确 ✓

### Phase 3: Skill Implementation

- [x] **T3**: 创建 `plugins/codex/skills/codex-advisor/SKILL.md`
  - 场景推断逻辑
  - 上下文收集步骤
  - Codex MCP 调用参数
  - **验证**: `parse-frontmatter.sh` 通过 ✓

- [x] **T4**: 实现批判性评估逻辑（在 SKILL.md 中）
  - 定义 nitpick 判断标准
  - 定义 over-engineering 判断标准
  - 输出分类格式
  - **验证**: 逻辑清晰可执行 ✓

### Phase 4: Integration & Validation

- [x] **T5**: 更新 `marketplace.json` 添加 codex 插件条目
  - category: tools
  - **验证**: `jq . marketplace.json` 无错误 ✓

- [x] **T6**: 端到端测试
  - 文件结构验证完成
  - marketplace.json 验证完成
  - **注意**: 实际插件安装测试需要在 commit 后执行

## Dependencies

- T2 depends on T1 ✓
- T3, T4 depend on T2 ✓
- T5 depends on T1 ✓
- T6 depends on all above ✓
