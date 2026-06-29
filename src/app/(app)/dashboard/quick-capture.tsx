"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { quickCaptureAction } from "./actions";

export function QuickCapture() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function onSave() {
    const content = text.trim();
    if (!content) return;
    setSaving(true);
    try {
      const result = await quickCaptureAction(content);
      setText("");
      toast.success("Note created");
      router.push(`/notes/${result.id}`);
    } catch {
      toast.error("Failed to create note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border bg-transparent p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="size-4" />
        Quick capture
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot down a thought..."
        className="min-h-20 resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:bg-transparent dark:bg-transparent focus-visible:ring-0"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSave();
          }
        }}
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Press Ctrl + Enter to save
        </span>
        <Button
          size="sm"
          onClick={onSave}
          disabled={!text.trim() || saving}
        >
          {saving ? "Saving..." : "Save note"}
        </Button>
      </div>
    </section>
  );
}
