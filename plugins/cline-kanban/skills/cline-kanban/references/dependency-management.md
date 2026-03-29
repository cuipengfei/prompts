# 依赖管理

## 建立依赖

```bash
kanban task link --task-id <A> --linked-task-id <B>
```

语义：**A 等待 B 完成**后才可开始。

---

## 校验规则

- 不能自链接（A 不能等待自身）
- 不能涉及 trash 中的任务
- A 与 B 中至少一方在 backlog

---

## 方向逻辑

| A 状态 | B 状态 | 实际方向 |
|--------|--------|----------|
| backlog | backlog | 保留传入顺序：A 等 B |
| backlog | 非 backlog | A 为等待方（backlog 方等待） |
| 非 backlog | backlog | B 为等待方（自动翻转） |
| 两者都非 backlog | — | 链接被拒绝 |

任务跨列移动时，runtime 自动调用 `updateTaskDependencies` 重算方向。非法依赖（任务不存在/进 trash/两边都非 backlog）被自动丢弃。

---

## 依赖解锁

B 完成进入 `review` → `trash` 后：

1. A 自动变为可开始状态
2. runtime 尝试自动调用 `startTask(A)`

---

## 删除依赖

```bash
kanban task unlink --dependency-id <id>
```

`dependency-id` 从 `kanban task list` 返回的 `dependencies` 数组中获取。

---

## 注意事项

- 两者都在 backlog 时，`A→B` 和 `B→A` 是不同的依赖对，可同时存在
- 源码**未做循环依赖检测**，创建时不会报错，但可能导致所有相关任务永远无法解锁
