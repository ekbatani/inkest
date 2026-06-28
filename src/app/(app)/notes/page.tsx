import Link from "next/link";
import { NotebookPen, Plus, Pin, Archive, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listNotes } from "@/server/notes/service";
import { formatRelativeDate } from "@/lib/dates";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim() || undefined;

  const [notes, pinned] = await Promise.all([
    listNotes({ search }),
    listNotes({ pinnedOnly: true, limit: 10 }),
  ]);

  const pinnedIds = new Set(pinned.map((n) => n.id));
  const regularNotes = notes.filter((n) => !pinnedIds.has(n.id));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" render={<Link href="/archive" />}>
            <Archive className="size-4" /> Archive
          </Button>
          <Button size="sm" className="gap-1.5" render={<Link href="/notes/new" />}>
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
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      {search && (
        <p className="text-sm text-muted-foreground">
          {notes.length} result{notes.length === 1 ? "" : "s"} for “{search}”
        </p>
      )}

      {!search && pinned.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Pin className="size-3.5" /> Pinned
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pinned.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </section>
      )}

      <section>
        {!search && regularNotes.length > 0 && (
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            All notes
          </h2>
        )}
        {notes.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(search ? notes : regularNotes).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NoteCard({ note }: { note: Awaited<ReturnType<typeof listNotes>>[number] }) {
  const excerpt =
    note.excerpt ||
    note.contentMd
      .replace(/[#*`>\-\[\]()!]/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 120);

  return (
    <Link
      href={`/notes/${note.id}`}
      className="group block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate font-medium">{note.title}</h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeDate(note.updatedAt)}
        </span>
      </div>
      {excerpt && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
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

function EmptyState({ search }: { search?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <NotebookPen className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">
          {search ? "No notes found" : "No notes yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {search
            ? "Try a different search term."
            : "Create your first note to get started."}
        </p>
      </div>
      {!search && (
        <Button size="sm" className="gap-1.5" render={<Link href="/notes/new" />}>
          <Plus className="size-4" /> New note
        </Button>
      )}
    </div>
  );
}
