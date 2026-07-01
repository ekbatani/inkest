"use client";

import * as React from "react";
import mermaid from "mermaid";
import { Expand, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "default",
});

let idCounter = 0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

type Props = {
  code: string;
};

export function MermaidRenderer({ code }: Props) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zoom, setZoom] = React.useState(1);
  const [fullscreenOpen, setFullscreenOpen] = React.useState(false);

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
          const svgElement = doc.documentElement;
          svgElement.removeAttribute("width");
          svgElement.removeAttribute("height");
          svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
          svgElement.setAttribute(
            "style",
            "display:block;width:100%;height:auto;max-width:none;",
          );
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

  React.useEffect(() => {
    setZoom(1);
  }, [code]);

  const zoomPercent = Math.round(zoom * 100);
  const canZoomOut = zoom > MIN_ZOOM;
  const canZoomIn = zoom < MAX_ZOOM;

  function changeZoom(delta: number) {
    setZoom((current) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
      return Math.round(next * 100) / 100;
    });
  }

  function renderDiagramViewport(className?: string) {
    return (
      <div className={cn("flex h-full w-full min-h-0 flex-col rounded-xl border bg-card/40", className)}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div className="text-xs text-muted-foreground">
            Scroll to explore the full diagram.
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={!canZoomOut}
              aria-label="Zoom out"
            >
              <Minus />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setZoom(1)}
              aria-label="Reset zoom"
            >
              <RotateCcw />
              {zoomPercent}%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={!canZoomIn}
              aria-label="Zoom in"
            >
              <Plus />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => setFullscreenOpen(true)}
              aria-label="Open fullscreen diagram"
            >
              <Expand />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div
            className="mx-auto min-w-full origin-top transition-transform"
            style={{ transform: `scale(${zoom})`, width: `${zoom * 100}%` }}
          >
            <div
              className="min-w-max"
              dangerouslySetInnerHTML={{ __html: svg ?? "" }}
            />
          </div>
        </div>
      </div>
    );
  }

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
    <>
      {renderDiagramViewport("min-h-[22rem]")}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent
          className="flex h-[min(92vh,900px)] max-w-[min(96vw,1400px)] flex-col gap-0 p-0 sm:max-w-[min(96vw,1400px)]"
          showCloseButton
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Diagram viewer</DialogTitle>
            <DialogDescription>
              Pan with scrollbars and zoom in for dense charts.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 p-4">
            {renderDiagramViewport()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
