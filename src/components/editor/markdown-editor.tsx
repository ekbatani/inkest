"use client";

import * as React from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  Decoration,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { Prec, StateField, type EditorState, type Range } from "@codemirror/state";
import { cn } from "@/lib/utils";
import { containsArabicScript } from "@/lib/text/rtl";
import {
  getHeadingAnchorId,
  resolveNoteHref,
  type WikiLinkTarget,
} from "@/lib/markdown/wiki";

type Props = {
  value: string;
  onChange: (value: string) => void;
  direction?: "ltr" | "rtl" | "auto";
  className?: string;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
  linkableNotes?: WikiLinkTarget[];
  onOpenLink?: (href: string) => void;
  onLargeMarkdownPaste?: (text: string) => void;
};

const LARGE_PASTE_THRESHOLD = 1500;

function looksLikeMarkdown(text: string) {
  const lines = text.split("\n");
  let signals = 0;
  for (const line of lines) {
    if (
      /^\s{0,3}(#{1,6}\s+\S|[-*+]\s+\S|\d+\.\s+\S|```|>\s*\S|\|.+\|)/.test(line)
    ) {
      signals++;
      if (signals >= 2) return true;
    }
  }
  return false;
}

export function MarkdownEditor({
  value,
  onChange,
  direction = "auto",
  className,
  editorRef,
  linkableNotes = [],
  onOpenLink,
  onLargeMarkdownPaste,
}: Props) {
  const usesRtlFont =
    direction === "rtl" || (direction === "auto" && containsArabicScript(value));
  const editorFontFamily =
    usesRtlFont ? "var(--font-rtl)" : "var(--font-serif), Georgia, serif";

  const extensions = React.useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      fencedBlockField,
      EditorView.decorations.of(buildStyledMarkdownDecorations(linkableNotes)),
      EditorView.domEventHandlers({
        click: (event, view) => handleEditorLinkClick(event, view, onOpenLink),
        paste: (event) => {
          if (!onLargeMarkdownPaste) return false;
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (text.length > LARGE_PASTE_THRESHOLD && looksLikeMarkdown(text)) {
            queueMicrotask(() => onLargeMarkdownPaste(text));
          }
          return false;
        },
      }),
      Prec.highest(
        EditorView.theme({
          "&": {
            fontSize: "16.5px",
            backgroundColor: "transparent",
            color: "color-mix(in oklab, var(--foreground) 88%, transparent)",
            minHeight: "100%",
          },
          ".cm-scroller": {
            fontFamily: editorFontFamily,
            lineHeight: "1.62",
            overflow: "auto",
          },
          ".cm-line": {
            padding: "0.08rem 0",
          },
          ".cm-content": {
            paddingBlock: "0",
            paddingInline: "0.18rem",
            paddingBottom: "2.5rem",
            caretColor: "color-mix(in oklab, var(--foreground) 82%, transparent)",
          },
          ".cm-gutters": {
            display: "none",
          },
          "&.cm-focused": {
            outline: "none",
          },
          ".cm-selectionBackground, .cm-content ::selection": {
            backgroundColor:
              "color-mix(in oklab, var(--muted) 82%, var(--foreground) 18%) !important",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor:
              "color-mix(in oklab, var(--foreground) 78%, transparent)",
            zIndex: "3",
          },
          ".cm-editor": {
            minHeight: "100%",
          },
          ".cm-placeholder": {
            color: "color-mix(in oklab, var(--muted-foreground) 70%, transparent)",
          },
          ".cm-md-heading-1": {
            fontFamily: "var(--font-sans)",
            fontSize: "1.72em",
            fontWeight: "650",
            lineHeight: "1.22",
            paddingTop: "0.45rem",
            paddingBottom: "0.18rem",
          },
          ".cm-md-heading-2": {
            fontFamily: "var(--font-sans)",
            fontSize: "1.38em",
            fontWeight: "650",
            lineHeight: "1.28",
            paddingTop: "0.38rem",
            paddingBottom: "0.14rem",
          },
          ".cm-md-heading-3": {
            fontFamily: "var(--font-sans)",
            fontSize: "1.16em",
            fontWeight: "650",
            paddingTop: "0.28rem",
          },
          ".cm-md-bold": {
            fontWeight: "700",
            color: "var(--foreground)",
          },
          ".cm-md-italic": {
            fontStyle: "italic",
          },
          ".cm-md-strike": {
            textDecoration: "line-through",
            color: "color-mix(in oklab, var(--foreground) 68%, transparent)",
          },
          ".cm-md-code": {
            borderRadius: "0.35rem",
            backgroundColor: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.92em",
            padding: "0.08em 0.24em",
          },
          ".cm-md-code-line": {
            borderRadius: "0.35rem",
            backgroundColor: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.92em",
          },
          ".cm-md-fenced-block": {
            position: "relative",
            margin: "0.55rem 0",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            backgroundColor: "color-mix(in oklch, var(--muted) 42%, transparent)",
            overflow: "hidden",
          },
          ".cm-md-fenced-toolbar": {
            position: "absolute",
            insetBlockStart: "0.35rem",
            insetInlineEnd: "0.35rem",
            zIndex: "1",
            display: "flex",
            gap: "0.25rem",
          },
          ".cm-md-fenced-button": {
            border: "1px solid var(--border)",
            borderRadius: "0.35rem",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: "0.72rem",
            fontWeight: "600",
            padding: "0.16rem 0.45rem",
          },
          ".cm-md-fenced-body": {
            padding: "1rem",
            paddingBlockStart: "2.2rem",
            overflowX: "auto",
          },
          ".cm-md-fenced-code": {
            margin: "0",
            whiteSpace: "pre",
            fontFamily: "var(--font-mono)",
            fontSize: "0.84rem",
            lineHeight: "1.55",
          },
          ".cm-md-mermaid": {
            display: "flex",
            justifyContent: "center",
            minHeight: "5rem",
          },
          ".cm-md-mermaid svg": {
            maxWidth: "100%",
            height: "auto",
          },
          ".cm-md-fenced-error": {
            color: "var(--destructive)",
            whiteSpace: "pre-wrap",
          },
          ".cm-md-quote-line": {
            borderInlineStart: "3px solid var(--border)",
            color: "var(--muted-foreground)",
            fontStyle: "italic",
            paddingInlineStart: "0.8rem",
          },
          ".cm-md-task-checkbox": {
            display: "inline-flex",
            width: "1rem",
            height: "1rem",
            marginInlineEnd: "0.45rem",
            verticalAlign: "-0.12rem",
            accentColor: "var(--foreground)",
            pointerEvents: "none",
          },
          ".cm-md-highlight": {
            borderRadius: "0.25rem",
            backgroundColor: "color-mix(in oklch, var(--ai-end) 32%, transparent)",
            padding: "0.04em 0.2em",
          },
          ".cm-md-comment": {
            borderBottom: "1px dotted color-mix(in oklch, var(--ai-start) 70%, var(--foreground) 30%)",
            backgroundColor: "color-mix(in oklch, var(--ai-start) 12%, transparent)",
          },
          ".cm-md-small": {
            fontSize: "0.86em",
          },
          ".cm-md-large": {
            fontSize: "1.18em",
          },
          ".cm-md-huge": {
            fontSize: "1.42em",
            lineHeight: "1.32",
          },
          ".cm-md-link": {
            color: "var(--primary)",
            cursor: "pointer",
            textDecoration: "underline",
            textDecorationColor:
              "color-mix(in oklab, var(--primary) 65%, transparent)",
            textUnderlineOffset: "0.16em",
          },
        }),
      ),
    ],
    [editorFontFamily, linkableNotes, onOpenLink, onLargeMarkdownPaste],
  );

  const dir = direction === "auto" ? undefined : direction;

  return (
    <div className={cn("h-full", usesRtlFont && "rtl-vazir", className)} dir={dir}>
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

function selectionTouches(state: EditorState, from: number, to: number) {
  return state.selection.ranges.some(
    (range) => range.from <= to && range.to >= from,
  );
}

function hideIfIdle(
  ranges: Range<Decoration>[],
  view: EditorView,
  from: number,
  to: number,
) {
  if (from >= to || selectionTouches(view.state, from, to)) return;
  ranges.push(Decoration.replace({}).range(from, to));
}

function findHeadingPosition(state: EditorState, fragment: string) {
  const targetId = getHeadingAnchorId(fragment);

  for (let lineNo = 1; lineNo <= state.doc.lines; lineNo++) {
    const line = state.doc.line(lineNo);
    const heading = line.text.match(/^\s{0,3}#{1,6}\s+(.+)$/);
    if (!heading) continue;

    if (getHeadingAnchorId(heading[1]) === targetId) {
      return line.from;
    }
  }

  return null;
}

function handleEditorLinkClick(
  event: MouseEvent,
  view: EditorView,
  onOpenLink?: (href: string) => void,
) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;

  const linkNode = target.closest<HTMLElement>("[data-inknest-link-href]");
  const href = linkNode?.dataset.inknestLinkHref?.trim();
  if (!href) return false;

  event.preventDefault();
  event.stopPropagation();

  if (href.startsWith("#")) {
    const targetPos = findHeadingPosition(view.state, href.slice(1));
    if (targetPos !== null) {
      view.dispatch({
        selection: { anchor: targetPos },
        effects: EditorView.scrollIntoView(targetPos, { y: "center" }),
      });
      view.focus();
    }
    return true;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    window.location.assign(href);
    return true;
  }

  if (onOpenLink) {
    onOpenLink(href);
    return true;
  }

  window.location.assign(href);
  return true;
}

class TaskCheckboxWidget extends WidgetType {
  constructor(private readonly checked: boolean) {
    super();
  }

  eq(widget: TaskCheckboxWidget) {
    return widget.checked === this.checked;
  }

  toDOM() {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.checked;
    checkbox.disabled = true;
    checkbox.className = "cm-md-task-checkbox";
    checkbox.ariaLabel = this.checked ? "Checked task" : "Unchecked task";
    return checkbox;
  }

  ignoreEvent() {
    return false;
  }
}

let mermaidPreviewId = 0;

class FencedBlockWidget extends WidgetType {
  constructor(
    private readonly lang: string,
    private readonly code: string,
    private readonly rawMarkdown: string,
    private readonly from: number,
    private readonly to: number,
  ) {
    super();
  }

  eq(widget: FencedBlockWidget) {
    return (
      widget.lang === this.lang &&
      widget.code === this.code &&
      widget.rawMarkdown === this.rawMarkdown &&
      widget.from === this.from &&
      widget.to === this.to
    );
  }

  toDOM(view: EditorView) {
    const root = document.createElement("div");
    root.className = "cm-md-fenced-block";

    const toolbar = document.createElement("div");
    toolbar.className = "cm-md-fenced-toolbar";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "cm-md-fenced-button";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "cm-md-fenced-button";
    edit.textContent = "Edit";
    edit.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({ selection: { anchor: this.from, head: this.to } });
      view.focus();
    });

    const body = document.createElement("div");
    body.className = "cm-md-fenced-body";

    let showingCode = false;
    let renderVersion = 0;

    const renderCode = () => {
      showingCode = true;
      toggle.textContent = "Preview";
      body.className = "cm-md-fenced-body";
      body.textContent = "";
      const pre = document.createElement("pre");
      pre.className = "cm-md-fenced-code";
      pre.textContent = this.rawMarkdown;
      pre.title = "Click Edit to modify this Markdown block";
      body.append(pre);
    };

    const renderPreview = () => {
      showingCode = false;
      toggle.textContent = "Code";
      body.textContent = "";

      if (this.lang.toLowerCase() !== "mermaid") {
        const pre = document.createElement("pre");
        pre.className = "cm-md-fenced-code";
        pre.textContent = this.code;
        body.append(pre);
        return;
      }

      const version = ++renderVersion;
      body.className = "cm-md-fenced-body cm-md-mermaid";
      body.textContent = "Rendering diagram...";

      void import("mermaid")
        .then((module) => {
          if (version !== renderVersion) return;
          const mermaid = module.default;
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "default",
          });
          return mermaid.render(`editor-mermaid-${++mermaidPreviewId}`, this.code);
        })
        .then((result) => {
          if (!result || version !== renderVersion) return;
          body.innerHTML = result.svg;
        })
        .catch((error: unknown) => {
          if (version !== renderVersion) return;
          body.className = "cm-md-fenced-body cm-md-fenced-error";
          body.textContent =
            error instanceof Error ? error.message : "Invalid Mermaid diagram.";
        });
    };

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (showingCode) {
        renderPreview();
      } else {
        renderCode();
      }
    });

    toolbar.append(toggle, edit);
    root.append(toolbar, body);
    renderPreview();
    return root;
  }

  ignoreEvent() {
    return false;
  }
}

