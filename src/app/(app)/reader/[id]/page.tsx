import { notFound } from "next/navigation";
import { getDocumentById, getDocumentContent } from "@/server/documents/service";
import { listAnnotationsForDocument } from "@/server/documents/annotations-service";
import { DocumentReaderView } from "@/components/reader/document-reader-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) return { title: "Document Not Found | Inkest" };
  return {
    title: `${doc.title} | Reader | Inkest`,
    description: `Read and annotate ${doc.title}.`,
  };
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) notFound();

  const [contentResult, initialAnnotations] = await Promise.all([
    getDocumentContent(doc.id),
    listAnnotationsForDocument(doc.id),
  ]);

  const content = "content" in contentResult ? contentResult.content : "";

  return (
    <DocumentReaderView
      doc={doc}
      content={content}
      initialAnnotations={initialAnnotations}
    />
  );
}
