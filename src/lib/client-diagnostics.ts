"use client";

type ErrorSurface = "app" | "note" | "project";

/**
 * Reports only fixed, non-content metadata from an App Router error boundary.
 * Error messages and stacks can include note text, URLs, or provider tokens,
 * so they intentionally never cross this boundary.
 */
export function reportClientError(
  surface: ErrorSurface,
  error: Error & { digest?: string },
) {
  const body = JSON.stringify({
    surface,
    digest: typeof error.digest === "string" ? error.digest.slice(0, 128) : undefined,
  });

  void fetch("/api/diagnostics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    // Diagnostics must never affect error recovery.
  });
}
