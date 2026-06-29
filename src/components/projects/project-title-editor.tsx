"use client";

import * as React from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateNoteAction } from "@/server/notes/actions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function ProjectTitleEditor({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState(title);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const save = async () => {
    const nextTitle = value.trim();
    if (!nextTitle || nextTitle === title) {
      setValue(title);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateNoteAction(id, { title: nextTitle });
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to update project title.");
      setValue(title);
    } finally {
      setIsSaving(false);
    }
  };

  const cancel = () => {
    setValue(title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          disabled={isSaving}
          className="h-8 min-w-0 max-w-[min(28rem,calc(100vw-10rem))] border-input bg-background px-2 py-1 text-sm font-medium shadow-none"
          aria-label="Project title"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => void save()}
          disabled={isSaving}
          aria-label="Save project title"
        >
          <Check className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={cancel}
          disabled={isSaving}
          aria-label="Cancel editing project title"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(title);
        setIsEditing(true);
      }}
      className={cn(
        "group inline-flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm font-medium transition-colors",
        "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
      aria-label="Edit project title"
      title="Click to edit project title"
    >
      <span className="truncate">{title}</span>
      <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
