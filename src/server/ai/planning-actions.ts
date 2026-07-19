"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNote, getNoteById, listNotes } from "@/server/notes/service";
import { createTask, listTasks } from "@/server/tasks/service";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2_000).nullable().optional(),
  priority: z.enum(["none", "low", "medium", "high"]),
  status: z.enum(["todo", "doing", "done", "canceled"]),
  dueDate: z.coerce.date().nullable(),
});

const savePlanSchema = z.object({
  sourceNoteId: z.string().min(1),
  destination: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("current") }),
    z.object({ kind: z.literal("existing"), projectId: z.string().min(1) }),
    z.object({ kind: z.literal("new"), title: z.string().trim().min(1).max(200) }),
    z.object({ kind: z.literal("subproject"), parentProjectId: z.string().min(1), title: z.string().trim().min(1).max(200) }),
  ]),
  tasks: z.array(taskSchema).min(1).max(50),
});

type ProjectOption = { id: string; title: string; parentId: string | null };

export async function getAiPlanningContextAction(sourceNoteId: string) {
  const source = await getNoteById(sourceNoteId);
  if (!source) throw new Error("NOTE_NOT_FOUND");

  const projects = await listNotes({ type: "project", limit: 500 });
  const currentProject = source.type === "project"
    ? source
    : source.parentId
      ? projects.find((project) => project.id === source.parentId) ?? null
      : null;

  return {
    currentProject: currentProject
      ? { id: currentProject.id, title: currentProject.title }
      : null,
    projects: projects.map<ProjectOption>((project) => ({
      id: project.id,
      title: project.title,
      parentId: project.parentId,
    })),
  };
}

function normalizedTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

async function resolveDestination(
  input: z.infer<typeof savePlanSchema>,
  currentProjectId: string | null,
) {
  if (input.destination.kind === "current") {
    if (!currentProjectId) throw new Error("CURRENT_PROJECT_REQUIRED");
    return currentProjectId;
  }

  if (input.destination.kind === "existing") {
    const project = await getNoteById(input.destination.projectId);
    if (!project || project.type !== "project") throw new Error("PROJECT_NOT_FOUND");
    return project.id;
  }

  const projectDraft = input.destination;
  if (projectDraft.kind !== "new" && projectDraft.kind !== "subproject") {
    throw new Error("INVALID_DESTINATION");
  }
  const parentId = projectDraft.kind === "subproject"
    ? projectDraft.parentProjectId
    : null;
  if (parentId) {
    const parent = await getNoteById(parentId);
    if (!parent || parent.type !== "project") throw new Error("PROJECT_NOT_FOUND");
  }

  const projects = await listNotes({ type: "project", parentId, limit: 500 });
  const duplicate = projects.some(
    (project) => normalizedTitle(project.title) === normalizedTitle(projectDraft.title),
  );
  if (duplicate) throw new Error("DUPLICATE_PROJECT");

  const project = await createNote({
    title: projectDraft.title,
    type: "project",
    status: "todo",
    parentId,
  });
  return project.id;
}

export async function saveAiTaskPlanAction(input: z.input<typeof savePlanSchema>) {
  const parsed = savePlanSchema.parse(input);
  const source = await getNoteById(parsed.sourceNoteId);
  if (!source) throw new Error("NOTE_NOT_FOUND");

  const context = await getAiPlanningContextAction(source.id);
  const destinationNoteId = await resolveDestination(
    parsed,
    context.currentProject?.id ?? null,
  );
  const existing = await listTasks(destinationNoteId);
  const seen = new Set(existing.map((task) => normalizedTitle(task.title)));
  let created = 0;
  let skipped = 0;

  for (const task of parsed.tasks) {
    const title = normalizedTitle(task.title);
    if (seen.has(title)) {
      skipped++;
      continue;
    }
    seen.add(title);
    await createTask({ ...task, noteId: destinationNoteId, source: "ai" });
    created++;
  }

  revalidatePath("/notes");
  revalidatePath("/projects");
  revalidatePath(`/projects/${destinationNoteId}`);
  revalidatePath(`/notes/${destinationNoteId}`);
  return { created, skipped, destinationNoteId };
}
