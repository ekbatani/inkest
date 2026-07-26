import Link from "next/link";
import { BookOpen, FileText, FileCode, File } from "lucide-react";
import { listDocuments } from "@/server/documents/service";
import { DocumentUploadModal } from "@/components/reader/document-upload-modal";
import { formatRelativeDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Research Reader | Inkest",
  description: "Read, annotate, and extract notes from research PDFs and documents.",
};

export default async function ReaderPage() {
  const documents = await listDocuments();

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            Research Reader Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingest PDFs, text files, and research papers with private attachment storage.
          </p>
        </div>
        <DocumentUploadModal />
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <BookOpen className="size-6" />
          </div>
          <div>
            <p className="font-semibold text-base">No research documents yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a PDF or Markdown paper to begin distraction-free reading and extracting notes.
            </p>
          </div>
          <DocumentUploadModal />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const formatSize = (bytes: number) => {
              if (bytes < 1024) return `${bytes} B`;
              if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
              return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            };

            return (
              <Link
                key={doc.id}
                href={`/reader/${doc.id}`}
                className="group flex flex-col justify-between rounded-xl border bg-card p-5 transition-all hover:border-primary hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-foreground">
                      {doc.fileType === "pdf" ? (
                        <File className="size-5 text-red-500" />
                      ) : doc.fileType === "markdown" ? (
                        <FileCode className="size-5 text-emerald-500" />
                      ) : (
                        <FileText className="size-5 text-blue-500" />
                      )}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {doc.fileType}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                    {doc.title}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatSize(doc.sizeBytes)}</span>
                  <span>{formatRelativeDate(doc.createdAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
