"use client";

import * as React from "react";
import { parseDocument } from "@/lib/document-engine/parser";
import { DocumentBlockView } from "./document-block-view";
import {
  VirtualizedDocumentView,
  type VirtualizedDocumentViewRef,
} from "./virtualized-document-view";
import { cn } from "@/lib/utils";
import type { WikiLinkTarget } from "@/lib/markdown/wiki";

const VIRTUALIZE_BLOCK_THRESHOLD = 35;

interface Props {
  content: string;
  documentId?: string;
  highlightedBlockId?: string;
  direction?: "ltr" | "rtl" | "auto";
  className?: string;
  linkableNotes?: WikiLinkTarget[];
  forceVirtualized?: boolean;
}

export function VirtualizedMarkdownPreview({
  content,
  documentId,
  highlightedBlockId,
  direction = "auto",
  className,
  linkableNotes = [],
  forceVirtualized = false,
}: Props) {
  const model = React.useMemo(() => {
    return parseDocument(content, documentId ?? "doc");
  }, [content, documentId]);

  const viewRef = React.useRef<VirtualizedDocumentViewRef>(null);
  const shouldVirtualize = forceVirtualized || model.blocks.length > VIRTUALIZE_BLOCK_THRESHOLD;

  if (shouldVirtualize) {
    return (
      <div className={cn("inkest-prose h-full w-full", className)}>
        <VirtualizedDocumentView
          ref={viewRef}
          blocks={model.blocks}
          documentId={documentId}
          highlightedBlockId={highlightedBlockId}
          direction={direction}
          linkableNotes={linkableNotes}
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className={cn("inkest-prose", className)}>
      {model.blocks.map((block, idx) => (
        <DocumentBlockView
          key={block.id}
          block={block}
          documentId={documentId}
          blockIndex={idx}
          isHighlighted={highlightedBlockId === block.id}
          direction={direction}
          linkableNotes={linkableNotes}
        />
      ))}
    </div>
  );
}

