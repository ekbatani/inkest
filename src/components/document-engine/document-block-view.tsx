"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { MermaidRenderer } from "@/components/markdown/mermaid-renderer";
import {
  getHeadingAnchorId,
  resolveNoteHref,
  parseWikiToken,
  type WikiLinkTarget,
} from "@/lib/markdown/wiki";

import type { DocumentBlock } from "@/lib/document-engine/types";

interface Props {
  block: DocumentBlock;
  documentId?: string;
  blockIndex?: number;
  direction?: "ltr" | "rtl" | "auto";
  linkableNotes?: WikiLinkTarget[];
  isHighlighted?: boolean;
  onMeasuredHeight?: (blockId: string, height: number) => void;
  onToggleTask?: (blockId: string, checked: boolean) => void;
}

export const DocumentBlockView = React.memo(
  function DocumentBlockView({
    block,
    documentId,
    blockIndex,
    direction = "auto",
    linkableNotes = [],
    isHighlighted = false,
    onMeasuredHeight,
    onToggleTask,
  }: Props) {
    const blockRef = React.useRef<HTMLDivElement>(null);

    // Dynamic height reporting for virtualization precision
    React.useLayoutEffect(() => {
      if (!blockRef.current || !onMeasuredHeight) return;
      const height = blockRef.current.getBoundingClientRect().height;
      if (height > 0) {
        onMeasuredHeight(block.id, height);
      }
    }, [block.id, block.hash, onMeasuredHeight]);

    const isRtl =
      direction === "rtl" || (direction === "auto" && block.metadata.isRtl);

    const renderContent = () => {
      switch (block.type) {
        case "heading": {
          const level = block.metadata.level ?? 1;
          const anchorId = block.metadata.headingAnchorId || getHeadingAnchorId(block.content);
          const rawText = block.content.replace(/^#{1,6}\s+/, "");

          const HeadingTag = `h${Math.min(level, 6)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
          const headingClasses = {
            1: "text-2xl sm:text-3xl font-bold tracking-tight mt-6 mb-3 scroll-mt-24",
            2: "text-xl sm:text-2xl font-semibold tracking-tight mt-5 mb-2.5 scroll-mt-24",
            3: "text-lg sm:text-xl font-semibold mt-4 mb-2 scroll-mt-24",
            4: "text-base sm:text-lg font-medium mt-3 mb-1.5 scroll-mt-24",
            5: "text-sm sm:text-base font-medium mt-2.5 mb-1 scroll-mt-24",
            6: "text-xs sm:text-sm font-medium mt-2 mb-1 scroll-mt-24",
          }[level] || "text-base font-semibold";

          return (
            <HeadingTag id={anchorId} className={headingClasses}>
              {renderInlineMarkdown(rawText, linkableNotes)}
            </HeadingTag>
          );
        }

        case "mermaid": {
          const code = block.content
            .replace(/^```[a-zA-Z0-9_-]*\s*\n?/, "")
            .replace(/\n?```\s*$/, "")
            .trim();
          return (
            <div className="my-4 overflow-hidden rounded-xl border bg-card/40">
              <MermaidRenderer code={code} />
            </div>
          );
        }

        case "code": {
          const lines = block.content.split("\n");
          const firstLine = lines[0] || "";
          const langMatch = firstLine.match(/^```([a-zA-Z0-9_-]*)/);
          const language = langMatch ? langMatch[1] : block.metadata.language || "text";
          const codeContent = block.content
            .replace(/^```[a-zA-Z0-9_-]*\s*\n?/, "")
            .replace(/\n?```\s*$/, "");

          return <CodeBlockWrapper code={codeContent} language={language} />;
        }

        case "table": {
          const headers = block.metadata.headers || [];
          const rows = block.metadata.rows || [];

          return (
            <div className="my-4 overflow-x-auto rounded-lg border bg-card/20">
              <table className="w-full text-left text-sm">
                {headers.length > 0 && (
                  <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="px-4 py-2.5 font-medium">
                          {renderInlineMarkdown(h, linkableNotes)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-border/60">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2 text-foreground/90">
                          {renderInlineMarkdown(cell, linkableNotes)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        case "blockquote": {
          const rawLines = block.content
            .split("\n")
            .map((l) => l.replace(/^\s*>\s?/, ""))
            .join("\n");
          return (
            <blockquote className="my-3 border-l-3 border-primary/60 bg-muted/20 pl-4 py-1.5 italic text-foreground/85 rounded-r-md">
              {renderInlineMarkdown(rawLines, linkableNotes)}
            </blockquote>
          );
        }

        case "list": {
          const lines = block.content.split("\n");
          return (
            <ul className="my-2.5 space-y-1.5 list-none pl-1">
              {lines.map((line, idx) => {
                const taskMatch = line.match(/^(\s*[-*+]\s+)\[([ xX])\]\s+(.*)$/);
                if (taskMatch) {
                  const checked = taskMatch[2].toLowerCase() === "x";
                  const taskText = taskMatch[3];
                  return (
                    <li key={idx} className="flex items-start gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onToggleTask?.(block.id, e.target.checked)}
                        className="mt-1 size-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <span className={cn("flex-1", checked && "line-through text-muted-foreground/75")}>
                        {renderInlineMarkdown(taskText, linkableNotes)}
                      </span>
                    </li>
                  );
                }

                const bulletMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
                if (bulletMatch) {
                  const isOrdered = /^\d+\./.test(bulletMatch[2]);
                  return (
                    <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed">
                      <span className="text-muted-foreground font-mono text-xs select-none pt-0.5">
                        {isOrdered ? bulletMatch[2] : "•"}
                      </span>
                      <span className="flex-1">{renderInlineMarkdown(bulletMatch[3], linkableNotes)}</span>
                    </li>
                  );
                }

                return (
                  <li key={idx} className="text-sm pl-4 leading-relaxed">
                    {renderInlineMarkdown(line, linkableNotes)}
                  </li>
                );
              })}
            </ul>
          );
        }

        case "image": {
          const alt = block.metadata.alt || "Image";
          const src = block.metadata.src || "";
          return (
            <figure className="my-4 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                loading="lazy"
                className="max-h-[480px] w-auto rounded-lg border object-contain shadow-xs"
              />
              {alt && <figcaption className="mt-1.5 text-xs text-muted-foreground">{alt}</figcaption>}
            </figure>
          );
        }

        case "thematic-break": {
          return <hr className="my-6 border-t border-border/70" />;
        }

        case "paragraph":
        default: {
          return (
            <p className="my-2.5 text-sm sm:text-base leading-relaxed text-foreground/90 font-normal">
              {renderInlineMarkdown(block.content, linkableNotes)}
            </p>
          );
        }
      }
    };

    return (
      <div
        ref={blockRef}
        data-document-id={documentId}
        data-block-id={block.id}
        data-block-index={blockIndex}
        data-block-type={block.type}
        data-section-title={block.metadata.sectionTitle}
        dir={isRtl ? "rtl" : "ltr"}
        className={cn(
          "inkest-block transition-colors duration-200",
          isRtl && "rtl-vazir",
          isHighlighted && "ring-2 ring-primary/60 bg-primary/5 rounded-md px-1",
        )}
      >
        {renderContent()}
      </div>
    );
  },
  (prev, next) =>
    prev.block.id === next.block.id &&
    prev.block.hash === next.block.hash &&
    prev.direction === next.direction &&
    prev.documentId === next.documentId &&
    prev.blockIndex === next.blockIndex &&
    prev.isHighlighted === next.isHighlighted &&
    prev.linkableNotes?.length === next.linkableNotes?.length,
);

function CodeBlockWrapper({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div className="group relative my-3 rounded-lg border bg-muted/40 font-mono text-xs overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-1.5 text-[11px] text-muted-foreground font-medium">
        <span>{language}</span>
        <button
          onClick={() => void handleCopy()}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-foreground/90 font-mono leading-normal">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Fast inline markdown renderer with Wiki links, bold, italic, inline code, and links.
 */
function renderInlineMarkdown(
  text: string,
  linkableNotes: WikiLinkTarget[] = [],
): React.ReactNode {
  if (!text) return null;

  // Split by inline markdown tokens: `code`, **bold**, *italic*, [link](url), [[wiki]]
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  const TOKEN_RE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|!?\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\))/;

  while (remaining.length > 0) {
    const match = remaining.match(TOKEN_RE);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }

    const token = match[0];
    keyIdx++;

    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={keyIdx} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.88em] text-foreground/95">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={keyIdx} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={keyIdx} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if ((token.startsWith("[[") || token.startsWith("![[")) && token.endsWith("]]")) {
      const parsed = parseWikiToken(token);
      const isEmbed = parsed.isEmbed;
      const target = parsed.section ? `${parsed.targetName}#${parsed.section}` : parsed.targetName;
      const href = resolveNoteHref(target, linkableNotes);
      const isUnresolved = !href || href === target || href === parsed.targetName;
      const targetUrl = isUnresolved ? `/notes/new?title=${encodeURIComponent(parsed.targetName)}` : href;
      const label = parsed.alias || target;

      if (isEmbed && href?.startsWith("/api/attachments/") && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(parsed.targetName)) {
        parts.push(
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={keyIdx}
            src={href}
            alt={label}
            className="my-2 max-h-96 max-w-full rounded-xl border border-border/60 shadow-xs"
            loading="lazy"
          />,
        );
      } else if (href?.startsWith("/api/attachments/")) {
        parts.push(
          <a
            key={keyIdx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-3 hover:text-primary/80 inline-flex items-center gap-1 font-medium"
          >
            {isEmbed ? `📎 ${label}` : label}
          </a>,
        );
      } else if (isUnresolved) {
        parts.push(
          <Link
            key={keyIdx}
            href={targetUrl}
            className="text-amber-500 hover:text-amber-600 underline decoration-dashed underline-offset-3 font-medium transition-colors"
          >
            {label} ↗
          </Link>,
        );
      } else if (href?.startsWith("/")) {
        parts.push(
          <Link
            key={keyIdx}
            href={href}
            className="text-primary hover:text-primary/80 underline underline-offset-3 font-medium transition-colors"
          >
            {isEmbed && href.startsWith("/projects/") ? `📁 ${label}` : isEmbed ? `📝 ${label}` : label}
          </Link>,
        );
      } else {
        parts.push(
          <a
            key={keyIdx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-3 hover:text-primary/80"
          >
            {label}
          </a>,
        );
      }
    } else if (token.startsWith("[") && token.includes("](")) {
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkHref = linkMatch[2];
        const resolved = resolveNoteHref(linkHref, linkableNotes) ?? linkHref;

        if (resolved.startsWith("/api/attachments/")) {
          parts.push(
            <a
              key={keyIdx}
              href={resolved}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-3 hover:text-primary/80"
            >
              {linkText}
            </a>,
          );
        } else if (resolved.startsWith("/")) {
          parts.push(
            <Link key={keyIdx} href={resolved} className="text-primary underline underline-offset-3 hover:text-primary/80">
              {linkText}
            </Link>,
          );
        } else {
          parts.push(
            <a
              key={keyIdx}
              href={resolved}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-3 hover:text-primary/80"
            >
              {linkText}
            </a>,
          );
        }
      }
    }

    remaining = remaining.slice(match.index + token.length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
