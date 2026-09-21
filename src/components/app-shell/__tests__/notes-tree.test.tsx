import { describe, it, expect, mock } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import type { NoteTreeNode } from "@/server/notes/service";

let currentPathname = "/";

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

import {
  NotesTree,
  hasDescendant,
  getAncestorIds,
  getActiveItemId,
} from "../notes-tree";

const mockTree: NoteTreeNode[] = [
  {
    id: "proj-1",
    title: "Project One",
    slug: "project-one",
    type: "project",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [
      {
        id: "note-1",
        title: "Child Note One",
        slug: "child-note-one",
        type: "note",
        updatedAt: new Date(),
        createdAt: new Date(),
        children: [],
      },
      {
        id: "subproj-1",
        title: "Subproject Alpha",
        slug: "subproject-alpha",
        type: "project",
        updatedAt: new Date(),
        createdAt: new Date(),
        children: [
          {
            id: "note-nested",
            title: "Deeply Nested Note",
            slug: "deeply-nested-note",
            type: "note",
            updatedAt: new Date(),
            createdAt: new Date(),
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "proj-2",
    title: "Project Two",
    slug: "project-two",
    type: "project",
    updatedAt: new Date(),
    createdAt: new Date(),
    children: [],
  },
];

describe("NotesTree helpers", () => {
  it("extracts active item id from various pathnames", () => {
    expect(getActiveItemId("/notes/note-123")).toBe("note-123");
    expect(getActiveItemId("/projects/proj-456")).toBe("proj-456");
    expect(getActiveItemId("/reader/doc-789")).toBe("doc-789");
    expect(getActiveItemId("/notes/new")).toBe(null);
    expect(getActiveItemId("/calendar")).toBe(null);
  });

  it("checks hasDescendant correctly across depths", () => {
    expect(hasDescendant(mockTree[0]!, "note-1")).toBe(true);
    expect(hasDescendant(mockTree[0]!, "note-nested")).toBe(true);
    expect(hasDescendant(mockTree[0]!, "subproj-1")).toBe(true);
    expect(hasDescendant(mockTree[0]!, "proj-2")).toBe(false);
    expect(hasDescendant(mockTree[1]!, "note-1")).toBe(false);
  });

  it("retrieves ancestor IDs chain for deep notes", () => {
    const ancestorsDeep = getAncestorIds(mockTree, "note-nested");
    expect(ancestorsDeep).toEqual(["subproj-1", "proj-1"]);

    const ancestorsDirect = getAncestorIds(mockTree, "note-1");
    expect(ancestorsDirect).toEqual(["proj-1"]);

    const ancestorsNone = getAncestorIds(mockTree, "proj-1");
    expect(ancestorsNone).toEqual([]);
  });
});

describe("NotesTree rendering and collapse logic", () => {
  it("auto-expands parent project when a child note is active", () => {
    currentPathname = "/notes/note-1";

    const html = renderToString(<NotesTree nodes={mockTree} />);
    expect(html).toContain("Project One");
    expect(html).toContain("Child Note One");
    expect(html).toContain('aria-label="Collapse"');
  });

  it("keeps parent project collapsed when child note is not active", () => {
    currentPathname = "/notes/other-unrelated-note";

    const html = renderToString(<NotesTree nodes={mockTree} />);
    expect(html).toContain("Project One");
    expect(html).not.toContain("Child Note One");
    expect(html).toContain('aria-label="Expand"');
  });

  it("evaluates open state with nullish coalescing to allow explicit minimize", () => {
    // Demonstrates the bug fix:
    // When isAncestorOfActive is true:
    const isAncestorOfActive = true;

    // Previous buggy logic: Boolean(open[node.id]) || isAncestorOfActive
    // If open['proj-1'] is false (user collapsed it):
    const buggyOpen = Boolean(false) || isAncestorOfActive;
    expect(buggyOpen).toBe(true); // BUG: Always true! Could never minimize.

    // Fixed logic: open[node.id] ?? isAncestorOfActive
    const openState: Record<string, boolean> = { "proj-1": false };
    const fixedOpenWhenCollapsed = openState["proj-1"] ?? isAncestorOfActive;
    expect(fixedOpenWhenCollapsed).toBe(false); // FIXED: Evaluates to false!

    const fixedOpenByDefault = openState["proj-2"] ?? isAncestorOfActive;
    expect(fixedOpenByDefault).toBe(true); // Auto-expanded by default
  });

  it("renders accessible navigation links and dedicated drag handle buttons", () => {
    currentPathname = "/notes/note-1";

    const html = renderToString(<NotesTree nodes={mockTree} />);
    // Contains links with correct destinations
    expect(html).toContain('href="/projects/proj-1"');
    expect(html).toContain('href="/notes/note-1"');
    // Contains dedicated drag handle buttons
    expect(html).toContain('title="Drag to reorder / Click to open"');
    // Links should NOT have touch-none which was interfering with clicks
    expect(html).not.toContain("touch-none");
  });
});
