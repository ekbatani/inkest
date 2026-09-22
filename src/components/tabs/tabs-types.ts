export type WorkspaceTabType = "note" | "daily" | "project" | "document" | "new";

export interface WorkspaceTab {
  id: string;
  title: string;
  url: string;
  type?: WorkspaceTabType;
  pinned?: boolean;
  /**
   * A stable tab keeps its note: navigating to another note/project from the
   * tree opens a new tab instead of replacing this one. Tabs are transient
   * (preview) until double-clicked. Pinned tabs are implicitly stable.
   */
  stable?: boolean;
  isDirty?: boolean;
  updatedAt?: number;
}

export interface TabsContextValue {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  activeTab: WorkspaceTab | null;
  loadedTabIds: Set<string>;
  /**
   * Incremented on every cached-tab fast-path switch (raw history.pushState).
   * TabContentKeeper compares it against the value seen when the last children
   * payload was attributed: a change in between means the in-flight payload no
   * longer belongs to the route the URL now shows, so it must not be cached.
   */
  fastPathSeq: number;
  markTabLoaded: (tabId: string) => void;
  unmarkTabLoaded: (tabId: string) => void;
  openTab: (
    tab: Omit<WorkspaceTab, "updatedAt">,
    activate?: boolean,
    options?: { forceNewTab?: boolean },
  ) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToTheRight: (tabId: string) => void;
  closeAllTabs: () => void;
  togglePinTab: (tabId: string) => void;
  toggleTabStable: (tabId: string) => void;
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;
  switchTab: (tabId: string) => void;
  clearActiveTab: () => void;
}
