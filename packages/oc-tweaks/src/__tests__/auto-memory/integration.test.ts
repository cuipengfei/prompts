// @ts-nocheck

import { afterEach, describe, expect, test } from "bun:test"
import { cp, mkdir, rm } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { autoMemoryPlugin } from "../../plugins/auto-memory"

const originalHome = Bun.env?.HOME

function setHome(home: string | undefined) {
  if (home === undefined) {
    delete Bun.env.HOME
  } else {
    Bun.env.HOME = home
  }
}

const testDir = dirname(fileURLToPath(import.meta.url))
const fixtureRoot = join(testDir, "../fixtures/memory-integration")
const runtimeRoot = "/tmp/oc-auto-memory-integration"

afterEach(async () => {
  setHome(originalHome)
  await rm(runtimeRoot, { recursive: true, force: true })
})

describe("autoMemoryPlugin V2 pipeline integration", () => {
  test("injects registry entries through untrusted memory blocks", async () => {
    const home = join(runtimeRoot, "home")
    const projectDir = join(runtimeRoot, "project")
    const configDir = join(home, ".config/opencode")
    const globalMemoryDir = join(configDir, "memory")
    const projectMemoryDir = join(projectDir, ".opencode/memory")

    setHome(home)
    await mkdir(configDir, { recursive: true })
    await mkdir(projectMemoryDir, { recursive: true })
    await Bun.write(
      join(configDir, "oc-tweaks.json"),
      JSON.stringify({ autoMemory: { enabled: true, summaryTokenBudget: 4000 } }),
    )
    await cp(join(fixtureRoot, "global"), globalMemoryDir, { recursive: true })
    await cp(join(fixtureRoot, "project"), projectMemoryDir, { recursive: true })

    const hooks = await autoMemoryPlugin({ directory: projectDir })
    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]({}, output)

    expect(output.system.length).toBe(1)
    const injected = output.system[0]
    if (Bun.env.OC_TWEAKS_MEMORY_INTEGRATION_EVIDENCE === "1") {
      console.log(injected)
    }
    expect(injected.match(/<untrusted_memory/g)?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(injected).toContain('<memory id="global-preferences"')
    expect(injected).toContain('<memory id="project-decisions"')
    expect(injected).toContain('<memory id="project-setup"')
  })
})
