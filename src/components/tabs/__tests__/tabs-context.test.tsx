import { describe, it, expect, mock, beforeEach } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import type { NoteTreeNode } from "@/server/notes/service";

let currentPathname = "/notes/note-1";
const pushedUrls: string[] = [];

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: (url: string) => {
      pushedUrls.push(url);
    },
    replace: () => {},
    prefetch: () => {},
    back: () => {},
    refresh: () => {},
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(),
}));

import { TabsProvider, useWorkspaceTabs, parseRoute } from "../tabs-context";
import type { TabsContextValue } from "../tabs-types";

const mockTree: NoteTreeNode[] = [
  {
    id: "note-1",
    title: "First Note",
    slug: "first-note",
    type: "note",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [],
  },
  {
    id: "note-2",
    title: "Second Note",
    slug: "second-note",
    type: "note",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [],
  },
  {
    id: "proj-1",
    title: "Project Alpha",
    slug: "project-alpha",
    type: "project",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [],
  },
];

function TestConsumer({
  onContext,
}: {
  onContext: (ctx: TabsContextValue) => void;
}) {
  const ctx = useWorkspaceTabs();
  onContext(ctx);
  return <div data-testid="tabs-count">{ctx.tabs.length}</div>;
}

describe("TabsProvider & useWorkspaceTabs", () => {
  beforeEach(() => {
    pushedUrls.length = 0;
    currentPathname = "/notes/note-1";
  });

  it("throws when useWorkspaceTabs is used outside TabsProvider", () => {
    let threw = false;
    try {
      renderToString(<TestConsumer onContext={() => {}} />);
    } catch (e: unknown) {
      threw = true;
      expect((e as Error).message).toContain("useWorkspaceTabs must be used within a TabsProvider");
    }
    expect(threw).toBe(true);
  });

  it("initializes active tab from current route and resolves title from notesTree", () => {
    let contextValue: TabsContextValue | null = null;
    currentPathname = "/notes/note-1";

    renderToString(
      <TabsProvider notesTree={mockTree}>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </TabsProvider>,
    );

    expect(contextValue).not.toBeNull();
    const ctx = contextValue!;
    expect(ctx.activeTabId).toBe("note-1");
    expect(ctx.tabs.length).toBe(1);
    expect(ctx.tabs[0].id).toBe("note-1");
    expect(ctx.tabs[0].title).toBe("First Note");
    expect(ctx.tabs[0].type).toBe("note");
  });

  it("handles project and daily routes properly", () => {
    let contextValue: TabsContextValue | null = null;
    currentPathname = "/projects/proj-1";

    renderToString(
      <TabsProvider notesTree={mockTree}>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </TabsProvider>,
    );

    const ctx = contextValue!;
    expect(ctx.activeTabId).toBe("proj-1");
    expect(ctx.tabs[0].type).toBe("project");
    expect(ctx.tabs[0].title).toBe("Project Alpha");
  });

  it("sets activeTabId to null on non-tab routes like /dashboard", () => {
    let contextValue: TabsContextValue | null = null;
    currentPathname = "/dashboard";

    renderToString(
      <TabsProvider notesTree={mockTree}>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </TabsProvider>,
    );

    const ctx = contextValue!;
    expect(ctx.activeTabId).toBeNull();
    expect(ctx.tabs.length).toBe(0);
  });

  it("does not restore a stale activeTabId from storage on non-tab routes", () => {
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

    const globalWithWindow = globalThis as unknown as { window?: FakeWindow };
    const hadWindow = "window" in globalWithWindow;
    const originalWindow = globalWithWindow.window;
    const store = new Map<string, string>([
      [
        "inkest:workspace-tabs",
        JSON.stringify({
          tabs: [{ id: "note-1", title: "First Note", url: "/notes/note-1", type: "note" }],
          activeTabId: "note-1",
        }),
      ],
    ]);
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

    let contextValue: TabsContextValue | null = null;
    currentPathname = "/vault";

    try {
      renderToString(
        <TabsProvider notesTree={mockTree}>
          <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
        </TabsProvider>,
      );

      const ctx = contextValue!;
      // No tab is active off the tabbed area, even though storage holds one...
      expect(ctx.activeTabId).toBeNull();
      // ...but the tab session itself is restored for returning to /notes.
      expect(ctx.tabs.length).toBe(1);
      expect(ctx.tabs[0].id).toBe("note-1");
      expect(ctx.tabs[0].title).toBe("First Note");
    } finally {
      if (hadWindow) {
        globalWithWindow.window = originalWindow;
      } else {
        delete globalWithWindow.window;
      }
    }
  });

  it("handles /notes route as All Notes tab", () => {
    let contextValue: TabsContextValue | null = null;
    currentPathname = "/notes";

    renderToString(
      <TabsProvider notesTree={mockTree}>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </TabsProvider>,
    );

    const ctx = contextValue!;
    expect(ctx.activeTabId).toBe("notes-overview");
    expect(ctx.tabs.length).toBe(1);
    expect(ctx.tabs[0].id).toBe("notes-overview");
    expect(ctx.tabs[0].title).toBe("All Notes");
    expect(ctx.tabs[0].url).toBe("/notes");
  });

  it("supports markTabLoaded and unmarkTabLoaded", () => {
    currentPathname = "/notes/note-1";

    function TabLoadTester() {
      const ctx = useWorkspaceTabs();
      const [step, setStep] = React.useState(0);

      if (step === 0) {
        ctx.markTabLoaded("tab-alpha");
        setStep(1);
      } else if (step === 1) {
        ctx.unmarkTabLoaded("tab-alpha");
        setStep(2);
      }

      return <div data-testid="loaded-count">{ctx.loadedTabIds.size}</div>;
    }

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <TabLoadTester />
      </TabsProvider>,
    );

    expect(html).toContain("data-testid=\"loaded-count\">0</div>");
  });

  it("parseRoute parses all supported workspace route formats", () => {
    expect(parseRoute("/notes")).toEqual({ id: "notes-overview", type: "note", url: "/notes" });
    expect(parseRoute("/notes/")).toEqual({ id: "notes-overview", type: "note", url: "/notes" });
    expect(parseRoute("/notes/new")).toEqual({ id: "new-note", type: "new", url: "/notes/new" });
    expect(parseRoute("/notes/abc-123")).toEqual({ id: "abc-123", type: "note", url: "/notes/abc-123" });
    expect(parseRoute("/projects/proj-456")).toEqual({ id: "proj-456", type: "project", url: "/projects/proj-456" });
    expect(parseRoute("/reader/doc-789")).toEqual({ id: "doc-789", type: "document", url: "/reader/doc-789" });
    expect(parseRoute("/daily")).toEqual({ id: "daily", type: "daily", url: "/daily" });
    expect(parseRoute("/dashboard")).toBeNull();
    expect(parseRoute("/settings")).toBeNull();
    expect(parseRoute("/calendar")).toBeNull();
  });
});
