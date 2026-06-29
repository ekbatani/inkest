import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Note } from "@/server/db/schema";

const statusConfig: Record<
  Note["status"],
  {
    label: string;
    variant: "default" | "secondary" | "outline";
    className?: string;
  }
> = {
  none: { label: "", variant: "outline" },
  todo: {
    label: "To do",
    variant: "outline",
    className:
      "border-amber-300/70 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200",
  },
  doing: {
    label: "In progress",
    variant: "secondary",
    className:
      "bg-sky-500/12 text-sky-700 dark:bg-sky-500/18 dark:text-sky-200",
  },
  done: {
    label: "Done",
    variant: "default",
    className:
      "bg-emerald-600/90 text-white dark:bg-emerald-500/85 dark:text-emerald-50",
  },
  paused: {
    label: "Paused",
    variant: "outline",
    className:
      "border-zinc-300/80 bg-zinc-500/8 text-zinc-700 dark:border-zinc-600/60 dark:bg-zinc-500/10 dark:text-zinc-300",
  },
  archived: {
    label: "Archived",
    variant: "outline",
    className:
      "border-zinc-300/70 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
  },
};

export function NoteStatusBadge({ status }: { status: Note["status"] }) {
  const config = statusConfig[status];
  if (!config.label) return null;
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
