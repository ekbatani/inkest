"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, FileCode, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadDocumentAction } from "@/server/documents/actions";
import { toast } from "sonner";

export function DocumentUploadModal({
  children,
}: {
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const handleUploadFile = async (file: File) => {
    const isPdf = file.name.endsWith(".pdf") || file.type === "application/pdf";
    const isTxt = file.name.endsWith(".txt") || file.type === "text/plain";
    const isMd = file.name.endsWith(".md") || file.type === "text/markdown";

    if (!isPdf && !isTxt && !isMd) {
      toast.error("Unsupported file type. Please upload a PDF, .txt, or .md file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds 20MB limit.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const doc = await uploadDocumentAction(formData);
      toast.success(`Imported "${doc.title}" successfully.`);
      setOpen(false);
      router.push(`/reader/${doc.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ? (
            (children as React.ReactElement)
          ) : (
            <Button className="gap-2">
              <Upload className="size-4" />
              Import Document
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Research Document</DialogTitle>
          <DialogDescription>
            Upload PDF, Plain Text (.txt), or Markdown (.md) documents to read and annotate.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-border/70 hover:border-primary/50"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Processing & encrypting upload…</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex gap-2 text-muted-foreground">
                <File className="size-6 text-red-500" />
                <FileText className="size-6 text-blue-500" />
                <FileCode className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold mb-1">
                Drag & drop your document here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports PDF, TXT, MD up to 20MB. Encrypted & private.
              </p>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90">
                Browse Files
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      void handleUploadFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
