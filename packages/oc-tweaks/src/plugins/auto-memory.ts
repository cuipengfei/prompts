import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { mkdir, readdir } from "node:fs/promises"

import { loadOcTweaksConfig, safeHook } from "../utils"

declare const Bun: any

const TRIGGER_WORDS_CN = ["记住", "保存偏好", "记录一下", "记到memory", "别忘了"]
const TRIGGER_WORDS_EN = ["remember", "save to memory", "note this down", "don't forget", "record"]

const REMEMBER_COMMAND_CONTENT = `---
description: 记忆助手 - 从当前会话提取关键信息并写入 memory 文件
---

当用户希望你记住偏好、决策或长期有价值的信息时：
1. 提取要保存的信息（保持原意，不扩写）
2. 推断 category（如 preferences / decisions / setup / notes）
3. 推断 scope（global 或 project）
4. 调用 remember tool 执行写入

参数：
- content: 要保存的内容
- category: 目标文件分类（不带 .md）
- scope: global | project

如有参数，则优先围绕参数提取重点：$ARGUMENTS
`

function getHome(): string {
  return Bun.env?.HOME ?? process.env.HOME ?? ""
}

function sanitizeCategory(raw?: string): string {
  if (!raw || !raw.trim()) return "notes"
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return normalized || "notes"
}

function resolveScope(raw?: string): "global" | "project" {
  if (!raw) return "global"
  return raw.trim().toLowerCase() === "project" ? "project" : "global"
}

async function listMarkdownFiles(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path)
    return entries.filter((item) => item.endsWith(".md")).sort()
  } catch {
    return []
  }
}

async function readPreferences(path: string): Promise<string> {
  try {
    const file = Bun.file(path)
    if (!(await file.exists())) return "（尚无 preferences.md）"
    const content = await file.text()
    return content.trim() || "（preferences.md 为空）"
  } catch {
    return "（读取 preferences.md 失败）"
  }
}

async function ensureRememberCommand(home: string): Promise<void> {
  const commandDir = `${home}/.config/opencode/commands`
  const commandPath = `${commandDir}/remember.md`
  const commandFile = Bun.file(commandPath)
  if (await commandFile.exists()) return

  await mkdir(commandDir, { recursive: true })
  await Bun.write(commandPath, REMEMBER_COMMAND_CONTENT)
}

async function appendMemoryRecord(filePath: string, content: string): Promise<void> {
  const file = Bun.file(filePath)
  let previous = ""

  try {
    if (await file.exists()) {
      previous = await file.text()
    }
  } catch {
    // Never disrupt user workflow
  }

  const prefix = previous.length > 0 && !previous.endsWith("\n") ? "\n" : ""
  const record = `[${new Date().toISOString()}]\n${content.trim()}\n\n`
  await Bun.write(filePath, `${previous}${prefix}${record}`)
}

function buildMemoryGuide(params: {
  globalMemoryDir: string
  projectMemoryDir: string
  globalFiles: string[]
  projectFiles: string[]
  preferencesContent: string
}): string {
  const globalList =
    params.globalFiles.length > 0
      ? params.globalFiles.map((name) => `- \`${name}\``).join("\n")
      : "- （暂无全局 memory 文件）"

  const projectList =
    params.projectFiles.length > 0
      ? params.projectFiles.map((name) => `- \`${name}\``).join("\n")
      : "- （暂无项目级 memory 文件）"

  return `## 🧠 Memory 系统指引

可用记忆层：
1. 全局 memory：\`${params.globalMemoryDir}\`
2. 项目 memory：\`${params.projectMemoryDir}\`

### 当前文件
**全局**
${globalList}

**项目级**
${projectList}

### 触发词（优先调用 remember tool）
- 中文：${TRIGGER_WORDS_CN.join("、")}
- English: ${TRIGGER_WORDS_EN.join(", ")}

命中触发词后：
1. 提取要保存的信息
2. 判断 scope（global / project）
3. 判断 category（例如 preferences / decisions / setup / notes）
4. 调用 \`remember\` tool 写入

### 用户核心 Preferences
\`\`\`markdown
${params.preferencesContent}
\`\`\`
`
}

export const autoMemoryPlugin: Plugin = async ({ directory }) => {
  const home = getHome()
  const globalMemoryDir = `${home}/.config/opencode/memory`
  const projectMemoryDir = `${directory}/.opencode/memory`

  try {
    await mkdir(globalMemoryDir, { recursive: true })
    await mkdir(projectMemoryDir, { recursive: true })
    await ensureRememberCommand(home)
  } catch {
    // Never disrupt user workflow
  }

  return {
    "experimental.chat.system.transform": safeHook(
      "auto-memory:system.transform",
      async (_input: unknown, output: { system: string[] }) => {
        const config = await loadOcTweaksConfig()
        if (!config || config.autoMemory?.enabled !== true) return

        const [globalFiles, projectFiles, preferencesContent] = await Promise.all([
          listMarkdownFiles(globalMemoryDir),
          listMarkdownFiles(projectMemoryDir),
          readPreferences(`${globalMemoryDir}/preferences.md`),
        ])

        output.system.push(
          buildMemoryGuide({
            globalMemoryDir,
            projectMemoryDir,
            globalFiles,
            projectFiles,
            preferencesContent,
          }),
        )
      },
    ),

    "experimental.session.compacting": safeHook(
      "auto-memory:compacting",
      async (_input: { sessionID: string }, output: { context: string[]; prompt?: string }) => {
        const config = await loadOcTweaksConfig()
        if (!config || config.autoMemory?.enabled !== true) return

        output.context.push(`## 💾 Memory 保存提示 (Compaction Phase)

如果本轮对话有值得长期保存的信息，请在摘要中标记：

\`\`\`
[MEMORY: 文件名.md]
这里写要保存的内容
\`\`\`

后续对话中应根据该标记调用 write/edit 或 remember tool 写入对应 memory 文件。`)
      },
    ),

    tool: {
      remember: tool({
        description: "Save important session facts into global/project memory markdown files",
        args: {
          content: tool.schema.string(),
          category: tool.schema.string().optional(),
          scope: tool.schema.string().optional(),
        },
        async execute(args, context) {
          try {
            const scope = resolveScope(args.scope)
            const category = sanitizeCategory(args.category)
            const targetDir =
              scope === "project"
                ? `${context.directory}/.opencode/memory`
                : `${getHome()}/.config/opencode/memory`

            await mkdir(targetDir, { recursive: true })
            const targetPath = `${targetDir}/${category}.md`
            await appendMemoryRecord(targetPath, args.content)

            return `Saved to ${targetPath}`
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return `Failed to save memory: ${message}`
          }
        },
      }),
    },
  }
}
