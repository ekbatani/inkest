import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId } from "@/lib/slug";

export const MAX_VAULT_FILENAME_LENGTH = 255;
export const MAX_VAULT_CONTENT_LENGTH = 50_000;
// AES-GCM ciphertext hex for 50,000 UTF-8 bytes is ~100KB-120KB hex characters
export const MAX_VAULT_CIPHERTEXT_LENGTH = 200_000;

export const vaultCategoryEnum = ["password", "key", "token", "secret_note"] as const;
export type VaultCategory = (typeof vaultCategoryEnum)[number];

export const createVaultItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "File name is required")
    .max(MAX_VAULT_FILENAME_LENGTH, `File name must be under ${MAX_VAULT_FILENAME_LENGTH} characters`),
  category: z.enum(vaultCategoryEnum).default("secret_note"),
  ciphertext: z
    .string()
    .min(1, "Ciphertext is required")
    .max(MAX_VAULT_CIPHERTEXT_LENGTH, `Secret payload exceeds maximum size limit (${MAX_VAULT_CONTENT_LENGTH} chars)`),
  iv: z.string().min(1, "IV is required").max(100),
  salt: z.string().min(1, "Salt is required").max(100),
});

export type CreateVaultItemInput = z.infer<typeof createVaultItemSchema>;

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

export async function createVaultItem(rawArgs: CreateVaultItemInput) {
  const args = createVaultItemSchema.parse(rawArgs);

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
  if (!id || typeof id !== "string") {
    throw new Error("INVALID_ID");
  }

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
