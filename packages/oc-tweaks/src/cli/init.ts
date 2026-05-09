#!/usr/bin/env bun

import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { formatDiagReport, runDiag, type DiagOpts } from "../plugins/auto-memory/diag"
declare const Bun: any

export const DEFAULT_CONFIG = {
  notify: { enabled: true },
  compaction: { enabled: true },
  autoMemory: { enabled: true },
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

export type CliCommand =
  | { command: "init" }
  | { command: "memory-diag"; opts: DiagOpts }

export function parseCliArgs(argv: string[]): CliCommand {
  const args = argv[0] === "tweaks" ? argv.slice(1) : argv
  if (args.length === 0 || args[0] === "init") return { command: "init" }

  if (args[0] === "memory" && args[1] === "diag") {
    return { command: "memory-diag", opts: parseDiagOpts(args.slice(2)) }
  }

  return { command: "init" }
}

function parseDiagOpts(args: string[]): DiagOpts {
  const opts: DiagOpts = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--root" && args[i + 1]) opts.root = args[++i]
    else if (arg === "--global-root" && args[i + 1]) opts.globalRoot = args[++i]
    else if (arg === "--project-root" && args[i + 1]) opts.projectRoot = args[++i]
  }
  return opts
}

// Only run when executed directly
const isMain = typeof Bun !== "undefined" && 
  Bun.main === import.meta.path

if (isMain) {
  const parsed = parseCliArgs(process.argv.slice(2))
  if (parsed.command === "memory-diag") {
    const report = await runDiag(parsed.opts)
    console.log(formatDiagReport(report))
  } else {
    const result = await initConfig()
    if (result.created) {
      console.log(`Created: ${result.path}`)
      console.log("All plugins configured. Edit the file to customize.")
    } else {
      console.log(`Config already exists: ${result.path}`)
      console.log("Nothing changed. Edit the file manually to update your configuration.")
    }
  }
}
