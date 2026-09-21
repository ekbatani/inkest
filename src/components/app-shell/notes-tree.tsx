"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Folder,
  FileText,
  FolderPlus,
  Plus,
  FileUp,
  FileCode,
  File,
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
import {
  createProjectAction,
  createNoteAction,
  moveNoteInTreeAction,
} from "@/server/notes/actions";
import { cn } from "@/lib/utils";
import type { NoteTreeNode } from "@/server/notes/service";
import { usesRtlTitleFont } from "@/lib/text/rtl";
import { DocumentUploadModal } from "@/components/reader/document-upload-modal";
import { useOptionalWorkspaceTabs, type WorkspaceTabType } from "@/components/tabs";

function getNodeIcon(node: NoteTreeNode) {
  if (node.type === "project") return Folder;
  if (node.type === "document") {
    if (node.fileType === "pdf") return File;
    if (node.fileType === "markdown") return FileCode;
    return FileText;
  }
  return FileText;
}

function getNodeHref(node: NoteTreeNode) {
  if (node.type === "project") {
    return `/projects/${node.id}`;
  }
  if (node.type === "document") {
    return `/reader/${node.documentId || node.id}`;
  }
  return `/notes/${node.id}`;
}

function getTabId(node: NoteTreeNode): string {
  if (node.type === "document") {
    return node.documentId || node.id;
  }
  return node.id;
}

type TreeItem = NoteTreeNode;

export function hasDescendant(node: TreeItem, targetId: string): boolean {
  return node.children.some(
    (child) =>
      child.id === targetId ||
      (child.documentId && child.documentId === targetId) ||
      hasDescendant(child, targetId),
  );
}

export function getAncestorIds(nodes: TreeItem[], targetId: string): string[] {
  const ancestors: string[] = [];

  function find(list: TreeItem[]): boolean {
    for (const item of list) {
      if (item.id === targetId || (item.documentId && item.documentId === targetId)) {
        return true;
      }
      if (item.children && item.children.length > 0) {
        if (find(item.children)) {
          ancestors.push(item.id);
          return true;
        }
      }
    }
    return false;
  }

  find(nodes);
  return ancestors;
}

