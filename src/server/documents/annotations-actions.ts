"use server";

import { revalidatePath } from "next/cache";
import {
  createAnnotation,
  listAnnotationsForDocument,
  deleteAnnotation,
  extractAnnotationToNote,
} from "@/server/documents/annotations-service";

export async function createAnnotationAction(input: {
  documentId: string;
  highlightText: string;
  comment?: string;
  color?: string;
  pageNumber?: number;
  positionSelector?: string;
}) {
  const annotation = await createAnnotation(input);
  revalidatePath(`/reader/${input.documentId}`);
  return annotation;
}

export async function listAnnotationsAction(documentId: string) {
  return listAnnotationsForDocument(documentId);
}

export async function deleteAnnotationAction(
  annotationId: string,
  documentId: string,
) {
  const result = await deleteAnnotation(annotationId);
  revalidatePath(`/reader/${documentId}`);
  return result;
}

export async function extractAnnotationAction(input: {
  annotationId: string;
  documentTitle: string;
}) {
  const result = await extractAnnotationToNote(input);
  revalidatePath("/notes");
  return result;
}
