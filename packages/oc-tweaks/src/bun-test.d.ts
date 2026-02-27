/// <reference types="bun-types" />

declare const Bun: any

declare module "bun:test" {
  export const describe: (...args: any[]) => any
  export const test: (...args: any[]) => any
  export const expect: any
  export const mock: any
  export const beforeEach: any
  export const afterEach: any
}
