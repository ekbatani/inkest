import { z } from "zod";

export const taskStatusEnum = z.enum(["todo", "doing", "done", "canceled"]);
export const taskPriorityEnum = z.enum(["none", "low", "medium", "high"]);
export const taskSourceEnum = z.enum(["manual", "markdown", "ai"]);

export const createTaskSchema = z.object({
  noteId: z.string().min(1),
  title: z.string().trim().min(1, "Task title is required.").max(300),
  description: z.string().max(2_000).nullable().optional(),
  status: taskStatusEnum.default("todo"),
  priority: taskPriorityEnum.default("none"),
  dueDate: z.coerce.date().nullable().optional(),
  source: taskSourceEnum.default("manual"),
  sourceLine: z.number().int().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(2_000).nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;