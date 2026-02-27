declare const Bun: any

import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
export interface LoggerConfig {
  enabled?: boolean
  maxLines?: number
}

const DEFAULT_MAX_LINES = 100

function getHome(): string {
  return Bun.env?.HOME ?? ((globalThis as any)?.process?.env?.HOME ?? "") ?? ""
}

function getLogFilePath(): string {
  return `${getHome()}/.config/opencode/plugins/oc-tweaks.log`
}

export async function log(
  config: LoggerConfig | undefined,
  level: string,
  message: string
): Promise<void> {
  if (!config?.enabled) return

  try {
    const logFile = getLogFilePath()
    const file = Bun.file(logFile)
    let content = ""

    if (await file.exists()) {
      content = await file.text()
    }

    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`
    content += line

    const maxLines = config.maxLines ?? DEFAULT_MAX_LINES
    const keepLines = Math.floor(maxLines / 2)
    const lines = content.split("\n").filter(Boolean)

    if (lines.length > maxLines) {
      content = lines.slice(-keepLines).join("\n") + "\n"
    }

    await mkdir(dirname(logFile), { recursive: true })
    await Bun.write(logFile, content)
  } catch {
    // Never disrupt user workflow
  }
}
