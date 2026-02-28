import type { Plugin } from "@opencode-ai/plugin"
import { mkdir, readdir } from "node:fs/promises"

import { loadOcTweaksConfig, safeHook } from "../utils"

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

function getHome(): string {
  return Bun.env?.HOME ?? process.env.HOME ?? ""
}

async function listMarkdownFiles(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path)
    return entries.filter((item) => item.endsWith(".md")).sort()
  } catch {
    return []
  }
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

async function ensureAutoMemoryInfra(home: string, projectMemoryDir: string): Promise<void> {
  await mkdir(`${home}/.config/opencode/memory`, { recursive: true })
  await mkdir(projectMemoryDir, { recursive: true })
  await ensureRememberCommand(home)
}

function buildMemoryGuide(params: {
  globalMemoryDir: string
  projectMemoryDir: string
  globalFiles: string[]
  projectFiles: string[]
  fileContents: Map<string, string>
}): string {
  const globalList =
    params.globalFiles.length > 0
      ? params.globalFiles.map((name) => `- \`${name}\``).join("\n")
      : "- （暂无全局 memory 文件）"

  const projectList =
    params.projectFiles.length > 0
      ? params.projectFiles.map((name) => `- \`${name}\``).join("\n")
      : "- （暂无项目级 memory 文件）"

  const MAX_LINES_PER_FILE = 200

  const injectedContents =
    params.fileContents.size > 0
      ? Array.from(params.fileContents.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path, content]) => {
            const lines = content.split("\n")
            const truncated =
              lines.length > MAX_LINES_PER_FILE
                ? lines.slice(0, MAX_LINES_PER_FILE).join("\n") +
                  "\n[...truncated, use Read tool for full content]"
                : content
            return `Contents of ${path}:\n${truncated}`
          })
          .join("\n\n")
      : "（暂无可注入的 memory 内容）"

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

export const autoMemoryPlugin: Plugin = async ({ directory }) => {
  const home = getHome()
  const globalMemoryDir = `${home}/.config/opencode/memory`
  const projectMemoryDir = `${directory}/.opencode/memory`

  try {
    const config = await loadOcTweaksConfig()
    if (config?.autoMemory?.enabled === true) {
      await ensureAutoMemoryInfra(home, projectMemoryDir)
    }
  } catch {
    // Never disrupt user workflow
  }

  return {
    "experimental.chat.system.transform": safeHook(
      "auto-memory:system.transform",
      async (_input: unknown, output: { system: string[] }) => {
        const config = await loadOcTweaksConfig()
        if (!config || config.autoMemory?.enabled !== true) return

        await ensureAutoMemoryInfra(home, projectMemoryDir)

        const [globalFiles, projectFiles] = await Promise.all([
          listMarkdownFiles(globalMemoryDir),
          listMarkdownFiles(projectMemoryDir),
        ])

        const fileContents = new Map<string, string>()
        const allPaths = [
          ...globalFiles.map((name) => ({ dir: globalMemoryDir, name })),
          ...projectFiles.map((name) => ({ dir: projectMemoryDir, name })),
        ]

        await Promise.all(
          allPaths.map(async ({ dir, name }) => {
            try {
              const content = await Bun.file(`${dir}/${name}`).text()
              if (content.trim()) fileContents.set(`${dir}/${name}`, content.trim())
            } catch {
              // Never disrupt user workflow
            }
          }),
        )

        output.system.push(
          buildMemoryGuide({
            globalMemoryDir,
            projectMemoryDir,
            globalFiles,
            projectFiles,
            fileContents,
          }),
        )
      },
    ),

    "experimental.session.compacting": safeHook(
      "auto-memory:compacting",
      async (_input: { sessionID: string }, output: { context: string[]; prompt?: string }) => {
        const config = await loadOcTweaksConfig()
        if (!config || config.autoMemory?.enabled !== true) return

        await ensureAutoMemoryInfra(home, projectMemoryDir)

        output.context.push(`## 💾 Memory Checkpoint

核心问题：**如果明天开一个全新会话，本轮对话中有哪些信息会让你希望已经记录下来？**

有 → 标记保存。没有 → 标记 none。

### 值得保存
- 用户表达的偏好、纠正、或明确要求记住的内容
- 架构决策、设计约束、技术选型及其理由
- 反复出现问题的根因与解决方案
- 工作流、工具链、沟通风格等跨会话有价值的模式

### 不要保存
- 本次对话的临时细节（具体报错、一次性调试步骤）
- AGENTS.md / CLAUDE.md 中已有的内容
- 未验证的猜测
- 机密信息（密码、API key 等）

每次 compaction 最多标记 1-2 条，宁缺毋滥。

有内容：
\`\`\`
[MEMORY: 文件名.md]
简洁 bullet points，保持原意
\`\`\`

无内容：\`[MEMORY: none]\` 并附一句理由说明为何无需保存

### Memory 路径
- 全局：\`${globalMemoryDir}/\`
- 项目：\`${projectMemoryDir}/\`
`)
      },
    ),
  }
}
