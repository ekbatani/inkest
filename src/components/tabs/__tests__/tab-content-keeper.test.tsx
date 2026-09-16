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

describe("TabContentKeeper", () => {
  beforeEach(() => {
    currentPathname = "/notes/note-1";
  });

  it("renders active children in container", () => {
    currentPathname = "/notes/note-1";

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <TabContentKeeper>
          <div data-testid="editor-note-1">Editor Content 1</div>
        </TabContentKeeper>
      </TabsProvider>,
    );

    expect(html).toContain("data-testid=\"editor-note-1\"");
    expect(html).toContain("Editor Content 1");
  });

  it("renders children directly when on a non-tab route like /dashboard", () => {
    currentPathname = "/dashboard";

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <TabContentKeeper>
          <div data-testid="dashboard-view">Dashboard Content</div>
        </TabContentKeeper>
      </TabsProvider>,
    );

    expect(html).toContain("data-testid=\"dashboard-view\"");
    expect(html).toContain("Dashboard Content");
  });
});
