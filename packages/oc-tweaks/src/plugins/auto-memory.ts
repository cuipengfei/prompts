import { tool, type Plugin } from "@opencode-ai/plugin"
import { mkdir } from "node:fs/promises"

import { loadOcTweaksConfig, safeHook } from "../utils"
import { detectNotifySender, notifyWithSender } from "../utils/wpf-notify"
import type { NotifySender, ShellExecutor } from "../utils/wpf-notify"
import { buildSystemInjection } from "./auto-memory/injector"
import { setToastSender } from "./auto-memory/notify"
import { recallMemory } from "./auto-memory/recall"
import type { MemoryEntry } from "./auto-memory/registry"
import { scanMemoryRoots } from "./auto-memory/registry"

declare const Bun: any

const TRIGGER_WORDS_CN = ["记住", "保存偏好", "记录一下", "记到memory", "别忘了"]
const TRIGGER_WORDS_EN = ["remember", "save to memory", "note this down", "don't forget", "record"]

const REMEMBER_COMMAND_CONTENT = `---
description: 记忆助手 - 将关键信息写入 memory 文件
---

当用户希望你记住偏好、决策或长期有价值的信息时，
直接使用 Write 或 Edit 工具操作 memory 文件。

## 保存位置
- 全局 memory：\`~/.config/opencode/memory/\`
- 项目 memory：\`{project}/.opencode/memory/\`

## 保存步骤
1. 提取要保存的信息（保持原意，不扩写）
2. 确定文件分类（如 preferences.md、decisions.md、setup.md、notes.md）
3. 确定 scope（全局 vs 项目级）
4. 使用 Read 工具检查目标文件是否已存在，读取现有内容
5. 使用 Edit 工具追加新内容（若文件存在），或用 Write 创建新文件

## 格式规范
- 使用 markdown bullet points
- 保持简洁，不扩写
- 不存临时信息（只存跨会话有价值的内容）
- 不重复 AGENTS.md / CLAUDE.md 中已有的内容

如有参数，则优先围绕参数提取重点：$ARGUMENTS
`

const MEMORY_MIGRATE_COMMAND_CONTENT = `---
description: 显式迁移 legacy memory frontmatter
---

运行只读确认后，显式调用 auto-memory migration，为没有 frontmatter 的 memory markdown 补写最小 frontmatter。

建议命令：

\`\`\`bash
oc-tweaks memory migrate --root "$ARGUMENTS"
\`\`\`
`

function getHome(): string {
  return Bun.env?.HOME ?? process.env.HOME ?? ""
}

async function ensureRememberCommand(home: string): Promise<void> {
  const commandDir = `${home}/.config/opencode/commands`
  const commandPath = `${commandDir}/remember.md`
  const commandFile = Bun.file(commandPath)

  if (await commandFile.exists()) {
    try {
      const existing = await commandFile.text()
      if (existing.trim() === REMEMBER_COMMAND_CONTENT.trim()) return
    } catch {
      // Never disrupt user workflow
    }
  }

  await mkdir(commandDir, { recursive: true })
  await Bun.write(commandPath, REMEMBER_COMMAND_CONTENT)
}

async function ensureMemoryMigrateCommand(home: string): Promise<void> {
  const commandDir = `${home}/.config/opencode/commands/memory`
  const commandPath = `${commandDir}/migrate.md`
  const commandFile = Bun.file(commandPath)

  if (await commandFile.exists()) {
    try {
      const existing = await commandFile.text()
      if (existing.trim() === MEMORY_MIGRATE_COMMAND_CONTENT.trim()) return
    } catch {
      // Never disrupt user workflow
    }
  }

  await mkdir(commandDir, { recursive: true })
  await Bun.write(commandPath, MEMORY_MIGRATE_COMMAND_CONTENT)
}

async function ensureAutoMemoryInfra(home: string, projectMemoryDir: string): Promise<void> {
  await mkdir(`${home}/.config/opencode/memory`, { recursive: true })
  await mkdir(projectMemoryDir, { recursive: true })
  await ensureRememberCommand(home)
  await ensureMemoryMigrateCommand(home)
}

