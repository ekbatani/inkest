"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Network, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GraphNode = {
  id: string;
  title: string;
  type?: string;
  connections: string[]; // Note IDs this note links to or shares tags with
};

export function LightweightGraphView({
  currentNoteId,
  nodes = [],
  onClose,
}: {
  currentNoteId: string;
  nodes: GraphNode[];
  onClose?: () => void;
}) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const activeNode = nodes.find((n) => n.id === currentNoteId) ?? nodes[0];
  const connectedNodes = React.useMemo(() => {
    if (!activeNode) return [];
    const connectedIds = new Set(activeNode.connections);
    return nodes.filter((n) => connectedIds.has(n.id) && n.id !== activeNode.id);
  }, [activeNode, nodes]);

  // Keyboard navigation for accessible graph exploration
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, connectedNodes.length));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + connectedNodes.length) % Math.max(1, connectedNodes.length),
        );
      } else if (e.key === "Enter" && connectedNodes[selectedIndex]) {
        e.preventDefault();
        router.push(`/notes/${connectedNodes[selectedIndex].id}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connectedNodes, selectedIndex, router, onClose]);

  if (!activeNode) return null;

  return (
    <div className="rounded-xl border bg-card/95 p-5 shadow-lg backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Network className="size-4 text-primary animate-pulse motion-reduce:animate-none" />
          <span>Associative Connection Graph</span>
          <Badge variant="secondary" className="text-[10px]">
            {connectedNodes.length} connections
          </Badge>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Use <kbd className="rounded border px-1 py-0.5 text-[10px]">↑/↓/←/→</kbd> to navigate connections, <kbd className="rounded border px-1 py-0.5 text-[10px]">Enter</kbd> to open.
      </p>

      {/* SVG Radial Graph Representation */}
      <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-lg bg-muted/30 p-4 border border-dashed">
        <svg className="absolute inset-0 h-full w-full stroke-muted-foreground/30 stroke-[1.5]">
          {connectedNodes.map((node, i) => {
            const angle = (i / Math.max(1, connectedNodes.length)) * 2 * Math.PI;
            const radius = 80;
            const cx = 150 + radius * Math.cos(angle);
            const cy = 100 + radius * Math.sin(angle);
            return (
              <line
                key={node.id}
                x1="150"
                y1="100"
                x2={cx}
                y2={cy}
                className={cn(
                  "transition-all duration-300 motion-reduce:transition-none",
                  i === selectedIndex && "stroke-primary stroke-2",
                )}
              />
            );
          })}
        </svg>

        {/* Center Node */}
        <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs text-center shadow-md p-1 truncate">
          {activeNode.title.slice(0, 8)}
        </div>
      </div>

      {/* Connection List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {connectedNodes.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No direct links or connections found for this note yet. Add <code className="text-primary">[[Note Title]]</code> to connect!
          </p>
        ) : (
          connectedNodes.map((node, idx) => (
            <Link
              key={node.id}
              href={`/notes/${node.id}`}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors",
                idx === selectedIndex
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-accent text-foreground",
              )}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span className="truncate">{node.title || "Untitled"}</span>
              <ArrowUpRight className="size-3 shrink-0" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
