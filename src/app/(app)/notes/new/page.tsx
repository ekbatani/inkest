import { createNote } from "@/server/notes/service";
import { redirect } from "next/navigation";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string; as?: string; title?: string }>;
}) {
  const { parent, as, title } = await searchParams;
  const parentId =
    parent && typeof parent === "string" ? parent : null;
  const isTask = as === "task";
  const isProject = as === "project";
  const defaultTitle = isProject ? "New subproject" : isTask ? "New task" : "Untitled";
  const noteTitle =
    typeof title === "string" && title.trim() ? title.trim() : defaultTitle;

  const note = await createNote({
    title: noteTitle,
    parentId,
    type: isProject ? "project" : "note",
    status: isTask ? "todo" : "none",
  });
  redirect(isProject ? `/projects/${note.id}` : `/notes/${note.id}?focus=title`);
}

