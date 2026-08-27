"use server";

import { revalidatePath } from "next/cache";
import {
  importDocument,
  listDocuments,
  deleteDocument,
} from "@/server/documents/service";

export async function uploadDocumentAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) {
    throw new Error("No file provided");
  }
  const parentId = (formData.get("parentId") as string | null) || null;

  const result = await importDocument(file, parentId);
  if ("error" in result) {
    throw new Error(result.error);
  }

  revalidatePath("/", "layout");
  return result.document;
}

export async function getDocumentsAction() {
  return listDocuments();
}

export async function deleteDocumentAction(docId: string) {
  const result = await deleteDocument(docId);
  revalidatePath("/", "layout");
  return result;
}
