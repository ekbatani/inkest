"use client";

import * as React from "react";
import { Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { insertTextAtCursor } from "./markdown-editor-utils";

type Props = {
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
  iconOnly?: boolean;
  variant?: Parameters<typeof Button>[0]["variant"];
  size?: Parameters<typeof Button>[0]["size"];
  className?: string;
};

const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/epub+zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf",
  ".epub",
  ".doc",
  ".docx",
].join(",");

export function AttachmentUploadButton({
  editorRef,
  iconOnly = false,
  variant = "ghost",
  size = iconOnly ? "icon-sm" : "sm",
  className,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const { markdown } = await res.json();
      insertTextAtCursor(editorRef, `\n${markdown}\n`);
      toast.success("Attachment inserted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn(iconOnly ? "" : "gap-1.5", className)}
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      aria-label="Attach file or image"
      title={iconOnly ? undefined : "Attach file"}
    >
      {uploading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Paperclip className="size-4" />
      )}
      {!iconOnly && <span className="hidden sm:inline">Attach</span>}
    </Button>
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={onFileChange}
      />
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent>Attach file or image</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </>
  );
}
