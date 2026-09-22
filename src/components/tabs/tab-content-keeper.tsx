"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useWorkspaceTabs, parseRoute } from "./tabs-context";
import { isRouteLoadingFallback } from "./route-loading";

const MAX_CACHED_TABS = 4;

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
  const {
    activeTabId,
    tabs,
    loadedTabIds,
    fastPathSeq,
    markTabLoaded,
    unmarkTabLoaded,
  } = useWorkspaceTabs();

  const currentRoute = parseRoute(pathname);
  const currentRouteId = currentRoute?.id ?? null;

  // In-memory cache of rendered tab contents. Only settled page content is
  // ever stored here: loading fallbacks and payloads delivered after a
  // fast-path tab switch are skipped (see the sync below).
  const [cachedTabs, setCachedTabs] = React.useState<Map<string, CacheEntry>>(() => {
    const map = new Map<string, CacheEntry>();
    const openAtInit = new Set(tabs.map((t) => t.id));
    if (
      currentRouteId &&
      openAtInit.has(currentRouteId) &&
      (!activeTabId || currentRouteId === activeTabId) &&
      !isRouteLoadingFallback(children)
    ) {
      map.set(currentRouteId, { node: children, lastActive: Date.now() });
    }
    return map;
  });

  const [prevPathname, setPrevPathname] = React.useState(pathname);
  const [prevActiveId, setPrevActiveId] = React.useState<string | null>(activeTabId);
  const [prevChildren, setPrevChildren] = React.useState<React.ReactNode>(children);
  const [prevRouteId, setPrevRouteId] = React.useState<string | null>(currentRouteId);
  const [prevFastPathSeq, setPrevFastPathSeq] = React.useState<number>(fastPathSeq);

  // The fastPathSeq observed when the children payload last changed. A new
  // children payload is attributable to the current route only when no
  // fast-path switch happened since the previous payload — otherwise it
  // belongs to the route we navigated away from, not the one the URL shows.
  // Tracked as state (not a ref) because the render-phase sync below reads
  // and adjusts it.
  const [lastChildrenSeq, setLastChildrenSeq] = React.useState<number>(fastPathSeq);

  // Synchronize cache during render phase
  if (
    pathname !== prevPathname ||
    activeTabId !== prevActiveId ||
    children !== prevChildren ||
    currentRouteId !== prevRouteId ||
    fastPathSeq !== prevFastPathSeq
  ) {
    setPrevPathname(pathname);
    setPrevActiveId(activeTabId);
    setPrevChildren(children);
    setPrevRouteId(currentRouteId);
    setPrevFastPathSeq(fastPathSeq);

    const childrenChanged = children !== prevChildren;
    const attributionValid = childrenChanged && fastPathSeq === lastChildrenSeq;
    if (childrenChanged) {
      setLastChildrenSeq(fastPathSeq);
    }

    setCachedTabs((prev) => {
      const next = new Map(prev);
      const openIds = new Set(tabs.map((t) => t.id));

      // 1. Evict any cached tabs that have been closed
      for (const id of next.keys()) {
        if (!openIds.has(id)) {
          next.delete(id);
        }
      }

      if (!attributionValid) {
        // This payload was delivered after a fast-path switch: it belongs to
        // the route we just left. Drop the entry cached from that interrupted
        // navigation (its node is exactly the stale previous payload) so the
        // tab is never fast-path-switched into an eternal skeleton — it will
        // refetch the next time it is opened.
        for (const [id, entry] of next) {
          if (entry.node === prevChildren) {
            next.delete(id);
          }
        }
      } else if (
        currentRouteId &&
        openIds.has(currentRouteId) &&
        !isRouteLoadingFallback(children)
      ) {
        // 2. Settled content for an open tab that matches the current route:
        // cache or update it. Transient loading fallbacks are never cached.
        next.set(currentRouteId, { node: children, lastActive: Date.now() });
      }

      // 3. If active tab changed to an already cached tab, update its
      // lastActive timestamp. Never swap a cached tab's node on activation —
      // children at that moment belongs to the route being left.
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

  // If on a non-tab route (e.g. /dashboard, /calendar, /settings), cached tabs must never be active or hide children
  const isTabRoute = currentRoute !== null;
  const isTabInCache = isTabRoute && activeTabId ? cachedTabs.has(activeTabId) : false;

  return (
    <div className="relative h-full w-full min-h-0 flex-1">
      {/* Mounted tabs kept in memory */}
      {Array.from(cachedTabs.entries()).map(([tabId, entry]) => {
        const isCurrent = isTabRoute && tabId === activeTabId;
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
