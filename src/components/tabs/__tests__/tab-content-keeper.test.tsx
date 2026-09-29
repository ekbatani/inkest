import { describe, it, expect, mock, beforeEach } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
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
import { TabContentKeeper } from "../tab-content-keeper";

const mockTree: NoteTreeNode[] = [
  {
    id: "note-1",
    title: "Note One",
    slug: "note-one",
    type: "note",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [],
  },
  {
    id: "note-2",
    title: "Note Two",
    slug: "note-two",
    type: "note",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [],
  },
];

type RouterContextValue = NonNullable<React.ContextType<typeof LayoutRouterContext>>;

/**
 * Stands in for the Next.js router: a layout's `children` is one router
 * element that renders whatever route the LayoutRouterContext points at.
 */
function FakeRouterChildren() {
  const ctx = React.use(LayoutRouterContext);
  return <div data-testid="route">{`route:${ctx?.url ?? "none"}`}</div>;
}

function routerContext(url: string): RouterContextValue {
  return { url } as unknown as RouterContextValue;
}

function renderAt(pathname: string, maxCachedTabs?: number) {
  currentPathname = pathname;
  return renderToString(
    <LayoutRouterContext.Provider value={routerContext(pathname)}>
      <TabsProvider notesTree={mockTree}>
        <TabContentKeeper maxCachedTabs={maxCachedTabs}>
          <FakeRouterChildren />
        </TabContentKeeper>
      </TabsProvider>
    </LayoutRouterContext.Provider>,
  );
}

describe("TabContentKeeper", () => {
  beforeEach(() => {
    currentPathname = "/notes/note-1";
  });

  it("renders the current tab route in its own visible kept slot", () => {
    const html = renderAt("/notes/note-1");

    expect(html).toContain('data-tab-content-id="note-1"');
    expect(html).toContain('style="display:contents"');
    expect(html).toContain("route:/notes/note-1");
  });

  it("renders the live router children for the current tab", () => {
    currentPathname = "/notes/note-1";

    const html = renderToString(
      <LayoutRouterContext.Provider value={routerContext("/notes/note-1")}>
        <TabsProvider notesTree={mockTree}>
          <TabContentKeeper>
            <div data-testid="editor-note-1">Editor Content 1</div>
          </TabContentKeeper>
        </TabsProvider>
      </LayoutRouterContext.Provider>,
    );

    expect(html).toContain('data-testid="editor-note-1"');
    expect(html).toContain("Editor Content 1");
  });

  it("renders children without a router context (outside the App Router)", () => {
    currentPathname = "/notes/note-1";

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <TabContentKeeper>
          <FakeRouterChildren />
        </TabContentKeeper>
      </TabsProvider>,
    );

    expect(html).toContain("route:none");
  });

  it("renders non-tab routes like /dashboard live, outside any kept slot", () => {
    const html = renderAt("/dashboard");

    expect(html).not.toContain("data-tab-content-id");
    expect(html).toContain("route:/dashboard");
  });

  it("never keeps /notes/new (transient redirect route)", () => {
    const html = renderAt("/notes/new");

    // /notes/new creates a note and redirects away; its one-shot spinner must
    // never become kept tab content (the create effect cannot re-run).
    expect(html).not.toContain("data-tab-content-id");
    expect(html).toContain("route:/notes/new");
  });

  it("never evicts the tab being shown, even with a zero budget", () => {
    const html = renderAt("/notes/note-2", 0);

    expect(html).toContain('data-tab-content-id="note-2"');
    expect(html).toContain("route:/notes/note-2");
  });

  it("renders the route exactly once for the current tab", () => {
    const html = renderAt("/notes/note-1");

    expect(html.match(/data-testid="route"/g)?.length).toBe(1);
  });
});
