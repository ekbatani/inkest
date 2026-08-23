"use server";

import {
  createVaultItem,
  deleteVaultItem,
  createVaultItemSchema,
  type CreateVaultItemInput,
} from "./vault-service";
import { revalidatePath } from "next/cache";

export async function createVaultItemAction(args: CreateVaultItemInput) {
  const validated = createVaultItemSchema.parse(args);
  const res = await createVaultItem(validated);
  revalidatePath("/vault");
  return res;
}

export async function deleteVaultItemAction(id: string) {
  await deleteVaultItem(id);
  revalidatePath("/vault");
}
