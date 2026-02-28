# AGENTS.md — oc-tweaks

[OpenCode](https://opencode.ai/) 运行时增强插件集合。

## 快速参考

```bash
# 安装依赖
bun install

# 运行全部测试（51 个测试，9 个文件）
bun test

# 运行单个测试文件
bun test src/__tests__/notify.test.ts

# 按名称过滤测试
bun test --grep "auto-detects notifier"

# 构建（ESM bundle，externals: @opencode-ai/plugin, @opencode-ai/sdk）
bun run build

# 冒烟测试（需要 OpenCode 运行时）
bun run smoke
```

## 项目结构

```
src/
├── index.ts              # 统一导出所有插件
├── types.ts              # 统一导出共享类型
├── cli/
│   └── init.ts           # `bunx oc-tweaks init` CLI 入口
├── plugins/
│   ├── notify.ts         # 桌面通知（WPF/osascript/notify-send）
│   ├── compaction.ts     # 上下文压缩时注入语言偏好
│   ├── auto-memory.ts     # 智能记忆注入（边界定义 + 全量 memory 文件内容）+ /remember command 文件创建
│   ├── background-subagent.ts  # 强制子代理后台调度
│   └── leaderboard.ts   # 向 claudecount.com 上报 token 用量
├── utils/
│   ├── index.ts          # 工具函数 barrel 导出
│   ├── config.ts         # 配置加载（loadOcTweaksConfig, loadJsonConfig）
│   ├── safe-hook.ts      # 错误吞咽 hook 包装器
│   └── logger.ts         # 基于文件的日志器，支持行数轮转
└── __tests__/            # 测试文件，与插件结构一一对应
    ├── notify.test.ts
    ├── compaction.test.ts
    ├── auto-memory.test.ts
    ├── background-subagent.test.ts
    ├── leaderboard.test.ts
    ├── index.test.ts
    ├── utils.test.ts
    ├── cli-init.test.ts
    └── logger.test.ts
```

## 架构

### 配置热重载

无论 `enabled` 状态如何，所有 hook **始终注册**。每个 hook 回调在调用时执行
`loadOcTweaksConfig()` 读取最新配置，因此编辑 `~/.config/opencode/oc-tweaks.json`
无需重启 OpenCode 即可生效。插件被禁用时，hook 为空操作（no-op）。

### auto-memory 插件架构

`auto-memory.ts` 提供 memory 边界定义注入与命令模板保障：

1. **被动注入**
   - `experimental.chat.system.transform`：扫描全局与项目 memory 目录，注入：
     - Memory 与 AGENTS.md / CLAUDE.md 的边界关系
     - What to save / What NOT to save
     - 如何保存与如何更新已有 memory
     - 当前所有 `.md` memory 文件内容（非仅 preferences）
   - `experimental.session.compacting`：注入 `[MEMORY: xxx.md]` 摘要标记格式，并引导使用内置 Read/Edit/Write 工具持久化。

2. **命令模板保障**
   - 插件初始化时自动维护 `~/.config/opencode/commands/remember.md`。
   - 若文件不存在则创建；若内容与当前模板不一致则覆盖，确保命令文案始终与当前机制一致。

3. **约束**
   - 仅使用 `autoMemory.enabled` 开关。
   - 不注册自定义 remember 写入工具。
   - 不创建 memory 模板文件，不删除旧 standalone 插件文件。

### 插件模式

每个插件导出一个 `Plugin` 异步函数，返回 hook 映射表：

```typescript
import type { Plugin } from "@opencode-ai/plugin"
import { loadOcTweaksConfig, safeHook } from "../utils"

export const myPlugin: Plugin = async () => {
  return {
    event: safeHook("my:event", async ({ event }) => {
      const config = await loadOcTweaksConfig()
      if (!config || config.mySection?.enabled !== true) return
      // ... 业务逻辑
    }),
  }
}
```

### 错误处理

- 用 `safeHook(name, fn)` 包装**每一个** hook — 自动捕获错误并写日志。
- 插件代码**绝不**向宿主抛异常。非关键路径使用 `catch {}` 并附带注释
  （如通知发送失败、日志 I/O 异常）。
- 惯用注释：`// Never disrupt user workflow` 或 `// Notification flow must stay non-blocking.`

## 代码风格

### 格式化

- **无 linter/formatter 配置** — 严格遵循现有约定。
- 2 空格缩进。
- 不加分号（主流风格；`compaction.ts` 有分号 — 两者均可接受）。
- 双引号。
- 多行数组/对象使用尾随逗号。

### 导入

```typescript
// 1. 类型导入在前（外部包）
import type { Plugin } from "@opencode-ai/plugin"

// 2. 空行
// 3. 内部模块的值导入
import { loadOcTweaksConfig, safeHook } from "../utils"
import { log } from "../utils/logger"
```

- 仅类型导入使用 `import type`。
- 内部导入使用相对路径（`../utils`，不用 `@/utils`）。
- 外部包在前，内部模块在后，中间空行分隔。

### 命名

| 类别 | 约定 | 示例 |
|------|------|------|
| 插件导出 | `camelCase` + `Plugin` 后缀 | `notifyPlugin`, `compactionPlugin` |
| 接口/类型 | PascalCase | `NotifyStyle`, `OcTweaksConfig` |
| 常量 | UPPER_SNAKE_CASE | `API_ENDPOINT`, `DEFAULT_MODEL` |
| 文件名 | kebab-case | `background-subagent.ts` |
| 函数 | camelCase | `loadOcTweaksConfig`, `detectNotifySender` |

### 类型

- 使用 Bun 特有 API（文件 I/O、环境变量、哈希）时，在文件顶部声明 `declare const Bun: any`。
- 配置形状用 `interface`；联合类型和别名用 `type`。
- 生产代码避免 `as any`；测试 mock 中可以使用。
- `Plugin` 类型来自 `@opencode-ai/plugin`。

### Bun API 用法

- **文件 I/O**：`Bun.file(path)` → `.exists()`, `.json()`, `.text()`；`Bun.write(path, content)`。
- **命令检测**：`Bun.which(command)` — 返回路径字符串或 `null`。**禁止**通过 `$` 调用
  shell `which`（会泄漏输出到终端）。
- **环境变量**：`Bun.env?.HOME`。
- **哈希**：`new Bun.CryptoHasher("sha256")`。

## 测试约定

### 框架

`bun:test` — 导入：`describe`, `test`, `expect`, `beforeEach`, `afterEach`。

### 测试文件头部

每个测试文件以 `// @ts-nocheck` 开头，因为测试中大量使用 `as any` 来 mock Bun 全局 API。

### Mock 模式

测试通过覆写全局对象来 mock `Bun.file`、`Bun.env.HOME`、`Bun.which` 和 `Bun.write`。
必须保存原始值并在 `afterEach` 中恢复：

```typescript
const originalBunFile = Bun.file
const originalHome = Bun.env?.HOME

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  // 恢复 HOME ...
})
```

### Shell Mock

`createShellMock({ availableCommands })` 返回一个 mock `$` 模板标签函数，
用于记录调用。测试通知发送逻辑时无需真实 shell 执行。

### 禁用插件的测试

热重载架构意味着 hook 始终注册，测试 "disabled" 状态时：
1. 断言 hook 存在：`expect(typeof hooks.event).toBe("function")`
2. 调用 hook 后验证无副作用（无调用记录、输出数组为空）。

## 发布

**绝不直接运行 `npm publish`。** CI 自动处理。

1. `bun test` → 全部通过
2. `bun run build`
3. 修改 `package.json` 中的 `version`
4. `git commit && git tag oc-tweaks-v{x.y.z}`
5. `git push && git push origin oc-tweaks-v{x.y.z}`
6. GitHub Actions 自动发布到 npm
7. 更新 `~/.config/opencode/opencode.json` 中的插件版本号，下次重启生效

监控 CI：`gh run list --repo cuipengfei/prompts --workflow=publish-oc-tweaks.yml --limit 5`
（必须指定 `--repo`，因为这是 fork 仓库，`gh` 默认指向上游 `cline/prompts`）。

## 计划文件原则（.sisyphus/plans）

- 计划文件统一放在 `.sisyphus/plans/`。
- 计划一旦写入即视为**只读规范**，执行阶段不得修改计划内容本身。
- 推荐结构：`TL;DR → Context → Objectives → Verification → Execution Waves → TODOs → Final Verification`。
- TODO 任务应包含：`What to do / Must NOT do / Acceptance Criteria / QA Scenarios / Commit`。
- 依赖矩阵必须明确关键路径与可并行任务，避免隐式顺序。

参考样例：
- `.sisyphus/plans/oc-tweaks.md`
- `.sisyphus/plans/oc-tweaks-v2.md`
- `.sisyphus/plans/oc-tweaks-v3-auto-memory.md`
