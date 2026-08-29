import { slugify } from "@/lib/slug";

// Transform `[[Wiki Link]]`, `[[Wiki Link|Alias]]`, `[[Wiki Link#Section|Alias]]`, and `![[Asset Embed]]` tokens
// in Markdown into real links to internal notes, projects, or assets.

export type WikiLinkTarget = {
  id: string;
  slug: string;
  title: string;
  type?: "note" | "daily" | "project" | "asset" | string;
  mimeType?: string;
  url?: string;
  sizeBytes?: number;
  updatedAt?: Date | string;
  status?: string;
  excerpt?: string;
};

export type NormalizedTarget = {
  id: string;
  slug: string;
  slugLower: string;
  titleLower: string;
  title: string;
  type?: string;
  mimeType?: string;
  url?: string;
  sizeBytes?: number;
  updatedAt?: Date | string;
  status?: string;
  excerpt?: string;
};

export function normalizeTargets(map: WikiLinkTarget[]): NormalizedTarget[] {
  return map.map((t) => ({
    id: t.id,
    slug: t.slug,
    slugLower: t.slug.toLowerCase(),
    title: t.title,
    titleLower: t.title.toLowerCase(),
    type: t.type,
    mimeType: t.mimeType,
    url: t.url,
    sizeBytes: t.sizeBytes,
    updatedAt: t.updatedAt,
    status: t.status,
    excerpt: t.excerpt,
  }));
}

export type ParsedWikiToken = {
  targetName: string;
  section: string;
  alias: string;
  isEmbed: boolean;
};

export function parseWikiToken(raw: string): ParsedWikiToken {
  let isEmbed = false;
  let text = (raw ?? "").trim();
  if (text.startsWith("!")) {
    isEmbed = true;
    text = text.slice(1).trim();
  }
  if (text.startsWith("[[") && text.endsWith("]]")) {
    text = text.slice(2, -2).trim();
  }

  // Handle pipe for alias: [[Target#Section|Alias]]
  const pipeIndex = text.indexOf("|");
  let targetAndSection = text;
  let alias = "";
  if (pipeIndex !== -1) {
    targetAndSection = text.slice(0, pipeIndex).trim();
    alias = text.slice(pipeIndex + 1).trim();
  }

  // Handle hash for section heading: [[Target#Section]]
  const hashIndex = targetAndSection.indexOf("#");
  let targetName = targetAndSection;
  let section = "";
  if (hashIndex !== -1) {
    targetName = targetAndSection.slice(0, hashIndex).trim();
    section = targetAndSection.slice(hashIndex + 1).trim();
  }

  return {
    targetName,
    section,
    alias,
    isEmbed,
  };
}

export function formatWikiLink(options: {
  target: string;
  section?: string;
  alias?: string;
  isEmbed?: boolean;
}): string {
  const prefix = options.isEmbed ? "!" : "";
  const sec = options.section?.trim() ? `#${options.section.trim()}` : "";
  const al = options.alias?.trim() && options.alias.trim() !== options.target.trim() ? `|${options.alias.trim()}` : "";
  return `${prefix}[[${options.target.trim()}${sec}${al}]]`;
}

export function resolveTarget(
  name: string,
  targets: NormalizedTarget[],
): NormalizedTarget | null {
  const needle = name.toLowerCase().trim();
  if (!needle) return null;

  // 1. exact slug match
  const bySlug = targets.find((t) => t.slugLower === needle);
  if (bySlug) return bySlug;

  // 2. exact title match
  const byTitle = targets.find((t) => t.titleLower === needle);
  if (byTitle) return byTitle;

  // 3. filename / title match without extension for assets
  const needleWithoutExt = needle.replace(/\.[a-z0-9]+$/i, "");
  const byTitleWithoutExt = targets.find((t) => {
    const targetTitleWithoutExt = t.titleLower.replace(/\.[a-z0-9]+$/i, "");
    const targetSlugWithoutExt = t.slugLower.replace(/\.[a-z0-9]+$/i, "");
    return (
      targetTitleWithoutExt === needle ||
      targetSlugWithoutExt === needle ||
      targetTitleWithoutExt === needleWithoutExt ||
      targetSlugWithoutExt === needleWithoutExt
    );
  });
  if (byTitleWithoutExt) return byTitleWithoutExt;

  // 4. normalised slug vs slugified title (so non-Latin titles that share a
  //    normalised slug still resolve)
  const slugifiedTitle = needle.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  if (slugifiedTitle) {
    const bySlugified = targets.find(
      (t) => t.slugLower.replace(/[^\w-]/g, "") === slugifiedTitle,
    );
    if (bySlugified) return bySlugified;
  }

  return null;
}

export function isImageAsset(target: NormalizedTarget | WikiLinkTarget): boolean {
  if (target.mimeType?.startsWith("image/")) return true;
  const name = (target.title || target.slug).toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(name);
}

export function resolveTargetHref(
  target: NormalizedTarget | WikiLinkTarget,
  section = "",
): string {
  if (target.url) return target.url;
  if (target.type === "asset") {
    return `/api/attachments/${target.id}`;
  }

  const anchor = section ? `#${getHeadingAnchorId(section)}` : "";
  if (target.type === "project") {
    return `/projects/${target.id}${anchor}`;
  }

  return `/notes/${target.id}${anchor}`;
}

export function splitLinkedTarget(input: string) {
  const parsed = parseWikiToken(input);
  return {
    name: parsed.targetName,
    section: parsed.section,
    alias: parsed.alias,
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

export function resolveNoteHref(input: string, targets: WikiLinkTarget[]): string | null {
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

  const { targetName, section } = parseWikiToken(trimmed);
  const target = resolveTarget(targetName, normalizeTargets(targets));

  if (!target) return trimmed;

  return resolveTargetHref(target, section);
}

// Match `[[ ... ]]` and `![[ ... ]]` — but not inside fenced code blocks.
export const WIKI_RE = /(!?)\[\[([^\]\n]+?)\]\]/g;

export function transformWikiLinks(
  input: string,
  targets: WikiLinkTarget[],
): string {
  if (!input.includes("[[")) return input;
  const normalized = normalizeTargets(targets);

  const lines = input.split("\n");
  let inFence = false;
  const out = lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    return line.replace(WIKI_RE, (whole, isEmbedStr: string, inner: string) => {
      const trimmed = (inner ?? "").trim();
      if (!trimmed) return whole;

      const isEmbed = Boolean(isEmbedStr);
      const { targetName, section, alias } = parseWikiToken(trimmed);
      const name = targetName;
      const target = resolveTarget(name, normalized);
      const defaultLabel = section ? `${name}#${section}` : name;
      const label = alias || defaultLabel;

      if (!target) {
        if (isEmbed) {
          return `![${label} ↗](/notes/new?title=${encodeURIComponent(name)})`;
        }
        return `[${label} ↗](/notes/new?title=${encodeURIComponent(name)})`;
      }

      const href = resolveTargetHref(target, section);

      if (isEmbed) {
        if (target.type === "asset" && isImageAsset(target)) {
          return `![${label}](${href})`;
        }
        if (target.type === "asset") {
          return `[📎 ${label}](${href})`;
        }
        if (target.type === "project") {
          return `[📁 ${label}](${href})`;
        }
        return `[📝 ${label}](${href})`;
      }

      return `[${label}](${href})`;
    });
  });
  return out.join("\n");
}


