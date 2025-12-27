# 变更提案：转型为 Claude Code 插件市场

## 为什么

当前仓库是一个"AI 编程助手指令框架"项目，包含丰富的 agents、commands、output-styles 和指令文件，但这些资产仅作为**项目级配置**存在于 `.claude/` 目录中，无法被其他项目复用或社区发现。

Claude Code 官方支持**插件市场（Marketplace）**机制，允许：

- 将现有资产打包为可复用的插件
- 通过 `/plugin install` 命令一键安装
- 跨项目共享、版本化管理
- 社区发现和贡献

## 变更内容

### 核心变更

1. **创建 Marketplace 元数据**
   - 添加 `.claude-plugin/marketplace.json` 定义插件目录
   - 设置 marketplace 名称、所有者信息

2. **重构现有资产为独立插件**
   - `prompts-core-agents`: 核心 agents (code-specialist, memory-manager, planning-analyst, tdd-coach)
   - `prompts-commands`: 通用 commands (improve-prompt)
   - `prompts-output-styles`: 输出样式 (structured-responder)
   - `prompts-skills`: 将 `.github/instructions/*.md` 转化为 Skills

3. **添加插件清单文件**
   - 每个插件目录添加 `.claude-plugin/plugin.json`
   - 定义 name, version, description, 组件路径

4. **更新文档**
   - 更新 README.md 说明如何作为 Marketplace 使用
   - 添加安装指南和使用示例

### 目录结构（目标）

```
prompts/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace 清单
├── plugins/
│   ├── prompts-core-agents/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── agents/
│   │       ├── code-specialist.md
│   │       ├── memory-manager.md
│   │       ├── planning-analyst.md
│   │       └── tdd-coach.md
│   ├── prompts-commands/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── commands/
│   │       └── improve-prompt.md
│   ├── prompts-output-styles/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── output-styles/
│   │       └── structured-responder.md
│   └── prompts-skills/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       └── skills/
│           ├── foundational-principles/
│           │   └── SKILL.md
│           ├── quality-standards/
│           │   └── SKILL.md
│           └── ...
├── .claude/                       # 保留用于本地开发配置
├── openspec/
└── README.md                      # 更新为 Marketplace 使用指南
```

## 影响分析

- **受影响规范**: 无（首次建立规范）
- **受影响代码/文件**:
  - `.claude/` 目录内容迁移至 `plugins/`
  - `.github/instructions/*.md` 转化为 Skills
  - 新增 `.claude-plugin/marketplace.json`
- **兼容性**: **非破坏性** - 现有 `.claude/` 配置可保留用于本地开发

## 预期收益

1. **可复用性**: 其他项目可通过 `/plugin install` 一键获取
2. **版本化**: 插件独立版本控制，升级更可控
3. **社区贡献**: 开放 PR 添加新插件
4. **模块化**: 用户可按需安装部分插件而非全量
