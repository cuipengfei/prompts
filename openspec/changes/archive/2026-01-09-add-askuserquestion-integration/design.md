# Design: AskUserQuestion Integration

## AskUserQuestion Tool Overview

```typescript
interface AskUserQuestionParams {
  questions: Array<{
    question: string;      // 完整问题文本
    header: string;        // 短标签（最多 12 字符）
    options: Array<{       // 2-4 个选项
      label: string;       // 选项显示文本（1-5 词）
      description: string; // 选项说明
    }>;
    multiSelect: boolean;  // 是否允许多选
  }>;
}
```

**关键约束**：
- 最多 4 个问题
- 每个问题 2-4 个选项
- 用户始终可选择 "Other" 提供自定义输入
- 推荐选项放第一位，末尾加 "(Recommended)"

---

## Plugin 1: session-learn

### 当前流程

```
提取学习 → 展示列表 → "确认？(y/n)" → 全部持久化或取消
```

### 改进流程

```
提取学习 → 使用 AskUserQuestion 多选 → 持久化选中项
```

### 实现模式

```markdown
## 第四步：用户确认

使用 AskUserQuestion 工具让用户选择要持久化的项目：

\`\`\`json
{
  "questions": [{
    "question": "以下是提取的学习内容，请选择要持久化的项目：",
    "header": "持久化选择",
    "options": [
      {
        "label": "[Layer] 项目1",
        "description": "简短描述"
      },
      {
        "label": "[Layer] 项目2",
        "description": "简短描述"
      }
      // 最多 4 个选项
    ],
    "multiSelect": true
  }]
}
\`\`\`

**选项构建规则**：
- label 格式：`[目标层] 简短标题`
- description：内容摘要（50 字以内）
- 若提取项超过 4 个，按优先级选取前 4 个，其余在 description 中提及
```

### 边界情况

| 情况 | 处理 |
|------|------|
| 只有 1 个学习项 | 仍使用 AskUserQuestion，只有 1 个选项 + "Other" |
| 超过 4 个学习项 | 前 4 个作为选项，说明其他项可通过 "Other" 指定 |
| 用户选择 "Other" | 提示用户输入要持久化的项目编号或描述 |

---

## Plugin 2: codex

### 当前流程

```
Codex 建议 → 展示编号列表 → "回复编号或描述你的选择" → 等待文本输入
```

### 改进流程

```
Codex 建议 → 使用 AskUserQuestion 多选 → 应用选中建议
```

### 实现模式

```markdown
## 第四步：用户选择

使用 AskUserQuestion 呈现 Codex 建议：

\`\`\`json
{
  "questions": [{
    "question": "Codex 提供了以下建议，请选择要采纳的：",
    "header": "采纳建议",
    "options": [
      {
        "label": "建议 1 (Recommended)",
        "description": "建议内容摘要"
      },
      {
        "label": "建议 2",
        "description": "建议内容摘要"
      }
    ],
    "multiSelect": true
  }]
}
\`\`\`

**选项构建规则**：
- 按相关性/质量排序
- 第一个选项添加 "(Recommended)" 标记
- description 包含建议的关键信息
```

### 边界情况

| 情况 | 处理 |
|------|------|
| Codex 只给 1 个建议 | 单选项 + "Other" |
| 建议超过 4 个 | 取最相关的 4 个，其他可通过 "Other" 引用 |
| 用户全不选 | 视为跳过，继续原流程 |

---

## Plugin 3: improve-prompt

### 当前流程

```
收到提示 → 分析 → 直接优化（猜测意图）
```

### 改进流程

```
收到提示 → 检测歧义 → [有歧义] 使用 AskUserQuestion → 根据选择优化
                      → [无歧义] 直接优化
```

### 实现模式

```markdown
## 歧义检测与澄清

在优化提示前，检测以下歧义类型：
1. **目标受众不明**：开发者 vs 最终用户
2. **输出格式不明**：代码 vs 文档 vs 设计
3. **范围不明**：局部修改 vs 重构
4. **技术选择不明**：多种可行方案

检测到歧义时，使用 AskUserQuestion：

\`\`\`json
{
  "questions": [{
    "question": "这个提示有多种理解方式，请选择你的意图：",
    "header": "澄清意图",
    "options": [
      {
        "label": "解释 A",
        "description": "具体含义说明"
      },
      {
        "label": "解释 B",
        "description": "具体含义说明"
      }
    ],
    "multiSelect": true
  }]
}
\`\`\`
```

### 歧义检测触发条件

1. 提示包含多义词且上下文不足
2. 提示可映射到多个不同的任务类型
3. 提示缺少关键约束（如技术栈、目标环境）

---

## 通用实现注意事项

### 1. 选项数量策略

```
如果候选项 <= 4：全部作为选项
如果候选项 > 4：
  - 前 3 个作为选项
  - 第 4 个选项为 "查看更多..."（description 列出其他项）
```

### 2. 错误处理

```
如果 AskUserQuestion 调用失败：
  - 回退到文本确认模式
  - 记录日志供调试
```

### 3. 用户体验一致性

所有三个插件的 AskUserQuestion 使用应遵循：
- header 使用动词短语（"持久化选择"、"采纳建议"、"澄清意图"）
- description 控制在 50 字以内
- 推荐选项始终放第一位并标记
