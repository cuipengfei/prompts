// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"

import {
  cleanMarkdown,
  detectNotifySender,
  escapeForPowerShell,
  truncateText,
} from "../utils/wpf-notify"
import { calculatePosition, WpfPositionManager } from "../utils/wpf-position"

const originalBunWhich = Bun.which

function mockBunWhich(availableCommands: string[]) {
  const available = new Set(availableCommands)
  ;(globalThis as any).Bun.which = (cmd: string) =>
    available.has(cmd) ? `/usr/bin/${cmd}` : null
}

function createShellMock() {
  const $ = async (_strings: TemplateStringsArray, ..._values: any[]) => ({
    stdout: "",
  })
  return { $ }
}

afterEach(() => {
  ;(globalThis as any).Bun.which = originalBunWhich
})

describe("wpf-notify utils", () => {
  test("detectNotifySender picks Windows-compatible WPF command", async () => {
    mockBunWhich(["pwsh", "powershell.exe", "notify-send"])
    const { $ } = createShellMock()

    const sender = await detectNotifySender($ as any, {}, undefined)
    expect(sender.kind).toBe("wpf")
    if ((globalThis as any)?.process?.platform === "win32") {
      expect(sender.command).toBe("pwsh")
      return
    }
    expect(sender.command).toBe("powershell.exe")
  })

  test("detectNotifySender falls back to powershell.exe", async () => {
    mockBunWhich(["powershell.exe"])
    const { $ } = createShellMock()

    const sender = await detectNotifySender($ as any, {}, undefined)
    expect(sender).toEqual({ kind: "wpf", command: "powershell.exe" })
  })

  test("detectNotifySender falls back to tui when no shell notifier exists", async () => {
    mockBunWhich([])
    const { $ } = createShellMock()
    const showToast = () => {}

    const sender = await detectNotifySender($ as any, { tui: { showToast } }, undefined)
    expect(sender.kind).toBe("tui")
  })

  test("detectNotifySender returns none when nothing is available", async () => {
    mockBunWhich([])
    const { $ } = createShellMock()

    const sender = await detectNotifySender($ as any, {}, undefined)
    expect(sender).toEqual({ kind: "none" })
  })

  test("escapeForPowerShell encodes arbitrary text with base64", () => {
    const source = `hello'\"\\\n中文 {\"k\":\"v\"}`
    const encoded = escapeForPowerShell(source)
    const decoded = Buffer.from(encoded, "base64").toString("utf8")

    expect(decoded).toBe(source)
    expect(encoded).not.toContain("中文")
    expect(encoded).not.toContain("hello")
  })

  test("truncateText applies suffix when exceeding max length", () => {
    expect(truncateText("abcdef", 3)).toBe("abc...")
    expect(truncateText("abc", 3)).toBe("abc")
  })

  test("cleanMarkdown removes markdown markers and normalizes spaces", () => {
    expect(cleanMarkdown("**A**\n\n# B  `code` ")).toBe("A B code")
  })
})

describe("wpf-position utils", () => {
  test("allocateSlot returns null when maxVisible reached", () => {
    const manager = new WpfPositionManager(2)
    const s1 = manager.allocateSlot(10_000)
    const s2 = manager.allocateSlot(10_000)
    const s3 = manager.allocateSlot(10_000)

    expect(s1?.slotIndex).toBe(0)
    expect(s2?.slotIndex).toBe(1)
    expect(s3).toBeNull()

    s1?.release()
    s2?.release()
  })

  test("queue is processed after slot release", () => {
    const manager = new WpfPositionManager(1)
    const first = manager.allocateSlot(10_000)
    let queuedRunCount = 0

    manager.enqueue(() => {
      const slot = manager.allocateSlot(10_000)
      if (!slot) return
      queuedRunCount += 1
      slot.release()
    })

    manager.processQueue()
    expect(queuedRunCount).toBe(0)

    first?.release()
    expect(queuedRunCount).toBe(1)
  })

  test("calculatePosition returns Manual expressions for top-right", () => {
    const position = calculatePosition(0, {
      position: "top-right",
      width: 420,
      height: 80,
      screenWidth: 1920,
      screenHeight: 1080,
    })

    expect(position.startupLocation).toBe("Manual")
    expect(typeof position.leftExpr).toBe("string")
    expect(typeof position.topExpr).toBe("string")
    expect(position.leftExpr).toContain("1920")
  })

  test("calculatePosition returns Manual expressions for bottom-right", () => {
    const position = calculatePosition(1, {
      position: "bottom-right",
      width: 420,
      height: 80,
      screenWidth: 1920,
      screenHeight: 1080,
    })

    expect(position.startupLocation).toBe("Manual")
    expect(position.topExpr).toContain("1080")
  })

  test("calculatePosition returns CenterScreen for center", () => {
    const position = calculatePosition(0, {
      position: "center",
      width: 420,
      height: 80,
    })

    expect(position).toEqual({ startupLocation: "CenterScreen" })
  })
})
