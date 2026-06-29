"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Folder,
  FileText,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { moveNoteInTreeAction } from "@/server/notes/actions";
import { cn } from "@/lib/utils";
import type { NoteTreeNode } from "@/server/notes/service";

type TreeItem = NoteTreeNode;
type TreeChild = NoteTreeNode["children"][number];

type DropTarget =
  | { kind: "root"; beforeId: string | null }
  | { kind: "child"; parentId: string; beforeId: string | null }
  | { kind: "project"; parentId: string };

const DROP_ROOT_END = "drop:root:end";

function makeRootDropId(beforeId: string) {
  return `drop:root:${beforeId}`;
}

function makeChildDropId(parentId: string, beforeId: string) {
  return `drop:child:${parentId}:${beforeId}`;
}

function makeChildEndDropId(parentId: string) {
  return `drop:child:${parentId}:end`;
}

function makeProjectDropId(parentId: string) {
  return `drop:project:${parentId}`;
}

function makeDragId(noteId: string) {
  return `drag:${noteId}`;
}

function extractNoteId(value: string) {
  return value.startsWith("drag:") ? value.slice("drag:".length) : value;
}

function parseDropTarget(value: string): DropTarget | null {
  if (value === DROP_ROOT_END) {
    return { kind: "root", beforeId: null };
  }
  if (value.startsWith("drop:root:")) {
    return { kind: "root", beforeId: value.slice("drop:root:".length) };
  }
  if (value.startsWith("drop:child:")) {
    const [, , parentId, beforeId] = value.split(":");
    if (!parentId) return null;
    return {
      kind: "child",
      parentId,
      beforeId: beforeId === "end" ? null : beforeId,
    };
  }
  if (value.startsWith("drop:project:")) {
    const parentId = value.slice("drop:project:".length);
    return parentId ? { kind: "project", parentId } : null;
  }
  return null;
}

function findNodeParentId(nodes: TreeItem[], noteId: string): string | null | undefined {
  for (const node of nodes) {
    if (node.id === noteId) return null;
    if (node.children.some((child) => child.id === noteId)) return node.id;
  }
  return undefined;
}

function findTopLevelNode(nodes: TreeItem[], noteId: string) {
  return nodes.find((node) => node.id === noteId) ?? null;
}

function removeNode(
  nodes: TreeItem[],
  noteId: string,
): { nodes: TreeItem[]; item: TreeItem | TreeChild | null } {
  const topLevelIndex = nodes.findIndex((node) => node.id === noteId);
  if (topLevelIndex >= 0) {
    const nextNodes = nodes.slice();
    const [item] = nextNodes.splice(topLevelIndex, 1);
    return { nodes: nextNodes, item };
  }

  for (const node of nodes) {
    const childIndex = node.children.findIndex((child) => child.id === noteId);
    if (childIndex >= 0) {
      const nextNodes = nodes.map((entry) =>
        entry.id === node.id
          ? {
              ...entry,
              children: entry.children.filter((child) => child.id !== noteId),
            }
          : entry,
      );
      return { nodes: nextNodes, item: node.children[childIndex] };
    }
  }

  return { nodes, item: null };
}

function insertNode(
  nodes: TreeItem[],
  item: TreeItem | TreeChild,
  target: DropTarget,
): TreeItem[] {
  if (target.kind === "root") {
    const topLevelItem = "children" in item ? item : { ...item, children: [] };
    const nextNodes = nodes.slice();
    const index =
      target.beforeId === null
        ? nextNodes.length
        : nextNodes.findIndex((node) => node.id === target.beforeId);
    if (index >= 0) {
      nextNodes.splice(index, 0, topLevelItem);
    } else {
      nextNodes.push(topLevelItem);
    }
    return nextNodes;
  }

  return nodes.map((node) => {
    if (node.id !== target.parentId) return node;
    const nextChildren = node.children.slice();
    const childItem =
      "children" in item
        ? {
            id: item.id,
            title: item.title,
            slug: item.slug,
            type: item.type,
            updatedAt: item.updatedAt,
            createdAt: item.createdAt,
          }
        : item;

    const index =
      target.kind === "project" || target.beforeId === null
        ? nextChildren.length
        : nextChildren.findIndex((child) => child.id === target.beforeId);
    if (index >= 0) {
      nextChildren.splice(index, 0, childItem);
    } else {
      nextChildren.push(childItem);
    }

    return {
      ...node,
      children: nextChildren,
    };
  });
}

