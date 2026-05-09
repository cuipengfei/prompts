import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdir, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  MemoryPathEscapeError,
  MemoryQuotaError,
  assertDiffLines,
  assertFilenameSafe,
  assertInsideRoot,
  assertSize,
} from "../../plugins/auto-memory/path-guard"

const TMP = join(tmpdir(), "path-guard-test-" + process.pid)
const ROOT = join(TMP, "root")
const OUTSIDE = join(TMP, "outside")

beforeAll(async () => {
  await mkdir(ROOT, { recursive: true })
  await mkdir(OUTSIDE, { recursive: true })
})

afterAll(async () => {
  await rm(TMP, { recursive: true, force: true })
})

describe("assertInsideRoot", () => {
  test("allows a normal path inside root", async () => {
    await mkdir(join(ROOT, "sub"), { recursive: true })
    const result = await assertInsideRoot(ROOT, join(ROOT, "sub", "file.md"))
    expect(result).toContain(ROOT)
  })

  test("throws on .. traversal escape", async () => {
    await expect(assertInsideRoot(ROOT, join(ROOT, "..", "outside", "x.md"))).rejects.toBeInstanceOf(
      MemoryPathEscapeError,
    )
  })

  test("throws on absolute path outside root", async () => {
    await expect(assertInsideRoot(ROOT, "/etc/passwd")).rejects.toBeInstanceOf(MemoryPathEscapeError)
  })

  test("throws on symlink pointing outside root", async () => {
    const escapeLink = join(ROOT, "escape")
    await symlink(OUTSIDE, escapeLink).catch(() => {})
    await expect(assertInsideRoot(ROOT, join(escapeLink, "x.md"))).rejects.toBeInstanceOf(MemoryPathEscapeError)
  })

  test("handles ENOENT target by checking parent", async () => {
    // nonexistent file in valid subdir - should resolve based on parent
    await mkdir(join(ROOT, "validdir"), { recursive: true })
    const result = await assertInsideRoot(ROOT, join(ROOT, "validdir", "newfile.md"))
    expect(result).toContain(ROOT)
  })

  test("throws when parent resolves outside root", async () => {
    await expect(assertInsideRoot(ROOT, join(OUTSIDE, "file.md"))).rejects.toBeInstanceOf(MemoryPathEscapeError)
  })
})

describe("assertSize", () => {
  test("passes when under limit", () => {
    expect(() => assertSize(Buffer.from("hello"), 100)).not.toThrow()
  })

  test("passes for string under limit", () => {
    expect(() => assertSize("hello world", 100)).not.toThrow()
  })

  test("throws MemoryQuotaError when over limit", () => {
    const big = Buffer.alloc(101)
    expect(() => assertSize(big, 100)).toThrow(MemoryQuotaError)
  })
})

describe("assertDiffLines", () => {
  test("passes when within limit", () => {
    const diff = "line1\nline2\nline3"
    expect(() => assertDiffLines(diff, 10)).not.toThrow()
  })

  test("throws MemoryQuotaError when diff exceeds max lines", () => {
    const diff = Array.from({ length: 11 }, (_, i) => `line${i}`).join("\n")
    expect(() => assertDiffLines(diff, 10)).toThrow(MemoryQuotaError)
  })
})

describe("assertFilenameSafe", () => {
  test("allows normal filename", () => {
    expect(() => assertFilenameSafe("preferences.md")).not.toThrow()
  })

  test("allows unicode/Chinese/emoji filenames", () => {
    expect(() => assertFilenameSafe("记忆🧠.md")).not.toThrow()
  })

  test("throws on null byte injection", () => {
    expect(() => assertFilenameSafe("file\0.md")).toThrow()
  })

  test("throws on control characters", () => {
    expect(() => assertFilenameSafe("file\x01name.md")).toThrow()
  })
})
