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
  Link2,
  List,
  ListOrdered,
  MessageSquarePlus,
  Pilcrow,
  Quote,
  Search,
  Sparkles,
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
  openFindAndReplace,
  triggerOpenLinkDialog,
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

  const openLinkDialog = () => {
    triggerOpenLinkDialog(editorRef);
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

  const triggerAskAi = () => {
    window.dispatchEvent(new CustomEvent("inkest:ask-ai"));
    onAction?.();
  };


  return (
    <div
      className={cn(
        "flex min-w-0 max-w-[calc(100vw-24px)] overflow-x-auto scrollbar-none items-center gap-0.5 rounded-lg border border-border/70 bg-background/95 p-0.5 shadow-lg backdrop-blur",
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
      <ToolButton label="Code block" onClick={() => apply("code-block")}>
        <Code2 className="size-3.5" strokeWidth={1.5} />
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
      <ToolButton label="Link (⌘K / Ctrl+K)" onClick={openLinkDialog}>
        <Link2 className="size-3.5" />
      </ToolButton>

      <ToolButton
        label="Find and replace (⌘F)"
        onClick={() => {
          openFindAndReplace(editorRef);
          onAction?.();
        }}
      >
        <Search className="size-3.5" />
      </ToolButton>


      <div className="mx-0.5 h-4 w-px bg-border/60" />

      {/* Ask AI button on selection */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Ask AI Assistant"
              onClick={triggerAskAi}
              className="text-violet-500 hover:text-violet-600 hover:bg-violet-500/10"
            />
          }
        >
          <Sparkles className="size-3.5 text-violet-500" />
        </TooltipTrigger>
        <TooltipContent>Ask AI about selection</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function FloatingMarkdownFormatToolbar({ editorRef }: Props) {
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const isOpenRef = React.useRef<boolean>(false);
  const openedSelectionRef = React.useRef<{ anchor: number; head: number } | null>(null);

  // Mobile touch gesture tracking
  const longTouchTimerRef = React.useRef<number | null>(null);
  const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const isLongTouchingRef = React.useRef<boolean>(false);
  const justFinishedLongTouchRef = React.useRef<boolean>(false);
  const finishLongTouchTimerRef = React.useRef<number | null>(null);

  const [position, setPosition] = React.useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });

  const clampPosition = React.useCallback((x: number, y: number) => {
    const margin = 12;
    const width = toolbarRef.current?.offsetWidth ?? 380;
    const height = toolbarRef.current?.offsetHeight ?? 38;

    // The Math.max guards keep the toolbar on-screen when the estimated
    // width exceeds a narrow viewport (toolbarRef is still null pre-open).
    return {
      x: Math.min(
        Math.max(margin, x),
        Math.max(margin, window.innerWidth - width - margin),
      ),
      y: Math.min(
        Math.max(margin, y),
        Math.max(margin, window.innerHeight - height - margin),
      ),
    };
  }, []);

  // Correct the estimated pre-open position once the real toolbar is
  // rendered and measurable — the fallback width skews small screens.
  React.useLayoutEffect(() => {
    if (!position.open) return;
    const el = toolbarRef.current;
    if (!el) return;
    const margin = 12;
    const maxX = Math.max(margin, window.innerWidth - el.offsetWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - el.offsetHeight - margin);
    const x = Math.min(Math.max(margin, position.x), maxX);
    const y = Math.min(Math.max(margin, position.y), maxY);
    if (x !== position.x || y !== position.y) {
      setPosition((current) => ({ ...current, x, y }));
    }
  }, [position.open, position.x, position.y]);

  const closeToolbar = React.useCallback(() => {
    isOpenRef.current = false;
    openedSelectionRef.current = null;
    setPosition((current) => (current.open ? { ...current, open: false } : current));
  }, []);

  const openToolbarAt = React.useCallback(
    (clientX: number, clientY: number) => {
      const view = editorRef.current?.view;
      if (!view) return;

      const pos = view.posAtCoords({ x: clientX, y: clientY });
      const sel = view.state.selection.main;

      // If clicked outside current selection or selection is empty, place cursor at target pos
      if (pos !== null && (sel.empty || pos < sel.from || pos > sel.to)) {
        view.dispatch({ selection: { anchor: pos } });
      }

      const width = toolbarRef.current?.offsetWidth ?? 380;
      const targetX = clientX - width / 2;
      const targetY = clientY - 48 < 12 ? clientY + 16 : clientY - 48;
      const next = clampPosition(targetX, targetY);

      const currentSel = view.state.selection.main;
      openedSelectionRef.current = {
        anchor: currentSel.anchor,
        head: currentSel.head,
      };
      isOpenRef.current = true;
      setPosition({ open: true, ...next });
      view.focus();
    },
    [clampPosition, editorRef],
  );

  React.useEffect(() => {
    let cleanup: (() => void) | undefined;
    let disposed = false;

    const attach = () => {
      const view = editorRef.current?.view;
      if (!view) {
        if (!disposed) window.setTimeout(attach, 50);
        return;
      }

      // Context menu handler (desktop right-click and native mobile long-press)
      const handleContextMenu = (event: MouseEvent) => {
        if (!view.dom.contains(event.target as Node)) return;
        event.preventDefault();
        openToolbarAt(event.clientX, event.clientY);
      };

      // Long touch handling for mobile touch devices
      const handleTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) {
          if (longTouchTimerRef.current) {
            clearTimeout(longTouchTimerRef.current);
            longTouchTimerRef.current = null;
          }
          return;
        }

        const touch = event.touches[0];
        if (!touch) return;

        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

        if (longTouchTimerRef.current) {
          clearTimeout(longTouchTimerRef.current);
        }

        longTouchTimerRef.current = window.setTimeout(() => {
          isLongTouchingRef.current = true;
          openToolbarAt(touch.clientX, touch.clientY);
        }, 500);
      };

      const handleTouchMove = (event: TouchEvent) => {
        if (!longTouchTimerRef.current || !touchStartPosRef.current) return;
        const touch = event.touches[0];
        if (!touch) return;

        const dx = touch.clientX - touchStartPosRef.current.x;
        const dy = touch.clientY - touchStartPosRef.current.y;
        if (Math.hypot(dx, dy) > 10) {
          clearTimeout(longTouchTimerRef.current);
          longTouchTimerRef.current = null;
        }
      };

      const handleTouchEnd = () => {
        if (longTouchTimerRef.current) {
          clearTimeout(longTouchTimerRef.current);
          longTouchTimerRef.current = null;
        }

        if (isLongTouchingRef.current) {
          isLongTouchingRef.current = false;
          justFinishedLongTouchRef.current = true;

          // Resync opened selection with current view selection in case mobile OS adjusted selection on touch release
          const currentSel = view.state.selection.main;
          openedSelectionRef.current = {
            anchor: currentSel.anchor,
            head: currentSel.head,
          };

          if (finishLongTouchTimerRef.current) {
            clearTimeout(finishLongTouchTimerRef.current);
          }
          finishLongTouchTimerRef.current = window.setTimeout(() => {
            justFinishedLongTouchRef.current = false;
          }, 300);
        }
      };

      const handleTouchCancel = () => {
        if (longTouchTimerRef.current) {
          clearTimeout(longTouchTimerRef.current);
          longTouchTimerRef.current = null;
        }
        isLongTouchingRef.current = false;
      };

      // Hide popup when user clicks somewhere else
      const handleOutsidePointer = (event: PointerEvent | MouseEvent) => {
        if (!isOpenRef.current) return;
        if (justFinishedLongTouchRef.current) return;

        const target = event.target as Element | null;
        if (!target) return;

        // If right-clicking inside the editor, let contextmenu handle it
        if (event.button === 2 && view.dom.contains(target)) {
          return;
        }

        // Keep open when clicking inside the toolbar
        if (toolbarRef.current?.contains(target)) {
          return;
        }

        // Keep open when clicking inside dropdown or tooltip portals
        if (
          target.closest?.('[data-slot^="dropdown-menu"]') ||
          target.closest?.('[data-slot^="tooltip"]')
        ) {
          return;
        }

        // User clicked somewhere else (in the editor or outside it)
        closeToolbar();
      };

      // Hide popup when cursor position changes
      const handleSelectionChange = () => {
        if (!isOpenRef.current) return;
        if (isLongTouchingRef.current || justFinishedLongTouchRef.current) return;

        const currentSel = view.state.selection.main;
        const openedSel = openedSelectionRef.current;
        if (!openedSel) return;

        if (
          currentSel.anchor !== openedSel.anchor ||
          currentSel.head !== openedSel.head
        ) {
          closeToolbar();
        }
      };

      // Hide popup on navigation or typing keys
      const handleKeyDown = (event: KeyboardEvent) => {
        if (!isOpenRef.current) return;

        if (event.key === "Escape") {
          closeToolbar();
          return;
        }

        if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
          return;
        }

        // Arrow keys, typing, enter, backspace, delete, etc.
        closeToolbar();
      };

      // Hide on scroll or window resize
      const handleScrollOrResize = () => {
        if (isOpenRef.current) {
          closeToolbar();
        }
      };

      view.dom.addEventListener("contextmenu", handleContextMenu);
      view.dom.addEventListener("touchstart", handleTouchStart, { passive: true });
      view.dom.addEventListener("touchmove", handleTouchMove, { passive: true });
      view.dom.addEventListener("touchend", handleTouchEnd, { passive: true });
      view.dom.addEventListener("touchcancel", handleTouchCancel, { passive: true });
      view.dom.addEventListener("keydown", handleKeyDown);

      document.addEventListener("pointerdown", handleOutsidePointer, true);
      document.addEventListener("selectionchange", handleSelectionChange);
      window.addEventListener("resize", handleScrollOrResize);
      view.scrollDOM.addEventListener("scroll", handleScrollOrResize, { passive: true });

      cleanup = () => {
        view.dom.removeEventListener("contextmenu", handleContextMenu);
        view.dom.removeEventListener("touchstart", handleTouchStart);
        view.dom.removeEventListener("touchmove", handleTouchMove);
        view.dom.removeEventListener("touchend", handleTouchEnd);
        view.dom.removeEventListener("touchcancel", handleTouchCancel);
        view.dom.removeEventListener("keydown", handleKeyDown);

        document.removeEventListener("pointerdown", handleOutsidePointer, true);
        document.removeEventListener("selectionchange", handleSelectionChange);
        window.removeEventListener("resize", handleScrollOrResize);
        view.scrollDOM.removeEventListener("scroll", handleScrollOrResize);

        if (longTouchTimerRef.current) clearTimeout(longTouchTimerRef.current);
        if (finishLongTouchTimerRef.current) clearTimeout(finishLongTouchTimerRef.current);
      };
    };

    attach();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [closeToolbar, editorRef, openToolbarAt]);

  if (!position.open) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 max-w-[calc(100vw-24px)]"
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
