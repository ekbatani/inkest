"use client";

import * as React from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "default",
});

let idCounter = 0;

type Props = {
  code: string;
};

export function MermaidRenderer({ code }: Props) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${++idCounter}`;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rendered, "image/svg+xml");
          doc.querySelectorAll(".version, [class*='version']").forEach((el) => el.remove());
          const cleanSvg = new XMLSerializer().serializeToString(doc.documentElement);
          setSvg(cleanSvg);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Invalid Mermaid diagram.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
        <span className="text-sm text-muted-foreground">Rendering diagram…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">
          Mermaid syntax error
        </p>
        <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
          {error}
        </pre>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Show source
          </summary>
          <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">
            {code}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      className="flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg ?? "" }}
    />
  );
}
