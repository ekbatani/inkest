import type * as React from "react";
// Type-only import — erased at compile time, so this module carries none of
// @uiw/react-codemirror's runtime weight. Kept separate from markdown-editor.tsx
// so callers that only need cursor/format helpers (AiPanel, upload/speech
// buttons, the format toolbar) don't pull CodeMirror into their chunk.
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import type { EditorView } from "@codemirror/view";

export function insertTextAtCursor(
  ref: React.RefObject<ReactCodeMirrorRef | null>,
  text: string,
) {
  const view = ref.current?.view;
  if (!view) return;
  const sel = view.state.selection.main;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + text.length },
  });
  view.focus();
}

export type MarkdownFormat =
  | "bold"
  | "italic"
  | "strikethrough"
  | "inline-code"
  | "code-block"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "quote"
  | "bullet-list"
  | "numbered-list"
  | "check-list"
  | "highlight"
  | "comment"
  | "small"
  | "large"
  | "huge";

const INLINE_FORMATS: Partial<
  Record<MarkdownFormat, { before: string; after: string; placeholder: string }>
> = {
  bold: { before: "**", after: "**", placeholder: "bold text" },
  italic: { before: "*", after: "*", placeholder: "italic text" },
  strikethrough: { before: "~~", after: "~~", placeholder: "struck text" },
  "inline-code": { before: "`", after: "`", placeholder: "code" },
};

function lineFormat(
  value: string,
  format: MarkdownFormat,
  selectionFrom: number,
  selectionTo: number,
) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionFrom - 1)) + 1;
  const nextNewline = value.indexOf("\n", selectionTo);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  const selectedLines = value.slice(lineStart, lineEnd);
  const lines = selectedLines.length > 0 ? selectedLines.split("\n") : [""];

  const formatted = lines
    .map((line, index) => {
      const stripped = line.replace(
        /^\s*(#{1,6}\s+|>\s+|- \[ \]\s+|- \s+|\d+\.\s+)/,
        "",
      );
      if (format === "heading-1") return `# ${stripped}`;
      if (format === "heading-2") return `## ${stripped}`;
      if (format === "heading-3") return `### ${stripped}`;
      if (format === "quote") return `> ${stripped}`;
      if (format === "bullet-list") return `- ${stripped}`;
      if (format === "numbered-list") return `${index + 1}. ${stripped}`;
      return `- [ ] ${stripped}`;
    })
    .join("\n");

  return { from: lineStart, to: lineEnd, insert: formatted };
}

function encodedAnnotation(
  format: MarkdownFormat,
  selectedText: string,
  comment?: string,
) {
  const fallback =
    format === "comment" ? "commented text" : format === "highlight" ? "highlight" : "sized text";
  const text = (selectedText || fallback).replaceAll("[", "\\[").replaceAll("]", "\\]");

  if (format === "highlight") return `[${text}](inkest-highlight:)`;
  if (format === "small") return `[${text}](inkest-size:small)`;
  if (format === "large") return `[${text}](inkest-size:large)`;
  if (format === "huge") return `[${text}](inkest-size:huge)`;

  const encoded = encodeURIComponent(comment?.trim() || "Add a comment here.");
  return `[${text}](inkest-comment:${encoded})`;
}

export function applyMarkdownFormat(
  ref: React.RefObject<ReactCodeMirrorRef | null>,
  format: MarkdownFormat,
  options?: { comment?: string },
) {
  const view = ref.current?.view;
  if (!view) return;

  applyMarkdownFormatToView(view, format, options);
}

export function applyMarkdownFormatToView(
  view: EditorView,
  format: MarkdownFormat,
  options?: { comment?: string },
) {

  const sel = view.state.selection.main;
  const selectedText = view.state.sliceDoc(sel.from, sel.to);
  const inline = INLINE_FORMATS[format];

  if (inline) {
    const text = selectedText || inline.placeholder;
    const insert = `${inline.before}${text}${inline.after}`;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert },
      selection: selectedText
        ? { anchor: sel.from + insert.length }
        : { anchor: sel.from + inline.before.length, head: sel.from + inline.before.length + text.length },
    });
    view.focus();
    return;
  }

  if (format === "code-block") {
    const text = selectedText || "code";
    const before = sel.from > 0 ? "\n\n" : "";
    const after = sel.to < view.state.doc.length ? "\n\n" : "";
    const insert = `${before}\`\`\`\n${text}\n\`\`\`${after}`;
    const contentFrom = sel.from + before.length + 4;
    const contentTo = contentFrom + text.length;

    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert },
      selection: selectedText
        ? { anchor: contentTo }
        : { anchor: contentFrom, head: contentTo },
    });
    view.focus();
    return;
  }

  if (
    format === "heading-1" ||
    format === "heading-2" ||
    format === "heading-3" ||
    format === "quote" ||
    format === "bullet-list" ||
    format === "numbered-list" ||
    format === "check-list"
  ) {
    const change = lineFormat(view.state.doc.toString(), format, sel.from, sel.to);
    view.dispatch({
      changes: change,
      selection: { anchor: change.from + change.insert.length },
    });
    view.focus();
    return;
  }

  const insert = encodedAnnotation(format, selectedText, options?.comment);
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: { anchor: sel.from + insert.length },
  });
  view.focus();
}

export function getSelectedEditorText(ref: React.RefObject<ReactCodeMirrorRef | null>) {
  const view = ref.current?.view;
  if (!view) return null;
  const sel = view.state.selection.main;
  if (sel.from === sel.to) return null;
  return view.state.sliceDoc(sel.from, sel.to).trim() || null;
}

export function replaceEntireEditorContent(
  ref: React.RefObject<ReactCodeMirrorRef | null>,
  text: string,
) {
  const view = ref.current?.view;
  if (!view) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    selection: { anchor: text.length },
  });
  view.focus();
}
