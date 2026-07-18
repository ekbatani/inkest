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
  const isProject = as === "project";
  const note = await createNote({
    title: isProject ? "New subproject" : isTask ? "New task" : "Untitled",
    parentId,
    type: isProject ? "project" : "note",
    status: isTask ? "todo" : "none",
  });
  redirect(isProject ? `/projects/${note.id}` : `/notes/${note.id}?focus=title`);
}
