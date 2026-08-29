import { describe, it, expect } from "bun:test";
import {
  transformWikiLinks,
  resolveNoteHref,
  getHeadingAnchorId,
  parseWikiToken,
  formatWikiLink,
  type WikiLinkTarget,
} from "./wiki";

describe("wiki.ts - Internal Note, Project, and Asset Linking", () => {
  const targets: WikiLinkTarget[] = [
    {
      id: "note-123",
      slug: "system-architecture",
      title: "System Architecture",
      type: "note",
    },
    {
      id: "proj-456",
      slug: "q3-product-launch",
      title: "Q3 Product Launch",
      type: "project",
    },
    {
      id: "daily-789",
      slug: "2026-08-26",
      title: "2026-08-26",
      type: "daily",
    },
    {
      id: "asset-101",
      slug: "diagram.png",
      title: "Architecture Diagram.png",
      type: "asset",
      mimeType: "image/png",
    },
    {
      id: "asset-102",
      slug: "spec.pdf",
      title: "Technical Spec.pdf",
      type: "asset",
      mimeType: "application/pdf",
    },
  ];

  it("resolves note links to /notes/[id]", () => {
    expect(resolveNoteHref("System Architecture", targets)).toBe("/notes/note-123");
    expect(resolveNoteHref("system-architecture", targets)).toBe("/notes/note-123");
    expect(resolveNoteHref("System Architecture#Database Layer", targets)).toBe(
      "/notes/note-123#database-layer",
    );
  });

  it("resolves project links to /projects/[id]", () => {
    expect(resolveNoteHref("Q3 Product Launch", targets)).toBe("/projects/proj-456");
    expect(resolveNoteHref("q3-product-launch#Roadmap", targets)).toBe(
      "/projects/proj-456#roadmap",
    );
  });

  it("resolves asset links to /api/attachments/[id]", () => {
    expect(resolveNoteHref("Architecture Diagram.png", targets)).toBe(
      "/api/attachments/asset-101",
    );
    expect(resolveNoteHref("diagram.png", targets)).toBe("/api/attachments/asset-101");
    expect(resolveNoteHref("Technical Spec.pdf", targets)).toBe(
      "/api/attachments/asset-102",
    );
  });

  it("transforms wiki links in markdown content", () => {
    const input = `
# Overview
Check [[System Architecture]] and [[Q3 Product Launch]].
Also download [[Technical Spec.pdf]].
Unresolved: [[Future Milestone]].
`;
    const transformed = transformWikiLinks(input, targets);

    expect(transformed).toContain("[System Architecture](/notes/note-123)");
    expect(transformed).toContain("[Q3 Product Launch](/projects/proj-456)");
    expect(transformed).toContain("[Technical Spec.pdf](/api/attachments/asset-102)");
    expect(transformed).toContain(
      "[Future Milestone ↗](/notes/new?title=Future%20Milestone)",
    );
  });

  it("handles aliases in wiki links ([[Target|Alias]] and [[Target#Section|Alias]])", () => {
    const input = `
See [[System Architecture|Arch Specs]] and [[Q3 Product Launch#Roadmap|Q3 Milestone]].
Also check [[Technical Spec.pdf|Download Technical Spec]].
Unresolved: [[Missing Note|Placeholder Name]].
`;
    const transformed = transformWikiLinks(input, targets);

    expect(transformed).toContain("[Arch Specs](/notes/note-123)");
    expect(transformed).toContain("[Q3 Milestone](/projects/proj-456#roadmap)");
    expect(transformed).toContain("[Download Technical Spec](/api/attachments/asset-102)");
    expect(transformed).toContain("[Placeholder Name ↗](/notes/new?title=Missing%20Note)");
  });

  it("handles asset and note embeds (![[...]])", () => {
    const input = `
![[Architecture Diagram.png]]
![[Architecture Diagram.png|System Topology Diagram]]
![[Technical Spec.pdf]]
![[System Architecture]]
![[Q3 Product Launch]]
`;
    const transformed = transformWikiLinks(input, targets);

    expect(transformed).toContain("![Architecture Diagram.png](/api/attachments/asset-101)");
    expect(transformed).toContain("![System Topology Diagram](/api/attachments/asset-101)");
    expect(transformed).toContain("[📎 Technical Spec.pdf](/api/attachments/asset-102)");
    expect(transformed).toContain("[📝 System Architecture](/notes/note-123)");
    expect(transformed).toContain("[📁 Q3 Product Launch](/projects/proj-456)");
  });

  it("preserves fenced code blocks without transforming wiki tokens", () => {
    const input = `
\`\`\`
[[System Architecture]] should not be touched
\`\`\`
[[System Architecture]] should be transformed
`;
    const transformed = transformWikiLinks(input, targets);
    expect(transformed).toContain("```\n[[System Architecture]] should not be touched\n```");
    expect(transformed).toContain("[System Architecture](/notes/note-123)");
  });

  it("parses wiki tokens accurately with parseWikiToken", () => {
    expect(parseWikiToken("[[Note]]")).toEqual({
      targetName: "Note",
      section: "",
      alias: "",
      isEmbed: false,
    });
    expect(parseWikiToken("[[Note|My Custom Alias]]")).toEqual({
      targetName: "Note",
      section: "",
      alias: "My Custom Alias",
      isEmbed: false,
    });
    expect(parseWikiToken("[[Note#Database|DB Section]]")).toEqual({
      targetName: "Note",
      section: "Database",
      alias: "DB Section",
      isEmbed: false,
    });
    expect(parseWikiToken("![[image.png|Alt Text]]")).toEqual({
      targetName: "image.png",
      section: "",
      alias: "Alt Text",
      isEmbed: true,
    });
  });

  it("formats wiki links accurately with formatWikiLink", () => {
    expect(formatWikiLink({ target: "My Note" })).toBe("[[My Note]]");
    expect(formatWikiLink({ target: "My Note", alias: "Custom Label" })).toBe(
      "[[My Note|Custom Label]]",
    );
    expect(
      formatWikiLink({ target: "My Note", section: "Architecture", alias: "Arch" }),
    ).toBe("[[My Note#Architecture|Arch]]");
    expect(
      formatWikiLink({ target: "diagram.png", alias: "Diagram", isEmbed: true }),
    ).toBe("![[diagram.png|Diagram]]");
  });

  it("generates consistent heading anchor IDs", () => {
    expect(getHeadingAnchorId("My Heading")).toBe("my-heading");
    expect(getHeadingAnchorId("Heading with **bold** and `code`")).toBe(
      "heading-with-bold-and-code",
    );
  });
});

