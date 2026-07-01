import { notFound } from "next/navigation";
import {
  getNoteById,
  listParentCandidates,
  listNotes,
  getBacklinks,
} from "@/server/notes/service";
import {
  getGoogleCalendarStatus,
  listCalendarEventsForDay,
  parseDateKey,
} from "@/server/calendar/service";
import { listTags, listTagsForNote } from "@/server/tags/service";
import { NoteEditor } from "@/components/notes/note-editor";

export default async function NoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { id } = await params;
  const { focus } = await searchParams;
  const note = await getNoteById(id);

  if (!note) notFound();

  const dailyDate = note.type === "daily" ? parseDateKey(note.slug) : null;

  const [
    allTags,
    noteTags,
    parentCandidates,
    linkableNotes,
    backlinks,
    calendarStatus,
    dailyEvents,
  ] =
    await Promise.all([
      listTags(),
      listTagsForNote(id),
      listParentCandidates(id),
      listNotes({ limit: 500 }).then((n) =>
        n.map((x) => ({ id: x.id, slug: x.slug, title: x.title })),
      ),
      getBacklinks(id),
      dailyDate ? getGoogleCalendarStatus() : Promise.resolve(null),
      dailyDate ? listCalendarEventsForDay(dailyDate) : Promise.resolve([]),
    ]);

  return (
    <NoteEditor
      note={note}
      allTags={allTags}
      noteTagIds={noteTags.map((t) => t.id)}
      parentCandidates={parentCandidates}
      linkableNotes={linkableNotes}
      backlinks={backlinks.map((b) => ({ id: b.id, title: b.title }))}
      selectTitleOnMount={focus === "title"}
      dailyAgenda={
        dailyDate && calendarStatus
          ? {
              dateKey: note.slug,
              status: calendarStatus,
              events: dailyEvents,
            }
          : undefined
      }
    />
  );
}
