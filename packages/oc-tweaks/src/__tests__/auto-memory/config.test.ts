import { describe, expect, it } from "bun:test"
import { DEFAULT_CONFIG, loadJsonConfig } from "../../utils/config"

describe("autoMemory config defaults", () => {
  it("has correct default value for autoWrite", () => {
    expect(DEFAULT_CONFIG.autoMemory?.autoWrite).toBe("notify")
  })

  it("has correct default value for maxBytesPerFile", () => {
    expect(DEFAULT_CONFIG.autoMemory?.maxBytesPerFile).toBe(32_768)
  })

  it("has correct default value for maxWritesPerSession", () => {
    expect(DEFAULT_CONFIG.autoMemory?.maxWritesPerSession).toBe(5)
  })

  it("has correct default value for summaryTokenBudget", () => {
    expect(DEFAULT_CONFIG.autoMemory?.summaryTokenBudget).toBe(4000)
  })

  it("backward compat: existing config with only enabled still gets new field defaults", async () => {
    const tmpPath = "/tmp/oc-tweaks-test-compat.json"
    await Bun.write(tmpPath, JSON.stringify({ enabled: true }))
    const result = await loadJsonConfig(tmpPath, DEFAULT_CONFIG.autoMemory!)
    expect(result.enabled).toBe(true)
    expect(result.autoWrite).toBe("notify")
    expect(result.maxBytesPerFile).toBe(32_768)
    expect(result.maxWritesPerSession).toBe(5)
    expect(result.summaryTokenBudget).toBe(4000)
  })

  it("unknown fields in config file are silently ignored (no error thrown)", async () => {
    const tmpPath = "/tmp/oc-tweaks-test-unknown.json"
    await Bun.write(tmpPath, JSON.stringify({ enabled: true, someFutureField: "future" }))
    let threw = false
    try {
      await loadJsonConfig(tmpPath, DEFAULT_CONFIG.autoMemory!)
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
  })

  it("autoWrite accepts 'off' | 'notify' | 'silent' values", async () => {
    const tmpPath = "/tmp/oc-tweaks-test-autowrite.json"
    for (const val of ["off", "notify", "silent"] as const) {
      await Bun.write(tmpPath, JSON.stringify({ autoWrite: val }))
      const result = await loadJsonConfig(tmpPath, DEFAULT_CONFIG.autoMemory!)
      expect(result.autoWrite).toBe(val)
    }
  })
})
