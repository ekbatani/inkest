"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Components } from "react-markdown";

const MermaidRenderer = dynamic(
  () => import("./mermaid-renderer").then((m) => m.MermaidRenderer),
  { ssr: false },
);

export function useMermaidCodeComponent(): Components {
  return React.useMemo(
    () => ({
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const lang = match?.[1];
        const text = String(children).replace(/\n$/, "");

        if (lang === "mermaid") {
          return <MermaidRenderer code={text} />;
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      pre({ children }) {
        return <>{children}</>;
      },
    }),
    [],
  );
}
