declare module "bun:test" {
  export interface ExpectMatcher {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeDefined: () => void;
    toBeNull: () => void;
    toContain: (expected: string) => void;
    not: ExpectMatcher;
  }
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  export const expect: (actual: unknown) => ExpectMatcher;
  export const beforeAll: (fn: () => void | Promise<void>) => void;
  export const afterAll: (fn: () => void | Promise<void>) => void;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
}

