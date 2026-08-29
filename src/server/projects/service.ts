import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId } from "@/lib/slug";
import type { Note } from "@/server/db/schema";
import { resolveProjectAccess, type ProjectRole } from "./access";
import { createNotification } from "@/server/notifications/service";
import { sendTelegramNotification } from "@/server/notifications/telegram";
import { getUserSettings } from "@/server/users/settings-service";
import {
  MAX_PROJECT_MEMBERS,
  type AddProjectMemberInput,
  type ShareRole,
  type UpdateProjectMemberRoleInput,
} from "./validation";

export type ProjectMember = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: ShareRole;
  createdAt: Date;
};

export type ProjectShareInfo = {
  /** True when this note is itself the share root (sharing is managed here). */
  isShareRoot: boolean;
  myRole: ProjectRole;
  owner: { userId: string; email: string; name: string | null; image: string | null };
  members: ProjectMember[];
};

type MutationResult =
  | { ok: true; member?: ProjectMember }
  | { ok: false; error: string; code: string };

async function auditProjectMemberChange(params: {
  action: string;
  projectId: string;
  actingUserId: string;
  metadata: Record<string, unknown>;
}) {
  const workspace = await getWorkspaceForUser(params.actingUserId);
  if (!workspace) return;
  await db.insert(schema.auditLogs).values({
    id: randomId("audit"),
    userId: params.actingUserId,
    workspaceId: workspace.id,
    action: params.action,
    entityType: "project",
    entityId: params.projectId,
    metadataJson: JSON.stringify(params.metadata),
    createdAt: new Date(),
  });
}

type OwnerGuard =
  | { ok: true; user: { id: string; email: string; name?: string | null }; note: Note }
  | { ok: false; error: string; code: string };

/** Resolves the acting user's role; only the owner may manage members. */
async function requireOwner(projectId: string): Promise<OwnerGuard> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const access = await resolveProjectAccess(projectId, user.id);
  if (!access) {
    return { ok: false, error: "Project not found.", code: "not-found" };
  }

  if (access.role !== "owner" || access.projectId !== projectId) {
    return {
      ok: false,
      error: "Only the project owner can manage sharing.",
      code: "forbidden",
    };
  }
  if (access.note.type !== "project") {
    return {
      ok: false,
      error: "Only projects can be shared.",
      code: "not-a-project",
    };
  }
  return { ok: true, user, note: access.note };
}

export async function getProjectShareInfo(
  projectId: string,
): Promise<ProjectShareInfo | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const access = await resolveProjectAccess(projectId, user.id);
  if (!access || access.note.type !== "project") return null;

  const ownerRows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      image: schema.users.image,
    })
    .from(schema.users)
    .where(eq(schema.users.id, access.note.userId))
    .limit(1);
  const owner = ownerRows[0];
  if (!owner) return null;

  const memberRows = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      image: schema.users.image,
      role: schema.projectMembers.role,
      createdAt: schema.projectMembers.createdAt,
    })
    .from(schema.projectMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.projectMembers.userId))
    .where(eq(schema.projectMembers.projectId, projectId))
    .orderBy(asc(schema.projectMembers.createdAt));

  return {
    isShareRoot: access.projectId === projectId,
    myRole: access.role,
    owner: {
      userId: owner.id,
      email: owner.email,
      name: owner.name,
      image: owner.image,
    },
    members: memberRows.map((row) => ({
      userId: row.userId,
      email: row.email,
      name: row.name,
      image: row.image,
      role: row.role,
      createdAt: row.createdAt,
    })),
  };
}

