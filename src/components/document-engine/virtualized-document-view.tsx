"use client";

import * as React from "react";
import { DocumentBlockView } from "./document-block-view";
import type { DocumentBlock } from "@/lib/document-engine/types";
import type { WikiLinkTarget } from "@/lib/markdown/wiki";

export interface VirtualizedDocumentViewRef {
  scrollToBlock: (blockId: string) => void;
  scrollToHeading: (headingAnchor: string) => void;
}

interface Props {
  blocks: DocumentBlock[];
  direction?: "ltr" | "rtl" | "auto";
  linkableNotes?: WikiLinkTarget[];
  className?: string;
  overscanPx?: number;
  onToggleTask?: (blockId: string, checked: boolean) => void;
}

export const VirtualizedDocumentView = React.forwardRef<
  VirtualizedDocumentViewRef,
  Props
>(function VirtualizedDocumentView(
  {
    blocks,
    direction = "auto",
    linkableNotes = [],
    className,
    overscanPx = 800,
    onToggleTask,
  },
  ref,
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(800);

  // Dynamic measured block heights
  const heightMapRef = React.useRef<Map<string, number>>(new Map());
  const [heightVersion, setHeightVersion] = React.useState(0);

  // Measure container viewport on mount and resize
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      setViewportHeight(el.clientHeight || window.innerHeight);
      setScrollTop(el.scrollTop);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    setScrollTop(top);
  }, []);

  const handleMeasuredHeight = React.useCallback(
    (blockId: string, height: number) => {
      const current = heightMapRef.current.get(blockId);
      if (current === undefined || Math.abs(current - height) > 2) {
        heightMapRef.current.set(blockId, height);
        // Debounce height updates to avoid layout thrashing
        setHeightVersion((v) => v + 1);
      }
    },
    [],
  );

  // Compute prefix sum array for fast range calculation
  const totalBlocks = blocks.length;
  const { startIdx, endIdx, offsetBefore, offsetAfter } = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    heightVersion; // dependency to recalculate when block heights adjust
    const heights = heightMapRef.current;

    let currentY = 0;
    let sIdx = 0;
    let eIdx = totalBlocks - 1;
    let beforeY = 0;

    const visibleTop = Math.max(0, scrollTop - overscanPx);
    const visibleBottom = scrollTop + viewportHeight + overscanPx;

    for (let i = 0; i < totalBlocks; i++) {
      const block = blocks[i];
      const h = heights.get(block.id) ?? block.metadata.estimatedHeight ?? 36;
      const bottom = currentY + h;

      if (bottom < visibleTop) {
        sIdx = i + 1;
        beforeY = bottom;
      }

      if (currentY > visibleBottom) {
        eIdx = i;
        break;
      }

      currentY += h;
    }

    sIdx = Math.min(sIdx, Math.max(0, totalBlocks - 1));
    eIdx = Math.min(Math.max(eIdx, sIdx), Math.max(0, totalBlocks - 1));

    let afterY = 0;
    for (let i = eIdx + 1; i < totalBlocks; i++) {
      const b = blocks[i];
      afterY += heights.get(b.id) ?? b.metadata.estimatedHeight ?? 36;
    }

    return {
      startIdx: sIdx,
      endIdx: eIdx,
      offsetBefore: beforeY,
      offsetAfter: afterY,
    };
  }, [blocks, heightVersion, overscanPx, scrollTop, totalBlocks, viewportHeight]);

  // Imperative handle for scrolling to anchors/blocks
  React.useImperativeHandle(
    ref,
    () => ({
      scrollToBlock(blockId: string) {
        const heights = heightMapRef.current;
        let y = 0;
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.id === blockId) {
            containerRef.current?.scrollTo({ top: Math.max(0, y - 40), behavior: "smooth" });
            return;
          }
          y += heights.get(b.id) ?? b.metadata.estimatedHeight ?? 36;
        }
      },
      scrollToHeading(anchor: string) {
        const heights = heightMapRef.current;
        let y = 0;
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.type === "heading" && b.metadata.headingAnchorId === anchor) {
            containerRef.current?.scrollTo({ top: Math.max(0, y - 40), behavior: "smooth" });
            return;
          }
          y += heights.get(b.id) ?? b.metadata.estimatedHeight ?? 36;
        }
      },
    }),
    [blocks],
  );

  const visibleBlocks = blocks.slice(startIdx, endIdx + 1);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className}
      style={{ overflowY: "auto", position: "relative" }}
    >
      {/* Top Spacer Pad */}
      {offsetBefore > 0 && <div style={{ height: `${offsetBefore}px` }} aria-hidden="true" />}

      {/* Rendered Visible Blocks */}
      {visibleBlocks.map((block) => (
        <DocumentBlockView
          key={block.id}
          block={block}
          direction={direction}
          linkableNotes={linkableNotes}
          onMeasuredHeight={handleMeasuredHeight}
          onToggleTask={onToggleTask}
        />
      ))}

      {/* Bottom Spacer Pad */}
      {offsetAfter > 0 && <div style={{ height: `${offsetAfter}px` }} aria-hidden="true" />}
    </div>
  );
});
