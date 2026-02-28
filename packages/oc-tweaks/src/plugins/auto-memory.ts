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

  const injectedContents =
    params.fileContents.size > 0
      ? Array.from(params.fileContents.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path, content]) => `Contents of ${path}:\n${content}`)
          .join("\n\n")
      : "（暂无可注入的 memory 内容）"

  return `## 🧠 Memory 系统指引

Memory 是 AGENTS.md / CLAUDE.md 的**补充**，用于存储跨会话有价值的信息。
不要将 AGENTS.md / CLAUDE.md 中已有的内容重复写入 memory。

可用记忆层：
1. 全局 memory：\`${params.globalMemoryDir}\`
2. 项目 memory：\`${params.projectMemoryDir}\`

### 何时保存 memory

**你必须（MUST）保存 memory 当：**
- 用户明确要求记住（触发词：${TRIGGER_WORDS_CN.join("、")} / ${TRIGGER_WORDS_EN.join(", ")})
- 用户纠正了你的行为或表达了明确偏好

**建议保存 memory 当：**
- 发现了跨会话有用的模式或约定（想想：如果明天从头开始，这个信息有帮助吗？）
- 用户描述了目标或背景（"我在做..."、"我们在迁移到..."）
- 找到了可能再次出现的问题的解决方案
- 用户的工作流、工具、沟通风格偏好

### 不要保存

- 临时的当前任务细节（只在本次对话有用的信息）
- AGENTS.md 或 CLAUDE.md 中已有的内容（不得重复或矛盾）
- 可能不完整或未验证的结论（先查证再记录）
- 机密信息（密码、API key 等）

### 如何保存

直接使用你的内置 Write 或 Edit 工具操作 memory 文件：
- 全局 memory：\`${params.globalMemoryDir}/\`
- 项目 memory：\`${params.projectMemoryDir}/\`

文件按主题分类（如 preferences.md、decisions.md、setup.md、notes.md）。
写入时保持简洁，用 markdown bullet points，保持原意不扩写。

### 如何更新已有 memory

- 更新已有文件时，使用 Edit 工具追加或修改特定段落，不要用 Write 整体覆盖
- 内容要具体、信息密集（包含文件路径、函数名、具体命令等）
- 当某个 memory 文件内容过长时，精简旧条目而不是无限追加
- 更新时保持已有内容的结构完整，不要破坏其他条目

### 当前 Memory 文件
**全局**
${globalList}

**项目级**
${projectList}

### 用户核心 Preferences
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

        output.context.push(`## 💾 Memory 保存提示 (Compaction Phase)

回顾本轮对话，判断是否有值得跨会话持久保存的信息。

### 应该保存的（至少一项命中即标记）
- 用户明确要求记住的偏好、决策或约定
- 用户纠正了你的行为（隐含偏好）
- 架构决策、设计约束、技术选型及其理由
- 跨会话有价值的模式或约定（问自己：明天从头开始，这个信息有帮助吗？）
- 反复出现问题的根因与解决方案
- 用户的工作流、工具链、沟通风格偏好

### 不应该保存的
- 仅本次对话有用的临时细节（具体报错、一次性调试命令）
- AGENTS.md / CLAUDE.md 中已有的内容（不得重复）
- 未验证的猜测或中间结论
- 机密信息（密码、API key、token）

### 标记格式

有值得保存的内容时，在摘要中标记：

\`\`\`
[MEMORY: 文件名.md]
简洁的 bullet points，保持原意不扩写
\`\`\`

确实没有值得保存的，标记 \`[MEMORY: none]\`。

### Memory 路径
- 全局：\`${globalMemoryDir}/\`
- 项目：\`${projectMemoryDir}/\`

后续对话中应根据标记调用内置 Read/Edit/Write 工具写入对应 memory 文件。`)
      },
    ),
  }
}
