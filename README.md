[English Version](README.en.md) | [古文版](README.guwen.md)

# 如何对 GitHub Copilot 进行洗脑改造 🧠🤖

## 这玩意儿是干啥的？

厌倦了 AI 代理产出面条代码？这个仓库是你的秘密武器，用来**对 GitHub Copilot 进行洗脑改造**（以及其他 AI 编程助手），把它们变成纪律严明、痴迷质量的代码忍者。把它看作 AI 新兵训练营：没有吼叫，只有精心制作的系统指令，实现手术刀般的精确度。告别“差不多就行”的代码和“我机器上能跑”的灾难。

## 谁需要这份洗脑手册？

- **开发者**：受够了 AI 的意大利面条代码，想要一个真正能辅助的助手。
- **团队**：想集成 AI，又不想代码库变成数字犯罪现场。
- **研究员/工程师**：痴迷于让 AI 生成的代码可靠、可维护。
- **业务分析师/产品负责人**：需要能理解需求，而不是幻想功能的 AI 代理。

## 指令武器库

这些是用于精密思想控制的战术模块：

- **核心行为定义**：塑造代理思考和操作方式的基础协议。
- **标准与质量规范**：防止 AI 写出让高级开发者落泪代码的铁律。
- **流程模板**：将模糊想法转化为坚实实现的分步工作流。
- **工具使用指南**：让 AI 代理更聪明（而非更辛苦）工作的高级技巧。

## 指令文件分解（又名“你的新 AI 霸主们”）

`[.github/instructions/](.github/instructions/)` 目录中的每个文件如何让 AI 屈服于你的意志：

### 任务控制中心

- `[.github/instructions/foundational-principles.md](.github/instructions/foundational-principles.md)`：打造终极 AI 编码仆从的总蓝图。

### 脑外科手术部（核心行为）

- `[.github/instructions/foundational-principles.md](.github/instructions/foundational-principles.md)`：为 AI 注入哲学，教它如何“思考”，而不仅仅是执行。
- `[.github/instructions/memory-bank.instructions.md](.github/instructions/memory-bank.instructions.md)`：赋予你的 AI 持久“大脑”，对抗数字失忆症。我们知道，这很革命性。
- `[.github/instructions/response-and-prompt-guidelines.md](.github/instructions/response-and-prompt-guidelines.md)`：强制 AI 专业沟通，拒绝聊天机器人的存在主义危机。包含神圣的 8 段式响应结构。
- `[.github/instructions/programming-workflow.md](.github/instructions/programming-workflow.md)`：AI 版 TDD 福音，防止牛仔式编码灾难。
- `[.github/instructions/planning-workflow.md](.github/instructions/planning-workflow.md)`：教 AI 分解复杂问题而不精神崩溃（MECE 原则万岁）。

### 质量控制部（拒绝垃圾代码）

- `[.github/instructions/quality-standards.md](.github/instructions/quality-standards.md)`：整洁代码的神圣戒律（SOLID、DRY 等）以及代码异味和反模式的黑名单。你的 AI 将学会像躲避放射性废物一样避开它们。
- `[.github/instructions/testing-guidelines.md](.github/instructions/testing-guidelines.md)`：如何编写真正能测试东西的测试。覆盖所有情况，免得代码在生产环境爆炸。

### 流程工程（化想法为现实）

- `[.github/instructions/planning-workflow.md](.github/instructions/planning-workflow.md)`：将模糊想法转化为具体计划，一次一个 Markdown 片段。专为希望 AI “懂行”的 BA 和 PM 设计。
- `[.github/instructions/ba.md](.github/instructions/ba.md)`：为业务分析师量身定制的 AI 辅助用户故事撰写流程。从史诗到故事，BA 认可的精度。

### 工具大师学院（高级技巧）

- `[.github/instructions/sequential-thinking.md](.github/instructions/sequential-thinking.md)`：为 `sequentialthinking` MCP 工具解锁动态问题解决能力。
- `[.github/instructions/shortcut-system-instruction.md](.github/instructions/shortcut-system-instruction.md)`：实现战术效率的命令快捷方式。`r!`、`d!`、`t!`——启动！

## 如何使用这些玩意儿

1.  **整合**：将你的 AI 代理（Copilot、自定义 GPT 等）指向这些指令，通常通过自定义系统提示或知识库。
2.  **观察**：见证你的 AI 从狂野的代码投掷野兽转变为专注、以质量为导向的伙伴。
3.  **改进**：这些是活文档。根据你项目的特定“神经症”进行调整。

## 如何在 VS Code 和 Copilot 里洗脑（正确结构！）

想在 VS Code 里直接洗脑 Copilot？请用正确结构：

1. 打开 VS Code 设置（`Ctrl+,` 或 `Cmd+,`）。
2. 搜索 `github.copilot.chat.codeGeneration.instructions`。
3. 按如下格式添加指令，每条是一个对象，包含 `text` 或 `file` 属性。例如：

```jsonc
"github.copilot.chat.codeGeneration.instructions": [
    { "text": "避免生成与公开代码完全一致的代码。" },
    { "file": "../prompts/.github/instructions/foundational-principles.md" },
    { "file": "../prompts/.github/instructions/planning-workflow.md" },
    { "file": "../prompts/.github/instructions/ba.md" },
    { "file": "../prompts/.github/instructions/memory-bank.instructions.md" },
    { "file": "../prompts/.github/instructions/quality-standards.md" },
    { "file": "../prompts/.github/instructions/programming-workflow.md" },
    { "file": "../prompts/.github/instructions/response-and-prompt-guidelines.md" },
    { "file": "../prompts/.github/instructions/testing-guidelines.md" },
    { "file": "../prompts/.github/instructions/sequential-thinking.md" },
    { "file": "../prompts/.github/instructions/shortcut-system-instruction.md" }
]
```

4. 保存并重启 Copilot Chat（如有必要）。
5. 见证 Copilot 服从你的意志（至少会努力服从）。

**小贴士：** 路径用相对路径，或自定义 text 规则。越具体，洗脑效果越强。

## 免责声明

给 AI 洗脑是门艺术，而非精确科学。结果可能因人而异。可能导致你的 AI 产生优越感。请负责任地使用。
