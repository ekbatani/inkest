"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useWorkspaceTabs, parseRoute } from "./tabs-context";

const MAX_CACHED_TABS = 8;

interface CacheEntry {
  node: React.ReactNode;
  lastActive: number;
}

export function TabContentKeeper({
  children,
  maxCachedTabs = MAX_CACHED_TABS,
}: {
  children: React.ReactNode;
  maxCachedTabs?: number;
}) {
  const pathname = usePathname();
  const { activeTabId, tabs, loadedTabIds, markTabLoaded, unmarkTabLoaded } = useWorkspaceTabs();

  const currentRoute = parseRoute(pathname);
  const currentRouteId = currentRoute?.id ?? null;

  // In-memory cache of rendered tab contents
  const [cachedTabs, setCachedTabs] = React.useState<Map<string, CacheEntry>>(() => {
    const map = new Map<string, CacheEntry>();
    if (currentRouteId && (!activeTabId || currentRouteId === activeTabId)) {
      map.set(currentRouteId, { node: children, lastActive: Date.now() });
    }
    return map;
  });

  const [prevActiveId, setPrevActiveId] = React.useState<string | null>(activeTabId);
  const [prevChildren, setPrevChildren] = React.useState<React.ReactNode>(children);
  const [prevRouteId, setPrevRouteId] = React.useState<string | null>(currentRouteId);

  // Synchronize cache during render phase
  if (
    activeTabId !== prevActiveId ||
    children !== prevChildren ||
    currentRouteId !== prevRouteId
  ) {
    setPrevActiveId(activeTabId);
    setPrevChildren(children);
    setPrevRouteId(currentRouteId);

    setCachedTabs((prev) => {
      const next = new Map(prev);
      const openIds = new Set(tabs.map((t) => t.id));

      // 1. Evict any cached tabs that have been closed
      for (const id of next.keys()) {
        if (!openIds.has(id)) {
          next.delete(id);
        }
      }

      // 2. If current route matches an open tab and children belongs to that route, cache or update it
      if (currentRouteId && openIds.has(currentRouteId)) {
        const existing = next.get(currentRouteId);
        if (!existing) {
          // New tab content rendered by Next.js
          next.set(currentRouteId, { node: children, lastActive: Date.now() });
        } else if (children !== prevChildren && currentRouteId === activeTabId) {
          // Fresh children delivered by Next.js for the active route (e.g. server revalidation or refresh)
          next.set(currentRouteId, { ...existing, node: children, lastActive: Date.now() });
        }
      }

      // 3. If active tab changed to an already cached tab, update its lastActive timestamp.
      // IMPORTANT: Never overwrite an existing cached tab's node with children when switching activeTabId!
      if (activeTabId && next.has(activeTabId)) {
        const entry = next.get(activeTabId)!;
        next.set(activeTabId, { ...entry, lastActive: Date.now() });
      }

      // 4. Enforce maximum tabs in memory (LRU eviction of inactive tabs)
      if (next.size > maxCachedTabs) {
        let oldestId: string | null = null;
        let oldestTime = Number.POSITIVE_INFINITY;

        for (const [id, entry] of next.entries()) {
          if (id !== activeTabId && entry.lastActive < oldestTime) {
            oldestTime = entry.lastActive;
            oldestId = id;
          }
        }

        if (oldestId) {
          next.delete(oldestId);
        }
      }

      return next;
    });
  }

  // Synchronize loadedTabIds in TabsContext with the cachedTabs keys
  React.useEffect(() => {
    const cachedIds = new Set(cachedTabs.keys());

    // Mark newly cached tabs as loaded in context
    for (const id of cachedIds) {
      if (!loadedTabIds.has(id)) {
        markTabLoaded(id);
      }
    }

    // Unmark any tabs that were evicted from cache or closed
    for (const id of loadedTabIds) {
      if (!cachedIds.has(id)) {
        unmarkTabLoaded(id);
      }
    }
  }, [cachedTabs, loadedTabIds, markTabLoaded, unmarkTabLoaded]);

  // If on a non-tab route (e.g. /dashboard, /calendar, /settings) or tab not cached yet
  const isTabInCache = activeTabId ? cachedTabs.has(activeTabId) : false;

  return (
    <div className="relative h-full w-full min-h-0 flex-1">
      {/* Mounted tabs kept in memory */}
      {Array.from(cachedTabs.entries()).map(([tabId, entry]) => {
        const isCurrent = tabId === activeTabId;
        return (
          <div
            key={tabId}
            data-tab-content-id={tabId}
            style={{ display: isCurrent ? "contents" : "none" }}
            aria-hidden={!isCurrent}
          >
            {entry.node}
          </div>
        );
      })}

      {/* Render children directly if current route is not yet in cache or is a non-tab route */}
      {!isTabInCache && (
        <div style={{ display: "contents" }}>
          {children}
        </div>
      )}
    </div>
  );
}
