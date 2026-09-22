"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { NoteTreeNode } from "@/server/notes/service";
import type { WorkspaceTab, TabsContextValue, WorkspaceTabType } from "./tabs-types";

const TabsContext = React.createContext<TabsContextValue | null>(null);

const STORAGE_KEY = "inkest:workspace-tabs";
const MAX_TABS = 30;

function findInTree(nodes: NoteTreeNode[], targetId: string): NoteTreeNode | null {
  for (const node of nodes) {
    if (node.id === targetId || (node.documentId && node.documentId === targetId)) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findInTree(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

export function parseRoute(pathname: string): { id: string; type: WorkspaceTabType; url: string } | null {
  if (pathname === "/notes" || pathname === "/notes/") {
    return { id: "notes-overview", type: "note", url: "/notes" };
  }

  const notesMatch = /^\/notes\/([^/?#]+)/.exec(pathname);
  if (notesMatch) {
    const id = notesMatch[1];
    if (id === "new") {
      return { id: "new-note", type: "new", url: "/notes/new" };
    }
    return { id, type: "note", url: `/notes/${id}` };
  }

  const projectsMatch = /^\/projects\/([^/?#]+)/.exec(pathname);
  if (projectsMatch) {
    const id = projectsMatch[1];
    return { id, type: "project", url: `/projects/${id}` };
  }

  const readerMatch = /^\/reader\/([^/?#]+)/.exec(pathname);
  if (readerMatch) {
    const id = readerMatch[1];
    return { id, type: "document", url: `/reader/${id}` };
  }

  if (pathname === "/daily") {
    return { id: "daily", type: "daily", url: "/daily" };
  }

  return null;
}

/**
 * /notes/new is a redirect-through page: it mounts, creates a note in a
 * one-shot effect, and router.replace()s away. Its spinner output must never
 * become a workspace tab or be cached — the create effect cannot re-run on a
 * revived cached instance, which stranded users on an eternal spinner.
 */
export function isTransientRouteId(routeId: string): boolean {
  return routeId === "new-note";
}

/**
 * Preview-tab integration for a newly visited note/project route: when the
 * active tab is transient (not stable, not pinned), the new route takes over
 * its slot in the strip instead of accumulating another tab. The caller
 * handles the case where the route already has a tab (activate/update).
 */
export function integrateRouteTab(
  prevTabs: WorkspaceTab[],
  activeTabId: string | null,
  newTab: WorkspaceTab,
): WorkspaceTab[] {
  const activeIndex = prevTabs.findIndex((t) => t.id === activeTabId);
  if (
    activeIndex >= 0 &&
    !prevTabs[activeIndex].stable &&
    !prevTabs[activeIndex].pinned
  ) {
    const updated = [...prevTabs];
    // Fresh transient tab in the same strip position; never inherit the
    // replaced tab's stable/pinned flags.
    updated[activeIndex] = newTab;
    return updated;
  }

  return [...prevTabs, newTab].slice(-MAX_TABS);
}

function dispatchSafeCustomEvent(type: string, detail?: unknown) {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function" &&
    typeof CustomEvent === "function"
  ) {
    window.dispatchEvent(
      detail !== undefined ? new CustomEvent(type, { detail }) : new CustomEvent(type),
    );
  }
}

export function TabsProvider({
  children,
  notesTree = [],
}: {
  children: React.ReactNode;
  notesTree?: NoteTreeNode[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Bumped on every cached-tab fast-path switch (raw history.pushState). See
  // TabsContextValue.fastPathSeq for why TabContentKeeper needs this.
  const [fastPathSeq, setFastPathSeq] = React.useState(0);

  // Track which tab contents are currently mounted and cached in client memory
  const [loadedTabIds, setLoadedTabIds] = React.useState<Set<string>>(() => new Set());

  const markTabLoaded = React.useCallback((tabId: string) => {
    setLoadedTabIds((prev) => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  }, []);

  const unmarkTabLoaded = React.useCallback((tabId: string) => {
    setLoadedTabIds((prev) => {
      if (!prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  // Initialize tabs from the current route only. Saved tabs are restored in an
  // effect after hydration: reading localStorage here would render a different
  // tree on the client than on the server and force React to discard the
  // server-rendered HTML on every page load.
  const [tabs, setTabs] = React.useState<WorkspaceTab[]>(() => {
    const routeInfo = parseRoute(pathname);
    if (!routeInfo || isTransientRouteId(routeInfo.id)) {
      return [];
    }

    const treeNode = findInTree(notesTree, routeInfo.id);
    const title =
      routeInfo.id === "notes-overview"
        ? "All Notes"
        : treeNode?.title ||
          (routeInfo.id === "daily" ? "Daily Note" : "Untitled Note");
    const nodeType = (treeNode?.type as WorkspaceTabType) || routeInfo.type;

    return [
      {
        id: routeInfo.id,
        title,
        url: routeInfo.url,
        type: nodeType,
        updatedAt: Date.now(),
      },
    ];
  });

  // The active tab always mirrors the current route. Saved tabs are restored above,
  // but a stale activeTabId must never be reactivated on a non-tab route (the tab bar
  // is hidden there and the saved tab would not match the rendered page).
  const [activeTabId, setActiveTabId] = React.useState<string | null>(
    () => parseRoute(pathname)?.id ?? null,
  );

  // Adjust state during render when pathname changes (official React pattern)
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  const routeInfo = parseRoute(pathname);
  const currentRouteId = routeInfo?.id ?? null;

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setActiveTabId(currentRouteId);

    if (routeInfo && !isTransientRouteId(routeInfo.id)) {
      const { id, type, url } = routeInfo;
      const treeNode = findInTree(notesTree, id);
      const title =
        id === "notes-overview"
          ? "All Notes"
          : treeNode?.title || (id === "daily" ? "Daily Note" : "Untitled Note");
      const nodeType = (treeNode?.type as WorkspaceTabType) || type;

      setTabs((prevTabs) => {
        const existingIndex = prevTabs.findIndex((t) => t.id === id);
        if (existingIndex >= 0) {
          const existing = prevTabs[existingIndex];
          if (existing.url === url && (existing.title === title || treeNode === null)) {
            return prevTabs;
          }
          const updated = [...prevTabs];
          updated[existingIndex] = {
            ...existing,
            url,
            title: treeNode ? treeNode.title : existing.title,
            type: nodeType,
            updatedAt: Date.now(),
          };
          return updated;
        }

        const newTab: WorkspaceTab = {
          id,
          title,
          url,
          type: nodeType,
          updatedAt: Date.now(),
        };

        return integrateRouteTab(prevTabs, activeTabId, newTab);
      });
    }

    // Leaving /notes/new (or arriving with a stale saved one): drop its
    // transient tab — it only ever showed a one-shot redirect spinner.
    setTabs((prevTabs) =>
      prevTabs.some((t) => isTransientRouteId(t.id))
        ? prevTabs.filter((t) => !isTransientRouteId(t.id))
        : prevTabs,
    );
  }

  // Restore saved tabs after hydration. Restoring during the initial render
  // would mismatch the server markup (which renders only the current route's
  // tab) and force a full client re-render.
  const [restored, setRestored] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        const savedTabs: WorkspaceTab[] =
          Array.isArray((parsed as { tabs?: unknown })?.tabs)
            ? ((parsed as { tabs: unknown[] }).tabs
                .filter(
                  (t: unknown): t is WorkspaceTab =>
                    typeof t === "object" &&
                    t !== null &&
                    typeof (t as WorkspaceTab).id === "string" &&
                    typeof (t as WorkspaceTab).url === "string" &&
                    !isTransientRouteId((t as WorkspaceTab).id),
                )
                .slice(0, MAX_TABS) as WorkspaceTab[])
            : [];

        if (savedTabs.length > 0) {
          // Syncing persisted external state (localStorage) into React state
          // on mount is the documented exception to deriving state during
          // render — reading storage in the initializer would mismatch SSR.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTabs((prev) => {
            if (prev.length > 1) return prev;
            if (prev.length === 0) return savedTabs;
            const current = prev[0];
            const savedIds = new Set(savedTabs.map((t) => t.id));
            if (savedIds.has(current.id)) {
              // Keep the saved session's tab order; refresh the current tab's
              // url/type in case the route carries fresher data.
              return savedTabs.map((t) =>
                t.id === current.id ? { ...t, url: current.url, type: t.type ?? current.type } : t,
              );
            }
            return [...savedTabs, current];
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
    setRestored(true);
  }, []);

  // Save tabs to localStorage whenever they change — but never before the
  // saved state has been restored, or the initial single-tab state would
  // clobber the previous session's tabs.
  React.useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tabs,
          activeTabId,
        }),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [tabs, activeTabId, restored]);

  // Listen to popstate (browser back/forward navigation)
  React.useEffect(() => {
    const handlePopState = () => {
      const rInfo = parseRoute(window.location.pathname);
      if (rInfo) {
        setActiveTabId(rInfo.id);
      } else {
        setActiveTabId(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Listen to custom events for real-time title & dirty state updates
  React.useEffect(() => {
    const handleTitleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; title: string }>).detail;
      if (!detail?.id) return;
      const nextTitle = detail.title || "Untitled Note";
      setTabs((prev) => {
        if (!prev.some((t) => t.id === detail.id && t.title !== nextTitle)) return prev;
        return prev.map((t) => (t.id === detail.id ? { ...t, title: nextTitle } : t));
      });
    };

    const handleDirtyUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; isDirty: boolean }>).detail;
      if (!detail?.id) return;
      setTabs((prev) => {
        if (!prev.some((t) => t.id === detail.id && t.isDirty !== detail.isDirty)) return prev;
        return prev.map((t) => (t.id === detail.id ? { ...t, isDirty: detail.isDirty } : t));
      });
    };

    window.addEventListener("inkest:tab-title-update", handleTitleUpdate);
    window.addEventListener("inkest:tab-dirty-update", handleDirtyUpdate);

    return () => {
      window.removeEventListener("inkest:tab-title-update", handleTitleUpdate);
      window.removeEventListener("inkest:tab-dirty-update", handleDirtyUpdate);
    };
  }, []);

  const switchTab = React.useCallback(
    (tabId: string) => {
      // Re-clicking the active tab (e.g. ahead of a double-click to stabilize
      // it) must not push duplicate history entries.
      if (tabId === activeTabId) return;

      const targetTab = tabs.find((t) => t.id === tabId);
      if (!targetTab) return;

      dispatchSafeCustomEvent("inkest:flush-active-save");

      setActiveTabId(tabId);
      setFastPathSeq((s) => s + 1);
      router.push(targetTab.url);
      dispatchSafeCustomEvent("inkest:tab-switched", { tabId });
    },
    [tabs, activeTabId, router],
  );

  const openTab = React.useCallback(
    (
      tab: Omit<WorkspaceTab, "updatedAt">,
      activate = true,
      options?: { forceNewTab?: boolean },
    ) => {
      const fullTab: WorkspaceTab = { ...tab, updatedAt: Date.now() };

      setTabs((prev) => {
        const index = prev.findIndex((t) => t.id === tab.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...fullTab };
          return updated;
        }
        if (options?.forceNewTab || fullTab.stable) {
          return [...prev, fullTab].slice(-MAX_TABS);
        }
        return integrateRouteTab(prev, activeTabId, fullTab);
      });

      if (activate) {
        dispatchSafeCustomEvent("inkest:flush-active-save");
        setActiveTabId(tab.id);
        setFastPathSeq((s) => s + 1);
        router.push(tab.url);
        dispatchSafeCustomEvent("inkest:tab-switched", { tabId: tab.id });
      }
    },
    [activeTabId, router],
  );

  const closeTab = React.useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => {
        const index = prevTabs.findIndex((t) => t.id === tabId);
        if (index < 0) return prevTabs;

        const nextTabs = prevTabs.filter((t) => t.id !== tabId);

        // Evict from loaded memory set
        setLoadedTabIds((prev) => {
          if (!prev.has(tabId)) return prev;
          const next = new Set(prev);
          next.delete(tabId);
          return next;
        });

        // If closing the currently active tab, pick an adjacent active tab
        if (activeTabId === tabId) {
          dispatchSafeCustomEvent("inkest:flush-active-save");

          if (nextTabs.length > 0) {
            const nextActiveIndex = Math.min(index, nextTabs.length - 1);
            const nextActiveTab = nextTabs[nextActiveIndex];
            setActiveTabId(nextActiveTab.id);
            setFastPathSeq((s) => s + 1);
            router.push(nextActiveTab.url);
            dispatchSafeCustomEvent("inkest:tab-switched", { tabId: nextActiveTab.id });
          } else {
            setActiveTabId(null);
            router.push("/notes");
          }
        }

        return nextTabs;
      });
    },
    [activeTabId, router],
  );

  const closeOtherTabs = React.useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => {
        const targetTab = prevTabs.find((t) => t.id === tabId);
        if (!targetTab) return prevTabs;

        const nextTabs = prevTabs.filter((t) => t.id === tabId || t.pinned);
        const keptIds = new Set(nextTabs.map((t) => t.id));

        setLoadedTabIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            if (keptIds.has(id)) next.add(id);
          }
          return next;
        });

        if (activeTabId !== tabId && !nextTabs.some((t) => t.id === activeTabId)) {
          dispatchSafeCustomEvent("inkest:flush-active-save");
          setActiveTabId(targetTab.id);
          setFastPathSeq((s) => s + 1);
          router.push(targetTab.url);
        }

        return nextTabs;
      });
    },
    [activeTabId, router],
  );

  const closeTabsToTheRight = React.useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => {
        const index = prevTabs.findIndex((t) => t.id === tabId);
        if (index < 0) return prevTabs;

        const nextTabs = prevTabs.filter(
          (t, i) => i <= index || Boolean(t.pinned),
        );
        const keptIds = new Set(nextTabs.map((t) => t.id));

        setLoadedTabIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            if (keptIds.has(id)) next.add(id);
          }
          return next;
        });

        if (activeTabId && !nextTabs.some((t) => t.id === activeTabId)) {
          const targetTab = prevTabs[index];
          dispatchSafeCustomEvent("inkest:flush-active-save");
          setActiveTabId(targetTab.id);
          setFastPathSeq((s) => s + 1);
          router.push(targetTab.url);
        }

        return nextTabs;
      });
    },
    [activeTabId, router],
  );

  const closeAllTabs = React.useCallback(() => {
    setTabs((prevTabs) => {
      const pinnedTabs = prevTabs.filter((t) => t.pinned);
      if (pinnedTabs.length > 0) {
        const keptIds = new Set(pinnedTabs.map((t) => t.id));
        setLoadedTabIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            if (keptIds.has(id)) next.add(id);
          }
          return next;
        });

        if (!pinnedTabs.some((t) => t.id === activeTabId)) {
          setActiveTabId(pinnedTabs[0].id);
          setFastPathSeq((s) => s + 1);
          router.push(pinnedTabs[0].url);
        }
        return pinnedTabs;
      }

      setLoadedTabIds(new Set());

      dispatchSafeCustomEvent("inkest:flush-active-save");
      setActiveTabId(null);
      router.push("/notes");
      return [];
    });
  }, [activeTabId, router]);

  const togglePinTab = React.useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const index = prevTabs.findIndex((t) => t.id === tabId);
      if (index < 0) return prevTabs;

      const tab = prevTabs[index];
      const isPinned = !tab.pinned;
      const updatedTab = { ...tab, pinned: isPinned };

      const otherTabs = prevTabs.filter((t) => t.id !== tabId);

      if (isPinned) {
        const pinnedCount = otherTabs.filter((t) => t.pinned).length;
        otherTabs.splice(pinnedCount, 0, updatedTab);
        return otherTabs;
      } else {
        const pinnedCount = otherTabs.filter((t) => t.pinned).length;
        otherTabs.splice(pinnedCount, 0, updatedTab);
        return otherTabs;
      }
    });
  }, []);

  // Double-clicking a tab toggles its stability: stable tabs are never
  // replaced by tree navigation. Pinned tabs are already protected, so the
  // toggle is redundant for them but harmless.
  const toggleTabStable = React.useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const index = prevTabs.findIndex((t) => t.id === tabId);
      if (index < 0) return prevTabs;

      const tab = prevTabs[index];
      const updatedTab = { ...tab, stable: !tab.stable };
      const otherTabs = prevTabs.filter((t) => t.id !== tabId);
      otherTabs.splice(index, 0, updatedTab);
      return otherTabs;
    });
  }, []);

  const reorderTabs = React.useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      setTabs((prevTabs) => {
        if (
          sourceIndex < 0 ||
          sourceIndex >= prevTabs.length ||
          destinationIndex < 0 ||
          destinationIndex >= prevTabs.length ||
          sourceIndex === destinationIndex
        ) {
          return prevTabs;
        }

        const nextTabs = [...prevTabs];
        const [removed] = nextTabs.splice(sourceIndex, 1);
        nextTabs.splice(destinationIndex, 0, removed);
        return nextTabs;
      });
    },
    [],
  );

  const updateTabTitle = React.useCallback((tabId: string, title: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: title || "Untitled Note" } : t)),
    );
  }, []);

  const setTabDirty = React.useCallback((tabId: string, isDirty: boolean) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isDirty } : t)),
    );
  }, []);

  // Keyboard navigation shortcuts
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const key = e.key.toLowerCase();

      // Alt + W: Close active tab
      if (key === "w") {
        if (activeTabId) {
          e.preventDefault();
          closeTab(activeTabId);
        }
      }
      // Alt + [: Switch to previous tab
      else if (key === "[") {
        if (tabs.length > 1 && activeTabId) {
          e.preventDefault();
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const prevIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
          switchTab(tabs[prevIndex].id);
        }
      }
      // Alt + ]: Switch to next tab
      else if (key === "]") {
        if (tabs.length > 1 && activeTabId) {
          e.preventDefault();
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1;
          switchTab(tabs[nextIndex].id);
        }
      }
      // Alt + T: Open new tab (browses /notes)
      else if (key === "t") {
        e.preventDefault();
        openTab({
          id: "notes-overview",
          title: "All Notes",
          url: "/notes",
          type: "note",
        });
      }
      // Alt + 1 ... 9: Jump to specific tab
      else if (/^[1-9]$/.test(key)) {
        const targetIndex = Number.parseInt(key, 10) - 1;
        if (targetIndex < tabs.length) {
          e.preventDefault();
          switchTab(tabs[targetIndex].id);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tabs, activeTabId, closeTab, switchTab, openTab]);

  const clearActiveTab = React.useCallback(() => {
    setActiveTabId(null);
  }, []);

  const activeTab = React.useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const value = React.useMemo(
    () => ({
      tabs,
      activeTabId,
      activeTab,
      loadedTabIds,
      fastPathSeq,
      markTabLoaded,
      unmarkTabLoaded,
      openTab,
      closeTab,
      closeOtherTabs,
      closeTabsToTheRight,
      closeAllTabs,
      togglePinTab,
      toggleTabStable,
      reorderTabs,
      updateTabTitle,
      setTabDirty,
      switchTab,
      clearActiveTab,
    }),
    [
      tabs,
      activeTabId,
      activeTab,
      loadedTabIds,
      fastPathSeq,
      markTabLoaded,
      unmarkTabLoaded,
      openTab,
      closeTab,
      closeOtherTabs,
      closeTabsToTheRight,
      closeAllTabs,
      togglePinTab,
      toggleTabStable,
      reorderTabs,
      updateTabTitle,
      setTabDirty,
      switchTab,
      clearActiveTab,
    ],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useWorkspaceTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("useWorkspaceTabs must be used within a TabsProvider");
  }
  return context;
}

export function useOptionalWorkspaceTabs(): TabsContextValue | null {
  return React.useContext(TabsContext);
}
