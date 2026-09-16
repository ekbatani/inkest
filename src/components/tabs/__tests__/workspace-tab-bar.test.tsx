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
        onReorder={() => {}}
      />,
    );

    expect(html).toContain("rtl-vazir");
    expect(html).toContain("یادداشت‌های روزانه");
  });
});
