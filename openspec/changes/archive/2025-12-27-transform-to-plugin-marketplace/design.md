# 技术设计文档

## 背景

本仓库目前作为"项目级"Claude Code 配置存在，资产分布在 `.claude/` 目录中。根据 Claude Code 官方插件文档，我们可以将其转型为 **Marketplace**，使这些资产可被社区发现、安装和复用。

## 设计目标

### 目标

1. **模块化**: 将现有资产拆分为独立、可组合的插件
2. **可发现性**: 通过 Marketplace 机制让用户可以 `/plugin marketplace add` 和 `/plugin install`
3. **版本化**: 每个插件独立版本控制，支持增量更新
4. **向后兼容**: 保留 `.claude/` 目录用于本地开发，不破坏现有工作流

### 非目标

1. 不重写现有 agents/commands/output-styles 的内容
2. 不引入复杂的构建工具或 CI/CD 流程（保持 Markdown 驱动）
3. 不强制用户安装所有插件（可按需选择）

## 设计决策

### 决策 1: Marketplace 结构

**选择**: 使用 monorepo 风格，所有插件在 `plugins/` 目录下

**替代方案**:
- A) 每个插件独立仓库 → 管理成本高，版本同步困难
- B) 单一插件包含所有资产 → 失去模块化优势
- C) Monorepo + 子目录（**选择**）→ 易于管理，用户可按需安装

**理由**: Monorepo 结构让仓库保持简洁，同时 Marketplace 机制允许用户只安装需要的插件。

### 决策 2: 插件拆分策略

**选择**: 按资产类型拆分为 4 个插件

| 插件名称 | 内容 | 用途 |
|---------|------|------|
| `prompts-core-agents` | agents/*.md | 专业化子代理（代码专家、TDD教练等）|
| `prompts-commands` | commands/*.md | 通用斜杠命令 |
| `prompts-output-styles` | output-styles/*.md | 输出样式模板 |
| `prompts-skills` | skills/*/SKILL.md | 指令框架转化的技能 |

**替代方案**:
- 按功能域拆分（quality, workflow, analysis）→ 边界模糊，难以维护
- 单一大插件 → 失去按需安装能力

### 决策 3: Instructions 转 Skills

**选择**: 将 `.github/instructions/*.md` 转化为 Claude Code Skills 格式

**转化规则**:
1. 每个 instruction 文件 → 一个 skill 目录
2. 主内容放入 `SKILL.md`，使用 YAML frontmatter 定义 `name` 和 `description`
3. 保留原始文件作为 Copilot 兼容层（可选）

**Skills 格式示例**:
```yaml
---
name: quality-standards
description: 代码质量标准和反模式指南。在代码审查、重构或需要确保代码质量时使用。
---

[原始 instruction 内容...]
```

### 决策 4: 命名规范

**Marketplace 名称**: `prompts-marketplace`（或仓库所有者/仓库名）

**插件名称前缀**: `prompts-` 统一前缀，确保命名空间清晰

**命令调用格式**:
- 安装前: `/improve-prompt`（项目级）
- 安装后: `/prompts-commands:improve-prompt`（插件级，带命名空间）

### 决策 5: 兼容性策略

**选择**: 保留 `.claude/` 目录用于本地开发

**行为**:
1. `.claude/` 继续作为项目级配置存在
2. 用户可选择：
   - 直接使用项目级配置（克隆仓库，现有行为）
   - 通过 Marketplace 安装插件（新增能力）

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Skills 格式不兼容 | 现有 instructions 可能需要调整 | 先在小范围测试，迭代格式 |
| 命名空间冲突 | 用户可能已有同名命令 | 使用 `prompts-` 前缀降低冲突概率 |
| 插件加载失败 | 结构错误导致无法加载 | 添加验证步骤到 tasks.md |

## 迁移计划

### 阶段 1: 创建基础结构
- 添加 Marketplace 元数据
- 创建插件目录骨架

### 阶段 2: 迁移资产
- 复制（非移动）现有资产到插件目录
- 保留原始 `.claude/` 结构

### 阶段 3: 验证与文档
- 验证插件结构
- 更新 README 添加安装指南

### 阶段 4: 可选清理
- 确认稳定后，可选择移除 `.claude/` 中的重复内容
- 或保留作为"快速体验"入口