export function getActiveItemId(pathname: string): string | null {
  const match = /(?:\/notes\/|\/projects\/|\/reader\/)([^/?#]+)/.exec(pathname);
  const id = match?.[1];
  return id && id !== "new" ? id : null;
}

type DropTarget =
  | { kind: "root"; beforeId: string | null }
  | { kind: "child"; parentId: string; beforeId: string | null }
  | { kind: "project"; parentId: string };

const DROP_ROOT_END = "drop:root:end";

function makeRootDropId(beforeId: string) {
  return `drop:root:${beforeId}`;
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

function findNodeParentId(nodes: TreeItem[], noteId: string, parentId: string | null = null): string | null | undefined {
  for (const node of nodes) {
    if (node.id === noteId) return parentId;
    const found = findNodeParentId(node.children, noteId, node.id);
    if (found !== undefined) return found;
  }
  return undefined;
}

function removeNode(
  nodes: TreeItem[],
  noteId: string,
): { nodes: TreeItem[]; item: TreeItem | null } {
  const topLevelIndex = nodes.findIndex((node) => node.id === noteId);
  if (topLevelIndex >= 0) {
    const nextNodes = nodes.slice();
    const [item] = nextNodes.splice(topLevelIndex, 1);
    return { nodes: nextNodes, item };
  }

  for (const node of nodes) {
    const nested = removeNode(node.children, noteId);
    if (nested.item) {
      return {
        nodes: nodes.map((entry) =>
          entry.id === node.id ? { ...entry, children: nested.nodes } : entry,
        ),
        item: nested.item,
      };
    }
  }

  return { nodes, item: null };
}

function insertNode(
  nodes: TreeItem[],
  item: TreeItem,
  target: DropTarget,
): TreeItem[] {
  if (target.kind === "root") {
    const nextNodes = nodes.slice();
    const index =
      target.beforeId === null
        ? nextNodes.length
        : nextNodes.findIndex((node) => node.id === target.beforeId);
    if (index >= 0) {
      nextNodes.splice(index, 0, item);
    } else {
      nextNodes.push(item);
    }
    return nextNodes;
  }

  return nodes.map((node) => {
    if (node.id !== target.parentId) return node;
    const nextChildren = node.children.slice();
    const childItem = item;

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

function isDescendant(
  nodes: TreeItem[],
  rootId: string,
  targetId: string,
): boolean {
  function findNode(list: TreeItem[], id: string): TreeItem | null {
    for (const item of list) {
      if (item.id === id) return item;
      const found = findNode(item.children, id);
      if (found) return found;
    }
    return null;
  }

  function contains(item: TreeItem, id: string): boolean {
    for (const child of item.children) {
      if (child.id === id) return true;
      if (contains(child, id)) return true;
    }
    return false;
  }

  const rootNode = findNode(nodes, rootId);
  if (!rootNode) return false;
  return contains(rootNode, targetId);
}

function canDrop(nodes: TreeItem[], noteId: string, target: DropTarget) {
  const currentParentId = findNodeParentId(nodes, noteId);
  if (currentParentId === undefined) return false;

  if (target.kind === "project" || target.kind === "child") {
    if (target.parentId === noteId) return false;
    if (isDescendant(nodes, noteId, target.parentId)) return false;
    return true;
  }

  return true;
}

function isDropTargetActive(activeId: string | null, overId: string, over: string | null) {
  return Boolean(activeId) && over === overId;
}

export function NotesTree({
  nodes,
  onNavigate,
}: {
  nodes: NoteTreeNode[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dndContextId = React.useId();
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
    // Server refreshes replace the canonical tree after optimistic drag updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTreeNodes(nodes);
  }, [nodes]);

  const handleCreateSubproject = React.useCallback(
    (parentId: string) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
      }
      setOpen((current) => ({ ...current, [parentId]: true }));
      onNavigate?.();
      React.startTransition(async () => {
        try {
          await createProjectAction(parentId);
        } catch {
          // Next.js redirect throws NEXT_REDIRECT which is expected
        }
      });
    },
    [onNavigate],
  );

  const handleCreateNote = React.useCallback(
    (parentId: string) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
      }
      setOpen((current) => ({ ...current, [parentId]: true }));
      onNavigate?.();
      React.startTransition(async () => {
        try {
          await createNoteAction(parentId);
        } catch {
          // Next.js redirect throws NEXT_REDIRECT which is expected
        }
      });
    },
    [onNavigate],
  );

  const tabsContext = useOptionalWorkspaceTabs();
  const routeActiveId = getActiveItemId(pathname);
  const activeId = tabsContext?.activeTabId ?? routeActiveId;
  const [prevActiveId, setPrevActiveId] = React.useState(activeId);

  if (activeId !== prevActiveId) {
    setPrevActiveId(activeId);
    if (activeId) {
      const ancestors = getAncestorIds(treeNodes, activeId);
      if (ancestors.length > 0) {
        setOpen((current) => {
          let changed = false;
          const next = { ...current };
          for (const id of ancestors) {
            if (next[id] !== true) {
              next[id] = true;
              changed = true;
            }
          }
          return changed ? next : current;
        });
      }
    }
  }

  const handleToggle = React.useCallback(
    (nodeId: string, isAncestor: boolean) => {
      setOpen((current) => {
        const currentlyOpen = current[nodeId] ?? isAncestor;
        return {
          ...current,
          [nodeId]: !currentlyOpen,
        };
      });
    },
    [],
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeId = extractNoteId(String(event.active.id));
    const overValue = event.over ? String(event.over.id) : null;
    setDragState({ activeId: null, overId: null });

    if (!overValue) return;

    const target = parseDropTarget(overValue);
    if (!target) return;
    if (!canDrop(treeNodes, activeId, target)) {
      toast.error("Cannot move this item here.");
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
        <div className="flex items-center gap-0.5">
          <DocumentUploadModal>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Upload document"
              title="Upload document"
            >
              <FileUp className="size-3.5" />
            </button>
          </DocumentUploadModal>
          <form action={createProjectAction} onSubmit={onNavigate}>
            <button
              type="submit"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Create project"
              title="Create project"
            >
              <FolderPlus className="size-3.5" />
            </button>
          </form>
          <Link
            href="/notes/new"
            onClick={onNavigate}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Create note"
            title="Create note"
          >
            <Plus className="size-3.5" />
          </Link>
        </div>
      </div>

      <DndContext
        id={dndContextId}
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
          {treeNodes.length === 0 ? (
            <li className="px-2 py-3 text-xs italic text-muted-foreground/70">
              No notes or projects yet
            </li>
          ) : (
            treeNodes.map((node) => {
              const tabId = getTabId(node);
              const isAncestorOfActive = Boolean(activeId && hasDescendant(node, activeId));
              const isOpen = open[node.id] ?? isAncestorOfActive;
              const hasChildren = node.children.length > 0;
              const isProject = node.type === "project";
              const isNodeActive = activeId === tabId || pathname === getNodeHref(node);
              return (
                <li key={node.id} className="notes-tree-row">
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
                    tabId={tabId}
                    tabType={node.type as WorkspaceTabType}
                    title={node.title}
                    href={getNodeHref(node)}
                    isActive={isNodeActive}
                    icon={getNodeIcon(node)}
                    canAcceptChildren={isProject}
                    projectDropId={isProject ? makeProjectDropId(node.id) : null}
                    projectDropActive={isProject && isDropTargetActive(
                      dragState.activeId,
                      makeProjectDropId(node.id),
                      dragState.overId,
                    )}
                    isProject={isProject}
                    onCreateSubproject={() => handleCreateSubproject(node.id)}
                    onCreateNote={() => handleCreateNote(node.id)}
                    onNavigate={onNavigate}
                  >
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => handleToggle(node.id, isAncestorOfActive)}
                        onPointerDown={(e) => e.stopPropagation()}
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
                    <TreeChildren
                      nodes={node.children}
                      pathname={pathname}
                      activeId={activeId}
                      open={open}
                      onToggle={handleToggle}
                      dragState={dragState}
                      onCreateSubproject={handleCreateSubproject}
                      onCreateNote={handleCreateNote}
                      onNavigate={onNavigate}
                    />
                  )}
                </li>
              );
            })
          )}
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

function TreeChildren({
  nodes,
  pathname,
  activeId,
  open,
  onToggle,
  dragState,
  onCreateSubproject,
  onCreateNote,
  onNavigate,
}: {
  nodes: TreeItem[];
  pathname: string;
  activeId: string | null;
  open: Record<string, boolean>;
  onToggle: (nodeId: string, isAncestor: boolean) => void;
  dragState: { activeId: string | null; overId: string | null };
  onCreateSubproject: (parentId: string) => void;
  onCreateNote: (parentId: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l pl-1.5">
      {nodes.map((node) => {
        const tabId = getTabId(node);
        const isAncestorOfActive = Boolean(activeId && hasDescendant(node, activeId));
        const isOpen = open[node.id] ?? isAncestorOfActive;
        const hasChildren = node.children.length > 0;
        const isProject = node.type === "project";
        const isNodeActive = activeId === tabId || pathname === getNodeHref(node);
        return (
          <li key={node.id} className="notes-tree-row">
            <TreeRow
              noteId={node.id}
              tabId={tabId}
              tabType={node.type as WorkspaceTabType}
              title={node.title}
              href={getNodeHref(node)}
              isActive={isNodeActive}
              icon={getNodeIcon(node)}
              canAcceptChildren={isProject}
              projectDropId={isProject ? makeProjectDropId(node.id) : null}
              projectDropActive={isProject && isDropTargetActive(
                dragState.activeId,
                makeProjectDropId(node.id),
                dragState.overId,
              )}
              isProject={isProject}
              onCreateSubproject={() => onCreateSubproject(node.id)}
              onCreateNote={() => onCreateNote(node.id)}
              onNavigate={onNavigate}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.id, isAncestorOfActive)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  <ChevronRight className={cn("size-3 transition-transform", isOpen && "rotate-90")} />
                </button>
              ) : <span className="block size-4 shrink-0" />}
            </TreeRow>
            {isOpen && (
              <TreeChildren
                nodes={node.children}
                pathname={pathname}
                activeId={activeId}
                open={open}
                onToggle={onToggle}
                dragState={dragState}
                onCreateSubproject={onCreateSubproject}
                onCreateNote={onCreateNote}
                onNavigate={onNavigate}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TreeRow({
  noteId,
  tabId,
  tabType,
  title,
  href,
  isActive,
  icon: Icon,
  canAcceptChildren = false,
  projectDropId = null,
  projectDropActive = false,
  isProject = false,
  onCreateSubproject,
  onCreateNote,
  onNavigate,
  children,
}: {
  noteId: string;
  tabId?: string;
  tabType?: WorkspaceTabType;
  title: string;
  href: string;
  isActive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  canAcceptChildren?: boolean;
  projectDropId?: string | null;
  projectDropActive?: boolean;
  isProject?: boolean;
  onCreateSubproject?: () => void;
  onCreateNote?: () => void;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  const tabsContext = useOptionalWorkspaceTabs();
  const targetTabId = tabId || noteId;
  const targetTabType = tabType || (isProject ? "project" : "note");

  const openInTabs = React.useCallback(
    (forceNewTab = false, stable = false) => {
      onNavigate?.();
      if (!tabsContext) return false;

      const defaultTitle =
        title ||
        (isProject
          ? "Untitled Project"
          : targetTabType === "document"
            ? "Untitled Document"
            : "Untitled Note");

      const existingTab = tabsContext.tabs.find((t) => t.id === targetTabId);
      if (existingTab && !forceNewTab) {
        tabsContext.switchTab(targetTabId);
        if (stable && !existingTab.stable) {
          tabsContext.toggleTabStable(targetTabId);
        }
      } else {
        tabsContext.openTab(
          {
            id: targetTabId,
            title: defaultTitle,
            url: href,
            type: targetTabType,
            stable: stable || forceNewTab,
          },
          true,
          { forceNewTab },
        );
      }
      return true;
    },
    [tabsContext, targetTabId, targetTabType, title, isProject, href, onNavigate],
  );

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      openInTabs(true, true);
      return;
    }

    if (e.button === 0) {
      if (tabsContext) {
        e.preventDefault();
        openInTabs(false, false);
      } else {
        onNavigate?.();
      }
    }
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      openInTabs(true, true);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      openInTabs(false, true);
    }
  };

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
      className={cn("group/tree-item relative", isDragging && "opacity-50")}
    >
      <div
        ref={canAcceptChildren ? drop.setNodeRef : undefined}
        className={cn(
          "flex items-center gap-0.5 rounded-md",
          projectDropActive && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
        )}
      >
        {children}
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={handleClick}
          onAuxClick={handleAuxClick}
          onDoubleClick={handleDoubleClick}
          className="flex size-5 shrink-0 items-center justify-center rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          title="Drag to reorder / Click to open"
          aria-label={title || "Item icon"}
        >
          <Icon className="size-3.5" />
        </button>
        <Link
          href={href}
          onClick={handleClick}
          onAuxClick={handleAuxClick}
          onDoubleClick={handleDoubleClick}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "group flex min-w-0 flex-1 items-center rounded-md px-1.5 py-1 text-sm transition-colors",
            isActive
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            projectDropActive && "bg-transparent",
          )}
        >
          <span
            className={cn(
              "truncate",
              usesRtlTitleFont(title) && "rtl-vazir",
            )}
          >
            {title || "Untitled"}
          </span>
        </Link>
        {isProject && (
          <div className="flex items-center opacity-0 group-hover/tree-item:opacity-100 focus-within:opacity-100 transition-opacity gap-0.5 pr-1">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCreateSubproject?.();
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="New subproject"
              aria-label={`New subproject in ${title || "project"}`}
            >
              <FolderPlus className="size-3" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCreateNote?.();
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="New note"
              aria-label={`New note in ${title || "project"}`}
            >
              <Plus className="size-3" />
            </button>
          </div>
        )}
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
