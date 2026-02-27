import { log } from "./logger"
import type { LoggerConfig } from "./logger"

export function safeHook<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  loggerConfig?: LoggerConfig
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (err) {
      await log(loggerConfig, "ERROR", `[oc-tweaks] ${name}: ${err}`)
    }
  }) as unknown as T
}
