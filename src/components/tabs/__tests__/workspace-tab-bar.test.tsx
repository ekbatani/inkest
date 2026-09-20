import { describe, it, expect, mock, beforeEach } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import type { NoteTreeNode } from "@/server/notes/service";

let currentPathname = "/notes/note-1";

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
    refresh: () => {},
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(),
}));

import { TabsProvider } from "../tabs-context";
import { WorkspaceTabBar } from "../workspace-tab-bar";
import { WorkspaceTabItem } from "../workspace-tab";

const mockTree: NoteTreeNode[] = [
  {
    id: "note-1",
    title: "Meeting Notes",
    slug: "meeting-notes",
    type: "note",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [],
  },
  {
    id: "note-2",
    title: "Product Roadmap",
    slug: "product-roadmap",
    type: "note",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [],
  },
];

// Install a minimal window stub so TabsProvider's localStorage restore path runs
// during server rendering. Returns a cleanup function.
interface FakeWindow {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
  addEventListener: () => void;
  removeEventListener: () => void;
  dispatchEvent: () => boolean;
  history: { pushState: () => void };
}

function installFakeWindow(seed: Record<string, string> = {}): () => void {
  const store = new Map(Object.entries(seed));
  const globalWithWindow = globalThis as unknown as { window?: FakeWindow };
  const hadWindow = "window" in globalWithWindow;
  const originalWindow = globalWithWindow.window;

  globalWithWindow.window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    history: { pushState: () => {} },
  };

  return () => {
    if (hadWindow) {
      globalWithWindow.window = originalWindow;
    } else {
      delete globalWithWindow.window;
    }
  };
}

describe("WorkspaceTabBar component", () => {
  beforeEach(() => {
    currentPathname = "/notes/note-1";
  });

  it("renders tabs when visiting a note route", () => {
    currentPathname = "/notes/note-1";

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <WorkspaceTabBar />
      </TabsProvider>,
    );

    expect(html).toContain('aria-label="Workspace tabs"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Meeting Notes");
    expect(html).toContain('aria-label="Open new note in tab"');
    expect(html).toContain('aria-label="List open tabs"');
  });

  it("returns null when on non-note page with no tabs", () => {
    currentPathname = "/dashboard";

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <WorkspaceTabBar />
      </TabsProvider>,
    );

    expect(html).toBe("");
  });

  it("hides the tab bar on non-tab sections even when tabs are open", () => {
    const cleanup = installFakeWindow({
      "inkest:workspace-tabs": JSON.stringify({
        tabs: [{ id: "note-1", title: "Meeting Notes", url: "/notes/note-1", type: "note" }],
        activeTabId: "note-1",
      }),
    });
    currentPathname = "/planner";

    try {
      const html = renderToString(
        <TabsProvider notesTree={mockTree}>
          <WorkspaceTabBar />
        </TabsProvider>,
      );

      expect(html).toBe("");
    } finally {
      cleanup();
    }
  });

  it("restores open tabs from storage when on a tab route", () => {
    const cleanup = installFakeWindow({
      "inkest:workspace-tabs": JSON.stringify({
        tabs: [{ id: "note-1", title: "Meeting Notes", url: "/notes/note-1", type: "note" }],
        activeTabId: "note-1",
      }),
    });
    currentPathname = "/notes/note-1";

    try {
      const html = renderToString(
        <TabsProvider notesTree={mockTree}>
          <WorkspaceTabBar />
        </TabsProvider>,
      );

      expect(html).toContain('aria-label="Workspace tabs"');
      expect(html).toContain("Meeting Notes");
      expect(html).toContain('aria-selected="true"');
    } finally {
      cleanup();
    }
  });

  it("renders WorkspaceTabItem with dirty indicator when isDirty is true", () => {
    const html = renderToString(
      <WorkspaceTabItem
        tab={{
          id: "note-dirty",
          title: "Unsaved Draft",
          url: "/notes/note-dirty",
          isDirty: true,
        }}
        isActive={true}
        index={0}
        onSelect={() => {}}
        onClose={() => {}}
        onTogglePin={() => {}}
        onToggleStable={() => {}}
        onReorder={() => {}}
      />,
    );

    expect(html).toContain('title="Unsaved changes"');
    expect(html).toContain('aria-label="Unsaved changes"');
    expect(html).toContain("Unsaved Draft");
  });

  it("renders WorkspaceTabItem with pin indicator when pinned is true", () => {
    const html = renderToString(
      <WorkspaceTabItem
        tab={{
          id: "note-pinned",
          title: "Pinned Notes",
          url: "/notes/note-pinned",
          pinned: true,
        }}
        isActive={false}
        index={0}
        onSelect={() => {}}
        onClose={() => {}}
        onTogglePin={() => {}}
        onToggleStable={() => {}}
        onReorder={() => {}}
      />,
    );

    expect(html).toContain("Pinned Notes");
    // Pinned tabs should omit close button to prevent accidental closing
    expect(html).not.toContain('aria-label="Close Pinned Notes"');
  });

  it("applies RTL class when title contains Persian or Arabic characters", () => {
    const html = renderToString(
      <WorkspaceTabItem
        tab={{
          id: "note-rtl",
          title: "یادداشت‌های روزانه",
          url: "/notes/note-rtl",
        }}
        isActive={true}
        index={0}
        onSelect={() => {}}
        onClose={() => {}}
        onTogglePin={() => {}}
        onToggleStable={() => {}}
        onReorder={() => {}}
      />,
    );

    expect(html).toContain("rtl-vazir");
    expect(html).toContain("یادداشت‌های روزانه");
  });
});
