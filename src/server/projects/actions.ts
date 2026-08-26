"use server";

import { revalidatePath } from "next/cache";
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
} from "./service";
import {
  addProjectMemberSchema,
  removeProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from "./validation";

type ActionResult = { error?: string; code?: string };

function revalidateProject(projectId: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function addProjectMemberAction(
  projectId: string,
  email: string,
  role: string,
): Promise<ActionResult> {
  const parsed = addProjectMemberSchema.safeParse({ email, role });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      code: "invalid-input",
    };
  }

  const result = await addProjectMember(projectId, parsed.data);
  if (!result.ok) return { error: result.error, code: result.code };

  revalidateProject(projectId);
  return {};
}

export async function updateProjectMemberRoleAction(
  projectId: string,
  memberUserId: string,
  role: string,
): Promise<ActionResult> {
  const parsed = updateProjectMemberRoleSchema.safeParse({ role });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      code: "invalid-input",
    };
  }

  const result = await updateProjectMemberRole(projectId, memberUserId, parsed.data);
  if (!result.ok) return { error: result.error, code: result.code };

  revalidateProject(projectId);
  return {};
}

export async function removeProjectMemberAction(
  projectId: string,
  memberUserId: string,
): Promise<ActionResult> {
  const parsed = removeProjectMemberSchema.safeParse({ userId: memberUserId });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      code: "invalid-input",
    };
  }

  const result = await removeProjectMember(projectId, parsed.data.userId);
  if (!result.ok) return { error: result.error, code: result.code };

  revalidateProject(projectId);
  return {};
}