export async function addProjectMember(
  projectId: string,
  input: AddProjectMemberInput,
): Promise<MutationResult> {
  const owner = await requireOwner(projectId);
  if (!owner.ok) {
    return { ok: false, error: owner.error, code: owner.code };
  }

  const targetRows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      image: schema.users.image,
    })
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);
  const target = targetRows[0];
  if (!target) {
    return {
      ok: false,
      error: "No account exists with that email. Ask them to sign up first.",
      code: "user-not-found",
    };
  }
  if (target.id === owner.note.userId) {
    return {
      ok: false,
      error: "The project owner already has full access.",
      code: "owner-member",
    };
  }

  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.projectMembers)
    .where(eq(schema.projectMembers.projectId, projectId));
  const existingCount = Number(countRows[0]?.count ?? 0);
  const existing = await db
    .select({ userId: schema.projectMembers.userId })
    .from(schema.projectMembers)
    .where(
      and(
        eq(schema.projectMembers.projectId, projectId),
        eq(schema.projectMembers.userId, target.id),
      ),
    )
    .limit(1);
  if (existing.length === 0 && existingCount >= MAX_PROJECT_MEMBERS) {
    return {
      ok: false,
      error: `A project can be shared with at most ${MAX_PROJECT_MEMBERS} people.`,
      code: "member-limit",
    };
  }

  await db
    .insert(schema.projectMembers)
    .values({
      id: randomId("pm"),
      projectId,
      userId: target.id,
      role: input.role,
      addedByUserId: owner.user.id,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.projectMembers.projectId, schema.projectMembers.userId],
      set: { role: input.role },
    });

  await auditProjectMemberChange({
    action: existing.length > 0 ? "project_member_role_changed" : "project_member_added",
    projectId,
    actingUserId: owner.user.id,
    metadata: { email: target.email, role: input.role },
  });

  // Notify member via in-app notification and Telegram push
  try {
    const targetSettings = await getUserSettings(target.id);
    const notificationsPrefs = targetSettings.notifications ?? {};
    const projectName = owner.note.title || "Untitled Project";
    const inviterName = owner.user.name || owner.user.email;

    if (notificationsPrefs.inApp !== false && notificationsPrefs.sharedProjectInvites !== false) {
      await createNotification({
        userId: target.id,
        type: "project_shared",
        title: "Project shared with you",
        body: `${inviterName} shared project "${projectName}" with you as ${input.role}.`,
        href: `/projects/${projectId}`,
        dedupeKey: `pm-share:${projectId}:${target.id}:${Date.now()}`,
      });
    }

    if (notificationsPrefs.telegramPush !== false && notificationsPrefs.sharedProjectInvites !== false) {
      const targetUserRow = await db
        .select({ chatId: schema.users.telegramChatId })
        .from(schema.users)
        .where(eq(schema.users.id, target.id))
        .limit(1);

      if (targetUserRow[0]?.chatId) {
        await sendTelegramNotification(
          {
            title: "🤝 Project Invitation",
            body: `You were invited to collaborate on "${projectName}" as ${input.role} by ${inviterName}.`,
            metadata: {
              Project: projectName,
              Role: input.role,
            },
          },
          { chatId: targetUserRow[0].chatId, userId: target.id },
        );
      }
    }
  } catch (err) {
    console.warn("[projects] Failed to deliver share notification:", err);
  }

  return {
    ok: true,
    member: {
      userId: target.id,
      email: target.email,
      name: target.name,
      image: target.image,
      role: input.role,
      createdAt: new Date(),
    },
  };
}

export async function updateProjectMemberRole(
  projectId: string,
  memberUserId: string,
  input: UpdateProjectMemberRoleInput,
): Promise<MutationResult> {
  const owner = await requireOwner(projectId);
  if (!owner.ok) {
    return { ok: false, error: owner.error, code: owner.code };
  }

  const updated = await db
    .update(schema.projectMembers)
    .set({ role: input.role })
    .where(
      and(
        eq(schema.projectMembers.projectId, projectId),
        eq(schema.projectMembers.userId, memberUserId),
      ),
    )
    .returning({ userId: schema.projectMembers.userId });
  if (updated.length === 0) {
    return { ok: false, error: "That person is not a member.", code: "not-a-member" };
  }

  await auditProjectMemberChange({
    action: "project_member_role_changed",
    projectId,
    actingUserId: owner.user.id,
    metadata: { memberUserId, role: input.role },
  });

  try {
    const memberSettings = await getUserSettings(memberUserId);
    const notificationsPrefs = memberSettings.notifications ?? {};
    const projectName = owner.note.title || "Untitled Project";

    if (notificationsPrefs.inApp !== false && notificationsPrefs.sharedProjectInvites !== false) {
      await createNotification({
        userId: memberUserId,
        type: "project_shared",
        title: "Project permissions updated",
        body: `Your access role on "${projectName}" was updated to ${input.role}.`,
        href: `/projects/${projectId}`,
        dedupeKey: `pm-role:${projectId}:${memberUserId}:${Date.now()}`,
      });
    }
  } catch (err) {
    console.warn("[projects] Failed to deliver role update notification:", err);
  }

  return { ok: true };
}

export async function removeProjectMember(
  projectId: string,
  memberUserId: string,
): Promise<MutationResult> {
  const owner = await requireOwner(projectId);
  if (!owner.ok) {
    return { ok: false, error: owner.error, code: owner.code };
  }

  const deleted = await db
    .delete(schema.projectMembers)
    .where(
      and(
        eq(schema.projectMembers.projectId, projectId),
        eq(schema.projectMembers.userId, memberUserId),
      ),
    )
    .returning({ userId: schema.projectMembers.userId });
  if (deleted.length === 0) {
    return { ok: false, error: "That person is not a member.", code: "not-a-member" };
  }

  await auditProjectMemberChange({
    action: "project_member_removed",
    projectId,
    actingUserId: owner.user.id,
    metadata: { memberUserId },
  });

  return { ok: true };
}
