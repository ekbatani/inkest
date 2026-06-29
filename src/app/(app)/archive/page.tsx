import Link from "next/link";
import { Archive } from "lucide-react";
import { listNotes } from "@/server/notes/service";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";
import { ArchiveToggleButton } from "@/components/notes/archive-toggle-button";

export default async function ArchivePage() {
  const archivedNotes = await listNotes({ archived: true, limit: 100 });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center gap-2">
        <Archive className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
      </header>

      {archivedNotes.length === 0 ? (
        <div className="surface-card-dashed flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Archive className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No archived notes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Archived notes will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {archivedNotes.map((note) => (
            <div key={note.id} className="surface-card p-4 opacity-75">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/notes/${note.id}`}
                    className={cn(
                      "block truncate font-medium hover:underline",
                      usesRtlTitleFont(note.title) && "rtl-vazir",
                    )}
                  >
                    {note.title}
                  </Link>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDateShort(note.updatedAt)}
                  </span>
                </div>
                <ArchiveToggleButton
                  noteId={note.id}
                  archived
                  variant="outline"
                  size="icon-sm"
                  className="rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        nativeButton={false}
        render={<Link href="/notes" />}
      >
        Back to notes
      </Button>
    </div>
  );
}