function moveTreeItem(nodes: TreeItem[], noteId: string, target: DropTarget) {
  const { nodes: withoutNode, item } = removeNode(nodes, noteId);
  if (!item) return nodes;
  return insertNode(withoutNode, item, target);
}

function canDrop(nodes: TreeItem[], noteId: string, target: DropTarget) {
  const currentParentId = findNodeParentId(nodes, noteId);
  if (currentParentId === undefined) return false;

  const activeTopLevel = findTopLevelNode(nodes, noteId);
  const isParentNode = Boolean(activeTopLevel);
  const hasChildren = Boolean(activeTopLevel?.children.length);

  if (target.kind === "project" || target.kind === "child") {
    if (target.parentId === noteId) return false;
    if (activeTopLevel?.type === "project") return false;
    if (isParentNode && hasChildren) return false;
    return true;
  }

  return true;
}

function isDropTargetActive(activeId: string | null, overId: string, over: string | null) {
  return Boolean(activeId) && over === overId;
}

export function NotesTree({ nodes }: { nodes: NoteTreeNode[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [treeNodes, setTreeNodes] = React.useState(nodes);
  const [dragState, setDragState] = React.useState<{
    activeId: string | null;
    overId: string | null;
  }>({ activeId: null, overId: null });

  React.useEffect(() => {
    setTreeNodes(nodes);
  }, [nodes]);

  if (treeNodes.length === 0) return null;

  const ancestorId = (() => {
    const match = /(\/notes\/[^/]+)/.exec(pathname);
    const activeId = match?.[1].split("/").pop();
    if (!activeId) return null;
    return (
      treeNodes.find(
        (node) =>
          node.id !== activeId && node.children.some((child) => child.id === activeId),
      )?.id ?? null
    );
  })();

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeId = extractNoteId(String(event.active.id));
    const overValue = event.over ? String(event.over.id) : null;
    setDragState({ activeId: null, overId: null });

    if (!overValue) return;

    const target = parseDropTarget(overValue);
    if (!target) return;
    if (!canDrop(treeNodes, activeId, target)) {
      toast.error("Only plain notes without child notes can be dropped into projects.");
      return;
    }

    const targetParentId =
      target.kind === "root" ? null : target.parentId;
    const beforeId =
      target.kind === "project" ? null : target.beforeId;

    const previousNodes = treeNodes;
    const nextNodes = moveTreeItem(treeNodes, activeId, target);
    setTreeNodes(nextNodes);

    if (target.kind === "project" || target.kind === "child") {
      setOpen((current) => ({ ...current, [target.parentId]: true }));
    }

    try {
      await moveNoteInTreeAction(activeId, targetParentId, beforeId);
      router.refresh();
    } catch {
      setTreeNodes(previousNodes);
      toast.error("Failed to move note.");
    }
  };

  return (
    <div className="px-3 pt-2">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notes Tree
        </span>
        <Link
          href="/notes"
          className="text-muted-foreground hover:text-foreground"
          aria-label="All notes"
        >
          <Plus className="size-3.5" />
        </Link>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) =>
          setDragState({
            activeId: extractNoteId(String(event.active.id)),
            overId: null,
          })
        }
        onDragOver={(event) =>
          setDragState((current) => ({
            activeId: current.activeId,
            overId: event.over ? String(event.over.id) : null,
          }))
        }
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragState({ activeId: null, overId: null })}
      >
        <ul className="flex flex-col gap-0.5">
          {treeNodes.map((node) => {
            const isOpen = Boolean(open[node.id]) || ancestorId === node.id;
            const hasChildren = node.children.length > 0;
            const isProject = node.type === "project";
            return (
              <li key={node.id}>
                <DropZone
                  id={makeRootDropId(node.id)}
                  active={isDropTargetActive(
                    dragState.activeId,
                    makeRootDropId(node.id),
                    dragState.overId,
                  )}
                />
                <TreeRow
                  noteId={node.id}
                  title={node.title}
                  href={`/notes/${node.id}`}
                  isActive={pathname === `/notes/${node.id}`}
                  icon={isProject ? Folder : FileText}
                  canAcceptChildren={isProject}
                  projectDropId={isProject ? makeProjectDropId(node.id) : null}
                  projectDropActive={isProject && isDropTargetActive(
                    dragState.activeId,
                    makeProjectDropId(node.id),
                    dragState.overId,
                  )}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() =>
                        setOpen((current) => ({
                          ...current,
                          [node.id]: !current[node.id],
                        }))
                      }
                      className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                      aria-label={isOpen ? "Collapse" : "Expand"}
                    >
                      <ChevronRight
                        className={cn(
                          "size-3 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </button>
                  ) : (
                    <span className="block size-4 shrink-0" />
                  )}
                </TreeRow>

                {isOpen && (
                  <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l pl-1.5">
                    {node.children.map((child) => (
                      <li key={child.id}>
                        <DropZone
                          id={makeChildDropId(node.id, child.id)}
                          active={isDropTargetActive(
                            dragState.activeId,
                            makeChildDropId(node.id, child.id),
                            dragState.overId,
                          )}
                        />
                        <TreeRow
                          noteId={child.id}
                          title={child.title}
                          href={`/notes/${child.id}`}
                          isActive={pathname === `/notes/${child.id}`}
                          icon={FileText}
                        >
                          <span className="block size-4 shrink-0" />
                        </TreeRow>
                      </li>
                    ))}
                    <DropZone
                      id={makeChildEndDropId(node.id)}
                      active={isDropTargetActive(
                        dragState.activeId,
                        makeChildEndDropId(node.id),
                        dragState.overId,
                      )}
                      padded
                    />
                  </ul>
                )}
              </li>
            );
          })}
          <DropZone
            id={DROP_ROOT_END}
            active={isDropTargetActive(
              dragState.activeId,
              DROP_ROOT_END,
              dragState.overId,
            )}
            padded
          />
        </ul>
      </DndContext>
    </div>
  );
}

