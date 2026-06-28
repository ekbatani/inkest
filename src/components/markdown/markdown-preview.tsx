"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";
import { useMermaidCodeComponent } from "./use-mermaid-code-component";

type Props = {
  content: string;
  direction?: "ltr" | "rtl" | "auto";
  className?: string;
  components?: Components;
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
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "input",
  ],
  protocols: {
    ...defaultSchema.protocols,
    src: ["http", "https", "data"],
  },
};

export function MarkdownPreview({
  content,
  direction = "auto",
  className,
  components: extraComponents,
}: Props) {
  const dir = direction === "auto" ? undefined : direction;
  const mermaidComponents = useMermaidCodeComponent();

  const components = React.useMemo(
    () => ({ ...mermaidComponents, ...extraComponents }),
    [mermaidComponents, extraComponents],
  );

  return (
    <div
      className={cn("inknest-prose", className)}
      dir={dir}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
