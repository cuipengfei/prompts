import type { Plugin } from "@opencode-ai/plugin"

import { loadJsonConfig, loadOcTweaksConfig, safeHook } from "../utils"
import { log as sharedLog } from "../utils/logger"

declare const Bun: any

function getHome(): string {
  return Bun.env?.HOME ?? ((globalThis as any)?.process?.env?.HOME ?? "") ?? ""
}
const API_ENDPOINT = "https://api.claudecount.com/api/usage/hook"

interface LeaderboardConfig {
  twitter_handle: string
  twitter_user_id: string
}

interface AssistantMessageInfo {
  id: string
  sessionID: string
  role: "assistant"
  time: { created: number; completed?: number }
  modelID: string
  providerID: string
  cost: number
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
}

// claudecount.com API only accepts official Anthropic model IDs with date suffixes.
// Map opencode model IDs (which may be custom names or non-Claude models) to accepted format.
const MODEL_MAP: Record<string, string> = {
  // Claude 4.x family → closest accepted ID
  "claude-opus-4.6": "claude-opus-4-20250514",
  "claude-opus-4.5": "claude-opus-4-20250514",
  "claude-sonnet-4.5": "claude-sonnet-4-20250514",
  "claude-sonnet-4": "claude-sonnet-4-20250514",
  "claude-haiku-4.5": "claude-3.5-haiku-20241022",
  // GPT family → mapped by performance tier
  "gpt-5.2-codex": "claude-sonnet-4-20250514",
  "gpt-5.1-codex": "claude-sonnet-4-20250514",
  "gpt-5.1-codex-max": "claude-opus-4-20250514",
  "gpt-5.2": "claude-sonnet-4-20250514",
  "gpt-5.1": "claude-sonnet-4-20250514",
  "gpt-5-mini": "claude-3.5-haiku-20241022",
  "gpt-5": "claude-sonnet-4-20250514",
  // Gemini family
  "gemini-3-pro-preview": "claude-sonnet-4-20250514",
  "gemini-2.5-pro": "claude-sonnet-4-20250514",
  // Grok family
  "grok-code-fast-1": "claude-3.5-haiku-20241022",
}

// Default fallback for unknown models
const DEFAULT_MODEL = "claude-sonnet-4-20250514"

function mapModel(modelID: string): string {
  // Direct match in map
  if (MODEL_MAP[modelID]) return MODEL_MAP[modelID]
  // Already an accepted Anthropic format (contains date suffix like -20250514)
  if (/claude-.*-\d{8}$/.test(modelID)) return modelID
  // Fallback
  return DEFAULT_MODEL
}


function parseLeaderboardConfig(parsed: Record<string, any>): LeaderboardConfig | null {
  // Support both field naming conventions (snake_case from old format, camelCase from new)
  const handle = parsed.twitter_handle ?? parsed.twitterUrl
  const userId = parsed.twitter_user_id ?? parsed.twitterUserId ?? handle
  if (!handle || !userId) return null
  return { twitter_handle: handle, twitter_user_id: userId }
}

async function readLeaderboardConfig(path: string): Promise<LeaderboardConfig | null> {
  const parsed = await loadJsonConfig<Record<string, any>>(path, {})
  return parseLeaderboardConfig(parsed)
}

async function loadLeaderboardConfig(
  configPath: string | null | undefined,
): Promise<LeaderboardConfig | null> {
  if (typeof configPath === "string") {
    return readLeaderboardConfig(configPath)
  }

  const paths = [`${getHome()}/.claude/leaderboard.json`, `${getHome()}/.config/claude/leaderboard.json`]
  for (const path of paths) {
    const config = await readLeaderboardConfig(path)
    if (config) return config
  }

  return null
}

async function submitUsage(config: LeaderboardConfig, msg: AssistantMessageInfo): Promise<void> {
  const timestamp = new Date(msg.time.created).toISOString()
  const hashInput = `${msg.time.created}${msg.id}${msg.sessionID}`
  const interactionHash = new Bun.CryptoHasher("sha256").update(hashInput).digest("hex")

  const payload = {
    twitter_handle: config.twitter_handle,
    twitter_user_id: config.twitter_user_id,
    timestamp,
    tokens: {
      input: msg.tokens.input,
      output: msg.tokens.output,
      cache_creation: msg.tokens.cache?.write ?? 0,
      cache_read: msg.tokens.cache?.read ?? 0,
    },
    model: mapModel(msg.modelID),
    interaction_id: interactionHash,
    interaction_hash: interactionHash,
  }

  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`API ${res.status}: ${body}`)
  }
}

export const leaderboardPlugin: Plugin = async () => {
  const ocTweaks = await loadOcTweaksConfig()
  if (!ocTweaks || ocTweaks.leaderboard?.enabled !== true) return {}

  const config = await loadLeaderboardConfig(ocTweaks.leaderboard?.configPath)
  if (!config) {
    await sharedLog(ocTweaks.logging, "INFO", "No leaderboard config found, plugin disabled")
    return {}
  }

  await sharedLog(ocTweaks.logging, "INFO", `Plugin loaded, handle=${config.twitter_handle}`)

  // Track submitted message IDs to avoid duplicates within this process
  const submitted = new Set<string>()

  return {
    event: safeHook(
      "leaderboard:event",
      async ({ event }: { event: unknown }) => {
        try {
          if (!event || typeof event !== "object") return
          const eventRecord = event as Record<string, unknown>
          if (eventRecord.type !== "message.updated") return

          const properties = eventRecord.properties
          if (!properties || typeof properties !== "object") return
          const infoUnknown = (properties as Record<string, unknown>).info
          if (!infoUnknown || typeof infoUnknown !== "object") return

          const info = infoUnknown as Record<string, any>
          if (info.role !== "assistant") return
          if (!info.time?.completed) return
          if (submitted.has(info.id)) return

          const msg = info as AssistantMessageInfo
          if (!msg.tokens || msg.tokens.input === 0) return

          submitted.add(msg.id)
          await sharedLog(
            ocTweaks.logging,
            "INFO",
            `Submitting: msg=${msg.id.slice(0, 16)} model=${msg.modelID}→${mapModel(msg.modelID)} in=${msg.tokens.input} out=${msg.tokens.output} cache_r=${msg.tokens.cache?.read ?? 0} cache_w=${msg.tokens.cache?.write ?? 0}`,
          )
          await submitUsage(config, msg)
          await sharedLog(ocTweaks.logging, "INFO", "Submitted OK")
        } catch (err) {
          await sharedLog(ocTweaks.logging, "ERROR", `Submit failed: ${err}`)
          // Silently ignore — never disrupt the user's workflow
        }
      },
    ),
  }
}
