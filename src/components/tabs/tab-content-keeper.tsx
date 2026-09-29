"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
// Next.js does not expose the per-segment router context publicly. Freezing it
// is the only way to keep a previously rendered route mounted: the `children`
// a layout receives is a single router element that always renders whatever
// route is current, so caching `children` itself can never preserve a tab.
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useWorkspaceTabs, parseRoute, isTransientRouteId } from "./tabs-context";

const MAX_CACHED_TABS = 4;

type LayoutRouterContextValue = React.ContextType<typeof LayoutRouterContext>;

/**
 * Renders the layout's router `children` against either the live router
 * context (the tab the router is currently showing) or the last live context
 * this tab rendered with (a kept tab). A kept tab's context is frozen, so its
 * page stays mounted exactly as the user left it — editor state, scroll, and
 * data included — and is shown instantly when the tab is activated again.
 *
 * When a kept tab becomes current again, the router's navigation transition
 * swaps in the live context. The segment keeps its identity, so React keeps
 * the already-visible content on screen until the fresh server payload
 * resolves, instead of falling back to the route's loading skeleton.
 */
function KeptTabScope({ live, children }: { live: boolean; children: React.ReactNode }) {
  const liveContext = React.use(LayoutRouterContext);
  const [frozenContext, setFrozenContext] = React.useState<LayoutRouterContextValue>(liveContext);

  if (live && liveContext !== frozenContext) {
    setFrozenContext(liveContext);
  }

  return (
    <LayoutRouterContext.Provider value={live ? liveContext : frozenContext}>
      {children}
    </LayoutRouterContext.Provider>
  );
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
  const currentRouteId =
    currentRoute && !isTransientRouteId(currentRoute.id) ? currentRoute.id : null;

  // Kept tabs, keyed by tab id, with the time each was last shown (for LRU).
  const [keptTabs, setKeptTabs] = React.useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (currentRouteId && tabs.some((t) => t.id === currentRouteId)) {
      map.set(currentRouteId, Date.now());
    }
    return map;
  });

  const [prevPathname, setPrevPathname] = React.useState(pathname);
  const [prevActiveId, setPrevActiveId] = React.useState<string | null>(activeTabId);
  const [prevTabs, setPrevTabs] = React.useState(tabs);

  // Synchronize kept tabs during render so a newly routed tab is placed in its
  // own slot in the same commit — moving it later would remount the page.
  if (pathname !== prevPathname || activeTabId !== prevActiveId || tabs !== prevTabs) {
    // Tab metadata updates (titles, dirty flags) only need the closed-tab
    // cleanup; recency changes only when the route or active tab does.
    const touched = pathname !== prevPathname || activeTabId !== prevActiveId;
    setPrevPathname(pathname);
    setPrevActiveId(activeTabId);
    setPrevTabs(tabs);

    setKeptTabs((prev) => {
      const next = new Map(prev);
      const openIds = new Set(tabs.map((t) => t.id));
      const now = Date.now();

      // 1. Drop tabs that have been closed.
      for (const id of next.keys()) {
        if (!openIds.has(id)) next.delete(id);
      }

      // 2. The route the router is showing always gets a slot.
      if (currentRouteId && openIds.has(currentRouteId) && (touched || !next.has(currentRouteId))) {
        next.set(currentRouteId, now);
      }

      // 3. Activating an already kept tab refreshes its recency.
      if (touched && activeTabId && next.has(activeTabId)) {
        next.set(activeTabId, now);
      }

      // 4. Enforce the memory budget (LRU), never evicting the tab being shown
      // or the tab the router is still rendering.
      while (next.size > maxCachedTabs) {
        let oldestId: string | null = null;
        let oldestTime = Number.POSITIVE_INFINITY;
        for (const [id, lastActive] of next) {
          if (id !== activeTabId && id !== currentRouteId && lastActive < oldestTime) {
            oldestTime = lastActive;
            oldestId = id;
          }
        }
        if (!oldestId) break;
        next.delete(oldestId);
      }

      const unchanged =
        next.size === prev.size && [...next].every(([id, t]) => prev.get(id) === t);
      return unchanged ? prev : next;
    });
  }

  // Mirror the kept tab ids into TabsContext.
  React.useEffect(() => {
    for (const id of keptTabs.keys()) {
      if (!loadedTabIds.has(id)) markTabLoaded(id);
    }
    for (const id of loadedTabIds) {
      if (!keptTabs.has(id)) unmarkTabLoaded(id);
    }
  }, [keptTabs, loadedTabIds, markTabLoaded, unmarkTabLoaded]);

  const isTabRoute = currentRoute !== null;
  // Show the activated tab as soon as it is kept, without waiting for the
  // router. A tab that is not kept yet has nothing to show until the router
  // renders it, so keep the tab the router is on visible in the meantime —
  // rendering the live router elsewhere would remount that page.
  const visibleTabId = !isTabRoute
    ? null
    : activeTabId && keptTabs.has(activeTabId)
      ? activeTabId
      : currentRouteId && keptTabs.has(currentRouteId)
        ? currentRouteId
        : null;

  return (
    <div className="relative h-full w-full min-h-0 flex-1">
      {Array.from(keptTabs.keys()).map((tabId) => {
        const isVisible = tabId === visibleTabId;
        return (
          <div
            key={tabId}
            data-tab-content-id={tabId}
            style={{ display: isVisible ? "contents" : "none" }}
            aria-hidden={!isVisible}
            inert={!isVisible}
          >
            <KeptTabScope live={tabId === currentRouteId}>{children}</KeptTabScope>
          </div>
        );
      })}

      {/* Non-tab routes (dashboard, settings, ...) and transient routes render live. */}
      {(!currentRouteId || !keptTabs.has(currentRouteId)) && (
        <div style={{ display: visibleTabId ? "none" : "contents" }}>{children}</div>
      )}
    </div>
  );
}
