import { createNote } from "@/server/notes/service";
import { redirect } from "next/navigation";

export default async function NewNotePage() {
  const note = await createNote({ title: "Untitled" });
  redirect(`/notes/${note.id}`);
}
