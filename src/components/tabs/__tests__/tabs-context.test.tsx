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

import { TabsProvider, useWorkspaceTabs } from "../tabs-context";
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
});
