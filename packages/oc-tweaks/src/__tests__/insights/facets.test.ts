// @ts-nocheck

import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import {
  extractAllFacets,
  extractFacetsFromAPI,
  formatTranscript,
  isMinimalSession,
  isSubstantiveSession,
} from "../../insights/facets"

const originalBunFile = Bun.file
const originalBunWrite = Bun.write
const originalHome = Bun.env?.HOME

const storedFiles: Record<string, string> = {}

function setHome(home: string | undefined) {
  if (home === undefined) delete (Bun.env as any).HOME
  else (Bun.env as any).HOME = home
}

function mockBun() {
  ;(globalThis as any).Bun.file = (path: string) => ({
    exists: async () => path in storedFiles,
    text: async () => {
      if (!(path in storedFiles)) throw new Error("ENOENT")
      return storedFiles[path]
    },
    json: async () => {
      if (!(path in storedFiles)) throw new Error("ENOENT")
      return JSON.parse(storedFiles[path])
    },
  })

  ;(globalThis as any).Bun.write = async (path: string, content: string) => {
    storedFiles[path] = typeof content === "string" ? content : String(content)
  }
}

function createSessionMeta(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    user_message_count: 3,
    duration_ms: 120_000,
    ...overrides,
  }
}

function createFacet(sessionId: string, overrides: Record<string, unknown> = {}) {
  return {
    session_id: sessionId,
    underlying_goal: "Ship feature",
    goal_categories: { implement_feature: 1 },
    outcome: "fully_achieved",
    user_satisfaction_counts: { satisfied: 1 },
    claude_helpfulness: "very_helpful",
    session_type: "single_task",
    friction_counts: { misunderstood_request: 0 },
    friction_detail: "",
    primary_success: "correct_code_edits",
    brief_summary: "Done",
    ...overrides,
  }
}

beforeEach(() => {
  setHome(originalHome)
  for (const key of Object.keys(storedFiles)) delete storedFiles[key]
  mockBun()
})

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  ;(globalThis as any).Bun.write = originalBunWrite
  setHome(originalHome)
})

describe("insights facets extractor", () => {
  test("extractFacetsFromAPI parses JSON, validates result, and marks internal session title", async () => {
    const home = "/tmp/oc-insights-facets-api"
    setHome(home)

    const createCalls: any[] = []
    const promptCalls: any[] = []

    const client = {
      session: {
        create: async (options: any) => {
          createCalls.push(options)
          return { data: { id: "internal-insights-session" } }
        },
        prompt: async (options: any) => {
          promptCalls.push(options)
          return {
            data: {
              parts: [
                {
                  type: "text",
                  text: `analysis\n${JSON.stringify(
                    createFacet("wrong-session-id", {
                      goal_categories: { fix_bug: 2 },
                    }),
                  )}\nend`,
                },
              ],
            },
          }
        },
      },
    }

    const result = await extractFacetsFromAPI(
      client,
      "ses-123",
      [
        { role: "user", content: "Please fix bug in parser" },
        { role: "assistant", content: [{ type: "text", text: "Working on it" }] },
      ],
      [
        {
          type: "tool",
          tool: "Edit",
          state: { input: { file_path: "/repo/src/parser.ts" }, output: "ok" },
        },
      ],
    )

    expect(result).not.toBeNull()
    expect(result?.session_id).toBe("ses-123")
    expect(result?.goal_categories).toEqual({ fix_bug: 2 })

    expect(createCalls.length).toBe(1)
    expect(createCalls[0]?.body?.title).toContain("[insights-internal]")

    expect(promptCalls.length).toBe(1)
    expect(promptCalls[0]?.path?.id).toBe("internal-insights-session")

    expect(Object.keys(storedFiles)).toContain(
      `${home}/.local/share/opencode/insights/facets/ses-123.json`,
    )
  })

  test("extractFacetsFromAPI sends prompt body without legacy maxTokens field", async () => {
    const promptCalls: any[] = []

    const client = {
      session: {
        create: async () => ({ data: { id: "internal-insights-session" } }),
        prompt: async (options: any) => {
          promptCalls.push(options)
          return {
            data: {
              parts: [{
                type: "text",
                text: JSON.stringify(createFacet("ses-typed")),
              }],
            },
          }
        },
      },
    }

    const result = await extractFacetsFromAPI(
      client,
      "ses-typed",
      [{ role: "user", content: "Please fix bug in parser" }],
      [],
    )

    expect(result?.session_id).toBe("ses-typed")
    expect(promptCalls.length).toBe(1)
    expect(promptCalls[0]?.body?.parts?.length).toBe(1)
    expect("maxTokens" in (promptCalls[0]?.body ?? {})).toBe(false)
  })

  test("extractAllFacets skips LLM when cached facets map hits", async () => {
    const promptCalls: any[] = []
    const createCalls: any[] = []

    const client = {
      session: {
        create: async (...args: any[]) => {
          createCalls.push(args)
          return { data: { id: "should-not-create" } }
        },
        prompt: async (...args: any[]) => {
          promptCalls.push(args)
          return { data: { parts: [{ type: "text", text: "{}" }] } }
        },
      },
    }

    const cached = new Map<string, any>([["ses-cache", createFacet("ses-cache")]])

    const facets = await extractAllFacets(
      client,
      [createSessionMeta("ses-cache")],
      new Map(),
      new Map(),
      cached,
    )

    expect(facets.get("ses-cache")?.session_id).toBe("ses-cache")
    expect(promptCalls.length).toBe(0)
    expect(createCalls.length).toBe(0)
  })

  test("extractAllFacets skips LLM when disk cache hits", async () => {
    const home = "/tmp/oc-insights-facets-disk-cache"
    setHome(home)

    storedFiles[`${home}/.local/share/opencode/insights/facets/ses-disk.json`] = JSON.stringify(
      createFacet("ses-disk"),
    )

    const promptCalls: any[] = []
    const createCalls: any[] = []

    const client = {
      session: {
        create: async (...args: any[]) => {
          createCalls.push(args)
          return { data: { id: "should-not-create" } }
        },
        prompt: async (...args: any[]) => {
          promptCalls.push(args)
          return { data: { parts: [{ type: "text", text: "{}" }] } }
        },
      },
    }

    const facets = await extractAllFacets(
      client,
      [createSessionMeta("ses-disk")],
      {},
      {},
      new Map(),
    )

    expect(facets.get("ses-disk")?.session_id).toBe("ses-disk")
    expect(promptCalls.length).toBe(0)
    expect(createCalls.length).toBe(0)
  })

  test("isSubstantiveSession follows plan threshold", () => {
    expect(isSubstantiveSession(createSessionMeta("a", { user_message_count: 1 }))).toBe(false)
    expect(isSubstantiveSession(createSessionMeta("b", { duration_ms: 59_999 }))).toBe(false)
    expect(
      isSubstantiveSession(
        createSessionMeta("c", {
          user_message_count: 2,
          duration_ms: 60_000,
        }),
      ),
    ).toBe(true)
  })

  test("isMinimalSession returns true only when warmup_minimal is the sole positive category", () => {
    expect(
      isMinimalSession(
        createFacet("m1", {
          goal_categories: { warmup_minimal: 1 },
        }),
      ),
    ).toBe(true)

    expect(
      isMinimalSession(
        createFacet("m2", {
          goal_categories: { warmup_minimal: 1, fix_bug: 1 },
        }),
      ),
    ).toBe(false)

    expect(
      isMinimalSession(
        createFacet("m3", {
          goal_categories: { warmup_minimal: 0 },
        }),
      ),
    ).toBe(false)
  })
})