function replaceWithWidgetIfIdle(
  ranges: Range<Decoration>[],
  view: EditorView,
  from: number,
  to: number,
  widget: WidgetType,
) {
  if (from >= to || selectionTouches(view.state, from, to)) return;
  ranges.push(Decoration.replace({ widget }).range(from, to));
}

function decorateInlinePattern(
  ranges: Range<Decoration>[],
  view: EditorView,
  lineFrom: number,
  text: string,
  pattern: RegExp,
  className: string,
) {
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined || !match[1]) continue;

    const openFrom = lineFrom + match.index;
    const delimiter = match[2] ? match[1] : pattern.source.startsWith("(?<!") ? "*" : match[1];
    const contentFrom = openFrom + delimiter.length;
    const contentTo = openFrom + match[0].length - delimiter.length;
    const closeTo = openFrom + match[0].length;

    ranges.push(Decoration.mark({ class: className }).range(contentFrom, contentTo));
    hideIfIdle(ranges, view, openFrom, contentFrom);
    hideIfIdle(ranges, view, contentTo, closeTo);
  }
}

const MARKDOWN_LINK_RE = /\[([^\]\n]+)]\(([^)\n]+)\)/g;
const WIKI_LINK_RE = /\[\[([^\]\n]+?)\]\]/g;

