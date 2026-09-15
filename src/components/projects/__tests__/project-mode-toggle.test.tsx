import { describe, it, expect, mock } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { ProjectModeToggle } from "../project-mode-toggle";

describe("ProjectModeToggle component", () => {
  it("renders correctly in project mode with note link", () => {
    const html = renderToString(
      <ProjectModeToggle noteId="test-note-1" currentMode="project" canEdit={true} />,
    );

    expect(html).toContain('aria-label="Project mode switcher"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Project mode");
    expect(html).toContain('href="/notes/test-note-1"');
    expect(html).toContain('aria-label="Switch to Note mode"');
  });

  it("renders correctly in note mode with project link", () => {
    const html = renderToString(
      <ProjectModeToggle noteId="test-note-2" currentMode="note" canEdit={true} />,
    );

    expect(html).toContain('aria-label="Project mode switcher"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Note mode");
    expect(html).toContain('href="/projects/test-note-2"');
    expect(html).toContain('aria-label="Switch to Project mode"');
  });

  it("hides note mode link when canEdit is false in project mode", () => {
    const html = renderToString(
      <ProjectModeToggle noteId="test-note-3" currentMode="project" canEdit={false} />,
    );

    expect(html).toContain("Project mode");
    expect(html).not.toContain('href="/notes/test-note-3"');
  });
});
