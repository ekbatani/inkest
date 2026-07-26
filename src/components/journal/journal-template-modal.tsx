"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Sun, Calendar, GitFork, Users, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { JOURNAL_TEMPLATES, type JournalTemplateType } from "@/lib/journal-templates";
import { createJournalEntryAction } from "@/server/journal/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICONS: Record<string, React.ReactNode> = {
  Sun: <Sun className="size-5 text-amber-500" />,
  Calendar: <Calendar className="size-5 text-blue-500" />,
  GitFork: <GitFork className="size-5 text-purple-500" />,
  BookOpen: <BookOpen className="size-5 text-emerald-500" />,
  Users: <Users className="size-5 text-rose-500" />,
};

export function JournalTemplateModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [loadingType, setLoadingType] = React.useState<JournalTemplateType | null>(null);

  const handleSelectTemplate = async (type: JournalTemplateType) => {
    setLoadingType(type);
    try {
      const res = await createJournalEntryAction({ templateType: type });
      toast.success("Journal entry created!");
      onOpenChange(false);
      router.push(`/notes/${res.noteId}`);
    } catch {
      toast.error("Failed to create journal entry.");
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" /> Choose Journal Template
          </DialogTitle>
          <DialogDescription>
            Select a structured template for guided reflections, decision logs, or research synthesis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 sm:grid-cols-2">
          {Object.values(JOURNAL_TEMPLATES).map((template) => (
            <button
              key={template.type}
              onClick={() => handleSelectTemplate(template.type)}
              disabled={Boolean(loadingType)}
              className="flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:border-violet-500 hover:bg-violet-500/5 hover:shadow-sm disabled:opacity-50"
            >
              <div className="flex w-full items-center justify-between">
                {ICONS[template.icon]}
                {loadingType === template.type && <Loader2 className="size-4 animate-spin text-violet-500" />}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{template.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
