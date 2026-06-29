import { createNote } from "@/server/notes/service";
import { redirect } from "next/navigation";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string; as?: string }>;
}) {
  const { parent, as } = await searchParams;
  const parentId =
    parent && typeof parent === "string" ? parent : null;
  const isTask = as === "task";
  const note = await createNote({
    title: isTask ? "New task" : "Untitled",
    parentId,
    status: isTask ? "todo" : "none",
  });
  redirect(`/notes/${note.id}?focus=title`);
}
