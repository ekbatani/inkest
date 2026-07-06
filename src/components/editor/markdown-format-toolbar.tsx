"use client";

import * as React from "react";
import {
  Bold,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  MessageSquarePlus,
  Pilcrow,
  Quote,
  Strikethrough,
  Type,
} from "lucide-react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  applyMarkdownFormat,
  type MarkdownFormat,
} from "@/components/editor/markdown-editor-utils";
import { cn } from "@/lib/utils";

type Props = {
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
  className?: string;
  onAction?: () => void;
};

export function MarkdownFormatToolbar({ editorRef, className, onAction }: Props) {
  const apply = (format: MarkdownFormat) => {
    applyMarkdownFormat(editorRef, format);
    onAction?.();
  };

  const addComment = () => {
    const comment = window.prompt("Comment");
    if (comment === null) return;
    if (!comment.trim()) {
      toast.error("Write a comment first.");
      return;
    }
    applyMarkdownFormat(editorRef, "comment", { comment });
    onAction?.();
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-0.5 rounded-lg border border-border/70 bg-background/95 p-0.5 shadow-lg backdrop-blur",
        className,
      )}
      onMouseDown={(event) => event.preventDefault()}
    >
      <ToolButton label="Bold" onClick={() => apply("bold")}>
        <Bold className="size-3.5" />
      </ToolButton>
      <ToolButton label="Italic" onClick={() => apply("italic")}>
        <Italic className="size-3.5" />
      </ToolButton>
      <ToolButton label="Strikethrough" onClick={() => apply("strikethrough")}>
        <Strikethrough className="size-3.5" />
      </ToolButton>
      <ToolButton label="Inline code" onClick={() => apply("inline-code")}>
        <Code2 className="size-3.5" />
      </ToolButton>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Headings" />}
        >
          <Type className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => apply("heading-1")}>
              <Heading1 className="size-4" /> Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => apply("heading-2")}>
              <Heading2 className="size-4" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => apply("heading-3")}>
              <Pilcrow className="size-4" /> Heading 3
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => apply("small")}>Small text</DropdownMenuItem>
            <DropdownMenuItem onClick={() => apply("large")}>Large text</DropdownMenuItem>
            <DropdownMenuItem onClick={() => apply("huge")}>Huge text</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolButton label="Checklist" onClick={() => apply("check-list")}>
        <CheckSquare className="size-3.5" />
      </ToolButton>
      <ToolButton label="Bulleted list" onClick={() => apply("bullet-list")}>
        <List className="size-3.5" />
      </ToolButton>
      <ToolButton label="Numbered list" onClick={() => apply("numbered-list")}>
        <ListOrdered className="size-3.5" />
      </ToolButton>
      <ToolButton label="Quote" onClick={() => apply("quote")}>
        <Quote className="size-3.5" />
      </ToolButton>
      <ToolButton label="Highlight" onClick={() => apply("highlight")}>
        <Highlighter className="size-3.5" />
      </ToolButton>
      <ToolButton label="Comment" onClick={addComment}>
        <MessageSquarePlus className="size-3.5" />
      </ToolButton>
    </div>
  );
}

export function FloatingMarkdownFormatToolbar({ editorRef }: Props) {
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const openSourceRef = React.useRef<"selection" | "context" | null>(null);
  const [position, setPosition] = React.useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });

  const clampPosition = React.useCallback((x: number, y: number) => {
    const width = toolbarRef.current?.offsetWidth ?? 360;
    const height = toolbarRef.current?.offsetHeight ?? 38;
    const margin = 12;

    return {
      x: Math.min(Math.max(margin, x), window.innerWidth - width - margin),
      y: Math.min(Math.max(margin, y), window.innerHeight - height - margin),
    };
  }, []);

  const showFromSelection = React.useCallback(() => {
    if (openSourceRef.current === "context") return;

    const view = editorRef.current?.view;
    if (!view) return;

    const selection = view.state.selection.main;
    if (selection.empty) {
      openSourceRef.current = null;
      setPosition((current) => ({ ...current, open: false }));
      return;
    }

    const from = view.coordsAtPos(selection.from);
    const to = view.coordsAtPos(selection.to);
    if (!from || !to) return;

    const next = clampPosition((from.left + to.right) / 2 - 180, from.top - 48);
    openSourceRef.current = "selection";
    setPosition({ open: true, ...next });
  }, [clampPosition, editorRef]);

  const closeToolbar = React.useCallback(() => {
    openSourceRef.current = null;
    setPosition((current) => ({ ...current, open: false }));
  }, []);

  React.useEffect(() => {
    let cleanup: (() => void) | undefined;
    let disposed = false;

    const attach = () => {
      const view = editorRef.current?.view;
      if (!view) {
        if (!disposed) window.setTimeout(attach, 50);
        return;
      }

      const showFromPointer = (event: MouseEvent) => {
        if (!view.dom.contains(event.target as Node)) return;
        window.setTimeout(showFromSelection, 0);
      };

      const showFromContextMenu = (event: MouseEvent) => {
        if (!view.dom.contains(event.target as Node)) return;
        event.preventDefault();

        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null && view.state.selection.main.empty) {
          view.dispatch({ selection: { anchor: pos } });
        }

        const next = clampPosition(event.clientX, event.clientY);
        openSourceRef.current = "context";
        setPosition({ open: true, ...next });
        view.focus();
      };

      const hideOnOutsidePointer = (event: MouseEvent) => {
        const target = event.target as Node;
        if (view.dom.contains(target) || toolbarRef.current?.contains(target)) return;
        closeToolbar();
      };

      const hideOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          closeToolbar();
        } else {
          window.setTimeout(showFromSelection, 0);
        }
      };

      view.dom.addEventListener("mouseup", showFromPointer);
      view.dom.addEventListener("keyup", hideOnEscape);
      view.dom.addEventListener("contextmenu", showFromContextMenu);
      window.addEventListener("resize", showFromSelection);
      document.addEventListener("selectionchange", showFromSelection);
      document.addEventListener("mousedown", hideOnOutsidePointer);

      cleanup = () => {
        view.dom.removeEventListener("mouseup", showFromPointer);
        view.dom.removeEventListener("keyup", hideOnEscape);
        view.dom.removeEventListener("contextmenu", showFromContextMenu);
        window.removeEventListener("resize", showFromSelection);
        document.removeEventListener("selectionchange", showFromSelection);
        document.removeEventListener("mousedown", hideOnOutsidePointer);
      };
    };

    attach();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [clampPosition, closeToolbar, editorRef, showFromSelection]);

  if (!position.open) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
    >
      <MarkdownFormatToolbar
        editorRef={editorRef}
        onAction={closeToolbar}
      />
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
