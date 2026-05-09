import { describe, expect, test } from "bun:test"

import {
  DEFAULT_META,
  MemoryFrontmatterParseError,
  parseFrontmatter,
  serializeFrontmatter,
} from "../../plugins/auto-memory/frontmatter"

describe("parseFrontmatter", () => {
  test("parses valid frontmatter and extracts body", () => {
    const raw = `---
id: abc-123
scope: global
type: preference
source: user
created_at: 2026-01-01T00:00:00Z
updated_at: 2026-01-01T00:00:00Z
trusted_as_instruction: false
---
# My Memory
- item`

    const { meta, body } = parseFrontmatter(raw)

    expect(meta.id).toBe("abc-123")
    expect(meta.scope).toBe("global")
    expect(meta.type).toBe("preference")
    expect(meta.source).toBe("user")
    expect(meta.trusted_as_instruction).toBe(false)
    expect(body).toBe("# My Memory\n- item")
  })

  test("returns DEFAULT_META when no frontmatter present (byte-for-byte body preserved)", () => {
    const raw = "# legacy memory\n- item"

    const { meta, body } = parseFrontmatter(raw)

    expect(meta.trusted_as_instruction).toBe(false)
    expect(meta.scope).toBe(DEFAULT_META.scope)
    expect(body).toBe(raw)
  })

  test("throws MemoryFrontmatterParseError on YAML parse failure", () => {
    const raw = "---\nid: [bad\n---\nbody"

    expect(() => parseFrontmatter(raw)).toThrow(MemoryFrontmatterParseError)
  })

  test("handles field type coercion - trusted_as_instruction string 'false' becomes boolean false", () => {
    const raw = `---
id: test
scope: project
type: decision
source: agent
created_at: 2026-01-01T00:00:00Z
updated_at: 2026-01-01T00:00:00Z
trusted_as_instruction: false
usage_count: 3
---
body here`

    const { meta } = parseFrontmatter(raw)

    expect(meta.trusted_as_instruction).toBe(false)
    expect(typeof meta.trusted_as_instruction).toBe("boolean")
    expect(meta.usage_count).toBe(3)
  })

  test("handles BOM (byte order mark) at start of file", () => {
    const raw = "\uFEFF---\nid: bom-test\nscope: global\ntype: pref\nsource: user\ncreated_at: 2026-01-01T00:00:00Z\nupdated_at: 2026-01-01T00:00:00Z\ntrusted_as_instruction: false\n---\nbody"

    const { meta, body } = parseFrontmatter(raw)

    expect(meta.id).toBe("bom-test")
    expect(body).toBe("body")
  })

  test("handles empty body after frontmatter", () => {
    const raw = `---
id: empty-body
scope: global
type: pref
source: user
created_at: 2026-01-01T00:00:00Z
updated_at: 2026-01-01T00:00:00Z
trusted_as_instruction: false
---
`

    const { meta, body } = parseFrontmatter(raw)

    expect(meta.id).toBe("empty-body")
    expect(body).toBe("")
  })
})

describe("serializeFrontmatter", () => {
  test("round-trips: parse then serialize produces parseable result", () => {
    const raw = `---
id: roundtrip
scope: global
type: preference
source: user
created_at: 2026-01-01T00:00:00Z
updated_at: 2026-01-02T00:00:00Z
trusted_as_instruction: false
---
body content`

    const { meta, body } = parseFrontmatter(raw)
    const serialized = serializeFrontmatter(meta, body)
    const reparsed = parseFrontmatter(serialized)

    expect(reparsed.meta.id).toBe(meta.id)
    expect(reparsed.meta.scope).toBe(meta.scope)
    expect(reparsed.meta.trusted_as_instruction).toBe(false)
    expect(reparsed.body).toBe(body)
  })
})

describe("DEFAULT_META", () => {
  test("has trusted_as_instruction: false", () => {
    expect(DEFAULT_META.trusted_as_instruction).toBe(false)
  })
})
