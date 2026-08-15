"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UseChatScrollOptions = {
  /** Dependencies that trigger scroll checks (e.g. messages array) */
  deps: unknown[];
  /** Distance from bottom in px to be considered "at bottom" */
  threshold?: number;
  /** Whether assistant is currently generating a response */
  isGenerating?: boolean;
};

export function useChatScroll<T extends HTMLElement = HTMLDivElement>({
  deps,
  threshold = 60,
  isGenerating = false,
}: UseChatScrollOptions) {
  const containerRef = React.useRef<T | null>(null);
  const viewportRef = React.useRef<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [hasUnread, setHasUnread] = React.useState(false);
  const prevDepsLengthRef = React.useRef(0);

  const getViewport = React.useCallback((): HTMLElement | null => {
    if (viewportRef.current && viewportRef.current.isConnected) {
      return viewportRef.current;
    }
    if (!containerRef.current) return null;
    const container = containerRef.current;

    if (container.getAttribute("data-slot") === "scroll-area-viewport") {
      viewportRef.current = container;
      return container;
    }

    const vp = container.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (vp) {
      viewportRef.current = vp;
      return vp;
    }

    viewportRef.current = container;
    return container;
  }, []);

  const checkIsAtBottom = React.useCallback(() => {
    const vp = getViewport();
    if (!vp) return true;
    const { scrollTop, scrollHeight, clientHeight } = vp;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [getViewport, threshold]);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const vp = getViewport();
      if (!vp) return;
      vp.scrollTo({
        top: vp.scrollHeight,
        behavior,
      });
      setIsAtBottom(true);
      setHasUnread(false);
    },
    [getViewport],
  );

  const scrollToTop = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const vp = getViewport();
      if (!vp) return;
      vp.scrollTo({
        top: 0,
        behavior,
      });
      setIsAtBottom(false);
    },
    [getViewport],
  );

  const scrollByPage = React.useCallback(
    (direction: "up" | "down", behavior: ScrollBehavior = "smooth") => {
      const vp = getViewport();
      if (!vp) return;
      const pageAmount = vp.clientHeight * 0.8;
      const delta = direction === "down" ? pageAmount : -pageAmount;
      vp.scrollBy({
        top: delta,
        behavior,
      });
    },
    [getViewport],
  );

  const handleScroll = React.useCallback(() => {
    const atBottom = checkIsAtBottom();
    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasUnread(false);
    }
  }, [checkIsAtBottom]);

  React.useEffect(() => {
    const vp = getViewport();
    if (!vp) return;

    vp.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      vp.removeEventListener("scroll", handleScroll);
    };
  }, [getViewport, handleScroll]);

  React.useEffect(() => {
    const depsArray = Array.isArray(deps) ? deps : [deps];
    const firstDep = depsArray[0];
    const depsLength = Array.isArray(firstDep) ? firstDep.length : depsArray.length;
    const isNewMessage = depsLength > prevDepsLengthRef.current;
    prevDepsLengthRef.current = depsLength;

    if (isNewMessage) {
      setTimeout(() => scrollToBottom("smooth"), 0);
    } else if (isGenerating) {
      if (checkIsAtBottom()) {
        setTimeout(() => scrollToBottom("auto"), 0);
      } else {
        setTimeout(() => setHasUnread(true), 0);
      }
    }
  }, [deps, isGenerating, checkIsAtBottom, scrollToBottom]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === "ArrowDown") {
        e.preventDefault();
        scrollToBottom("smooth");
      } else if (isMod && e.key === "ArrowUp") {
        e.preventDefault();
        scrollToTop("smooth");
      } else if (e.key === "PageDown" && !e.shiftKey) {
        e.preventDefault();
        scrollByPage("down");
      } else if (e.key === "PageUp" && !e.shiftKey) {
        e.preventDefault();
        scrollByPage("up");
      }
    },
    [scrollToBottom, scrollToTop, scrollByPage],
  );

  return {
    containerRef,
    isAtBottom,
    hasUnread,
    scrollToBottom,
    scrollToTop,
    scrollByPage,
    handleKeyDown,
  };
}

type ScrollToBottomButtonProps = {
  onClick: () => void;
  visible: boolean;
  hasUnread?: boolean;
  className?: string;
};

export function ScrollToBottomButton({
  onClick,
  visible,
  hasUnread = false,
  className,
}: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      onClick={onClick}
      aria-label="Scroll to bottom"
      title="Scroll to bottom (Ctrl+Down)"
      className={cn(
        "absolute bottom-3 right-4 z-20 size-8 rounded-full border border-border/80 bg-background/95 shadow-md backdrop-blur-xs transition-all hover:bg-muted hover:scale-105 active:scale-95",
        className,
      )}
    >
      <ChevronDown className="size-4 text-foreground" />
      {hasUnread && (
        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-violet-500 ring-2 ring-background" />
      )}
    </Button>
  );
}
