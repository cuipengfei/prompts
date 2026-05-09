/**
 * auto-memory notify channel.
 *
 * Emits a single structured stderr line for every write event, optionally
 * fires a best-effort toast (mode='notify' only), and queues a stub reminder
 * for the next-message `<system-reminder>` injection path.
 *
 * Degradation chain (per docs/sdk-spike-notes.md):
 *   1. toast (best-effort, only mode='notify') — TODO: wire to wpf-notify
 *      shell sender; current V1 leaves a hook so the auto-memory plugin can
 *      inject `$` + `client` later without re-shaping callers.
 *   2. stderr structured JSON line — always (unless mode='off')
 *   3. in-memory reminder queue — drained by the chat.system.transform hook
 *      when the next user message arrives (mode='notify' only).
 *
 * MUST NOT block the main flow: no awaits, no throws.
 */

export type NotifyAction = "created" | "updated" | "forgotten"

export interface NotifyWriteEvent {
  scope: string
  relPath: string
  action: NotifyAction
  willAffectRecall: boolean
}

export type NotifyMode = "off" | "notify" | "silent"

export interface NotifyWriteOpts {
  mode?: NotifyMode
}

const reminderQueue: string[] = []

/**
 * Drain the pending reminder queue. The auto-memory plugin's
 * `experimental.chat.system.transform` hook calls this once per user turn
 * and pushes the resulting strings into `output.system`.
 */
export function drainReminderQueue(): string[] {
  if (reminderQueue.length === 0) return []
  const out = reminderQueue.slice()
  reminderQueue.length = 0
  return out
}

/** Test-only helper: reset queue between cases. */
export function __resetReminderQueueForTests(): void {
  reminderQueue.length = 0
}

export function notifyWrite(
  event: NotifyWriteEvent,
  opts: NotifyWriteOpts = {},
): void {
  const mode: NotifyMode = opts.mode ?? "notify"

  // mode=off is a defensive no-op: writers should block earlier, but if a
  // caller still reaches here we must not surface anything.
  if (mode === "off") return

  // 1. Best-effort toast (mode=notify only). V1 leaves this as a hook —
  //    the auto-memory plugin owns the shell sender + client and will wire
  //    a callback in via `setToastSender(...)` in T11/T12. For now we just
  //    swallow any failure to honour "do not block / do not throw".
  if (mode === "notify") {
    try {
      // TODO(T11): invoke registered toast sender (wpf-notify shell first,
      //            client.tui.showToast fallback per sdk-spike-notes §4).
      // No-op in V1 — degrade silently to stderr.
    } catch {
      // swallow — degradation chain handles it
    }
  }

  // 2. Always emit a single structured stderr line containing all 4 fields.
  try {
    const payload = JSON.stringify({
      scope: event.scope,
      relPath: event.relPath,
      action: event.action,
      willAffectRecall: event.willAffectRecall,
    })
    process.stderr.write(`oc-tweaks auto-memory ${payload}\n`)
  } catch {
    // stderr write should never throw, but stay defensive
  }

  // 3. Queue a next-message reminder stub (mode=notify only).
  if (mode === "notify") {
    const verb =
      event.action === "created"
        ? "created"
        : event.action === "updated"
          ? "updated"
          : "forgotten"
    const recallNote = event.willAffectRecall
      ? " (this will affect future recall)"
      : ""
    reminderQueue.push(
      `<system-reminder>auto-memory ${verb} ${event.scope}/${event.relPath}${recallNote}</system-reminder>`,
    )
  }
}
