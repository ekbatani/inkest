export type WorkspaceTabType = "note" | "daily" | "project" | "document" | "new";

export interface WorkspaceTab {
  id: string;
  title: string;
  url: string;
  type?: WorkspaceTabType;
  pinned?: boolean;
  isDirty?: boolean;
  updatedAt?: number;
}

export interface TabsContextValue {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  activeTab: WorkspaceTab | null;
  loadedTabIds: Set<string>;
  markTabLoaded: (tabId: string) => void;
  unmarkTabLoaded: (tabId: string) => void;
  openTab: (tab: Omit<WorkspaceTab, "updatedAt">, activate?: boolean) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToTheRight: (tabId: string) => void;
  closeAllTabs: () => void;
  togglePinTab: (tabId: string) => void;
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;
  switchTab: (tabId: string) => void;
}
