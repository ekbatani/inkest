"use server";

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

  const result = await importDocument(file);
  if ("error" in result) {
    throw new Error(result.error);
  }

  return result.document;
}

export async function getDocumentsAction() {
  return listDocuments();
}

export async function deleteDocumentAction(docId: string) {
  return deleteDocument(docId);
}
