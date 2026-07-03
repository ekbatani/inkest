"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyCodeBlockProps = {
  code: string;
  className?: string;
};

export function CopyCodeBlock({ code, className }: CopyCodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — select the text manually");
    }
  }

  return (
    <div className={cn("group/code relative", className)}>
      <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-muted/40 p-4 pe-12 font-mono text-xs leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        className="absolute end-2 top-2 opacity-70 group-hover/code:opacity-100"
        aria-label="Copy command"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}
