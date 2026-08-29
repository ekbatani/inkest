"use client";

import * as React from "react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  ExternalLink,
  Copy,
  Pencil,
  Unlink,
  FileText,
  FolderKanban,
  Calendar,
  Paperclip,
  ImageIcon,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type WikiLinkTarget,
  isImageAsset,
  parseWikiToken,
  resolveTarget,
  normalizeTargets,
} from "@/lib/markdown/wiki";
import {
  unlinkRange,
  triggerOpenLinkDialog,
} from "@/components/editor/markdown-editor-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ActiveLinkInfo = {
  href: string;
  rawText: string;
  from: number;
  to: number;
  coords: { x: number; y: number; width: number; height: number };
};

type Props = {
  activeLink: ActiveLinkInfo | null;
  onClose: () => void;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
  linkableNotes: WikiLinkTarget[];
  onOpenLink?: (href: string) => void;
};

export function LinkPreviewPopover({
  activeLink,
  onClose,
  editorRef,
  linkableNotes = [],
  onOpenLink,
}: Props) {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const normalizedTargets = React.useMemo(
    () => normalizeTargets(linkableNotes),
    [linkableNotes],
  );

  // Parse link info
  const linkData = React.useMemo(() => {
    if (!activeLink) return null;

    const { href, rawText } = activeLink;
    const isWiki = rawText.startsWith("[[") || rawText.startsWith("![[");
    const isWeb = /^[a-z][a-z0-9+.-]*:/i.test(href);
    const isAttachment = href.startsWith("/api/attachments/");
    const isHeadingAnchor = href.startsWith("#");

    let targetTitle = rawText;
    let targetSection = "";
    let targetAlias = "";
    let isEmbed = false;

    if (isWiki) {
      const parsed = parseWikiToken(rawText);
      targetTitle = parsed.targetName;
      targetSection = parsed.section;
      targetAlias = parsed.alias;
      isEmbed = parsed.isEmbed;
    } else {
      const mdMatch = rawText.match(/^(!?)\[(.*?)\]\((.*?)\)$/);
      if (mdMatch) {
        isEmbed = Boolean(mdMatch[1]);
        targetAlias = mdMatch[2];
        targetTitle = mdMatch[2];
      }
    }

    const matchedTarget = resolveTarget(targetTitle, normalizedTargets);

    return {
      href,
      rawText,
      targetTitle,
      targetSection,
      targetAlias,
      isEmbed,
      isWiki,
      isWeb,
      isAttachment,
      isHeadingAnchor,
      target: matchedTarget,
    };
  }, [activeLink, normalizedTargets]);

  // Position calculation
  const [style, setStyle] = React.useState<React.CSSProperties>({
    display: "none",
  });

  React.useEffect(() => {
    if (!activeLink || !popoverRef.current) {
      setStyle({ display: "none" });
      return;
    }

    const popoverWidth = 320;
    const popoverHeight = 160;
    const margin = 12;

    const { coords } = activeLink;
    let left = coords.x + coords.width / 2 - popoverWidth / 2;
    left = Math.max(margin, Math.min(window.innerWidth - popoverWidth - margin, left));

    let top = coords.y - popoverHeight - 8;
    if (top < margin) {
      top = coords.y + coords.height + 8;
    }

    setStyle({
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${popoverWidth}px`,
      zIndex: 60,
    });
  }, [activeLink]);

  // Close on outside click
  React.useEffect(() => {
    if (!activeLink) return;

    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeLink, onClose]);

  if (!activeLink || !linkData) return null;

  const handleOpen = () => {
    onClose();
    if (linkData.isAttachment || linkData.isWeb) {
      window.open(linkData.href, "_blank", "noopener,noreferrer");
    } else if (onOpenLink) {
      onOpenLink(linkData.href);
    } else {
      window.location.assign(linkData.href);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(linkData.href);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Failed to copy link.");
    }
    onClose();
  };

  const handleEdit = () => {
    onClose();
    triggerOpenLinkDialog(editorRef, {
      prefilledQuery: linkData.targetTitle,
      replaceRange: { from: activeLink.from, to: activeLink.to },
    });
  };

  const handleUnlink = () => {
    onClose();
    const plainText = linkData.targetAlias || linkData.targetTitle || linkData.href;
    unlinkRange(editorRef, {
      from: activeLink.from,
      to: activeLink.to,
      plainText,
    });
    toast.success("Link removed.");
  };

  const targetType =
    linkData.target?.type ||
    (linkData.isWeb
      ? "web"
      : linkData.isAttachment
        ? "asset"
        : "note");

  return (
    <div
      ref={popoverRef}
      style={style}
      className="rounded-2xl border border-border/80 bg-background/95 p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-150 animate-in fade-in zoom-in-95"
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl",
            targetType === "project" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
            targetType === "daily" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            targetType === "asset" && "bg-sky-500/15 text-sky-600 dark:text-sky-400",
            targetType === "web" && "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
            targetType === "note" && "bg-primary/15 text-primary",
          )}
        >
          {targetType === "project" ? (
            <FolderKanban className="size-4" />
          ) : targetType === "daily" ? (
            <Calendar className="size-4" />
          ) : targetType === "asset" ? (
            linkData.target && isImageAsset(linkData.target) ? (
              <ImageIcon className="size-4 text-rose-500" />
            ) : (
              <Paperclip className="size-4" />
            )
          ) : linkData.isWeb ? (
            <Globe className="size-4" />
          ) : (
            <FileText className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="truncate text-xs font-semibold text-foreground">
              {linkData.target?.title || linkData.targetTitle}
            </span>

            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1.5 py-0 h-4 uppercase font-bold",
                targetType === "project" && "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5",
                targetType === "daily" && "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
                targetType === "asset" && "text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/5",
                targetType === "web" && "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/5",
                targetType === "note" && "text-primary border-primary/30 bg-primary/5",
              )}
            >
              {targetType === "project" && linkData.target?.status
                ? `Project · ${linkData.target.status}`
                : targetType}
            </Badge>

            {linkData.targetSection && (
              <span className="text-[10px] text-indigo-500 font-mono">
                #{linkData.targetSection}
              </span>
            )}
          </div>

          <div className="mt-0.5 truncate text-[11px] text-muted-foreground font-mono">
            {linkData.href}
          </div>

          {linkData.target?.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground/90 bg-muted/30 p-2 rounded-lg border border-border/40">
              {linkData.target.excerpt}
            </p>
          )}

          {linkData.isAttachment && linkData.target && isImageAsset(linkData.target) && (
            <div className="mt-2 overflow-hidden rounded-xl border border-border/50 bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={linkData.href}
                alt={linkData.target.title}
                className="max-h-28 w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleOpen}
          className="h-7 text-xs gap-1.5 px-3 rounded-lg font-medium"
        >
          <span>Open</span>
          {linkData.isWeb || linkData.isAttachment ? (
            <ArrowUpRight className="size-3" />
          ) : (
            <ExternalLink className="size-3" />
          )}
        </Button>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={handleCopy}
            title="Copy link"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Copy className="size-3.5" />
          </Button>

          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={handleEdit}
            title="Edit link"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </Button>

          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={handleUnlink}
            title="Remove link syntax (keep text)"
            className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Unlink className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

