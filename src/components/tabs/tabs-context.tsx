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

export function TabsProvider({
  children,
  notesTree = [],
}: {
  children: React.ReactNode;
  notesTree?: NoteTreeNode[];
}) {
  const router = useRouter();
  const pathname = usePathname();

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

  // Initialize tabs from route and localStorage
  const [tabs, setTabs] = React.useState<WorkspaceTab[]>(() => {
    const routeInfo = parseRoute(pathname);
    let initialTabs: WorkspaceTab[] = [];

    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.tabs)) {
            initialTabs = parsed.tabs
              .filter(
                (t: unknown): t is WorkspaceTab =>
                  typeof t === "object" &&
                  t !== null &&
                  typeof (t as WorkspaceTab).id === "string" &&
                  typeof (t as WorkspaceTab).url === "string",
              )
              .slice(0, MAX_TABS);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    if (routeInfo) {
      const existing = initialTabs.find((t) => t.id === routeInfo.id);
      if (!existing) {
        const treeNode = findInTree(notesTree, routeInfo.id);
        const title =
          routeInfo.id === "notes-overview"
            ? "All Notes"
            : treeNode?.title ||
              (routeInfo.id === "new-note"
                ? "New Note"
                : routeInfo.id === "daily"
                  ? "Daily Note"
                  : "Untitled Note");
        const nodeType = (treeNode?.type as WorkspaceTabType) || routeInfo.type;
        initialTabs.push({
          id: routeInfo.id,
          title,
          url: routeInfo.url,
          type: nodeType,
          updatedAt: Date.now(),
        });
      }
    }

    return initialTabs;
  });

  // The active tab always mirrors the current route. Saved tabs are restored above,
  // but a stale activeTabId must never be reactivated on a non-tab route (the tab bar
  // is hidden there and the saved tab would not match the rendered page).
  const [activeTabId, setActiveTabId] = React.useState<string | null>(
    () => parseRoute(pathname)?.id ?? null,
  );

  // Adjust state during render when pathname changes (official React pattern)
  const routeInfo = parseRoute(pathname);
  const currentRouteId = routeInfo?.id ?? null;
  const [prevRouteId, setPrevRouteId] = React.useState(currentRouteId);

  if (currentRouteId !== prevRouteId) {
    setPrevRouteId(currentRouteId);
    setActiveTabId(currentRouteId);

    if (routeInfo) {
      const { id, type, url } = routeInfo;
      const treeNode = findInTree(notesTree, id);
      const title =
        id === "notes-overview"
          ? "All Notes"
          : treeNode?.title ||
            (id === "new-note"
              ? "New Note"
              : id === "daily"
                ? "Daily Note"
                : "Untitled Note");
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
        return [...prevTabs, newTab].slice(-MAX_TABS);
      });
    }
  }

  // Save tabs to localStorage whenever they change
  React.useEffect(() => {
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
  }, [tabs, activeTabId]);

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
      setTabs((prev) =>
        prev.map((t) => (t.id === detail.id ? { ...t, title: detail.title || "Untitled Note" } : t)),
      );
    };

    const handleDirtyUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; isDirty: boolean }>).detail;
      if (!detail?.id) return;
      setTabs((prev) =>
        prev.map((t) => (t.id === detail.id ? { ...t, isDirty: detail.isDirty } : t)),
      );
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
      const targetTab = tabs.find((t) => t.id === tabId);
      if (!targetTab) return;

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
      }

      setActiveTabId(tabId);

      // If target tab is already mounted and cached in memory, switch via history without triggering Next.js loading screen!
      if (typeof window !== "undefined" && loadedTabIds.has(tabId)) {
        window.history.pushState(null, "", targetTab.url);
        window.dispatchEvent(new CustomEvent("inkest:tab-switched", { detail: { tabId } }));
      } else {
        router.push(targetTab.url);
      }
    },
    [tabs, loadedTabIds, router],
  );

  const openTab = React.useCallback(
    (tab: Omit<WorkspaceTab, "updatedAt">, activate = true) => {
      setTabs((prev) => {
        const index = prev.findIndex((t) => t.id === tab.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...tab, updatedAt: Date.now() };
          return updated;
        }
        return [...prev, { ...tab, updatedAt: Date.now() }].slice(-MAX_TABS);
      });

      if (activate) {
        switchTab(tab.id);
      }
    },
    [switchTab],
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
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
          }

          if (nextTabs.length > 0) {
            const nextActiveIndex = Math.min(index, nextTabs.length - 1);
            const nextActiveTab = nextTabs[nextActiveIndex];
            setActiveTabId(nextActiveTab.id);

            if (typeof window !== "undefined" && loadedTabIds.has(nextActiveTab.id)) {
              window.history.pushState(null, "", nextActiveTab.url);
              window.dispatchEvent(
                new CustomEvent("inkest:tab-switched", { detail: { tabId: nextActiveTab.id } }),
              );
            } else {
              router.push(nextActiveTab.url);
            }
          } else {
            setActiveTabId(null);
            router.push("/notes");
          }
        }

        return nextTabs;
      });
    },
    [activeTabId, loadedTabIds, router],
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
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
          }
          setActiveTabId(targetTab.id);

          if (typeof window !== "undefined" && loadedTabIds.has(targetTab.id)) {
            window.history.pushState(null, "", targetTab.url);
          } else {
            router.push(targetTab.url);
          }
        }

        return nextTabs;
      });
    },
    [activeTabId, loadedTabIds, router],
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
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
          }
          setActiveTabId(targetTab.id);

          if (typeof window !== "undefined" && loadedTabIds.has(targetTab.id)) {
            window.history.pushState(null, "", targetTab.url);
          } else {
            router.push(targetTab.url);
          }
        }

        return nextTabs;
      });
    },
    [activeTabId, loadedTabIds, router],
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
          router.push(pinnedTabs[0].url);
        }
        return pinnedTabs;
      }

      setLoadedTabIds(new Set());

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
      }
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
      markTabLoaded,
      unmarkTabLoaded,
      openTab,
      closeTab,
      closeOtherTabs,
      closeTabsToTheRight,
      closeAllTabs,
      togglePinTab,
      reorderTabs,
      updateTabTitle,
      setTabDirty,
      switchTab,
    }),
    [
      tabs,
      activeTabId,
      activeTab,
      loadedTabIds,
      markTabLoaded,
      unmarkTabLoaded,
      openTab,
      closeTab,
      closeOtherTabs,
      closeTabsToTheRight,
      closeAllTabs,
      togglePinTab,
      reorderTabs,
      updateTabTitle,
      setTabDirty,
      switchTab,
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
