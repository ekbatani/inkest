"use client";

import * as React from "react";
import { useWorkspaceTabs } from "./tabs-context";

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
  const { activeTabId, tabs, markTabLoaded } = useWorkspaceTabs();

  // In-memory cache of rendered tab contents
  const [cachedTabs, setCachedTabs] = React.useState<Map<string, CacheEntry>>(() => {
    const map = new Map<string, CacheEntry>();
    if (activeTabId) {
      map.set(activeTabId, { node: children, lastActive: Date.now() });
    }
    return map;
  });

  const [prevActiveId, setPrevActiveId] = React.useState<string | null>(activeTabId);

  // Synchronize cache during render phase when active tab changes
  if (activeTabId !== prevActiveId) {
    setPrevActiveId(activeTabId);
    if (activeTabId) {
      setCachedTabs((prev) => {
        const next = new Map(prev);
        const openIds = new Set(tabs.map((t) => t.id));

        // 1. Evict any cached tabs that have been closed
        for (const id of next.keys()) {
          if (!openIds.has(id)) {
            next.delete(id);
          }
        }

        // 2. Add or update active tab
        const existing = next.get(activeTabId);
        if (!existing) {
          next.set(activeTabId, { node: children, lastActive: Date.now() });
        } else {
          next.set(activeTabId, { ...existing, node: children, lastActive: Date.now() });
        }

        // 3. Enforce maximum tabs in memory (LRU eviction of inactive tabs)
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
  }

  // Notify tabs context when active tab is registered
  React.useEffect(() => {
    if (activeTabId) {
      markTabLoaded(activeTabId);
    }
  }, [activeTabId, markTabLoaded]);

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
