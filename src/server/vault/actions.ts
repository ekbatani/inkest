"use server";

import { createVaultItem, deleteVaultItem, type VaultCategory } from "./vault-service";
import { revalidatePath } from "next/cache";

export async function createVaultItemAction(args: {
  title: string;
  category: VaultCategory;
  ciphertext: string;
  iv: string;
  salt: string;
}) {
  const res = await createVaultItem(args);
  revalidatePath("/vault");
  return res;
}

export async function deleteVaultItemAction(id: string) {
  await deleteVaultItem(id);
  revalidatePath("/vault");
}
