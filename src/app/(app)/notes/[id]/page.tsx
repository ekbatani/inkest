import { notFound } from "next/navigation";
import { getNoteById } from "@/server/notes/service";
import { NoteEditor } from "@/components/notes/note-editor";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getNoteById(id);

  if (!note) notFound();

  return <NoteEditor note={note} />;
}
