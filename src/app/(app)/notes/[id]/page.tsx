import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import {
  getNoteById,
  listParentCandidates,
  listNotes,
  getBacklinks,
  listProjectTaskNotes,
} from "@/server/notes/service";
import { listAttachmentsForUser } from "@/server/attachments/service";
import { resolveProjectAccess } from "@/server/projects/access";
import {
  getGoogleCalendarStatus,
  listCalendarEventsForDay,
  parseDateKey,
} from "@/server/calendar/service";
import { listTags, listTagsForNote } from "@/server/tags/service";
import { getUserSettings } from "@/server/users/settings-service";
import { NoteEditor } from "@/components/notes/note-editor";
import { getCurrentUser } from "@/server/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Note editor",
};

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

  // Load linkable notes, projects, and assets for wiki-link autocomplete and resolution
  const user = await getCurrentUser();
  const [access, linkableTargets] = await Promise.all([
    user ? resolveProjectAccess(id, user.id) : Promise.resolve(null),
    Promise.all([
      listNotes({ limit: 500 }),
      listAttachmentsForUser(100),
    ]).then(([notes, attachments]) => [
      ...notes.map((x) => ({
        id: x.id,
        slug: x.slug,
        title: x.title,
        type: x.type as "note" | "daily" | "project",
      })),
      ...attachments.map((a) => ({
        id: a.id,
        slug: a.fileName,
        title: a.originalName,
        type: "asset" as const,
        mimeType: a.mimeType,
        url: `/api/attachments/${a.id}`,
      })),
    ]),
  ]);

  // Viewers of a shared project get a read-only page instead of the editor.
  if (access?.role === "viewer") {
    return (
      <div className="app-page gap-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={
              <Link
                href={access.projectId ? `/projects/${access.projectId}` : "/notes"}
                aria-label="Back"
              />
            }
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="truncate text-lg font-semibold">{note.title}</h1>
          <Badge variant="outline" className="gap-1 text-xs">
            <Eye className="size-3" /> Read-only · shared project
          </Badge>
        </div>
        <MarkdownPreview
          content={note.contentMd}
          direction={note.direction}
          linkableNotes={linkableTargets}
          className="max-w-3xl font-sans text-[0.98rem] leading-8 tracking-[-0.01em] text-foreground/90 sm:text-[1.02rem]"
        />
      </div>
    );
  }

  const dailyDate = note.type === "daily" ? parseDateKey(note.slug) : null;

  const [
    allTags,
    noteTags,
    parentCandidates,
    backlinks,
    calendarStatus,
    dailyEvents,
    settings,
    projectTaskNotes,
  ] =
    await Promise.all([
      listTags(),
      listTagsForNote(id),
      listParentCandidates(id),
      getBacklinks(id),
      dailyDate ? getGoogleCalendarStatus() : Promise.resolve(null),
      dailyDate ? listCalendarEventsForDay(dailyDate) : Promise.resolve([]),
      getUserSettings(),
      note.type === "project" ? listProjectTaskNotes(id) : Promise.resolve([]),
    ]);

  return (
    <NoteEditor
      key={note.id}
      note={note}
      allTags={allTags}
      noteTagIds={noteTags.map((t) => t.id)}
      parentCandidates={parentCandidates}
      linkableNotes={linkableTargets}

      backlinks={backlinks.map((b) => ({ id: b.id, title: b.title, snippet: b.snippet, type: b.type }))}
      projectTaskCount={projectTaskNotes.length}
      selectTitleOnMount={focus === "title"}
      superFocusPrefs={{
        trackingMode: settings.superFocus?.trackingMode ?? "pointer",
        radius: settings.superFocus?.radius ?? 1,
      }}
      ttsPrefs={{
        rate: settings.tts?.rate ?? 1,
        voiceURI: settings.tts?.voiceURI,
      }}
      editorPrefs={{
        pasteToPreview: settings.editor?.pasteToPreview ?? true,
        spellcheck: settings.editor?.spellcheck ?? true,
        spellcheckLanguage: settings.editor?.spellcheckLanguage ?? "auto",
      }}
      aiOnboardingDismissed={settings.ai?.onboardingDismissed ?? false}
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
