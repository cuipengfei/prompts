import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { parseFrontmatter } from "../../plugins/auto-memory/frontmatter"
import { migrate } from "../../plugins/auto-memory/migrate"

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), "migrate-test-"))
})

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

describe("migrate", () => {
  test("backfills frontmatter on legacy .md (no frontmatter)", async () => {
    const file = join(tmpRoot, "legacy notes.md")
    const original = "# Legacy\n- item one\n- item two\n"
    await writeFile(file, original, "utf8")

    const result = await migrate({ root: tmpRoot, scope: "global" })

    expect(result.migrated).toEqual(["legacy notes.md"])
    expect(result.skipped).toEqual([])
    expect(result.errored).toEqual([])

    const after = await readFile(file, "utf8")
    expect(after.startsWith("---")).toBe(true)

    const { meta, body } = parseFrontmatter(after)
    expect(meta.id).toBe("legacy-notes")
    expect(meta.scope).toBe("global")
    expect(meta.type).toBe("note")
    expect(meta.source).toBe("migrate")
    expect(meta.trusted_as_instruction).toBe(false)
    expect(meta.created_at).not.toBe("")
    expect(meta.updated_at).not.toBe("")
    // Body bytes preserved.
    expect(body).toBe(original)
  })

  test("does not touch files that already have frontmatter", async () => {
    const file = join(tmpRoot, "modern.md")
    const original = `---
id: keep-me
scope: global
type: preference
source: user
created_at: 2026-01-01T00:00:00Z
updated_at: 2026-01-01T00:00:00Z
trusted_as_instruction: false
---
# Modern
- existing
`
    await writeFile(file, original, "utf8")

    const result = await migrate({ root: tmpRoot, scope: "global" })

    expect(result.migrated).toEqual([])
    expect(result.skipped).toEqual(["modern.md"])
    expect(result.errored).toEqual([])

    const after = await readFile(file, "utf8")
    expect(after).toBe(original)
  })

  test("is idempotent — second run is a no-op", async () => {
    const file = join(tmpRoot, "legacy.md")
    await writeFile(file, "body\n", "utf8")

    const first = await migrate({ root: tmpRoot, scope: "global" })
    expect(first.migrated).toEqual(["legacy.md"])

    const afterFirst = await readFile(file, "utf8")

    const second = await migrate({ root: tmpRoot, scope: "global" })
    expect(second.migrated).toEqual([])
    expect(second.skipped).toEqual(["legacy.md"])
    expect(second.errored).toEqual([])

    const afterSecond = await readFile(file, "utf8")
    expect(afterSecond).toBe(afterFirst)
  })

  test("ignores non-.md files", async () => {
    await writeFile(join(tmpRoot, "notes.txt"), "ignore me", "utf8")
    await writeFile(join(tmpRoot, "data.json"), "{}", "utf8")
    await mkdir(join(tmpRoot, "subdir"), { recursive: true })

    const result = await migrate({ root: tmpRoot, scope: "global" })

    expect(result.migrated).toEqual([])
    expect(result.skipped).toEqual([])
    expect(result.errored).toEqual([])
  })

  test("auto-detects scope=project when path contains .opencode/memory", async () => {
    const projectRoot = join(tmpRoot, ".opencode", "memory")
    await mkdir(projectRoot, { recursive: true })
    await writeFile(join(projectRoot, "prefs.md"), "body\n", "utf8")

    const result = await migrate({ root: projectRoot })

    expect(result.migrated).toEqual(["prefs.md"])
    const { meta } = parseFrontmatter(await readFile(join(projectRoot, "prefs.md"), "utf8"))
    expect(meta.scope).toBe("project")
  })
})
