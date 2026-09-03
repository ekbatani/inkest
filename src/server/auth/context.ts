import { AsyncLocalStorage } from "node:async_hooks";

export interface AuthContext {
  userId: string;
  workspaceId?: string;
  isAgent?: boolean;
}

const authStorage = new AsyncLocalStorage<AuthContext>();

export function runWithAuthContext<T>(
  context: AuthContext,
  fn: () => Promise<T> | T,
): Promise<T> {
  return Promise.resolve(authStorage.run(context, fn));
}

export function getActiveAuthContext(): AuthContext | undefined {
  return authStorage.getStore();
}
