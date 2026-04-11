// @ts-nocheck

import { describe, test, expect } from "bun:test"

import * as collector from "../../insights/collector"
import { isSubstantiveSession } from "../../insights/facets"

describe("collector Bug B regression", () => {
  test("counts user messages without content and records message timing", () => {
    const createdAt = 1234
    const messages = [
      { role: "user", time: { created: createdAt } },
      { role: "assistant", tokens: { input: 100, output: 50 } },
    ]

    const stats = collector.extractToolStats(messages, [])

    expect(typeof collector.countHumanUserMessages).toBe("function")
    expect(collector.countHumanUserMessages(messages)).toBe(1)
    expect(stats.messageHours).toEqual([new Date(createdAt).getHours()])
    expect(stats.userMessageTimestamps).toEqual([createdAt])
  })

  test("counts user messages with content as regression guard", () => {
    const messages = [{ role: "user", content: "hello", time: { created: 1234 } }]

    expect(typeof collector.countHumanUserMessages).toBe("function")
    expect(collector.countHumanUserMessages(messages)).toBe(1)
  })

  test("isSubstantiveSession keeps sessions with user messages", () => {
    const sessionMeta = {
      id: "ses-1",
      user_message_count: 5,
      duration_ms: 120_000,
    }

    expect(isSubstantiveSession(sessionMeta as any)).toBe(true)
  })
})
