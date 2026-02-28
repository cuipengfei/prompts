export interface PositionConfig {
  position?: string
  width: number
  height: number
  gap?: number
  screenMargin?: number
  screenWidth?: number
  screenHeight?: number
  screenLeft?: number
  screenTop?: number
}

export interface WpfManualPosition {
  startupLocation: "Manual"
  leftExpr: string
  topExpr: string
}

export interface WpfCenterPosition {
  startupLocation: "CenterScreen"
}

export type WpfCalculatedPosition = WpfManualPosition | WpfCenterPosition

export class WpfPositionManager {
  private readonly slots = new Map<number, { expiresAt: number; timer: ReturnType<typeof setTimeout> }>()
  private readonly queue: Array<() => void> = []

  constructor(private readonly maxVisible: number) {}

  allocateSlot(duration: number): { slotIndex: number; release: () => void } | null {
    this.cleanupExpiredSlots()

    for (let slotIndex = 0; slotIndex < this.maxVisible; slotIndex += 1) {
      if (this.slots.has(slotIndex)) continue

      const ttl = Math.max(0, duration) + 500
      const timer = setTimeout(() => {
        this.releaseSlot(slotIndex)
      }, ttl)
      const expiresAt = Date.now() + ttl

      this.slots.set(slotIndex, { expiresAt, timer })

      let released = false
      return {
        slotIndex,
        release: () => {
          if (released) return
          released = true
          this.releaseSlot(slotIndex)
        },
      }
    }

    return null
  }

  enqueue(callback: () => void): void {
    this.queue.push(callback)
  }

  processQueue(): void {
    this.cleanupExpiredSlots()

    while (this.queue.length > 0 && this.hasAvailableSlot()) {
      const callback = this.queue.shift()
      if (!callback) return
      callback()
    }
  }

  private hasAvailableSlot(): boolean {
    this.cleanupExpiredSlots()
    return this.slots.size < this.maxVisible
  }

  private cleanupExpiredSlots(): void {
    const now = Date.now()
    for (const [slotIndex, state] of this.slots.entries()) {
      if (state.expiresAt > now) continue
      clearTimeout(state.timer)
      this.slots.delete(slotIndex)
    }
  }

  private releaseSlot(slotIndex: number): void {
    const state = this.slots.get(slotIndex)
    if (!state) return
    clearTimeout(state.timer)
    this.slots.delete(slotIndex)
    this.processQueue()
  }
}

export function calculatePosition(
  slotIndex: number,
  config: PositionConfig,
): WpfCalculatedPosition {
  const position = config.position ?? "center"
  if (position === "center") {
    return { startupLocation: "CenterScreen" }
  }

  const width = config.width
  const height = config.height
  const gap = config.gap ?? 12
  const margin = config.screenMargin ?? 20

  const screenLeftExpr =
    typeof config.screenLeft === "number"
      ? `${config.screenLeft}`
      : "($targetScreen.Left)"

  const screenTopExpr =
    typeof config.screenTop === "number"
      ? `${config.screenTop}`
      : "($targetScreen.Top)"

  const screenRightExpr =
    typeof config.screenWidth === "number"
      ? `(${screenLeftExpr} + ${config.screenWidth})`
      : "($targetScreen.Right)"

  const screenBottomExpr =
    typeof config.screenHeight === "number"
      ? `(${screenTopExpr} + ${config.screenHeight})`
      : "($targetScreen.Bottom)"

  const leftExpr = `(${screenRightExpr} - ${width} - ${margin})`

  if (position === "bottom-right") {
    const topExpr = `(${screenBottomExpr} - ${margin} - ((${slotIndex} + 1) * (${height} + ${gap})))`
    return {
      startupLocation: "Manual",
      leftExpr,
      topExpr,
    }
  }

  const topExpr = `(${screenTopExpr} + ${margin} + (${slotIndex} * (${height} + ${gap})))`
  return {
    startupLocation: "Manual",
    leftExpr,
    topExpr,
  }
}
