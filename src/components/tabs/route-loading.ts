import { isValidElement } from "react";
import type * as React from "react";

/**
 * Route loading fallbacks (loading.tsx) tag their default export with this
 * static flag so TabContentKeeper can recognize a transient children payload
 * and refuse to cache it — a cached skeleton would be replayed forever once
 * the tab is marked loaded, because the fast-path switch never refetches.
 *
 * This module must stay free of "use client" so server-rendered loading.tsx
 * files can import the tag helper.
 */
export function tagRouteLoadingFallback<T extends React.ComponentType<unknown>>(
  component: T,
): T {
  (component as unknown as { isRouteLoadingFallback: boolean }).isRouteLoadingFallback = true;
  return component;
}

export function isRouteLoadingFallback(node: React.ReactNode): boolean {
  if (!isValidElement(node) || typeof node.type !== "function") {
    return false;
  }
  return (
    (node.type as unknown as { isRouteLoadingFallback?: boolean })
      .isRouteLoadingFallback === true
  );
}
