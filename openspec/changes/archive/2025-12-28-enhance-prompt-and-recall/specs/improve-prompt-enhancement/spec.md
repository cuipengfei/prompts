# Spec: improve-prompt-enhancement

## ADDED Requirements

### Requirement: 系统 SHALL 提供工具推荐

在重构提示词后，系统 SHALL 分析增强版提示词并基于上下文智能推荐相关的 tool/skill/MCP。

#### Scenario: 有相关工具可推荐
- **Given**: 增强版提示词的任务性质匹配某些工具
- **When**: improve-prompt 命令完成重构
- **Then**: 系统应当推荐 1-3 个最相关的工具
- **And**: 使用格式 `工具名` - 简短理由

#### Scenario: 无相关工具
- **Given**: 增强版提示词不匹配任何工具
- **When**: improve-prompt 命令完成重构
- **Then**: 系统应当省略"💡 推荐工具"部分

---

### Requirement: 输出格式 SHALL 包含工具推荐

当识别到相关工具时，输出格式 SHALL 包含可选的工具推荐部分。

#### Scenario: 完整输出结构
- **Given**: improve-prompt 命令完成重构
- **When**: 有相关工具可推荐
- **Then**: 输出应当遵循以下结构：
  1. 📝 原始提示词
  2. ✨ 增强版提示词
  3. 🔍 改进说明
  4. 💡 推荐工具（可选）
  5. ---（分隔线）
  6. 执行改写后的任务

---

## UNCHANGED Requirements

以下核心约束保持不变：

1. **铁律**: 系统是结构优化器，不是范围扩展者
2. **允许**: 重组句子结构、将隐含步骤显式化、添加格式标记
3. **禁止**: 扩展原始范围、添加虚构细节、改变原意、删除用户要求、引入新技术栈
