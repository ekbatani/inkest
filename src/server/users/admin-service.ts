import { eq, like, or, desc, sql, and, count } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { requireAdminUser } from "@/server/auth/admin";
import { createUserWithWorkspace } from "@/server/auth/users";
import { hashPassword } from "@/server/auth/password";

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  status: "active" | "suspended";
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  workspaceName: string | null;
  notesCount: number;
  projectsCount: number;
}

export interface AdminUserListResult {
  users: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
  stats: {
    totalUsers: number;
    totalAdmins: number;
    totalActive: number;
    totalSuspended: number;
  };
}

export interface ListUsersFilter {
  query?: string;
  role?: "all" | "admin" | "user";
  status?: "all" | "active" | "suspended";
  page?: number;
  limit?: number;
}

export async function listUsersAdmin(
  filter: ListUsersFilter = {},
): Promise<AdminUserListResult> {
  await requireAdminUser();

  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
  const offset = (page - 1) * limit;

  // Build filter conditions
  const conditions = [];

  if (filter.query && filter.query.trim()) {
    const q = `%${filter.query.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${schema.users.email})`, q),
        like(sql`lower(${schema.users.name})`, q),
      ),
    );
  }

  if (filter.role && filter.role !== "all") {
    conditions.push(eq(schema.users.role, filter.role));
  }

  if (filter.status && filter.status !== "all") {
    conditions.push(eq(schema.users.status, filter.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Query filtered users with pagination
  const userRows = await db
    .select()
    .from(schema.users)
    .where(whereClause)
    .orderBy(desc(schema.users.createdAt))
    .limit(limit)
    .offset(offset);

  // Total matching users
  const totalCountResult = await db
    .select({ count: count() })
    .from(schema.users)
    .where(whereClause);
  const total = totalCountResult[0]?.count ?? 0;

  // Global aggregate stats
  const allUsersStats = await db
    .select({
      total: count(),
      admins: sql<number>`sum(case when ${schema.users.role} = 'admin' then 1 else 0 end)`,
      active: sql<number>`sum(case when ${schema.users.status} = 'active' then 1 else 0 end)`,
      suspended: sql<number>`sum(case when ${schema.users.status} = 'suspended' then 1 else 0 end)`,
    })
    .from(schema.users);

  const stats = {
    totalUsers: allUsersStats[0]?.total ?? 0,
    totalAdmins: Number(allUsersStats[0]?.admins ?? 0),
    totalActive: Number(allUsersStats[0]?.active ?? 0),
    totalSuspended: Number(allUsersStats[0]?.suspended ?? 0),
  };

  // For the current page of users, fetch workspace and count notes/projects
  const enrichedUsers: AdminUserListItem[] = await Promise.all(
    userRows.map(async (u) => {
      const [ws, notesAgg] = await Promise.all([
        db
          .select({ name: schema.workspaces.name })
          .from(schema.workspaces)
          .where(eq(schema.workspaces.userId, u.id))
          .limit(1),
        db
          .select({
            notesCount: sql<number>`sum(case when ${schema.notes.type} = 'note' or ${schema.notes.type} = 'daily' then 1 else 0 end)`,
            projectsCount: sql<number>`sum(case when ${schema.notes.type} = 'project' then 1 else 0 end)`,
          })
          .from(schema.notes)
          .where(eq(schema.notes.userId, u.id)),
      ]);

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as "admin" | "user",
        status: u.status as "active" | "suspended",
        image: u.image,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        workspaceName: ws[0]?.name ?? null,
        notesCount: Number(notesAgg[0]?.notesCount ?? 0),
        projectsCount: Number(notesAgg[0]?.projectsCount ?? 0),
      };
    }),
  );

  return {
    users: enrichedUsers,
    total,
    page,
    limit,
    stats,
  };
}

export async function createUserAdmin(input: {
  email: string;
  name?: string;
  password: string;
  role: "admin" | "user";
}) {
  await requireAdminUser();

  const res = await createUserWithWorkspace(
    input.email,
    input.password,
    input.name,
    input.role,
  );

  if ("error" in res) {
    throw new Error(res.error);
  }

  return { success: true, userId: res.userId };
}

export async function updateUserRoleAdmin(input: {
  userId: string;
  role: "admin" | "user";
}) {
  const currentAdmin = await requireAdminUser();

  if (currentAdmin.id === input.userId && input.role !== "admin") {
    throw new Error("You cannot remove admin privileges from your own account.");
  }

  const targetUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, input.userId))
    .limit(1);

  if (targetUser.length === 0) {
    throw new Error("User not found.");
  }

  await db
    .update(schema.users)
    .set({
      role: input.role,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, input.userId));

  return { success: true };
}

export async function updateUserStatusAdmin(input: {
  userId: string;
  status: "active" | "suspended";
}) {
  const currentAdmin = await requireAdminUser();

  if (currentAdmin.id === input.userId && input.status === "suspended") {
    throw new Error("You cannot suspend your own account.");
  }

  const targetUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, input.userId))
    .limit(1);

  if (targetUser.length === 0) {
    throw new Error("User not found.");
  }

  await db
    .update(schema.users)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, input.userId));

  return { success: true };
}

export async function resetUserPasswordAdmin(input: {
  userId: string;
  newPassword: string;
}) {
  await requireAdminUser();

  if (!input.newPassword || input.newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const targetUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, input.userId))
    .limit(1);

  if (targetUser.length === 0) {
    throw new Error("User not found.");
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db
    .update(schema.users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, input.userId));

  return { success: true };
}

export async function deleteUserAdmin(input: { userId: string }) {
  const currentAdmin = await requireAdminUser();

  if (currentAdmin.id === input.userId) {
    throw new Error("You cannot delete your own account.");
  }

  const targetUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, input.userId))
    .limit(1);

  if (targetUser.length === 0) {
    throw new Error("User not found.");
  }

  // Delete user record; Drizzle foreign key cascade deletes workspaces, notes, tasks, etc.
  await db.delete(schema.users).where(eq(schema.users.id, input.userId));

  return { success: true };
}
