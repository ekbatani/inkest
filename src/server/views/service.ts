import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { SavedView, Note } from "@/server/db/schema";

export const SavedViewFilterSchema = z.object({
  tags: z.array(z.string()).optional(),
  untaggedOnly: z.boolean().optional(),
  type: z.enum(["note", "project", "daily"]).optional(),
  dateRange: z.enum(["today", "this_week", "this_month", "all"]).optional(),
  hasBacklinks: z.boolean().optional(),
  searchQuery: z.string().optional(),
});

export type SavedViewFilter = z.infer<typeof SavedViewFilterSchema>;

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");

  return { user, workspace };
}

export async function createSavedView(data: {
  name: string;
  icon?: string;
  filter: SavedViewFilter;
  sortOrder?: number;
}): Promise<SavedView> {
  const { user, workspace } = await getContext();
  const parsedFilter = SavedViewFilterSchema.parse(data.filter);
  const now = new Date();
  const id = randomUUID();

  const [inserted] = await db
    .insert(schema.savedViews)
    .values({
      id,
      userId: user.id,
      workspaceId: workspace.id,
      name: data.name.trim(),
      icon: data.icon ?? "filter",
      queryJson: JSON.stringify(parsedFilter),
      sortOrder: data.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return inserted;
}

export async function listSavedViews(): Promise<SavedView[]> {
  const { user, workspace } = await getContext();
  return db
    .select()
    .from(schema.savedViews)
    .where(
      and(
        eq(schema.savedViews.userId, user.id),
        eq(schema.savedViews.workspaceId, workspace.id),
      ),
    )
    .orderBy(schema.savedViews.sortOrder, desc(schema.savedViews.createdAt));
}

export async function deleteSavedView(viewId: string): Promise<void> {
  const { user, workspace } = await getContext();
  await db
    .delete(schema.savedViews)
    .where(
      and(
        eq(schema.savedViews.id, viewId),
        eq(schema.savedViews.userId, user.id),
        eq(schema.savedViews.workspaceId, workspace.id),
      ),
    );
}

export async function executeSavedViewQuery(
  filter: SavedViewFilter,
): Promise<Note[]> {
  const { user, workspace } = await getContext();
  const conditions = [
    eq(schema.notes.userId, user.id),
    eq(schema.notes.workspaceId, workspace.id),
    eq(schema.notes.archived, false),
  ];

  if (filter.type) {
    conditions.push(eq(schema.notes.type, filter.type));
  }

  if (filter.dateRange && filter.dateRange !== "all") {
    const now = new Date();
    const startDate = new Date();
    if (filter.dateRange === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (filter.dateRange === "this_week") {
      startDate.setDate(now.getDate() - 7);
    } else if (filter.dateRange === "this_month") {
      startDate.setMonth(now.getMonth() - 1);
    }
    conditions.push(
      sql`${schema.notes.createdAt} >= ${Math.floor(startDate.getTime() / 1000)}`,
    );
  }

  if (filter.searchQuery && filter.searchQuery.trim()) {
    const term = `%${filter.searchQuery.trim().toLowerCase()}%`;
    conditions.push(
      sql`(lower(${schema.notes.title}) LIKE ${term} OR lower(${schema.notes.contentMd}) LIKE ${term})`,
    );
  }

  let noteList = await db
    .select()
    .from(schema.notes)
    .where(and(...conditions))
    .orderBy(desc(schema.notes.updatedAt));

  if (filter.untaggedOnly) {
    const taggedNoteIds = await db
      .select({ noteId: schema.noteTags.noteId })
      .from(schema.noteTags);
    const taggedSet = new Set(taggedNoteIds.map((t: { noteId: string }) => t.noteId));
    noteList = noteList.filter((n: Note) => !taggedSet.has(n.id));
  } else if (filter.tags && filter.tags.length > 0) {
    const matchingNoteIds = await db
      .select({ noteId: schema.noteTags.noteId })
      .from(schema.noteTags)
      .where(inArray(schema.noteTags.tagId, filter.tags));
    const matchingSet = new Set(matchingNoteIds.map((t: { noteId: string }) => t.noteId));
    noteList = noteList.filter((n: Note) => matchingSet.has(n.id));
  }

  if (filter.hasBacklinks) {
    noteList = noteList.filter((n: Note) => n.contentMd.includes("[["));
  }

  return noteList;
}
