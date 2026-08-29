"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createNote,
  updateNote,
  archiveNote,
  unarchiveNote,
  deleteNoteSoft,
  togglePinned,
  moveNoteInTree,
} from "./service";
import { syncMarkdownTasks } from "@/server/tasks/service";

export async function createNoteAction() {
  const note = await createNote({ title: "Untitled" });
  revalidatePath("/", "layout");
  redirect(`/notes/${note.id}`);
}

export async function createNoteWithTitleAction(title: string) {
  const note = await createNote({ title: title.trim() || "Untitled" });
  revalidatePath("/", "layout");
  return note;
}

export async function createProjectAction(
  formDataOrParentId?: FormData | string | null,
) {
  const parentId =
    typeof formDataOrParentId === "string"
      ? formDataOrParentId
      : formDataOrParentId instanceof FormData
        ? (formDataOrParentId.get("parentId") as string | null)
        : undefined;

  const note = await createNote({
    title: parentId ? "New subproject" : "New project",
    type: "project",
    parentId: parentId || undefined,
    status: "todo",
  });
  revalidatePath("/", "layout");
  redirect(`/projects/${note.id}`);
}

export async function createSubprojectAction(parentId: string) {
  return createProjectAction(parentId);
}

export async function setProjectParentAction(
  projectId: string,
  parentId: string | null,
) {
  const updated = await updateNote(projectId, { parentId });
  revalidatePath("/", "layout");
  return updated;
}

export async function createProjectTaskNoteAction(
  projectId: string,
  title: string,
) {
  const note = await createNote({
    title: title.trim() || "New task",
    parentId: projectId,
    status: "todo",
  });
  revalidatePath("/", "layout");
  return note;
}

export async function autoSaveNoteAction(
  id: string,
  input: Parameters<typeof updateNote>[1],
) {
  const updated = await updateNote(id, input);
  if (input.contentMd !== undefined) {
    try {
      await syncMarkdownTasks(id, input.contentMd);
    } catch {
      // Sync failure should not break note editing.
    }
  }
  return updated;
}

export async function updateNoteAction(
  id: string,
  input: Parameters<typeof updateNote>[1],
) {
  const updated = await autoSaveNoteAction(id, input);
  revalidatePath("/", "layout");
  return updated;
}

export async function archiveNoteAction(id: string) {
  await archiveNote(id);
  revalidatePath("/", "layout");
  redirect("/notes");
}

export async function unarchiveNoteAction(id: string) {
  await unarchiveNote(id);
  revalidatePath("/", "layout");
}

export async function deleteNoteAction(id: string) {
  await deleteNoteSoft(id);
  revalidatePath("/", "layout");
  redirect("/notes");
}

export async function togglePinnedAction(id: string) {
  await togglePinned(id);
  revalidatePath("/", "layout");
}

export async function moveNoteInTreeAction(
  noteId: string,
  targetParentId: string | null,
  beforeId: string | null = null,
) {
  const note = await moveNoteInTree(noteId, targetParentId, beforeId);
  if (!note) {
    throw new Error("NOTE_NOT_FOUND");
  }

  revalidatePath("/", "layout");
  return note;
}

export type NoteSearchHit = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: Date;
  type: "note" | "project" | "daily";
  status: string | null;
};

function toSearchHit(n: {
  id: string;
  title: string;
  excerpt: string | null;
  contentMd: string;
  updatedAt: Date;
  type: string;
  status: string | null;
}): NoteSearchHit {
  return {
    id: n.id,
    title: n.title,
    excerpt: (n.excerpt || n.contentMd || "").replace(/[#*`>\-\[\]()!]/g, "").replace(/\n+/g, " ").trim().slice(0, 90),
    updatedAt: n.updatedAt,
    type: n.type === "project" || n.type === "daily" ? n.type : "note",
    status: n.status,
  };
}

export async function searchNotesAction(
  query: string,
): Promise<NoteSearchHit[]> {
  const { listNotes } = await import("./service");
  const q = (query ?? "").trim();
  if (!q) return [];
  // listNotes applies its SQL limit before the in-memory text filter, so the
  // pool must be large enough to surface matches beyond the newest rows.
  const poolLimit = 200;
  const [projects, notes, dailies] = await Promise.all([
    listNotes({ search: q, limit: poolLimit, type: "project" }),
    listNotes({ search: q, limit: poolLimit, type: "note" }),
    listNotes({ search: q, limit: poolLimit, type: "daily" }),
  ]);
  return [
    ...projects.slice(0, 4),
    ...[...notes, ...dailies].slice(0, 8),
  ].map(toSearchHit);
}

export async function listRecentNotesAction(): Promise<NoteSearchHit[]> {
  const { listNotes } = await import("./service");
  const notes = await listNotes({ limit: 8 });
  return notes.map(toSearchHit);
}

export async function getLinkableTargetsAction(): Promise<import("@/lib/markdown/wiki").WikiLinkTarget[]> {
  const { listNotes } = await import("./service");
  const { listAttachmentsForUser } = await import("@/server/attachments/service");
  const [notes, attachments] = await Promise.all([
    listNotes({ limit: 1000 }),
    listAttachmentsForUser(250),
  ]);

  return [
    ...notes.map((x) => ({
      id: x.id,
      slug: x.slug,
      title: x.title,
      type: x.type as "note" | "daily" | "project",
      status: x.status,
      updatedAt: x.updatedAt,
      excerpt: (x.excerpt || x.contentMd || "")
        .replace(/[#*`>\-\[\]()!]/g, "")
        .replace(/\n+/g, " ")
        .trim()
        .slice(0, 100),
    })),
    ...attachments.map((a) => ({
      id: a.id,
      slug: a.fileName,
      title: a.originalName,
      type: "asset" as const,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      updatedAt: a.createdAt,
      url: `/api/attachments/${a.id}`,
    })),
  ];
}

