"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNote } from "@/server/notes/service";

export async function createProjectAction() {
  const note = await createNote({
    title: "New project",
    type: "project",
    status: "todo",
  });
  revalidatePath("/projects");
  revalidatePath("/notes");
  redirect(`/projects/${note.id}`);
}