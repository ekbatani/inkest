import { createNote } from "@/server/notes/service";
import { redirect } from "next/navigation";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>;
}) {
  const { parent } = await searchParams;
  const parentId =
    parent && typeof parent === "string" ? parent : null;
  const note = await createNote({ title: "Untitled", parentId });
  redirect(`/notes/${note.id}`);
}