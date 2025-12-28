# Tasks: enhance-prompt-and-recall

## 实施任务列表

### Phase 1: improve-prompt 增强

- [x] **1.1 添加工具推荐模块**
  - 在 improve-prompt.md 的"输出格式"部分添加 `### 💡 推荐工具` section
  - 定义推荐逻辑（基于关键词匹配任务类型）
  - 示例推荐：openspec、sequential-thinking、memory 等

- [x] **1.2 添加可选 EARS 增强**
  - 在"步骤 2: 结构化改写"中，添加可选的触发条件显式化
  - 不强制，仅当原始提示词有隐含触发条件时使用
  - 保持"禁止扩展范围"的铁律

- [x] **1.3 更新验证清单**
  - 添加"是否推荐了相关工具"检查项
  - 确保推荐工具与任务相关

### Phase 2: session-recall 扩展

- [x] **2.1 扩展数据源**
  - 添加 Project CLAUDE.md 查询步骤
  - 添加 User CLAUDE.md 查询步骤
  - 保留 Memory MCP 查询步骤
  - 定义查询优先级：Project > User > Memory

- [x] **2.2 扩展触发场景**
  - 更新 description 描述（不仅是沮丧）
  - 添加常规查询场景说明
  - 更新示例

- [x] **2.3 更新输出格式**
  - 按层级展示召回结果
  - 明确标注数据来源（Project/User/Memory）

### Phase 3: 验证

- [x] **3.1 功能验证**
  - 测试 improve-prompt 工具推荐功能
  - 测试 session-recall 三层查询

- [x] **3.2 文档更新**
  - 更新 README.md 说明
  - 确保与 session-learn 的三层分类保持一致

## 依赖关系

```
1.1 → 1.2 → 1.3 (顺序)
2.1 → 2.2 → 2.3 (顺序)
Phase 1 || Phase 2 (并行)
Phase 3 depends on Phase 1 + Phase 2
```

## 验证标准

- [x] improve-prompt 能在改写后推荐相关工具
- [x] improve-prompt 保持"不扩展范围"的铁律
- [x] session-recall 能查询三层数据源
- [x] session-recall 支持常规查询场景
