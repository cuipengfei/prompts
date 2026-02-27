declare const Bun: any

export async function loadJsonConfig<T extends Record<string, unknown>>(
  path: string,
  defaults: T
): Promise<T> {
  try {
    const file = Bun.file(path)
    if (!(await file.exists())) return defaults
    const parsed = await file.json()
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

export interface NotifyStyle {
  backgroundColor?: string      // default: "#101018"
  backgroundOpacity?: number    // default: 0.95
  textColor?: string            // default: "#AAAAAA"
  borderRadius?: number         // default: 14
  colorBarWidth?: number        // default: 5
  width?: number                // default: 420
  height?: number               // default: 105
  titleFontSize?: number        // default: 14
  contentFontSize?: number      // default: 11
  iconFontSize?: number         // default: 30
  duration?: number             // default: 10000
  position?: string             // default: "center"
  shadow?: boolean              // default: true
  idleColor?: string            // default: "#4ADE80"
  errorColor?: string           // default: "#EF4444"
}

export interface OcTweaksConfig extends Record<string, unknown> {
  compaction: { enabled?: boolean }
  autoMemory: { enabled?: boolean }
  backgroundSubagent: { enabled?: boolean }
  leaderboard: { enabled?: boolean; configPath?: string | null }
  logging?: {
    enabled?: boolean
    maxLines?: number
  }
  notify: {
    enabled?: boolean
    notifyOnIdle?: boolean
    notifyOnError?: boolean
    command?: string | null
    style?: NotifyStyle
  }
}

const DEFAULT_CONFIG: OcTweaksConfig = {
  compaction: {},
  autoMemory: {},
  backgroundSubagent: {},
  leaderboard: {},
  notify: {},
}

export async function loadOcTweaksConfig(): Promise<OcTweaksConfig | null> {
  const home =
    Bun.env?.HOME ?? ((globalThis as any)?.process?.env?.HOME ?? "") ?? ""
  const path = `${home}/.config/opencode/oc-tweaks.json`
  try {
    const file = Bun.file(path)
    if (!(await file.exists())) return null
    const parsed = await file.json()
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return null
  }
}