function addLinkDecoration(
  ranges: Range<Decoration>[],
  view: EditorView,
  openFrom: number,
  contentFrom: number,
  contentTo: number,
  closeTo: number,
  href: string,
) {
  if (!href) return;

  ranges.push(
    Decoration.mark({
      class: "cm-md-link",
      attributes: {
        "data-inknest-link-href": href,
        title: href,
      },
    }).range(contentFrom, contentTo),
  );
  hideIfIdle(ranges, view, openFrom, contentFrom);
  hideIfIdle(ranges, view, contentTo, closeTo);
}

type FencedBlock = {
  from: number;
  to: number;
  lang: string;
  code: string;
  rawMarkdown: string;
};

function findFencedBlocks(state: EditorState) {
  const blocks: FencedBlock[] = [];
  const doc = state.doc;

  for (let lineNo = 1; lineNo <= doc.lines; lineNo++) {
    const startLine = doc.line(lineNo);
    const startMatch = startLine.text.match(/^\s*```(\S*)\s*$/);
    if (!startMatch) continue;

    const codeLines: string[] = [];
    let endLine = startLine;
    let foundEnd = false;

    for (let innerLineNo = lineNo + 1; innerLineNo <= doc.lines; innerLineNo++) {
      const line = doc.line(innerLineNo);
      if (/^\s*```\s*$/.test(line.text)) {
        endLine = line;
        foundEnd = true;
        lineNo = innerLineNo;
        break;
      }
      codeLines.push(line.text);
      endLine = line;
    }

    if (!foundEnd) {
      lineNo = endLine.number;
    }

    blocks.push({
      from: startLine.from,
      to: endLine.to,
      lang: startMatch[1] ?? "",
      code: codeLines.join("\n"),
      rawMarkdown: doc.sliceString(startLine.from, endLine.to),
    });
  }

  return blocks;
}