## 开放问题

1. **是否需要 CI 验证?** 可后续添加 GitHub Action 自动验证 marketplace.json 格式
2. **版本策略?** 建议从 `1.0.0` 开始，后续按 semver 规范迭代
3. **OpenSpec 命令归属?** `openspec/*` 命令是 OpenSpec CLI 注入的，不纳入插件范围

---

## 附录：MCP 工具搜索最佳实践汇总

### 来源

通过以下 MCP 工具搜索获取最佳实践：
- **Firecrawl**: 搜索 Claude Code plugin marketplace 相关内容
- **Exa**: 搜索 Claude Code plugin development best practices
- **DuckDuckGo**: 搜索 github marketplace 实践
- **Context7**: 获取 /anthropics/claude-code 和 /thevibeworks/claude-code-docs 文档
- **DeepWiki**: 查询 anthropics/claude-code 仓库关于 plugin marketplace 的信息
- **本地插件分析**: 分析 superpowers-marketplace 和 superpowers-developing-for-claude-code 结构

### 关键最佳实践

#### 1. Marketplace 结构（来自 ivan-magda/claude-code-plugin-template）

```
marketplace/
├── .claude-plugin/
│   └── marketplace.json      # Marketplace 元数据
├── plugins/
│   └── plugin-name/
│       ├── .claude-plugin/
│       │   └── plugin.json   # 插件清单
│       ├── commands/
│       ├── agents/
│       ├── skills/
│       └── README.md
├── docs/                      # 文档目录
└── README.md
```

#### 2. marketplace.json 规范

```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Owner Name",
    "email": "owner@example.com"
  },
  "metadata": {
    "description": "Marketplace description",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./plugins/plugin-name",
      "description": "Plugin description",
      "version": "1.0.0",
      "category": "development",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

#### 3. plugin.json 规范

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "What the plugin does",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  },
  "homepage": "https://example.com",
  "repository": "https://github.com/owner/repo",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}
```

#### 4. Skill 目录结构（来自 superpowers 和 Context7）

```
skill-name/
├── SKILL.md                   # 主技能文件（必需）
├── reference/                 # 参考文档（可选）
│   ├── domain1.md
│   └── domain2.md
└── scripts/                   # 辅助脚本（可选）
    └── helper.js
```

**SKILL.md 格式**:
```yaml
---
name: skill-name
description: Brief description of what this Skill does and when to use it
---

# Skill Name

## Instructions
[Clear, step-by-step guidance]

## Examples
[Concrete examples]
```

#### 5. 命名规范

- **Marketplace 名称**: kebab-case，如 `prompts-marketplace`
- **插件名称**: kebab-case，带统一前缀，如 `prompts-core-agents`
- **Skill 名称**: kebab-case，描述性，如 `quality-standards`
- **避免保留名称**: `claude-plugins-official`, `anthropic-marketplace` 等

#### 6. 团队配置（.claude/settings.json）

```json
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/your-marketplace-name"
      }
    }
  },
  "enabledPlugins": {
    "plugin-name@marketplace-name": true
  }
}
```

#### 7. 验证与测试

```bash
# 本地添加 marketplace
/plugin marketplace add ./path/to/marketplace

# 安装插件测试
/plugin install plugin-name@marketplace-name

# 验证插件结构
claude plugin validate .

# 使用 --plugin-dir 测试
claude --plugin-dir ./plugins/plugin-name
```

#### 8. 从 Anthropic 官方最佳实践

- **CLAUDE.md 文件**: 保持简洁、人类可读，包含常用命令、代码风格、测试指令
- **Slash Commands**: 使用 `$ARGUMENTS` 传递参数，支持复杂工作流模板
- **目录组织**: 命令可使用子目录创建命名空间（如 `commands/review/security.md`）
- **Skills 触发**: Claude 基于任务上下文自主决定何时使用 Skills

### 参考资源

- [ivan-magda/claude-code-plugin-template](https://github.com/ivan-magda/claude-code-plugin-template) - 官方推荐模板
- [Anthropic Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Code Docs - Plugins](https://code.claude.com/docs/en/plugins)
- [Claude Code Docs - Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [superpowers-marketplace](https://github.com/obra/superpowers) - 成熟 marketplace 参考
