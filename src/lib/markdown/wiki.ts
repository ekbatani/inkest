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
      const [nameRaw, sectionRaw] = trimmed.split("#");
      const name = (nameRaw ?? "").trim();
      const section = (sectionRaw ?? "").trim();
      const target = resolve(name, normalized);
      const label = section ? `${name}#${section}` : name;
      if (!target) {
        // Render as muted text so the user sees the unresolved intention.
        return `*${label}*`;
      }
      return `[${label}](/notes/${target.id}${section ? `#${section}` : ""})`;
    });
  });
  return out.join("\n");
}