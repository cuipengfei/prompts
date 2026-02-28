import type { Plugin } from "@opencode-ai/plugin"

import { loadOcTweaksConfig, safeHook } from "../utils"
import { calculatePosition, WpfPositionManager } from "../utils/wpf-position"
import {
  detectNotifySender,
  sendWpfToast,
  truncateText,
} from "../utils/wpf-notify"
import type { NotifySender, ShellExecutor } from "../utils/wpf-notify"

const DEFAULT_DURATION = 3000
const DEFAULT_MAX_VISIBLE = 3
const DEFAULT_MAX_ARG_LENGTH = 300
const DEFAULT_POSITION = "top-right"
const DEFAULT_ACCENT_COLOR = "#60A5FA"

export const toolCallNotifyPlugin: Plugin = async ({ $, client }) => {
  let cachedSender: NotifySender | null = null
  let managerMaxVisible = 0
  let manager: WpfPositionManager | null = null

  const getManager = (maxVisible: number): WpfPositionManager => {
    if (!manager || managerMaxVisible !== maxVisible) {
      manager = new WpfPositionManager(maxVisible)
      managerMaxVisible = maxVisible
    }
    return manager
  }

  return {
    "tool.execute.before": safeHook(
      "tool-call-notify:tool.execute.before",
      async (
        input: { tool: string },
        output: { args?: Record<string, unknown> },
      ) => {
        const config = await loadOcTweaksConfig()
        if (!config || config.notify?.enabled !== true) return

        const toolCallConfig = config.notify?.toolCall
        if (!toolCallConfig || toolCallConfig.enabled !== true) return

        const excludeTools = toolCallConfig.filter?.exclude ?? []
        if (Array.isArray(excludeTools) && excludeTools.includes(input.tool)) return

        const sender = cachedSender ??= await detectNotifySender(
          $ as ShellExecutor,
          client,
          config.logging,
        )
        if (sender.kind !== "wpf") return

        const duration =
          typeof toolCallConfig.duration === "number" && toolCallConfig.duration > 0
            ? toolCallConfig.duration
            : DEFAULT_DURATION

        const maxVisible =
          typeof toolCallConfig.maxVisible === "number" && toolCallConfig.maxVisible > 0
            ? toolCallConfig.maxVisible
            : DEFAULT_MAX_VISIBLE

        const maxArgLength =
          typeof toolCallConfig.maxArgLength === "number" && toolCallConfig.maxArgLength > 0
            ? toolCallConfig.maxArgLength
            : DEFAULT_MAX_ARG_LENGTH

        const position =
          typeof toolCallConfig.position === "string" && toolCallConfig.position.trim().length > 0
            ? toolCallConfig.position.trim()
            : DEFAULT_POSITION

        let serializedArgs = "{}"
        try {
          serializedArgs = JSON.stringify(output.args ?? {}, null, 2) ?? "{}"
        } catch {
          serializedArgs = "[unserializable args]"
        }

        const argsText = truncateText(serializedArgs, maxArgLength)

        const positionManager = getManager(maxVisible)

        const enqueueDisplay = () => {
          const slot = positionManager.allocateSlot(duration)
          if (!slot) {
            positionManager.enqueue(enqueueDisplay)
            return
          }

          const baseStyle = config.notify?.style ?? {}
          const width = baseStyle.width ?? 420
          const height = baseStyle.height ?? 105

          const calculatedPosition = calculatePosition(slot.slotIndex, {
            position,
            width,
            height,
          })

          void sendWpfToast({
            $: $ as ShellExecutor,
            sender,
            title: `🔧 ${input.tool}`,
            message: argsText,
            tag: "ToolCall",
            style: {
              ...baseStyle,
              duration,
            },
            position: calculatedPosition,
            icon: "🔧",
            accentColor: DEFAULT_ACCENT_COLOR,
            showDismissHint: false,
            maxMessageLength: maxArgLength,
            preserveMessageFormatting: true,
          }).catch(() => {
            slot.release()
          })
        }

        positionManager.enqueue(enqueueDisplay)
        positionManager.processQueue()
      },
    ),
  }
}
