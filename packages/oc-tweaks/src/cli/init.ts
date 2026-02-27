#!/usr/bin/env bun

import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
declare const Bun: any

export const DEFAULT_CONFIG = {
  notify: { enabled: true },
  compaction: { enabled: true },
  backgroundSubagent: { enabled: true },
  leaderboard: { enabled: false },
  logging: { enabled: false, maxLines: 200 }
}

export async function initConfig(): Promise<{ created: boolean; path: string }> {
  const home = Bun.env?.HOME ?? ((globalThis as any)?.process?.env?.HOME ?? "") ?? ""
  const configPath = `${home}/.config/opencode/oc-tweaks.json`

  const file = Bun.file(configPath)
  if (await file.exists()) {
    return { created: false, path: configPath }
  }

  const json = JSON.stringify(DEFAULT_CONFIG, null, 2)
  await mkdir(dirname(configPath), { recursive: true })
  await Bun.write(configPath, json + "\n")

  return { created: true, path: configPath }
}

// Only run when executed directly
const isMain = typeof Bun !== "undefined" && 
  Bun.main === import.meta.path

if (isMain) {
  const result = await initConfig()
  if (result.created) {
    console.log(`Created: ${result.path}`)
    console.log("All plugins configured. Edit the file to customize.")
  } else {
    console.log(`Config already exists: ${result.path}`)
    console.log("Nothing changed. Edit the file manually to update your configuration.")
  }
}
