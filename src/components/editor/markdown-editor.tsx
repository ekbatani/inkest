"use client";

import * as React from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  direction?: "ltr" | "rtl" | "auto";
  className?: string;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
};

export function MarkdownEditor({
  value,
  onChange,
  direction = "auto",
  className,
  editorRef,
}: Props) {
  const extensions = React.useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      Prec.highest(
        EditorView.theme({
          "&": {
            fontSize: "14px",
            backgroundColor: "transparent",
          },
          ".cm-scroller": {
            fontFamily: "var(--font-mono)",
            lineHeight: "1.7",
            overflow: "auto",
          },
          ".cm-content": {
            padding: "0",
          },
          ".cm-gutters": {
            display: "none",
          },
          "&.cm-focused": {
            outline: "none",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "var(--foreground)",
          },
          ".cm-editor": {
            height: "100%",
          },
        }),
      ),
    ],
    [],
  );

  const dir = direction === "auto" ? undefined : direction;

  return (
    <div className={cn("h-full", className)} dir={dir}>
      <CodeMirror
        ref={editorRef}
        value={value}
        onChange={onChange}
        extensions={extensions}
        height="100%"
        className="h-full text-sm"
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          searchKeymap: false,
        }}
        style={{ height: "100%" }}
      />
    </div>
  );
}

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
