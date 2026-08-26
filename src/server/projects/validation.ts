import { z } from "zod";

export const MAX_PROJECT_MEMBERS = 20;

export const shareRoleEnum = ["viewer", "editor"] as const;
export type ShareRole = (typeof shareRoleEnum)[number];

export const addProjectMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email."),
  role: z.enum(shareRoleEnum).default("viewer"),
});

export const updateProjectMemberRoleSchema = z.object({
  role: z.enum(shareRoleEnum),
});

export const removeProjectMemberSchema = z.object({
  userId: z.string().min(1),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRoleInput = z.infer<typeof updateProjectMemberRoleSchema>;
