// @ts-nocheck

import { describe, test, expect, beforeEach, afterEach } from "bun:test"

import { safeHook } from "../utils/safe-hook"
import { loadJsonConfig, loadOcTweaksConfig } from "../utils/config"

const originalBunFile = Bun.file
const originalHome = Bun.env?.HOME

function mockBunFile(mockData: Record<string, any>) {
  ;(globalThis as any).Bun.file = (path: string) => ({
    exists: async () => path in mockData,
    json: async () => {
      if (!(path in mockData)) throw new Error("ENOENT")
      const data = mockData[path]
      if (data instanceof Error) throw data
      return data
    },
    text: async () => JSON.stringify(mockData[path] ?? ""),
  })
}

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  if (originalHome === undefined) {
    delete (Bun.env as any).HOME
  } else {
    ;(Bun.env as any).HOME = originalHome
  }
})

describe("safeHook", () => {
  function createWarnSpy() {
    const calls: any[] = []
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      calls.push(args)
    }
    return {
      calls,
      restore: () => {
        console.warn = originalWarn
      },
    }
  }

  let warnSpy: ReturnType<typeof createWarnSpy>

  beforeEach(() => {
    warnSpy = createWarnSpy()
  })

  afterEach(() => {
    warnSpy.restore()
  })

  test("returns original function result", async () => {
    const wrapped = safeHook("add", (value: number) => value + 1)
    const result = await Promise.resolve(wrapped(1))

    expect(result).toBe(2)
    expect(warnSpy.calls.length).toBe(0)
  })

  test("swallows errors silently (now uses logger, not console.warn)", async () => {
    const error = new Error("boom")
    const wrapped = safeHook("fail", () => {
      throw error
    })

    // Should not throw, and should not call console.warn (logger is used instead)
    await expect(Promise.resolve(wrapped())).resolves.toBeUndefined()
    expect(warnSpy.calls.length).toBe(0)
  })

  test("works with async functions", async () => {
    const wrapped = safeHook("async", async (value: number) => value * 2)
    const result = await wrapped(3)

    expect(result).toBe(6)
    expect(warnSpy.calls.length).toBe(0)
  })
})

describe("loadJsonConfig", () => {
  test("returns defaults when file is missing", async () => {
    mockBunFile({})
    const defaults = { a: 1, b: true }

    const result = await loadJsonConfig("/tmp/missing.json", defaults)

    expect(result).toEqual(defaults)
  })

  test("merges defaults with parsed config", async () => {
    const path = "/tmp/config.json"
    mockBunFile({
      [path]: {
        b: false,
        c: "extra",
      },
    })
    const defaults = { a: 1, b: true }

    const result = await loadJsonConfig(path, defaults)

    expect(result).toEqual({ a: 1, b: false, c: "extra" })
  })

  test("returns defaults when json parsing fails", async () => {
    const path = "/tmp/bad.json"
    mockBunFile({
      [path]: new Error("invalid json"),
    })
    const defaults = { enabled: true }

    const result = await loadJsonConfig(path, defaults)

    expect(result).toEqual(defaults)
  })
})

describe("loadOcTweaksConfig", () => {
  test("loads config from default path", async () => {
    const home = "/tmp/oc-home"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`

    mockBunFile({
      [path]: {
        notify: {
          enabled: false,
          notifyOnIdle: true,
        },
      },
    })

    const result = await loadOcTweaksConfig()

    expect(result.notify.enabled).toBe(false)
    expect(result.notify.notifyOnIdle).toBe(true)
    expect(result.compaction).toEqual({})
  })

  test("string \"false\" is not treated as disabled", async () => {
    const home = "/tmp/oc-home-2"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`

    mockBunFile({
      [path]: {
        notify: {
          enabled: "false",
        },
      },
    })

    const result = await loadOcTweaksConfig()

    expect(result.notify.enabled).toBe("false")
    expect(result.notify.enabled === false).toBe(false)
  })
})
