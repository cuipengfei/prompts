# Natural Writing Plugin Design

日期: 2025-01-31

## 概述

创建 `natural-writing` Output Style 插件，让 Claude 生成内容时自动避免 24 种 AI 写作模式，产出更自然的文本。

## 设计决策

| 项目 | 决定 | 理由 |
|------|------|------|
| 形式 | Output Style | 目标是影响生成而非编辑已有文本 |
| 独立插件 | 是（第 20 个） | 符合项目单一职责原则 |
| 命名 | `natural-writing` | 强调结果而非过程 |
| 内容详细度 | 完整 24 种模式，精简表达 | 保留结构和精髓，去除冗长 |
| 语言 | 中文为主，模式名英文 | 便于对照原文档 |
| 额外功能 | 极简 voice guidance + override 语句 | 避免输出过于中性；用户显式要求时优先遵从 |
| 原始参考 | 保留但不 git 追踪 | 供未来参考 |

## 目录结构

```
plugins/natural-writing/
├── .claude-plugin/
│   └── plugin.json
├── output-styles/
│   └── natural-writing.md
└── reference/                      # 不 git 追踪
    ├── humanizer-zh-SKILL.md
    ├── humanizer-en-SKILL.md
    └── humanizer-en-README.md
```

## 文件内容

### plugin.json

```json
{
  "name": "natural-writing",
  "version": "1.0.0",
  "description": "避免 24 种 AI 写作模式，生成更自然的文本",
  "author": {
    "name": "cuipengfei",
    "email": "cuipengfei@gmail.com"
  },
  "license": "MIT"
}
```

### natural-writing.md 结构

```markdown
---
name: natural-writing
description: 避免 AI 写作模式，生成更自然的文本
---

# Natural Writing Style

生成内容时避免以下 24 种 AI 写作模式。

## Override 规则

**用户显式要求时优先遵从。** 若用户明确要求使用 bold、emoji、列表等格式，以用户要求为准。

## Voice Guidance（极简）

避免模式只是一半，还需注入真实感：
- 使用具体事实和细节，而非模糊泛化
- 变化句子节奏，长短交错
- 适当时表达观点或不确定性

## Content Patterns (1-6)
### 1. Significance Inflation
避免夸大意义、遗产和更广泛趋势。
**避免词汇**：标志着、见证了、是……的体现...
**Before → After 示例**

### 2. Notability Name-dropping
...

## Language Patterns (7-12)
### 7. AI Vocabulary
...

## Style Patterns (13-18)
### 13. Em Dash Overuse
...

## Communication Patterns (19-21)
### 19. Chatbot Artifacts
...

## Filler and Hedging (22-24)
### 22. Filler Phrases
...
```

每个模式包含：
1. 英文名称（标题）
2. 中文简述（1-2 句）
3. 避免词汇列表（如适用）
4. 1 个 Before → After 示例（中文）

### marketplace.json 更新

添加条目：
```json
{
  "name": "natural-writing",
  "description": "避免 24 种 AI 写作模式，生成更自然的文本",
  "source": "./plugins/natural-writing",
  "category": "productivity"
}
```

### .gitignore 更新

添加：
```
plugins/natural-writing/reference/
```

## 参考来源

- [blader/humanizer](https://github.com/blader/humanizer) - 英文原版
- [op7418/Humanizer-zh](https://github.com/op7418/Humanizer-zh) - 中文翻译版
- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) - 原始来源

## 实现清单

- [ ] 创建 `plugins/natural-writing/.claude-plugin/plugin.json`
- [ ] 创建 `plugins/natural-writing/output-styles/natural-writing.md`
- [ ] 创建 `plugins/natural-writing/reference/` 并保存 3 个原始文件
- [ ] 更新 `.claude-plugin/marketplace.json`
- [ ] 更新 `.gitignore`
