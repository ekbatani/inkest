import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId } from "@/lib/slug";

export type VaultCategory = "password" | "key" | "token" | "secret_note";

export async function listVaultItems() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const items = await db
    .select()
    .from(schema.vaultItems)
    .where(eq(schema.vaultItems.userId, user.id))
    .orderBy(desc(schema.vaultItems.createdAt));

  return items;
}

export async function createVaultItem(args: {
  title: string;
  category: VaultCategory;
  ciphertext: string;
  iv: string;
  salt: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");

  const id = randomId("vlt");

  await db.insert(schema.vaultItems).values({
    id,
    userId: user.id,
    workspaceId: workspace.id,
    title: args.title,
    category: args.category,
    ciphertext: `${args.salt}:${args.ciphertext}`, // Store salt prefixed
    iv: args.iv,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Write audit log
  await db.insert(schema.auditLogs).values({
    id: randomId("audit"),
    userId: user.id,
    workspaceId: workspace.id,
    action: "vault_item_created",
    entityType: "vault_item",
    entityId: id,
    createdAt: new Date(),
  });

  return { id };
}

export async function deleteVaultItem(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const workspace = await getWorkspaceForUser(user.id);

  await db
    .delete(schema.vaultItems)
    .where(and(eq(schema.vaultItems.id, id), eq(schema.vaultItems.userId, user.id)));

  if (workspace) {
    await db.insert(schema.auditLogs).values({
      id: randomId("audit"),
      userId: user.id,
      workspaceId: workspace.id,
      action: "vault_item_deleted",
      entityType: "vault_item",
      entityId: id,
      createdAt: new Date(),
    });
  }
}