function TreeRow({
  noteId,
  title,
  href,
  isActive,
  icon: Icon,
  canAcceptChildren = false,
  projectDropId = null,
  projectDropActive = false,
  children,
}: {
  noteId: string;
  title: string;
  href: string;
  isActive: boolean;
  icon: typeof Folder;
  canAcceptChildren?: boolean;
  projectDropId?: string | null;
  projectDropActive?: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: makeDragId(noteId) });
  const drop = useDroppable({
    id: projectDropId ?? `noop:${noteId}`,
    disabled: !canAcceptChildren,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && "opacity-50")}
    >
      <div
        ref={canAcceptChildren ? drop.setNodeRef : undefined}
        className={cn(
          "flex items-center gap-0.5 rounded-md",
          projectDropActive && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
        )}
        {...attributes}
        {...listeners}
      >
        {children}
        <Link
          href={href}
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm transition-colors touch-none",
            isActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            projectDropActive && "bg-transparent",
          )}
        >
          <Icon className="size-3 shrink-0" />
          <span className="truncate">{title || "Untitled"}</span>
        </Link>
      </div>
    </div>
  );
}

function DropZone({
  id,
  active,
  padded = false,
}: {
  id: string;
  active: boolean;
  padded?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mx-2 h-1 rounded-full transition-colors",
        padded && "my-1",
        active ? "bg-foreground/40" : "bg-transparent",
      )}
    />
  );
}
