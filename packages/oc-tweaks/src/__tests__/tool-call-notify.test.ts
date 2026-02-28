// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"

import { toolCallNotifyPlugin } from "../plugins/tool-call-notify"

const originalBunFile = Bun.file
const originalHome = Bun.env?.HOME
const originalBunWhich = Bun.which
const WPF_COMMAND = (globalThis as any)?.process?.platform === "win32" ? "pwsh" : "powershell.exe"

function mockBunWhich(availableCommands: string[]) {
  const available = new Set(availableCommands)
  ;(globalThis as any).Bun.which = (cmd: string) =>
    available.has(cmd) ? `/usr/bin/${cmd}` : null
}

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

function createShellMock() {
  const calls: Array<{ command: string; values: any[] }> = []

  const $ = async (strings: TemplateStringsArray, ...values: any[]) => {
    const segments = Array.from(strings)
    const command = segments.reduce(
      (acc, segment, index) =>
        acc + segment + (index < values.length ? String(values[index]) : ""),
      "",
    )
    calls.push({ command, values })
    return { stdout: "" }
  }

  return { $, calls }
}

function extractDecodedPayload(jsCode: string) {
  const matches = [...jsCode.matchAll(/FromBase64String\('([^']+)'\)/g)]
  if (matches.length < 2) return { title: "", text: "" }
  return {
    title: Buffer.from(matches[0][1], "base64").toString("utf8"),
    text: Buffer.from(matches[1][1], "base64").toString("utf8"),
  }
}

afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  ;(globalThis as any).Bun.which = originalBunWhich
  if (originalHome === undefined) {
    delete (Bun.env as any).HOME
  } else {
    ;(Bun.env as any).HOME = originalHome
  }
})

describe("toolCallNotifyPlugin", () => {
  test("registers tool.execute.before hook", async () => {
    const { $ } = createShellMock()
    const hooks = await toolCallNotifyPlugin({ $, directory: "/tmp/demo", client: {} })

    expect(typeof hooks["tool.execute.before"]).toBe("function")
  })

  test("is no-op when tool call notify is disabled", async () => {
    const home = "/tmp/oc-tool-call-disabled"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: {
          enabled: true,
          toolCall: { enabled: false },
        },
      },
    })
    mockBunWhich([WPF_COMMAND])

    const { $, calls } = createShellMock()
    const hooks = await toolCallNotifyPlugin({ $, directory: "/tmp/demo", client: {} })
    await hooks["tool.execute.before"]({ tool: "read" }, { args: { filePath: "a" } })

    const execCalls = calls.filter((entry) => entry.command.includes("bun -e"))
    expect(execCalls.length).toBe(0)
  })

  test("skips excluded tools from filter.exclude", async () => {
    const home = "/tmp/oc-tool-call-filter"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: {
          enabled: true,
          toolCall: {
            enabled: true,
            filter: { exclude: ["think_sequentialthinking"] },
          },
        },
      },
    })
    mockBunWhich([WPF_COMMAND])

    const { $, calls } = createShellMock()
    const hooks = await toolCallNotifyPlugin({ $, directory: "/tmp/demo", client: {} })
    await hooks["tool.execute.before"](
      { tool: "think_sequentialthinking" },
      { args: { thought: "x" } },
    )

    const execCalls = calls.filter((entry) => entry.command.includes("bun -e"))
    expect(execCalls.length).toBe(0)
  })

  test("sends wpf toast when enabled on wpf-capable environment", async () => {
    const home = "/tmp/oc-tool-call-enabled"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: {
          enabled: true,
          toolCall: {
            enabled: true,
          },
        },
      },
    })
    mockBunWhich([WPF_COMMAND])

    const { $, calls } = createShellMock()
    const hooks = await toolCallNotifyPlugin({ $, directory: "/tmp/demo", client: {} })
    await hooks["tool.execute.before"](
      { tool: "read" },
      { args: { filePath: "/tmp/a.md" } },
    )

    const execCalls = calls.filter((entry) => entry.command.includes("bun -e"))
    expect(execCalls.length).toBe(1)

    const jsCode = String(execCalls[0].values[0] ?? "")
    const decoded = extractDecodedPayload(jsCode)
    expect(decoded.title).toBe("🔧 read")
    expect(decoded.text).toContain("filePath")
  })

  test("truncates args payload based on maxArgLength", async () => {
    const home = "/tmp/oc-tool-call-truncate"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: {
          enabled: true,
          toolCall: {
            enabled: true,
            maxArgLength: 10,
          },
        },
      },
    })
    mockBunWhich([WPF_COMMAND])

    const { $, calls } = createShellMock()
    const hooks = await toolCallNotifyPlugin({ $, directory: "/tmp/demo", client: {} })
    await hooks["tool.execute.before"](
      { tool: "read" },
      { args: { veryLong: "0123456789abcdef" } },
    )

    const execCalls = calls.filter((entry) => entry.command.includes("bun -e"))
    const jsCode = String(execCalls[0].values[0] ?? "")
    const decoded = extractDecodedPayload(jsCode)
    expect(decoded.text.endsWith("...")).toBe(true)
    expect(decoded.text.length).toBeLessThanOrEqual(13)
  })

  test("skips notification on non-wpf environments", async () => {
    const home = "/tmp/oc-tool-call-non-wpf"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: {
          enabled: true,
          toolCall: {
            enabled: true,
          },
        },
      },
    })
    mockBunWhich(["notify-send"])

    const { $, calls } = createShellMock()
    const hooks = await toolCallNotifyPlugin({ $, directory: "/tmp/demo", client: {} })
    await hooks["tool.execute.before"](
      { tool: "read" },
      { args: { filePath: "/tmp/a.md" } },
    )

    const execCalls = calls.filter((entry) => entry.command.includes("bun -e"))
    expect(execCalls.length).toBe(0)
  })
})