function buildMemoryGuide(params: {
  globalMemoryDir: string
  projectMemoryDir: string
  entries: MemoryEntry[]
  injection: string
  summaryPathHints: string
}): string {
  const globalList = buildEntryList(params.entries, "global")
  const projectList = buildEntryList(params.entries, "project")
  const injectedContents = [params.injection, params.summaryPathHints].filter(Boolean).join("\n")

  return `## 🧠 Memory 系统指引

Memory 是 AGENTS.md / CLAUDE.md 的**补充**，存储跨会话有价值的信息。

记忆层（直接用 Write / Edit 工具操作）：
1. 全局：\`${params.globalMemoryDir}/\` — 跨项目偏好
2. 项目：\`${params.projectMemoryDir}/\` — 项目特定知识

文件按主题分类（preferences.md、decisions.md、setup.md 等），写入时保持简洁，用 markdown bullet points，保持原意不扩写。

### 何时保存

**必须保存：**
- 用户明确要求记住（触发词：${TRIGGER_WORDS_CN.join("、")} / ${TRIGGER_WORDS_EN.join(", ")}）
- 用户纠正了你的行为或表达了明确偏好

**建议保存（判断标准：如果明天从头开始，这个信息有帮助吗？）：**
- 架构决策、技术选型及其理由
- 反复出现问题的根因与解决方案
- 工作流、工具链、沟通风格等跨会话模式

### 不要保存

- 本次对话的临时细节（具体报错、一次性调试步骤）
- AGENTS.md / CLAUDE.md 中已有的内容（不得重复或矛盾）
- 未验证的猜测（先查证再记录）
- 机密信息（密码、API key 等）

### 当前 Memory 文件
**全局**
${globalList}

**项目级**
${projectList}

### 已有 Memory 内容
${injectedContents}`
}

function buildEntryList(entries: MemoryEntry[], scope: "global" | "project"): string {
  const scopedEntries = entries
    .filter((entry) => entry.scope === scope)
    .sort((a, b) => a.absPath.localeCompare(b.absPath))

  if (scopedEntries.length === 0) {
    return scope === "global" ? "- （暂无全局 memory 文件）" : "- （暂无项目级 memory 文件）"
  }

  return scopedEntries.map((entry) => `- \`${entry.absPath.split("/").pop() ?? entry.meta.id}\``).join("\n")
}

function buildMemoryInjection(entries: MemoryEntry[], summaryTokenBudget: number): string {
  return entries
    .map((entry) => buildSystemInjection([entry], { summaryTokenBudget }))
    .filter(Boolean)
    .join("\n")
}

function buildSummaryPathHints(entries: MemoryEntry[]): string {
  return entries
    .slice()
    .sort((a, b) => a.absPath.localeCompare(b.absPath))
    .map((entry) => `Contents of ${entry.absPath}: ${entry.summary}`)
    .join("\n")
}

export const autoMemoryPlugin: Plugin = async ({ directory, $, client }) => {
  const home = getHome()
  const globalMemoryDir = `${home}/.config/opencode/memory`
  const projectMemoryDir = `${directory}/.opencode/memory`
  let cachedSender: NotifySender | null = null

  try {
    const config = await loadOcTweaksConfig()
    if (config?.autoMemory?.enabled === true) {
      await ensureAutoMemoryInfra(home, projectMemoryDir)
      setToastSender((msg) => {
        void (async () => {
          try {
            const shell = $ as ShellExecutor
            cachedSender ??= await detectNotifySender(shell, client, config.logging)
            await notifyWithSender(shell, cachedSender, "oc: auto-memory", msg, "Memory", config.notify?.style, config.logging)
          } catch {
            // toast is best-effort only
          }
        })()
      })
    }
  } catch {
    // Never disrupt user workflow
  }

  return {
    tool: {
      memory_recall: tool({
        description: "Recall memory body by literal query from OpenCode memory files",
        args: {
          query: tool.schema.string(),
          type: tool.schema.string().optional(),
        },
        execute: async ({ query, type }) => {
          const entries = scanMemoryRoots(globalMemoryDir, projectMemoryDir)
          const results = await recallMemory(query, entries, { filterType: type })
          return results.map((result) => result.content).join("\n")
        },
      }),
    },
    "experimental.chat.system.transform": safeHook(
      "auto-memory:system.transform",
      async (_input: unknown, output: { system: string[] }) => {
        const config = await loadOcTweaksConfig()
        if (!config || config.autoMemory?.enabled !== true) return

        await ensureAutoMemoryInfra(home, projectMemoryDir)

        const entries = scanMemoryRoots(globalMemoryDir, projectMemoryDir)
        const injection = buildMemoryInjection(entries, config.autoMemory.summaryTokenBudget ?? 4000)
        const summaryPathHints = buildSummaryPathHints(entries)

        output.system.push(
          buildMemoryGuide({
            globalMemoryDir,
            projectMemoryDir,
            entries,
            injection,
            summaryPathHints,
          }),
        )
      },
    ),
  }
}
