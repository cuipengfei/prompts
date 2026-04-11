// @ts-nocheck

import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import {
  extractAllFacets,
  extractFacetsFromAPI,
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
