// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"

import { notifyPlugin } from "../plugins/notify"

const originalBunFile = Bun.file
const originalHome = Bun.env?.HOME
const originalBunWhich = Bun.which
const WPF_COMMAND = (globalThis as any)?.process?.platform === "win32" ? "pwsh" : "powershell.exe"

function mockBunWhich(availableCommands: string[]) {
  const available = new Set(availableCommands)
  ;(globalThis as any).Bun.which = (cmd: string) => available.has(cmd) ? `/usr/bin/${cmd}` : null
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

function createShellMock(options?: {
  availableCommands?: string[]
  throwOnExecution?: boolean
}) {
  const available = new Set(options?.availableCommands ?? [])
  const calls: Array<{ command: string; values: any[] }> = []

  const $ = async (strings: TemplateStringsArray, ...values: any[]) => {
    const segments = Array.from(strings)
    const command = segments.reduce(
      (acc, segment, index) =>
        acc + segment + (index < values.length ? String(values[index]) : ""),
      "",
    )

    calls.push({ command, values })

    if (command.startsWith("which ")) {
      const bin = String(values[0] ?? command.slice("which ".length).trim())
      if (available.has(bin)) return { stdout: `${bin}\n` }
      throw new Error(`missing ${bin}`)
    }

    if (options?.throwOnExecution) {
      throw new Error("execution failed")
    }

    return { stdout: "" }
  }

  return { $, calls }
}


afterEach(() => {
  ;(globalThis as any).Bun.file = originalBunFile
  if (originalHome === undefined) {
    delete (Bun.env as any).HOME
  } else {
    ;(Bun.env as any).HOME = originalHome
  }
  ;(globalThis as any).Bun.which = originalBunWhich
})

describe("notifyPlugin", () => {
  test("hook is registered but disabled config makes it no-op", async () => {
    const home = "/tmp/oc-notify-disabled"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: { enabled: false },
      },
    })

    const { $, calls } = createShellMock({ availableCommands: ["notify-send"] })
    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client: {} })

    // Hook always registered (hot-reload), but disabled = no-op
    expect(typeof hooks.event).toBe("function")
    await hooks.event({ event: { type: "session.idle", properties: { sessionID: "s0" } } })
    const notifyCalls = calls.filter((e) => !e.command.startsWith("which "))
    expect(notifyCalls.length).toBe(0)
  })

  test("auto-detects notifier once and caches detection result", async () => {
    const home = "/tmp/oc-notify-detect"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [path]: { notify: { enabled: true } } })

    mockBunWhich(["notify-send"])
    const { $, calls } = createShellMock({ availableCommands: ["notify-send"] })
    const client = {
      session: {
        messages: async () => ({
          data: [
            { info: { role: "user" }, parts: [{ type: "text", text: "irrelevant" }] },
            { info: { role: "assistant" }, parts: [{ type: "text", text: "**Done**   now" }] },
          ],
        }),
      },
    }

    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client })
    await hooks.event({ event: { type: "session.idle", properties: { sessionID: "s1" } } })
    await hooks.event({ event: { type: "session.error", properties: {} } })

    const notifyCalls = calls.filter((entry) => entry.command.startsWith("notify-send "))
    expect(notifyCalls.length).toBe(2)
    expect(notifyCalls[0].command).toContain("notify-send oc: demo")
    expect(notifyCalls[0].command).toContain("✓ Done now")
  })

  test("uses custom command and replaces $TITLE/$MESSAGE placeholders", async () => {
    const home = "/tmp/oc-notify-custom"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: {
          enabled: true,
          command: "custom-bin --title $TITLE --message $MESSAGE",
        },
      },
    })

    const { $, calls } = createShellMock()
    const client = {
      session: {
        messages: async () => ({
          data: [{ info: { role: "assistant" }, parts: [{ type: "text", text: "Hello *world*" }] }],
        }),
      },
    }

    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client })
    await hooks.event({ event: { type: "session.idle", properties: { sessionID: "s2" } } })

    const whichCalls = calls.filter((entry) => entry.command.startsWith("which "))
    const executeCalls = calls.filter((entry) => !entry.command.startsWith("which "))

    expect(whichCalls.length).toBe(0)
    expect(executeCalls.length).toBe(1)
    expect(executeCalls[0].command).toContain("custom-bin --title oc: demo --message ✓ Hello world")
    expect(executeCalls[0].command).not.toContain("$TITLE")
    expect(executeCalls[0].command).not.toContain("$MESSAGE")
  })

  test("does not notify when notifyOnIdle/notifyOnError are false", async () => {
    const home = "/tmp/oc-notify-switches"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: {
          enabled: true,
          notifyOnIdle: false,
          notifyOnError: false,
        },
      },
    })

    const { $, calls } = createShellMock({ availableCommands: ["notify-send"] })
    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client: {} })

    await hooks.event({ event: { type: "session.idle", properties: { sessionID: "s3" } } })
    await hooks.event({ event: { type: "session.error", properties: {} } })

    const notifyCalls = calls.filter((entry) => !entry.command.startsWith("which "))
    expect(notifyCalls.length).toBe(0)
  })

  test("falls back to client.tui.showToast when no shell notifier exists", async () => {
    const home = "/tmp/oc-notify-tui"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [path]: { notify: { enabled: true } } })

    mockBunWhich([])
    const { $, calls } = createShellMock()
    const toastCalls: any[] = []
    const client = {
      tui: {
        showToast: (...args: any[]) => {
          toastCalls.push(args)
        },
      },
    }

    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client })
    await hooks.event({ event: { type: "session.error", properties: {} } })

    // Bun.which returns null for all, falls back to tui
    expect(toastCalls.length).toBe(1)
  })

  test("degrades silently when execution fails and does not throw", async () => {
    const home = "/tmp/oc-notify-non-blocking"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [path]: { notify: { enabled: true } } })

    const { $ } = createShellMock({
      availableCommands: ["notify-send"],
      throwOnExecution: true,
    })

    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client: {} })

    await expect(
      hooks.event({ event: { type: "session.error", properties: {} } }),
    ).resolves.toBeUndefined()
  })

  test("keeps silent when no notifier is available", async () => {
    const home = "/tmp/oc-notify-none"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [path]: { notify: { enabled: true } } })

    const { $ } = createShellMock()
    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client: {} })

    await expect(
      hooks.event({ event: { type: "session.error", properties: {} } }),
    ).resolves.toBeUndefined()
  })
})

  test("detects WPF-capable sender and uses wpf flow", async () => {
    const home = "/tmp/oc-notify-wpf-detect"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [path]: { notify: { enabled: true } } })

    mockBunWhich([WPF_COMMAND])
    const { $, calls } = createShellMock({ availableCommands: [WPF_COMMAND] })
    const client = {
      session: {
        messages: async () => ({
          data: [{ info: { role: "assistant" }, parts: [{ type: "text", text: "Task done" }] }],
        }),
      },
    }

    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client })
    await hooks.event({ event: { type: "session.idle", properties: { sessionID: "s4" } } })

    const wpfCalls = calls.filter((entry) => entry.command.includes(WPF_COMMAND))
    expect(wpfCalls.length).toBeGreaterThan(0)

    const bun_e_calls = calls.filter((entry) => entry.command.includes("bun -e"))
    expect(bun_e_calls.length).toBeGreaterThan(0)

    const jsCode = String(bun_e_calls[0].values[0] ?? "")
    expect(jsCode).toContain("PresentationFramework")
    expect(jsCode).toContain("ShowActivated")
  })

  test("wpf notification script contains WS_EX_NOACTIVATE for non-focus behavior", async () => {
    const home = "/tmp/oc-notify-wpf-noactivate"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({ [path]: { notify: { enabled: true } } })

    mockBunWhich([WPF_COMMAND])
    const { $, calls } = createShellMock({ availableCommands: [WPF_COMMAND] })
    const client = {
      session: {
        messages: async () => ({
          data: [{ info: { role: "assistant" }, parts: [{ type: "text", text: "Finished" }] }],
        }),
      },
    }

    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client })
    await hooks.event({ event: { type: "session.idle", properties: { sessionID: "s5" } } })

    const bun_e_calls = calls.filter((entry) => entry.command.includes("bun -e"))
    expect(bun_e_calls.length).toBeGreaterThan(0)

    const jsCode = String(bun_e_calls[0].values[0] ?? "")
    expect(jsCode).toMatch(/WS_EX_NOACTIVATE|0x08000000|MakeGlobalWindow/)
  })

  test("wpf notification uses custom style from config", async () => {
    const home = "/tmp/oc-notify-wpf-style"
    ;(Bun.env as any).HOME = home
    const path = `${home}/.config/opencode/oc-tweaks.json`
    mockBunFile({
      [path]: {
        notify: {
          enabled: true,
          style: {
            backgroundColor: "#FF0000",
            duration: 3000,
          },
        },
      },
    })

    mockBunWhich([WPF_COMMAND])
    const { $, calls } = createShellMock({ availableCommands: [WPF_COMMAND] })
    const client = {
      session: {
        messages: async () => ({
          data: [{ info: { role: "assistant" }, parts: [{ type: "text", text: "Complete" }] }],
        }),
      },
    }

    const hooks = await notifyPlugin({ $, directory: "/tmp/demo", client })
    await hooks.event({ event: { type: "session.idle", properties: { sessionID: "s6" } } })

    const bun_e_calls = calls.filter((entry) => entry.command.includes("bun -e"))
    expect(bun_e_calls.length).toBeGreaterThan(0)

    const jsCode = String(bun_e_calls[0].values[0] ?? "")
    expect(jsCode).toContain("#FF0000")
    expect(jsCode).toContain("3000")
  })