describe("formatTranscript compatibility", () => {
  test("legacy session: extracts text from message.content when no text/reasoning parts exist", () => {
    const messages = [
      { _messageId: "msg-1", role: "user", content: "Please fix the bug" },
      { _messageId: "msg-2", role: "assistant", content: [{ type: "text", text: "Working on it" }] },
    ]
    const parts = [
      {
        _messageId: "msg-2",
        type: "tool",
        tool: "Edit",
        state: { input: { file_path: "/repo/src/parser.ts" }, output: "ok" },
      },
    ]

    const transcript = formatTranscript("ses-legacy", messages, parts)

    expect(transcript).toContain("[User] Please fix the bug")
    expect(transcript).toContain("[Assistant] Working on it")
    expect(transcript).toContain("[Tool: Edit]")
    // Should NOT contain part-based markers
    expect(transcript).not.toContain("[Reasoning]")
  })

  test("part-based session: extracts text from parts when message.content is empty", () => {
    const messages = [
      { _messageId: "msg-1", role: "user", content: "" },
      { _messageId: "msg-2", role: "assistant", content: "" },
    ]
    const parts = [
      { _messageId: "msg-1", type: "text", text: "Please fix the bug" },
      { _messageId: "msg-2", type: "reasoning", reasoning: "Let me think about the approach" },
      { _messageId: "msg-2", type: "text", text: "I will fix it now" },
      {
        _messageId: "msg-2",
        type: "tool",
        tool: "Edit",
        state: { input: { file_path: "/repo/src/parser.ts" }, output: "ok" },
      },
    ]

    const transcript = formatTranscript("ses-part-based", messages, parts)

    expect(transcript).toContain("[User] Please fix the bug")
    expect(transcript).toContain("[Reasoning] Let me think about the approach")
    expect(transcript).toContain("[Assistant] I will fix it now")
    expect(transcript).toContain("[Tool: Edit]")
    // Should NOT fall back to message.content (which is empty string)
    const userLines = transcript.split("\n").filter((l) => l.startsWith("[User]"))
    expect(userLines.length).toBe(1)
  })

  test("mixed session: uses part-based text and does NOT concatenate message.content", () => {
    const messages = [
      { _messageId: "msg-1", role: "user", content: "Some old content that should be ignored" },
      { _messageId: "msg-2", role: "assistant", content: "Old assistant content" },
    ]
    const parts = [
      { _messageId: "msg-1", type: "text", text: "Real user text from parts" },
      { _messageId: "msg-2", type: "text", text: "Real assistant text from parts" },
    ]

    const transcript = formatTranscript("ses-mixed", messages, parts)

    // Part-based text should appear
    expect(transcript).toContain("[User] Real user text from parts")
    expect(transcript).toContain("[Assistant] Real assistant text from parts")
    // Legacy message.content should NOT appear (no blind concatenation)
    expect(transcript).not.toContain("Some old content that should be ignored")
    expect(transcript).not.toContain("Old assistant content")
  })

  test("part-based session: assigns correct role via _messageId mapping", () => {
    const messages = [
      { _messageId: "msg-u1", role: "user" },
      { _messageId: "msg-a1", role: "assistant" },
    ]
    const parts = [
      { _messageId: "msg-u1", type: "text", text: "User question" },
      { _messageId: "msg-a1", type: "text", text: "Assistant answer" },
      { type: "text", text: "Orphan text without messageId" },
    ]

    const transcript = formatTranscript("ses-roles", messages, parts)

    expect(transcript).toContain("[User] User question")
    expect(transcript).toContain("[Assistant] Assistant answer")
    expect(transcript).toContain("[Message] Orphan text without messageId")
  })
})
