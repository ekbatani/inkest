import { z } from "zod";

export const noteTypeEnum = z.enum(["note", "project", "daily"]);
export const noteDirectionEnum = z.enum(["ltr", "rtl", "auto"]);
export const noteStatusEnum = z.enum([
  "none",
  "todo",
  "doing",
  "done",
  "paused",
  "archived",
]);
export const notePriorityEnum = z.enum(["none", "low", "medium", "high"]);

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  contentMd: z.string().max(1_000_000).default(""),
  type: noteTypeEnum.default("note"),
  direction: noteDirectionEnum.default("auto"),
  status: noteStatusEnum.default("none"),
  priority: notePriorityEnum.default("none"),
  dueDate: z.coerce.date().nullable().optional(),
  pinned: z.boolean().default(false),
  parentId: z.string().nullable().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  contentMd: z.string().max(1_000_000).optional(),
  type: noteTypeEnum.optional(),
  direction: noteDirectionEnum.optional(),
  status: noteStatusEnum.optional(),
  priority: notePriorityEnum.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
