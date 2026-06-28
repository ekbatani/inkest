import { Badge } from "@/components/ui/badge";
import type { Note } from "@/server/db/schema";

const statusConfig: Record<
  Note["status"],
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  none: { label: "", variant: "outline" },
  todo: { label: "To do", variant: "outline" },
  doing: { label: "In progress", variant: "secondary" },
  done: { label: "Done", variant: "default" },
  paused: { label: "Paused", variant: "outline" },
  archived: { label: "Archived", variant: "outline" },
};

export function NoteStatusBadge({ status }: { status: Note["status"] }) {
  const config = statusConfig[status];
  if (!config.label) return null;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