function blockContainingLine(blocks: FencedBlock[], lineFrom: number, lineTo: number) {
  return blocks.find((block) => block.from <= lineFrom && block.to >= lineTo);
}

function buildStyledMarkdownDecorations(linkableNotes: WikiLinkTarget[]) {
  return (view: EditorView) => {
    const ranges: Range<Decoration>[] = [];
    const fencedBlocks = findFencedBlocks(view.state);

    for (const { from, to } of view.visibleRanges) {
      let pos = from;
      while (pos <= to) {
        const line = view.state.doc.lineAt(pos);
        const text = line.text;
        const fencedBlock = blockContainingLine(fencedBlocks, line.from, line.to);
        if (fencedBlock && !selectionTouches(view.state, fencedBlock.from, fencedBlock.to)) {
          if (line.to + 1 > to) break;
          pos = line.to + 1;
          continue;
        }

        const heading = text.match(/^(#{1,6})\s*(?=\S)/);
        const task = text.match(/^(\s*[-*]\s+\[([ xX])]\s+)/);

        if (fencedBlock) {
          ranges.push(
            Decoration.line({ class: "cm-md-code-line" }).range(line.from),
          );
        } else if (task) {
          replaceWithWidgetIfIdle(
            ranges,
            view,
            line.from,
            line.from + task[1].length,
            new TaskCheckboxWidget(task[2].toLowerCase() === "x"),
          );
        } else if (heading) {
          const level = Math.min(heading[1].length, 3);
          ranges.push(
            Decoration.line({ class: `cm-md-heading-${level}` }).range(line.from),
          );
          hideIfIdle(ranges, view, line.from, line.from + heading[0].length);
        }

        const quote = text.match(/^(\s*>\s*)/);
        if (!fencedBlock && quote) {
          ranges.push(
            Decoration.line({ class: "cm-md-quote-line" }).range(line.from),
          );
          hideIfIdle(ranges, view, line.from, line.from + quote[1].length);
        }

        if (fencedBlock) {
          if (line.to + 1 > to) break;
          pos = line.to + 1;
          continue;
        }

        decorateInlinePattern(
          ranges,
          view,
          line.from,
          text,
          /(\*\*|__)(?!\s)(.+?)(?<!\s)\1/g,
          "cm-md-bold",
        );
        decorateInlinePattern(
          ranges,
          view,
          line.from,
          text,
          /(~~)(?!\s)(.+?)(?<!\s)~~/g,
          "cm-md-strike",
        );
        decorateInlinePattern(
          ranges,
          view,
          line.from,
          text,
          /(`)([^`\n]+?)`/g,
          "cm-md-code",
        );
        decorateInlinePattern(
          ranges,
          view,
          line.from,
          text,
          /(?<!\*)\*(?!\s|\*)(.+?)(?<!\s)\*(?!\*)/g,
          "cm-md-italic",
        );

        for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
          if (match.index === undefined || !match[1] || !match[2]) continue;

          const openFrom = line.from + match.index;
          const contentFrom = openFrom + 1;
          const contentTo = contentFrom + match[1].length;
          const closeTo = openFrom + match[0].length;
          const href = match[2].trim();

          if (href.startsWith("inkest-")) {
            const className = href.startsWith("inkest-highlight:")
              ? "cm-md-highlight"
              : href.startsWith("inkest-comment:")
                ? "cm-md-comment"
                : href === "inkest-size:small"
                  ? "cm-md-small"
                  : href === "inkest-size:large"
                    ? "cm-md-large"
                    : href === "inkest-size:huge"
                      ? "cm-md-huge"
                      : null;

            if (!className) continue;

            ranges.push(
              Decoration.mark({ class: className }).range(contentFrom, contentTo),
            );
            hideIfIdle(ranges, view, openFrom, contentFrom);
            hideIfIdle(ranges, view, contentTo, closeTo);
            continue;
          }

          addLinkDecoration(
            ranges,
            view,
            openFrom,
            contentFrom,
            contentTo,
            closeTo,
            resolveNoteHref(href, linkableNotes) ?? href,
          );
        }

        for (const match of text.matchAll(WIKI_LINK_RE)) {
          if (match.index === undefined || !match[1]) continue;

          const openFrom = line.from + match.index;
          const inner = match[1].trim();
          if (!inner) continue;

          const sectionIndex = inner.indexOf("#");
          const noteName =
            sectionIndex === -1 ? inner : inner.slice(0, sectionIndex).trim();
          const href = resolveNoteHref(inner, linkableNotes);

          if (!href || href === inner || href === noteName) continue;

          const leadingTrim = match[1].length - match[1].trimStart().length;
          const contentFrom = openFrom + 2 + leadingTrim;
          const contentTo = contentFrom + inner.length;
          const closeTo = openFrom + match[0].length;

          addLinkDecoration(
            ranges,
            view,
            openFrom,
            contentFrom,
            contentTo,
            closeTo,
            href,
          );
        }

        if (line.to + 1 > to) break;
        pos = line.to + 1;
      }
    }

    return ranges.length > 0 ? Decoration.set(ranges, true) : Decoration.none;
  };
}

function buildFencedBlockDecorations(state: EditorState) {
  const ranges: Range<Decoration>[] = [];

  for (const block of findFencedBlocks(state)) {
    if (selectionTouches(state, block.from, block.to)) continue;

    ranges.push(
      Decoration.replace({
        block: true,
        widget: new FencedBlockWidget(
          block.lang,
          block.code,
          block.rawMarkdown,
          block.from,
          block.to,
        ),
      }).range(block.from, block.to),
    );
  }

  return ranges.length > 0 ? Decoration.set(ranges, true) : Decoration.none;
}

const fencedBlockField = StateField.define({
  create(state) {
    return buildFencedBlockDecorations(state);
  },
  update(value, tr) {
    if (!tr.docChanged && !tr.selection) return value;
    return buildFencedBlockDecorations(tr.state);
  },
  provide: (field) => EditorView.decorations.from(field),
});

