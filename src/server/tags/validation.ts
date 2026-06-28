import { z } from "zod";

export const tagColorEnum = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/u, "Use a hex color like #aabbcc.")
  .nullable()
  .optional();

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required.").max(60),
  color: tagColorEnum,
});

export const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: tagColorEnum,
});

export const setNoteTagsSchema = z.object({
  noteId: z.string().min(1),
  tagIds: z.array(z.string()).max(50),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type SetNoteTagsInput = z.infer<typeof setNoteTagsSchema>;