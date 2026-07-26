import { slugify } from "@/lib/slug";

// Transform `[[Wiki Link]]` and `[[Wiki Link#Section]]` tokens in Markdown into
// real links to internal notes. The first match (by slug) wins; falls back to
// case-insensitive title match.

export type WikiLinkTarget = {
  id: string;
  slug: string;
  title: string;
};

type NormalizedTarget = {
  id: string;
  slug: string;
  slugLower: string;
  titleLower: string;
  title: string;
};

function normalize(map: WikiLinkTarget[]): NormalizedTarget[] {
  return map.map((t) => ({
    id: t.id,
    slug: t.slug,
    slugLower: t.slug.toLowerCase(),
    title: t.title,
    titleLower: t.title.toLowerCase(),
  }));
}

function resolve(
  name: string,
  targets: NormalizedTarget[],
): NormalizedTarget | null {
  const needle = name.toLowerCase();
  // 1. exact slug match
  const bySlug = targets.find((t) => t.slugLower === needle);
  if (bySlug) return bySlug;
  // 2. exact title match
  const byTitle = targets.find((t) => t.titleLower === needle);
  if (byTitle) return byTitle;
  // 3. normalised slug vs slugified title (so non-Latin titles that share a
  //    normalised slug still resolve)
  const slugifiedTitle = needle.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  const bySlugified = targets.find(
    (t) => t.slugLower.replace(/[^\w-]/g, "") === slugifiedTitle,
  );
  return bySlugified ?? null;
}

function splitLinkedTarget(input: string) {
  const trimmed = input.trim();
  const hashIndex = trimmed.indexOf("#");

  if (hashIndex === -1) {
    return { name: trimmed, section: "" };
  }

  return {
    name: trimmed.slice(0, hashIndex).trim(),
    section: trimmed.slice(hashIndex + 1).trim(),
  };
}

function stripInlineMarkdown(input: string) {
  return input
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

export function getHeadingAnchorId(input: string) {
  return slugify(stripInlineMarkdown(input)) || "section";
}

export function resolveNoteHref(input: string, targets: WikiLinkTarget[]) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("#")) {
    return `#${getHeadingAnchorId(trimmed.slice(1))}`;
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  ) {
    return trimmed;
  }

  const { name, section } = splitLinkedTarget(trimmed);
  const target = resolve(name, normalize(targets));

  if (!target) return trimmed;

  return `/notes/${target.id}${section ? `#${getHeadingAnchorId(section)}` : ""}`;
}

// Match `[[ ... ]]` — but not inside fenced code blocks. We do a line-based
// scan that toggles inside fences to keep the regex simple and fast.
const WIKI_RE = /\[\[([^\]\n]+?)\]\]/g;

export function transformWikiLinks(
  input: string,
  targets: WikiLinkTarget[],
): string {
  if (!input.includes("[[")) return input;
  const normalized = normalize(targets);

  const lines = input.split("\n");
  let inFence = false;
  const out = lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    return line.replace(WIKI_RE, (whole, inner: string) => {
      const trimmed = (inner ?? "").trim();
      if (!trimmed) return whole;
      const { name, section } = splitLinkedTarget(trimmed);
      const target = resolve(name, normalized);
      const label = section ? `${name}#${section}` : name;
      if (!target) {
        // Render as explicit unresolved link affordance with prefilled new note query
        return `[${label} ↗](/notes/new?title=${encodeURIComponent(name)})`;
      }
      return `[${label}](/notes/${target.id}${section ? `#${getHeadingAnchorId(section)}` : ""})`;
    });
  });
  return out.join("\n");
}
