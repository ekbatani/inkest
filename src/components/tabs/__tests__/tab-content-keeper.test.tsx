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
import { tagRouteLoadingFallback } from "../route-loading";

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

  it("does not prematurely cache previous tab content under a newly activated tab while route is in flight", () => {
    // Simulate: user is on /notes/note-1 with note-1 content
    currentPathname = "/notes/note-1";

    function SwitchInFlightSimulation() {
      // Step 1: user was on note-1
      // Step 2: user clicks tab 2, setting activeTabId to note-2 while pathname is still note-1 and children is note-1
      const [step, setStep] = React.useState(1);

      if (step === 1) {
        setStep(2);
      }

      return (
        <TabsProvider notesTree={mockTree}>
          <TabContentKeeper>
            <div data-testid="active-content">
              {step === 1 ? "Note 1 Initial Content" : "Note 1 Previous Content"}
            </div>
          </TabContentKeeper>
        </TabsProvider>
      );
    }

    const html = renderToString(<SwitchInFlightSimulation />);

    // Since note-1 is active initially and pathname is /notes/note-1, note-1 is cached.
    // It should NEVER cache Note 1's content under data-tab-content-id="note-2"
    expect(html).not.toContain('data-tab-content-id="note-2"');
    expect(html).toContain('data-tab-content-id="note-1"');
  });

  it("evicts oldest inactive tab when cache exceeds maxCachedTabs", () => {
    currentPathname = "/notes/note-1";

    function EvictionSimulation() {
      // Start on note-1, then switch route and active tab to note-2 with maxCachedTabs=1
      const [step, setStep] = React.useState(1);

      if (step === 1) {
        setStep(2);
      }

      const activeId = step === 1 ? "note-1" : "note-2";
      currentPathname = step === 1 ? "/notes/note-1" : "/notes/note-2";

      return (
        <TabsProvider notesTree={mockTree}>
          <TabContentKeeper maxCachedTabs={1}>
            <div data-testid={`content-${activeId}`}>Content for {activeId}</div>
          </TabContentKeeper>
        </TabsProvider>
      );
    }

    const html = renderToString(<EvictionSimulation />);
    // With maxCachedTabs = 1, when note-2 is cached, note-1 should be evicted
    expect(html).toContain('data-tab-content-id="note-2"');
    expect(html).not.toContain('data-tab-content-id="note-1"');
  });

  it("never caches a tagged route loading fallback as tab content", () => {
    currentPathname = "/notes/note-1";

    function FakeRouteLoading() {
      return <div data-testid="route-loading-fallback">Loading…</div>;
    }
    const TaggedFakeRouteLoading = tagRouteLoadingFallback(FakeRouteLoading);

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <TabContentKeeper>
          <TaggedFakeRouteLoading />
        </TabContentKeeper>
      </TabsProvider>,
    );

    // The skeleton must be rendered directly, never stored in the tab cache —
    // a cached skeleton replays forever once the tab is marked loaded.
    expect(html).not.toContain("data-tab-content-id");
    expect(html).toContain('data-testid="route-loading-fallback"');
  });

  it("renders /notes/new children directly without caching (transient redirect route)", () => {
    currentPathname = "/notes/new";

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <TabContentKeeper>
          <div data-testid="new-note-spinner">Creating note…</div>
        </TabContentKeeper>
      </TabsProvider>,
    );

    // /notes/new creates a note and redirects away; its one-shot spinner must
    // never become cached tab content (the create effect cannot re-run).
    expect(html).not.toContain("data-tab-content-id");
    expect(html).toContain('data-testid="new-note-spinner"');
  });

  it("renders non-tab route content when navigating from a note route to /settings", () => {
    currentPathname = "/notes/note-1";

    function NavigationSimulation() {
      const [route, setRoute] = React.useState("/notes/note-1");
      currentPathname = route;

      const [step, setStep] = React.useState(1);

      if (step === 1) {
        setStep(2);
        setRoute("/settings");
        currentPathname = "/settings";
      }

      return (
        <TabsProvider notesTree={mockTree}>
          <TabContentKeeper>
            {route === "/notes/note-1" ? (
              <div data-testid="note-editor">Note 1 Editor</div>
            ) : (
              <div data-testid="settings-page">Settings Page</div>
            )}
          </TabContentKeeper>
        </TabsProvider>
      );
    }

    const html = renderToString(<NavigationSimulation />);
    expect(html).toContain('data-testid="settings-page"');
    expect(html).toContain("Settings Page");
  });

  it("strictly hides cached tab content and renders children when on /vault, /calendar, or /tags", () => {
    currentPathname = "/vault";

    const html = renderToString(
      <TabsProvider notesTree={mockTree}>
        <TabContentKeeper>
          <div data-testid="vault-view">Vault Secret View</div>
        </TabContentKeeper>
      </TabsProvider>,
    );

    expect(html).toContain('data-testid="vault-view"');
    expect(html).toContain("Vault Secret View");
  });

  it("handles navigation between two non-tab routes consecutively (/vault -> /settings)", () => {
    currentPathname = "/vault";

    function NonTabNavSimulation() {
      const [route, setRoute] = React.useState("/vault");
      currentPathname = route;

      const [step, setStep] = React.useState(1);

      if (step === 1) {
        setStep(2);
        setRoute("/settings");
        currentPathname = "/settings";
      }

      return (
        <TabsProvider notesTree={mockTree}>
          <TabContentKeeper>
            {route === "/vault" ? (
              <div data-testid="vault-content">Vault Content</div>
            ) : (
              <div data-testid="settings-content">Settings Content</div>
            )}
          </TabContentKeeper>
        </TabsProvider>
      );
    }

    const html = renderToString(<NonTabNavSimulation />);
    expect(html).toContain('data-testid="settings-content"');
    expect(html).not.toContain('data-testid="vault-content"');
  });
});
