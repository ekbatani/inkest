"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Components } from "react-markdown";

const MermaidRenderer = dynamic(
  () => import("./mermaid-renderer").then((m) => m.MermaidRenderer),
  { ssr: false },
);

function MermaidCodeBlock({ code }: { code: string }) {
  return <MermaidRenderer code={code} />;
}

export function useMermaidCodeComponent(): Components {
  return React.useMemo(
    () => ({
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const lang = match?.[1];
        const text = String(children).replace(/\n$/, "");

        if (lang === "mermaid") {
          return <MermaidCodeBlock code={text} />;
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      pre({ children, ...props }) {
        // React Markdown wraps every fenced block in <pre>. Mermaid replaces
        // that wrapper with its renderer, but ordinary fenced blocks must keep
        // it so they remain distinct, scrollable block-level code surfaces.
        if (
          React.Children.toArray(children).some(
            (child) =>
              React.isValidElement<{ className?: string }>(child) &&
              (child.type === MermaidCodeBlock ||
                /(^|\s)language-mermaid(\s|$)/.test(child.props.className ?? "")),
          )
        ) {
          return <>{children}</>;
        }

        return <pre {...props}>{children}</pre>;
      },
    }),
    [],
  );
}
