import Link from "next/link";
import { NotebookPen, Plus, Pin, Archive, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listNotes } from "@/server/notes/service";
import { listTags } from "@/server/tags/service";
import { formatRelativeDate } from "@/lib/dates";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import type { Note } from "@/server/db/schema";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string | string[] }>;
}) {
  const { q, tag } = await searchParams;
  const search = q?.trim() || undefined;
  const tagIds = Array.isArray(tag)
    ? tag.filter(Boolean)
    : tag
      ? [tag]
      : [];

  const [notes, pinned, allTags] = await Promise.all([
    listNotes({ search, tagIds }),
    listNotes({ pinnedOnly: true, limit: 10, tagIds }),
    listTags(),
  ]);

  const activeTagObjects = allTags.filter((t) => tagIds.includes(t.id));
  // Filter out unknown tag ids silently to avoid confusing UI.
  const unknownTagIds = tagIds.filter(
    (id) => !allTags.some((t) => t.id === id),
  );
  void unknownTagIds;

  const pinnedIds = new Set(pinned.map((n) => n.id));
  const regularNotes = notes.filter((n) => !pinnedIds.has(n.id));

  const buildHref = (delta: { removeTag?: string; addTag?: string; q?: string | null }) => {
    const params = new URLSearchParams();
    if (search && delta.q !== null) params.set("q", search);
    let nextTagIds = tagIds.slice();
    if (delta.removeTag) {
      nextTagIds = nextTagIds.filter((id) => id !== delta.removeTag);
    }
    if (delta.addTag && !nextTagIds.includes(delta.addTag)) {
      nextTagIds.push(delta.addTag);
    }
    for (const id of nextTagIds) params.append("tag", id);
    const qs = params.toString();
    return qs ? `/notes?${qs}` : "/notes";
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/archive" />}
          >
            <Archive className="size-4" /> Archive
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href="/notes/new" />}
          >
            <Plus className="size-4" /> New note
          </Button>
        </div>
      </header>

      <form className="flex items-center gap-2" action="/notes" method="get">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Search notes by title or content…"
            className="pl-9"
          />
        </div>
        {/* Preserve tag filters on submit by hiding them as inputs. */}
        {tagIds.map((id) => (
          <input key={id} type="hidden" name="tag" value={id} />
        ))}
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Filter:</span>
          {allTags.map((t) => {
            const isActive = tagIds.includes(t.id);
            return (
              <Link
                key={t.id}
                href={buildHref({ addTag: isActive ? undefined : t.id, removeTag: isActive ? t.id : undefined })}
                className="inline-flex"
              >
                <Badge
                  variant={isActive ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  style={
                    isActive && t.color
                      ? {
                          backgroundColor: t.color,
                          borderColor: t.color,
                          color: "white",
                        }
                      : t.color && !isActive
                        ? { color: t.color, borderColor: `${t.color}50` }
                        : undefined
                  }
                >
                  {t.name}
                  {isActive && <X className="size-3" />}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      {activeTagObjects.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {notes.length} note{notes.length === 1 ? "" : "s"} tagged{" "}
          {activeTagObjects.map((t, i) => (
            <span key={t.id}>
              {i > 0 ? ", " : ""}
              <Link
                href={buildHref({ removeTag: t.id })}
                className="text-foreground hover:underline"
              >
                {t.name} ×
              </Link>
            </span>
          ))}
        </p>
      )}

      {search && !activeTagObjects.length && (
        <p className="text-sm text-muted-foreground">
          {notes.length} result{notes.length === 1 ? "" : "s"} for “{search}”
        </p>
      )}

      {!search && !activeTagObjects.length && (
        <div className="flex items-center gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
          <span className="text-foreground font-semibold flex items-center gap-1">
            <NotebookPen className="size-3.5" /> Fast Re-finding:
          </span>
          <Link
            href="/notes"
            className="rounded px-2 py-1 bg-accent text-accent-foreground font-medium"
          >
            Recently Updated
          </Link>
          <Link
            href="/views"
            className="rounded px-2 py-1 hover:bg-muted text-muted-foreground transition-colors"
          >
            Saved Views & Filters
          </Link>
          <Link
            href="/notes?q="
            className="rounded px-2 py-1 hover:bg-muted text-muted-foreground transition-colors"
          >
            Press ⌘K for Command Bar
          </Link>
        </div>
      )}

      {!search && !activeTagObjects.length && pinned.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Pin className="size-3.5" /> Pinned Notes ({pinned.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pinned.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </section>
      )}

      <section>
        {!search && !activeTagObjects.length && regularNotes.length > 0 && (
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            All notes
          </h2>
        )}
        {notes.length === 0 ? (
          <EmptyState search={search} hasTagFilter={activeTagObjects.length > 0} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(search || activeTagObjects.length ? notes : regularNotes).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const excerpt =
    note.excerpt ||
    note.contentMd
      .replace(/[#*`>\-\[\]()!]/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 120);
  const excerptUsesRtlFont = usesRtlTitleFont(excerpt);

  return (
    <Link
      href={`/notes/${note.id}`}
      className="surface-card-interactive group block p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            "truncate font-medium",
            usesRtlTitleFont(note.title) && "rtl-vazir",
          )}
        >
          {note.title}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeDate(note.updatedAt)}
        </span>
      </div>
      {excerpt && (
        <p
          className={cn(
            "mt-1 line-clamp-2 text-sm text-muted-foreground",
            excerptUsesRtlFont && "rtl-vazir",
          )}
        >
          {excerpt}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {note.type !== "note" && (
          <Badge variant="secondary" className="text-xs">
            {note.type}
          </Badge>
        )}
        <NoteStatusBadge status={note.status} />
        {note.pinned && <Pin className="size-3 text-muted-foreground" />}
      </div>
    </Link>
  );
}

function EmptyState({
  search,
  hasTagFilter,
}: {
  search?: string;
  hasTagFilter?: boolean;
}) {
  return (
    <div className="surface-card-dashed flex flex-col items-center gap-3 p-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <NotebookPen className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">
          {search || hasTagFilter ? "No notes found" : "No notes yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {search
            ? "Try a different search term."
            : hasTagFilter
              ? "No notes match the selected tag filters."
              : "Create your first note to get started."}
        </p>
      </div>
      {!search && !hasTagFilter && (
        <Button
          size="sm"
          className="gap-1.5"
          nativeButton={false}
          render={<Link href="/notes/new" />}
        >
          <Plus className="size-4" /> New note
        </Button>
      )}
    </div>
  );
}
