"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNote, getNoteById, listNotes, updateNote } from "@/server/notes/service";
import { createTask, listTasks } from "@/server/tasks/service";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2_000).nullable().optional(),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  status: z.enum(["todo", "doing", "done", "canceled"]).default("todo"),
  dueDate: z.coerce.date().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
});

const savePlanSchema = z.object({
  sourceNoteId: z.string().min(1),
  destination: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("current"),
      projectDueDate: z.coerce.date().nullable().optional(),
    }),
    z.object({
      kind: z.literal("existing"),
      projectId: z.string().min(1),
      projectDueDate: z.coerce.date().nullable().optional(),
    }),
    z.object({
      kind: z.literal("new"),
      title: z.string().trim().min(1).max(200),
      dueDate: z.coerce.date().nullable().optional(),
      priority: z.enum(["none", "low", "medium", "high"]).optional(),
    }),
    z.object({
      kind: z.literal("subproject"),
      parentProjectId: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      dueDate: z.coerce.date().nullable().optional(),
      priority: z.enum(["none", "low", "medium", "high"]).optional(),
    }),
  ]),
  tasks: z.array(taskSchema).min(1).max(50),
});

export type ProjectOption = {
  id: string;
  title: string;
  parentId: string | null;
  dueDate: Date | null;
  status: string;
  priority: string;
};

export async function getAiPlanningContextAction(sourceNoteId?: string) {
  let source = null;
  if (sourceNoteId) {
    source = await getNoteById(sourceNoteId);
  }

  const projects = await listNotes({ type: "project", limit: 500 });
  const currentProject = source
    ? source.type === "project"
      ? source
      : source.parentId
        ? projects.find((project) => project.id === source.parentId) ?? null
        : null
    : null;

  return {
    currentProject: currentProject
      ? {
          id: currentProject.id,
          title: currentProject.title,
          dueDate: currentProject.dueDate,
          status: currentProject.status,
          priority: currentProject.priority,
        }
      : null,
    projects: projects.map<ProjectOption>((project) => ({
      id: project.id,
      title: project.title,
      parentId: project.parentId,
      dueDate: project.dueDate,
      status: project.status,
      priority: project.priority,
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
    if (input.destination.projectDueDate) {
      await updateNote(currentProjectId, { dueDate: input.destination.projectDueDate });
    }
    return currentProjectId;
  }

  if (input.destination.kind === "existing") {
    const project = await getNoteById(input.destination.projectId);
    if (!project || project.type !== "project") throw new Error("PROJECT_NOT_FOUND");
    if (input.destination.projectDueDate) {
      await updateNote(project.id, { dueDate: input.destination.projectDueDate });
    }
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
    if (!parent || parent.type !== "project") throw new Error("PARENT_PROJECT_NOT_FOUND");
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
    priority: projectDraft.priority ?? "none",
    dueDate: projectDraft.dueDate ?? undefined,
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
    await createTask({
      ...task,
      noteId: destinationNoteId,
      source: "ai",
    });
    created++;
  }

  revalidatePath("/", "layout");
  revalidatePath(`/projects/${destinationNoteId}`);
  revalidatePath(`/notes/${parsed.sourceNoteId}`);
  return { created, skipped, destinationNoteId };
}
