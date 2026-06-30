"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";
import { useMermaidCodeComponent } from "./use-mermaid-code-component";
import { transformWikiLinks, type WikiLinkTarget } from "@/lib/markdown/wiki";
import { containsArabicScript } from "@/lib/text/rtl";

type Props = {
  content: string;
  direction?: "ltr" | "rtl" | "auto";
  className?: string;
  components?: Components;
  /** Notes available for `[[wiki]]` link resolution. */
  linkableNotes?: WikiLinkTarget[];
};

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow dir on elements for RTL
    div: [...(defaultSchema.attributes?.div ?? []), "dir"],
    p: [...(defaultSchema.attributes?.p ?? []), "dir"],
    span: [...(defaultSchema.attributes?.span ?? []), "dir"],
    // Allow class for our prose styling and task list classes
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "class",
      "title",
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "input",
  ],
  protocols: {
    ...defaultSchema.protocols,
    href: [
      ...(defaultSchema.protocols?.href ?? []),
      "inkest-highlight",
      "inkest-comment",
      "inkest-size",
    ],
    src: ["http", "https", "data"],
  },
};

function normalizeMarkdownHeadings(content: string) {
  const lines = content.split("\n");
  let inFence = false;

  return lines
    .map((line) => {
      if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
        inFence = !inFence;
        return line;
      }

      if (inFence) return line;

      return line.replace(/^(\s{0,3})(#{1,6})([^#\s].*)$/, "$1$2 $3");
    })
    .join("\n");
}

export function MarkdownPreview({
  content,
  direction = "auto",
  className,
  components: extraComponents,
  linkableNotes,
}: Props) {
  const dir = direction === "auto" ? undefined : direction;
  const usesRtlFont =
    direction === "rtl" || (direction === "auto" && containsArabicScript(content));
  const mermaidComponents = useMermaidCodeComponent();

  const components = React.useMemo(
    (): Components => ({
      ...mermaidComponents,
      ...extraComponents,
      a: ({
        href,
        children,
        ...props
      }: React.ComponentPropsWithoutRef<"a">) => {
        if (href === "inkest-highlight:") {
          return <mark className="inkest-highlight">{children}</mark>;
        }

        if (href?.startsWith("inkest-size:")) {
          const size = href.slice("inkest-size:".length);
          return (
            <span
              className={cn(
                size === "small" && "inkest-text-small",
                size === "large" && "inkest-text-large",
                size === "huge" && "inkest-text-huge",
              )}
            >
              {children}
            </span>
          );
        }

        if (href?.startsWith("inkest-comment:")) {
          const rawComment = href.slice("inkest-comment:".length);
          let comment = rawComment || "";
          try {
            comment = decodeURIComponent(comment);
          } catch {
            comment = rawComment;
          }

          return (
            <span className="inkest-comment" title={comment}>
              <span className="inkest-comment__text">{children}</span>
              <span className="inkest-comment__badge" aria-label={`Comment: ${comment}`}>
                Comment
              </span>
            </span>
          );
        }

        return (
          <a href={href} {...props}>
            {children}
          </a>
        );
      },
    }),
    [mermaidComponents, extraComponents],
  );

  const processedContent = React.useMemo(
    () =>
      normalizeMarkdownHeadings(
        linkableNotes && linkableNotes.length > 0
          ? transformWikiLinks(content, linkableNotes)
          : content,
      ),
    [content, linkableNotes],
  );

  return (
    <div
      className={cn("inkest-prose", usesRtlFont && "rtl-vazir", className)}
      dir={dir}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
