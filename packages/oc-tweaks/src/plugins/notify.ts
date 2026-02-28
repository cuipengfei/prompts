import type { Plugin } from "@opencode-ai/plugin"

import { loadOcTweaksConfig, safeHook } from "../utils"
import type { LoggerConfig } from "../utils"
import type { NotifyStyle } from "../utils/config"
import {
  cleanMarkdown,
  detectNotifySender,
  notifyWithSender,
  truncateText,
} from "../utils/wpf-notify"
import type { NotifySender, ShellExecutor } from "../utils/wpf-notify"

export const notifyPlugin: Plugin = async ({ $, directory, client }) => {
  // Cache the detected sender (system capability doesn't change at runtime)
  let cachedSender: NotifySender | null = null

  return {
    event: safeHook("notify:event", async ({ event }: { event: any }) => {
      const config = await loadOcTweaksConfig()
      if (!config || config.notify?.enabled !== true) return

      const logConfig = config.logging
      const notifyOnIdle = config.notify?.notifyOnIdle !== false
      const notifyOnError = config.notify?.notifyOnError !== false
      const configuredCommand =
        typeof config.notify?.command === "string" && config.notify.command.trim().length > 0
          ? config.notify.command.trim()
          : null
      const style = config.notify?.style

      const sender = configuredCommand
        ? ({ kind: "custom", commandTemplate: configuredCommand } as const)
        : (cachedSender ??= await detectNotifySender($ as ShellExecutor, client, logConfig))

      const sendToast = async (projectName: string, message: string, tag: string) => {
        const title = `oc: ${projectName}`
        await notifyWithSender(
          $ as ShellExecutor,
          sender,
          title,
          message,
          tag,
          style as NotifyStyle | undefined,
          logConfig as LoggerConfig | undefined,
        )
      }

      if (event?.type === "session.idle") {
        if (!notifyOnIdle) return

        const projectName = getProjectName(directory)
        const sessionId =
          (event.properties as { sessionID?: string; sessionId?: string } | undefined)
            ?.sessionID ??
          (event.properties as { sessionID?: string; sessionId?: string } | undefined)
            ?.sessionId

        const message = await extractIdleMessage(client, sessionId)
        await sendToast(projectName, message, "Stop")
        return
      }

      if (event?.type === "session.error") {
        if (!notifyOnError) return
        const projectName = getProjectName(directory)
        await sendToast(projectName, "❌ Session error", "Error")
      }
    }),
  }
}

function getProjectName(directory: string): string {
  const normalized = directory.replace(/\\/g, "/")
  const segments = normalized.split("/").filter(Boolean)
  return segments[segments.length - 1] || "opencode"
}

async function extractIdleMessage(client: any, sessionId?: string): Promise<string> {
  let message = "✓ Task completed"
  if (!sessionId || !client?.session?.messages) return message

  try {
    const result = await client.session.messages({ path: { id: sessionId } })
    const messages = result?.data
    if (!Array.isArray(messages)) return message

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i]
      if (msg?.info?.role !== "assistant" || !Array.isArray(msg?.parts)) continue
      for (const part of msg.parts) {
        if (part?.type === "text" && typeof part.text === "string") {
          message = `✓ ${truncateText(cleanMarkdown(part.text), 400)}`
          return message
        }
      }
    }

    return message
  } catch {
    return message
  }
}
