"use client";

import * as React from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import {
  ensureSyntaxTree,
  HighlightStyle,
  LanguageDescription,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import {
  Decoration,
  EditorView,
  keymap,
  WidgetType,
} from "@codemirror/view";
import { Prec, type EditorState, type Range } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { containsArabicScript } from "@/lib/text/rtl";
import {
  getHeadingAnchorId,
  resolveNoteHref,
  parseWikiToken,
  isImageAsset,
  WIKI_RE,
  type WikiLinkTarget,
} from "@/lib/markdown/wiki";
import { applyMarkdownFormatToView } from "@/components/editor/markdown-editor-utils";
import { InsertLinkDialog } from "@/components/editor/insert-link-dialog";
import {
  LinkPreviewPopover,
  type ActiveLinkInfo,
} from "@/components/editor/link-preview-popover";
import {
  search,
  openSearchPanel,
  closeSearchPanel,
  findNext,
  findPrevious,
  selectSelectionMatches,
  gotoLine,
  selectNextOccurrence,
} from "@codemirror/search";
import {
  createFindReplacePanel,
  openReplacePanelEffect,
} from "@/components/editor/find-replace-panel";

type Props = {
  value: string;
  onChange: (value: string) => void;
  direction?: "ltr" | "rtl" | "auto";
  className?: string;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
  linkableNotes?: WikiLinkTarget[];
  onOpenLink?: (href: string) => void;
  onLargeMarkdownPaste?: (content: string) => void;
  spellcheck?: boolean;
  spellcheckLanguage?: "auto" | "en" | "fa";
};

const LARGE_PASTE_THRESHOLD = 1500;

const markdownFormattingKeymap = keymap.of([
  {
    key: "Mod-b",
    run: (view) => {
      applyMarkdownFormatToView(view, "bold");
      return true;
    },
  },
  {
    key: "Mod-i",
    run: (view) => {
      applyMarkdownFormatToView(view, "italic");
      return true;
    },
  },
  {
    key: "Mod-Shift-x",
    run: (view) => {
      applyMarkdownFormatToView(view, "strikethrough");
      return true;
    },
  },
  {
    key: "Mod-e",
    run: (view) => {
      applyMarkdownFormatToView(view, "inline-code");
      return true;
    },
  },
  {
    key: "Mod-k",
    run: (view) => {
      const sel = view.state.selection.main;
      const selectedText = view.state.sliceDoc(sel.from, sel.to);
      window.dispatchEvent(
        new CustomEvent("inkest:open-insert-link-dialog", {
          detail: {
            prefilledQuery: selectedText,
            replaceRange:
              sel.from !== sel.to ? { from: sel.from, to: sel.to } : undefined,
          },
        }),
      );
      return true;
    },
  },
  {
    key: "[",
    run: (view) => {
      const sel = view.state.selection.main;
      if (sel.from === sel.to) return false;
      const selectedText = view.state.sliceDoc(sel.from, sel.to);
      const insert = `[[${selectedText}]]`;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert },
        selection: { anchor: sel.from + insert.length },
      });
      return true;
    },
  },
]);


const customSearchKeymap = keymap.of([
  {
    key: "Mod-f",
    run: (view) => {
      openSearchPanel(view);
      return true;
    },
    scope: "editor search-panel",
  },
  {
    key: "Mod-h",
    run: (view) => {
      openSearchPanel(view);
      view.dispatch({ effects: openReplacePanelEffect.of(true) });
      return true;
    },
    scope: "editor search-panel",
  },
  {
    key: "Mod-Alt-f",
    run: (view) => {
      openSearchPanel(view);
      view.dispatch({ effects: openReplacePanelEffect.of(true) });
      return true;
    },
    scope: "editor search-panel",
  },
  {
    key: "F3",
    run: findNext,
    shift: findPrevious,
    scope: "editor search-panel",
    preventDefault: true,
  },
  {
    key: "Mod-g",
    run: findNext,
    shift: findPrevious,
    scope: "editor search-panel",
    preventDefault: true,
  },
  {
    key: "Escape",
    run: closeSearchPanel,
    scope: "editor search-panel",
  },
  {
    key: "Mod-Shift-l",
    run: selectSelectionMatches,
  },
  {
    key: "Mod-Alt-g",
    run: gotoLine,
  },
  {
    key: "Mod-d",
    run: selectNextOccurrence,
    preventDefault: true,
  },
]);

const fencedCodeLanguages = [
  LanguageDescription.of({
    name: "JSON",
    alias: ["json"],
    support: javascript(),
  }),
  LanguageDescription.of({
    name: "JavaScript",
    alias: ["js", "javascript", "jsx", "ts", "typescript", "tsx"],
    support: javascript({ jsx: true, typescript: true }),
  }),
  LanguageDescription.of({
    name: "HTML",
    alias: ["html", "xml", "svg"],
    support: html(),
  }),
  LanguageDescription.of({
    name: "CSS",
    alias: ["css"],
    support: css(),
  }),
];

const fencedCodeHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#c084fc" },
  { tag: [tags.string, tags.special(tags.string)], color: "#86efac" },
  { tag: [tags.number, tags.bool, tags.null], color: "#fbbf24" },
  { tag: tags.propertyName, color: "#7dd3fc" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "#94a3b8", fontStyle: "italic" },
  { tag: [tags.definitionKeyword, tags.function(tags.variableName)], color: "#f9a8d4" },
]);

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

function extractDocumentHeadings(docText: string) {
  const headings: { title: string; anchor: string; level: number }[] = [];
  const lines = docText.split("\n");
  for (const line of lines) {
    const match = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawTitle = match[2].replace(/[`*_~]/g, "").trim();
      headings.push({
        title: rawTitle,
        anchor: getHeadingAnchorId(rawTitle),
        level,
      });
    }
  }
  return headings;
}

function getTargetDetail(t: WikiLinkTarget): string {
  if (t.type === "project") {
    return t.status ? `Project · ${t.status}` : "Project";
  }
  if (t.type === "daily") return "Daily note";
  if (t.type === "asset") {
    if (t.mimeType?.startsWith("image/")) return "Image";
    if (t.mimeType?.includes("pdf")) return "PDF";
    return "File";
  }
  return "Note";
}

function createWikiLinkCompletionSource(targets: WikiLinkTarget[]) {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/(!?)\[\[[^\]]*$/);
    if (!word) return null;

    const isEmbed = word.text.startsWith("!");
    let rawQuery = word.text.replace(/^!?\[\[/, "");
    let filterCategory: "all" | "projects" | "notes" | "assets" = "all";

    // Support prefix filters: @ / p: / /p / a: / /a / n: / /n
    if (rawQuery.startsWith("@") || rawQuery.startsWith("p:") || rawQuery.startsWith("/p")) {
      filterCategory = "projects";
      rawQuery = rawQuery.replace(/^(@|p:|\/p\s*)/i, "");
    } else if (rawQuery.startsWith("a:") || rawQuery.startsWith("/a")) {
      filterCategory = "assets";
      rawQuery = rawQuery.replace(/^(a:|\/a\s*)/i, "");
    } else if (rawQuery.startsWith("n:") || rawQuery.startsWith("/n")) {
      filterCategory = "notes";
      rawQuery = rawQuery.replace(/^(n:|\/n\s*)/i, "");
    }

    const query = rawQuery.toLowerCase().trim();

    // 1. Heading completion: [[# or [[Note#
    if (rawQuery.includes("#")) {
      const hashIdx = rawQuery.indexOf("#");
      const headingQuery = rawQuery.slice(hashIdx + 1).toLowerCase().trim();
      const headings = extractDocumentHeadings(context.state.doc.toString());

      return {
        from: word.from + (isEmbed ? 3 : 2) + hashIdx + 1,
        options: headings
          .filter((h) => !headingQuery || h.title.toLowerCase().includes(headingQuery))
          .map((h) => ({
            label: h.title,
            detail: `Heading · H${h.level}`,
            apply: `${h.title}]]`,
            boost: 3,
          })),
      };
    }

    return {
      from: word.from + (isEmbed ? 3 : 2),
      options: targets
        .filter((t) => {
          if (filterCategory === "projects" && t.type !== "project") return false;
          if (filterCategory === "notes" && t.type !== "note" && t.type !== "daily") return false;
          if (filterCategory === "assets" && t.type !== "asset") return false;

          return (
            !query ||
            t.title.toLowerCase().includes(query) ||
            t.slug.toLowerCase().includes(query) ||
            (t.excerpt && t.excerpt.toLowerCase().includes(query))
          );
        })
        .map((t) => {
          const isImage = isImageAsset(t);
          const isTargetAsset = t.type === "asset";
          const isProject = t.type === "project";

          let boost = t.title.toLowerCase().startsWith(query) ? 2 : 1;
          if (isEmbed && (isImage || isTargetAsset)) boost += 3;
          if (isProject) boost += 1;

          return {
            label: t.title,
            detail: getTargetDetail(t),
            apply: `${t.title}]]`,
            boost,
          };
        }),
    };
  };
}



async function uploadAndInsertFile(
  file: File,
  view: EditorView,
  insertPos?: number,
) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/attachments", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Upload failed");
    }

    const { markdown } = await res.json();
    const pos = insertPos ?? view.state.selection.main.head;
    const doc = view.state.doc;
    const separatorBefore =
      pos > 0 && !doc.sliceString(pos - 1, pos).endsWith("\n") ? "\n" : "";
    const separatorAfter =
      pos < doc.length && !doc.sliceString(pos, pos + 1).startsWith("\n")
        ? "\n"
        : "";
    const textToInsert = `${separatorBefore}${markdown}${separatorAfter}`;

    view.dispatch({
      changes: { from: pos, insert: textToInsert },
      selection: { anchor: pos + textToInsert.length },
    });
    view.focus();
    toast.success("Attachment inserted.");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Upload failed.");
  }
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
  const docLen = view.state.doc.length;
  const clampedFrom = Math.min(Math.max(0, from), docLen);
  const clampedTo = Math.min(Math.max(0, to), docLen);
  if (clampedFrom >= clampedTo || selectionTouches(view.state, clampedFrom, clampedTo)) return;
  ranges.push(Decoration.replace({}).range(clampedFrom, clampedTo));
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

  // Open private attachments or external URLs in new tab safely
  if (href.startsWith("/api/attachments/") || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
    window.open(href, "_blank", "noopener,noreferrer");
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

function replaceWithWidgetIfIdle(
  ranges: Range<Decoration>[],
  view: EditorView,
  from: number,
  to: number,
  widget: WidgetType,
) {
  const docLen = view.state.doc.length;
  const clampedFrom = Math.min(Math.max(0, from), docLen);
  const clampedTo = Math.min(Math.max(0, to), docLen);
  if (clampedFrom >= clampedTo || selectionTouches(view.state, clampedFrom, clampedTo)) return;
  ranges.push(Decoration.replace({ widget }).range(clampedFrom, clampedTo));
}

function decorateInlinePattern(
  ranges: Range<Decoration>[],
  view: EditorView,
  lineFrom: number,
  text: string,
  pattern: RegExp,
  className: string,
) {
  const docLen = view.state.doc.length;
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined || !match[1]) continue;

    const openFrom = lineFrom + match.index;
    const delimiter = match[2] ? match[1] : pattern.source.startsWith("(?<!") ? "*" : match[1];
    const contentFrom = openFrom + delimiter.length;
    const contentTo = openFrom + match[0].length - delimiter.length;
    const closeTo = openFrom + match[0].length;

    const clampedContentFrom = Math.min(Math.max(0, contentFrom), docLen);
    const clampedContentTo = Math.min(Math.max(0, contentTo), docLen);

    if (clampedContentFrom < clampedContentTo) {
      ranges.push(Decoration.mark({ class: className }).range(clampedContentFrom, clampedContentTo));
    }
    hideIfIdle(ranges, view, openFrom, contentFrom);
    hideIfIdle(ranges, view, contentTo, closeTo);
  }
}

const MARKDOWN_LINK_RE = /\[([^\]\n]+)]\(([^)\n]+)\)/g;

function addLinkDecoration(
  ranges: Range<Decoration>[],
  view: EditorView,
  openFrom: number,
  contentFrom: number,
  contentTo: number,
  closeTo: number,
  href: string,
  classNameOverride?: string,
) {
  const docLen = view.state.doc.length;
  const clampedContentFrom = Math.min(Math.max(0, contentFrom), docLen);
  const clampedContentTo = Math.min(Math.max(0, contentTo), docLen);
  if (!href || clampedContentFrom >= clampedContentTo) return;

  ranges.push(
    Decoration.mark({
      class: classNameOverride ?? "cm-md-link",
      attributes: {
        "data-inknest-link-href": href,
        title: href,
      },
    }).range(clampedContentFrom, clampedContentTo),
  );
  hideIfIdle(ranges, view, openFrom, contentFrom);
  hideIfIdle(ranges, view, contentTo, closeTo);
}

function blockContainingLine(
  blocks: ReadonlyArray<{ from: number; to: number }>,
  lineFrom: number,
  lineTo: number,
) {
  return blocks.find((block) => block.from <= lineFrom && block.to >= lineTo);
}

function findVisibleFencedBlocks(view: EditorView) {
  const blocks: { from: number; to: number }[] = [];
  const docLen = view.state.doc.length;
  if (docLen === 0) return blocks;
  const rawEnd = view.visibleRanges.at(-1)?.to ?? view.viewport.to;
  const visibleEnd = Math.min(Math.max(0, rawEnd), docLen);
  // The language parser can still be catching up when the editor first mounts.
  // Resolve the visible tree now so an initially visible fenced block gets its
  // non-blocking surface decoration without waiting for a later transaction.
  const tree = ensureSyntaxTree(view.state, visibleEnd, 20) ?? syntaxTree(view.state);

  tree.iterate({
    enter: (node) => {
      if (node.name !== "FencedCode") return;
      if (
        view.visibleRanges.some(
          (range) => node.from <= Math.min(range.to, docLen) && node.to >= Math.min(range.from, docLen),
        )
      ) {
        blocks.push({ from: node.from, to: node.to });
      }
    },
  });

  return blocks;
}

function buildLineDecorations(view: EditorView) {
  const docLen = view.state.doc.length;
  if (docLen === 0) return Decoration.none;
  const ranges: Range<Decoration>[] = [];
  const fencedBlocks = findVisibleFencedBlocks(view);

  for (const { from, to } of view.visibleRanges) {
    let pos = Math.min(Math.max(0, from), docLen);
    const clampedTo = Math.min(Math.max(0, to), docLen);
    while (pos <= clampedTo) {
      if (pos > docLen) break;
      const line = view.state.doc.lineAt(pos);
      const text = line.text;
      const fencedBlock = blockContainingLine(fencedBlocks, line.from, line.to);
      if (fencedBlock) {
        if (line.to + 1 > clampedTo || line.to >= docLen) break;
        pos = line.to + 1;
        continue;
      }

      const heading = text.match(/^(#{1,6})\s*(?=\S)/);
      const quote = text.match(/^(\s*>\s*)/);

      if (heading) {
        const level = Math.min(heading[1].length, 3);
        ranges.push(
          Decoration.line({ class: `cm-md-heading-${level}` }).range(line.from),
        );
      } else if (quote) {
        ranges.push(
          Decoration.line({ class: "cm-md-quote-line" }).range(line.from),
        );
      }

      if (line.to + 1 > clampedTo || line.to >= docLen) break;
      pos = line.to + 1;
    }
  }

  return ranges.length > 0 ? Decoration.set(ranges, true) : Decoration.none;
}

function buildInlineDecorations(linkableNotes: WikiLinkTarget[]) {
  return (view: EditorView) => {
    const docLen = view.state.doc.length;
    if (docLen === 0) return Decoration.none;
    const ranges: Range<Decoration>[] = [];
    const fencedBlocks = findVisibleFencedBlocks(view);

    for (const { from, to } of view.visibleRanges) {
      let pos = Math.min(Math.max(0, from), docLen);
      const clampedTo = Math.min(Math.max(0, to), docLen);
      while (pos <= clampedTo) {
        if (pos > docLen) break;
        const line = view.state.doc.lineAt(pos);
        const text = line.text;
        const fencedBlock = blockContainingLine(fencedBlocks, line.from, line.to);
        if (fencedBlock) {
          if (line.to + 1 > clampedTo || line.to >= docLen) break;
          pos = line.to + 1;
          continue;
        }

        const heading = text.match(/^(#{1,6})\s*(?=\S)/);
        const task = text.match(/^(\s*[-*]\s+\[([ xX])]\s+)/);

        if (task) {
          replaceWithWidgetIfIdle(
            ranges,
            view,
            line.from,
            line.from + task[1].length,
            new TaskCheckboxWidget(task[2].toLowerCase() === "x"),
          );
        } else if (heading) {
          hideIfIdle(ranges, view, line.from, line.from + heading[0].length);
        } else {
          const quote = text.match(/^(\s*>\s*)/);
          if (quote) {
            hideIfIdle(ranges, view, line.from, line.from + quote[1].length);
          }
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

            if (!className || contentFrom >= contentTo) continue;

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

        for (const match of text.matchAll(WIKI_RE)) {
          if (match.index === undefined || !match[2]) continue;

          const isEmbed = Boolean(match[1]);
          const openFrom = line.from + match.index;
          const inner = match[2].trim();
          if (!inner) continue;

          const { targetName, section } = parseWikiToken(inner);
          const href = resolveNoteHref(section ? `${targetName}#${section}` : targetName, linkableNotes);

          const leadingTrim = match[2].length - match[2].trimStart().length;
          const contentFrom = openFrom + (isEmbed ? 3 : 2) + leadingTrim;
          const contentTo = contentFrom + inner.length;
          const closeTo = openFrom + match[0].length;

          const isUnresolved = !href || href === inner || href === targetName;
          const targetHref = isUnresolved
            ? `/notes/new?title=${encodeURIComponent(targetName)}`
            : href;

          addLinkDecoration(
            ranges,
            view,
            openFrom,
            contentFrom,
            contentTo,
            closeTo,
            targetHref,
            isUnresolved ? "cm-md-link-unresolved" : undefined,
          );
        }

        if (line.to + 1 > clampedTo || line.to >= docLen) break;
        pos = line.to + 1;
      }
    }

    return ranges.length > 0 ? Decoration.set(ranges, true) : Decoration.none;
  };
}

function findLinkTokenAtPos(state: EditorState, pos: number) {
  const docLen = state.doc.length;
  if (docLen === 0) return null;
  const clampedPos = Math.min(Math.max(0, pos), docLen);
  const line = state.doc.lineAt(clampedPos);
  const text = line.text;
  const lineOffset = clampedPos - line.from;

  for (const match of text.matchAll(WIKI_RE)) {
    if (match.index === undefined) continue;
    const start = match.index;
    const end = start + match[0].length;
    if (lineOffset >= start && lineOffset <= end) {
      return {
        from: line.from + start,
        to: line.from + end,
        rawText: match[0],
      };
    }
  }

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    if (match.index === undefined) continue;
    const start = match.index;
    const end = start + match[0].length;
    if (lineOffset >= start && lineOffset <= end) {
      return {
        from: line.from + start,
        to: line.from + end,
        rawText: match[0],
      };
    }
  }

  return null;
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
  spellcheck = true,
  spellcheckLanguage = "auto",
}: Props) {
  const [editorValue, setEditorValue] = React.useState(value);
  const lastEmittedValueRef = React.useRef(value);

  // Link management state
  const [createdTargets, setCreatedTargets] = React.useState<WikiLinkTarget[]>([]);
  const targets = React.useMemo(() => {
    if (createdTargets.length === 0) return linkableNotes;
    const createdIds = new Set(createdTargets.map((t) => t.id));
    return [...createdTargets, ...linkableNotes.filter((t) => !createdIds.has(t.id))];
  }, [linkableNotes, createdTargets]);

  const [insertLinkOpen, setInsertLinkOpen] = React.useState(false);
  const [insertLinkQuery, setInsertLinkQuery] = React.useState("");
  const [insertLinkRange, setInsertLinkRange] = React.useState<{ from: number; to: number } | undefined>(undefined);
  const [activeLinkInfo, setActiveLinkInfo] = React.useState<ActiveLinkInfo | null>(null);

  const handleTargetCreated = React.useCallback((newTarget: WikiLinkTarget) => {
    setCreatedTargets((prev) => [newTarget, ...prev.filter((t) => t.id !== newTarget.id)]);
  }, []);

  React.useEffect(() => {
    const onOpenDialog = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          prefilledQuery?: string;
          replaceRange?: { from: number; to: number };
        }>
      ).detail;
      setInsertLinkQuery(detail?.prefilledQuery ?? "");
      setInsertLinkRange(detail?.replaceRange);
      setInsertLinkOpen(true);
    };

    window.addEventListener("inkest:open-insert-link-dialog", onOpenDialog);
    return () =>
      window.removeEventListener("inkest:open-insert-link-dialog", onOpenDialog);
  }, []);

  // Sync external changes (e.g. Undo, Redo, Version Restore, Note switch) down to CodeMirror state.
  // Ignore echo prop updates that match the last value emitted by CodeMirror.
  React.useEffect(() => {
    if (value === lastEmittedValueRef.current) return;
    lastEmittedValueRef.current = value;
    setEditorValue(value);

    const view = editorRef?.current?.view;
    if (view && view.state.doc.toString() !== value) {
      const currentSelection = view.state.selection;
      const newLen = value.length;
      const newAnchor = Math.min(currentSelection.main.anchor, newLen);
      const newHead = Math.min(currentSelection.main.head, newLen);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        selection: { anchor: newAnchor, head: newHead },
      });
    }
  }, [value, editorRef]);

  const handleCodeMirrorChange = React.useCallback(
    (nextValue: string) => {
      lastEmittedValueRef.current = nextValue;
      setEditorValue(nextValue);
      onChange(nextValue);
    },
    [onChange],
  );

  const usesRtlFont =
    direction === "rtl" || (direction === "auto" && containsArabicScript(editorValue));
  const editorFontFamily =
    usesRtlFont
      ? "var(--font-rtl)"
      : "var(--inkest-font-writing, var(--font-sans))";

  const extensions = React.useMemo(
    () => [
      markdown({ base: markdownLanguage, codeLanguages: fencedCodeLanguages }),
      markdownFormattingKeymap,
      search({
        createPanel: createFindReplacePanel,
        top: true,
      }),
      customSearchKeymap,
      autocompletion({
        override: [createWikiLinkCompletionSource(targets)],
        defaultKeymap: true,
        icons: false,
      }),
      syntaxHighlighting(fencedCodeHighlightStyle),
      EditorView.lineWrapping,
      // CodeMirror owns the editable DOM, so native browser spellcheck must
      // be enabled on its content element rather than on the React wrapper.
      // This stays entirely in the browser: no note text is sent anywhere.
      EditorView.contentAttributes.of({
        spellcheck: String(spellcheck),
        ...(spellcheckLanguage === "auto" ? {} : { lang: spellcheckLanguage }),
      }),
      EditorView.decorations.of(buildLineDecorations),
      EditorView.decorations.of(buildInlineDecorations(targets)),
      EditorView.domEventHandlers({
        click: (event, view) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return false;

          const linkNode = target.closest<HTMLElement>("[data-inknest-link-href]");
          const href = linkNode?.dataset.inknestLinkHref?.trim();
          if (!linkNode || !href) {
            setActiveLinkInfo(null);
            return false;
          }

          event.preventDefault();
          event.stopPropagation();

          // If holding Cmd/Ctrl or Alt, navigate directly
          if (event.metaKey || event.ctrlKey || event.altKey) {
            return handleEditorLinkClick(event, view, onOpenLink);
          }

          // Otherwise show rich contextual preview card
          const rect = linkNode.getBoundingClientRect();
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          const token = pos !== null ? findLinkTokenAtPos(view.state, pos) : null;

          setActiveLinkInfo({
            href,
            rawText: token?.rawText || linkNode.textContent || href,
            from: token?.from ?? (pos ?? 0),
            to: token?.to ?? (pos ?? 0),
            coords: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            },
          });
          return true;
        },
        paste: (event, view) => {
          const files = event.clipboardData?.files;
          if (files && files.length > 0) {
            event.preventDefault();
            for (let i = 0; i < files.length; i++) {
              void uploadAndInsertFile(files[i], view);
            }
            return true;
          }

          if (!onLargeMarkdownPaste) return false;
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (text.length > LARGE_PASTE_THRESHOLD && looksLikeMarkdown(text)) {
            // Let CodeMirror apply the paste first. The parent note state is
            // intentionally debounced for typing performance, so pass the
            // editor's post-paste document to the optional preview instead of
            // waiting for that parent update.
            queueMicrotask(() => onLargeMarkdownPaste(view.state.doc.toString()));
          }
          return false;
        },
        drop: (event, view) => {
          const files = event.dataTransfer?.files;
          if (files && files.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            const targetPos = pos !== null ? pos : view.state.selection.main.head;
            for (let i = 0; i < files.length; i++) {
              void uploadAndInsertFile(files[i], view, targetPos);
            }
            return true;
          }
          return false;
        },
      }),
      Prec.highest(
        EditorView.theme({
          "&": {
            fontSize: "1.05rem",
            backgroundColor: "transparent",
            color: "color-mix(in oklab, var(--foreground) 91%, transparent)",
            minHeight: "100%",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
          },
          ".cm-scroller": {
            fontFamily: editorFontFamily,
            lineHeight: "1.75",
            letterSpacing: "-0.011em",
            overflow: "auto",
          },
          ".cm-line": {
            padding: "0.06rem 0",
          },
          ".cm-content": {
            paddingBlock: "0",
            paddingInline: "0.25rem",
            paddingBottom: "2.5rem",
            width: "100%",
            maxWidth: "100%",
            marginInline: "auto",
            caretColor: "var(--primary)",
          },
          ".cm-gutters": {
            display: "none",
          },
          "&.cm-focused": {
            outline: "none",
          },
          ".cm-selectionBackground, .cm-content ::selection": {
            backgroundColor:
              "color-mix(in oklab, var(--primary) 17%, transparent) !important",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "var(--primary)",
            zIndex: "3",
          },
          ".cm-editor": {
            minHeight: "100%",
          },
          ".cm-placeholder": {
            color: "color-mix(in oklab, var(--muted-foreground) 62%, transparent)",
          },
          ".cm-panels": {
            position: "sticky",
            top: "0",
            zIndex: "30",
            backgroundColor: "transparent",
            border: "none",
          },
          ".cm-panels-top": {
            borderBottom: "none",
          },
          ".cm-tooltip": {
            border: "1px solid color-mix(in oklab, var(--border) 90%, transparent)",
            backgroundColor: "var(--popover)",
            color: "var(--popover-foreground)",
            borderRadius: "0.75rem",
            overflow: "hidden",
            padding: "0.25rem",
            boxShadow:
              "0 12px 32px -12px rgba(0, 0, 0, 0.45), 0 4px 12px -6px rgba(0, 0, 0, 0.25)",
          },
          ".cm-tooltip.cm-tooltip-autocomplete > ul": {
            maxHeight: "15em",
            padding: "0",
            margin: "0",
            fontFamily: editorFontFamily,
            fontSize: "0.8125rem",
          },
          ".cm-tooltip-autocomplete ul li": {
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.3rem 0.55rem",
            borderRadius: "0.5rem",
            color: "var(--foreground)",
            cursor: "pointer",
          },
          ".cm-tooltip-autocomplete ul li[aria-selected]": {
            backgroundColor:
              "color-mix(in oklab, var(--primary) 16%, transparent)",
            color: "var(--foreground)",
          },
          ".cm-completionLabel": {
            minWidth: "0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
          ".cm-completionDetail": {
            marginLeft: "auto",
            paddingLeft: "0.75rem",
            flexShrink: "0",
            fontStyle: "normal",
            fontSize: "0.6875rem",
            color: "var(--muted-foreground)",
          },
          ".cm-find-replace-panel": {
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
            padding: "0.45rem 0.55rem",
            maxWidth: "540px",
            width: "calc(100% - 1.5rem)",
            marginInlineStart: "auto",
            marginInlineEnd: "0.75rem",
            marginTop: "0.5rem",
            borderRadius: "0.75rem",
            border: "1px solid color-mix(in oklab, var(--border) 85%, transparent)",
            backgroundColor: "color-mix(in oklab, var(--background) 95%, var(--card) 5%)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.22), 0 8px 10px -6px rgba(0, 0, 0, 0.14)",
            color: "var(--foreground)",
            fontSize: "0.8125rem",
            fontFamily: "var(--font-sans)",
          },
          ".cm-find-replace-row": {
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            minWidth: "0",
          },
          ".cm-find-replace-replace-row": {
            transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            overflow: "hidden",
          },
          ".cm-find-replace-replace-row.is-collapsed": {
            display: "none",
          },
          ".cm-find-replace-replace-row.is-expanded": {
            display: "flex",
          },
          ".cm-find-replace-spacer": {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.75rem",
            height: "1.75rem",
            flexShrink: "0",
            color: "var(--muted-foreground)",
            opacity: "0.6",
          },
          ".cm-find-replace-btn": {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.75rem",
            height: "1.75rem",
            borderRadius: "0.375rem",
            border: "none",
            background: "transparent",
            color: "var(--muted-foreground)",
            cursor: "pointer",
            padding: "0",
            flexShrink: "0",
            transition: "background-color 0.12s, color 0.12s, transform 0.08s",
          },
          ".cm-find-replace-btn:hover:not(:disabled)": {
            backgroundColor: "color-mix(in oklab, var(--muted) 85%, transparent)",
            color: "var(--foreground)",
          },
          ".cm-find-replace-btn:active:not(:disabled)": {
            transform: "scale(0.94)",
          },
          ".cm-find-replace-btn:disabled": {
            opacity: "0.35",
            cursor: "not-allowed",
          },
          ".cm-find-replace-close-btn:hover": {
            backgroundColor: "color-mix(in oklab, var(--destructive) 15%, transparent) !important",
            color: "var(--destructive) !important",
          },
          ".cm-find-replace-input-wrapper": {
            position: "relative",
            display: "flex",
            alignItems: "center",
            flex: "1",
            minWidth: "0",
            height: "1.875rem",
            backgroundColor: "color-mix(in oklab, var(--muted) 45%, var(--background))",
            border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
            borderRadius: "0.375rem",
            paddingInlineStart: "0.5rem",
            paddingInlineEnd: "0.375rem",
            transition: "border-color 0.12s, box-shadow 0.12s",
          },
          ".cm-find-replace-input-wrapper:focus-within": {
            borderColor: "var(--primary)",
            boxShadow: "0 0 0 1.5px color-mix(in oklab, var(--primary) 30%, transparent)",
          },
          ".cm-find-replace-input-icon": {
            color: "var(--muted-foreground)",
            marginInlineEnd: "0.375rem",
            flexShrink: "0",
          },
          ".cm-find-replace-input": {
            flex: "1",
            minWidth: "0",
            height: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--foreground)",
            fontSize: "0.8125rem",
            padding: "0",
            fontFamily: "inherit",
          },
          ".cm-find-replace-input::placeholder": {
            color: "color-mix(in oklab, var(--muted-foreground) 75%, transparent)",
          },
          ".cm-find-replace-badge": {
            fontSize: "0.6875rem",
            fontWeight: "500",
            fontFamily: "var(--font-mono)",
            paddingInline: "0.375rem",
            paddingBlock: "0.0625rem",
            borderRadius: "0.25rem",
            whiteSpace: "nowrap",
            flexShrink: "0",
            marginInlineStart: "0.25rem",
            lineHeight: "1.2",
          },
          ".cm-find-replace-badge-muted": {
            color: "var(--muted-foreground)",
            backgroundColor: "color-mix(in oklab, var(--muted) 80%, transparent)",
          },
          ".cm-find-replace-badge-active": {
            color: "var(--foreground)",
            backgroundColor: "color-mix(in oklab, var(--primary) 18%, transparent)",
          },
          ".cm-find-replace-badge-error": {
            color: "var(--destructive)",
            backgroundColor: "color-mix(in oklab, var(--destructive) 15%, transparent)",
          },
          ".cm-find-replace-clear-btn": {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.125rem",
            height: "1.125rem",
            marginInlineStart: "0.25rem",
            borderRadius: "50%",
            border: "none",
            background: "color-mix(in oklab, var(--muted-foreground) 25%, transparent)",
            color: "var(--foreground)",
            cursor: "pointer",
            padding: "0",
            flexShrink: "0",
          },
          ".cm-find-replace-clear-btn:hover": {
            background: "color-mix(in oklab, var(--muted-foreground) 45%, transparent)",
          },
          ".cm-find-replace-group": {
            display: "inline-flex",
            alignItems: "center",
            gap: "0.125rem",
            backgroundColor: "color-mix(in oklab, var(--muted) 40%, transparent)",
            padding: "0.125rem",
            borderRadius: "0.375rem",
            border: "1px solid color-mix(in oklab, var(--border) 50%, transparent)",
            flexShrink: "0",
          },
          ".cm-find-replace-toggle": {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "1.625rem",
            height: "1.5rem",
            paddingInline: "0.25rem",
            borderRadius: "0.25rem",
            border: "none",
            background: "transparent",
            color: "var(--muted-foreground)",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: "600",
            transition: "background-color 0.12s, color 0.12s",
          },
          ".cm-find-replace-toggle:hover": {
            backgroundColor: "color-mix(in oklab, var(--muted) 80%, transparent)",
            color: "var(--foreground)",
          },
          ".cm-find-replace-toggle.is-active": {
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          },
          ".cm-toggle-mono": {
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
          },
          ".cm-find-replace-actions": {
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            flexShrink: "0",
          },
          ".cm-find-replace-action-btn": {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "1.75rem",
            paddingInline: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: "500",
            borderRadius: "0.375rem",
            border: "1px solid color-mix(in oklab, var(--border) 80%, transparent)",
            backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
            color: "var(--secondary-foreground)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background-color 0.12s, border-color 0.12s, transform 0.08s",
          },
          ".cm-find-replace-action-btn:hover:not(:disabled)": {
            backgroundColor: "color-mix(in oklab, var(--secondary) 100%, white 10%)",
            borderColor: "var(--border)",
          },
          ".cm-find-replace-action-btn:active:not(:disabled)": {
            transform: "scale(0.96)",
          },
          ".cm-find-replace-action-btn:disabled": {
            opacity: "0.4",
            cursor: "not-allowed",
          },
          ".cm-find-replace-action-btn-subtle": {
            paddingInline: "0.375rem",
            width: "1.75rem",
          },
          ".cm-searchMatch": {
            backgroundColor:
              "color-mix(in oklab, var(--warning, #eab308) 32%, transparent)",
            borderRadius: "0.2rem",
            boxShadow:
              "0 0 0 1px color-mix(in oklab, var(--warning, #eab308) 45%, transparent)",
          },
          ".cm-searchMatch-selected": {
            backgroundColor:
              "color-mix(in oklab, var(--warning, #f59e0b) 80%, var(--primary) 20%) !important",
            color: "#000000 !important",
            borderRadius: "0.2rem",
            boxShadow:
              "0 0 0 2px var(--primary), 0 0 6px color-mix(in oklab, var(--primary) 50%, transparent) !important",
            fontWeight: "600",
          },
          ".cm-md-heading-1": {
            fontFamily: "var(--font-sans)",
            fontSize: "1.68em",
            fontWeight: "660",
            lineHeight: "1.2",
            letterSpacing: "-0.035em",
            paddingTop: "0.7rem",
            paddingBottom: "0.14rem",
          },
          ".cm-md-heading-2": {
            fontFamily: "var(--font-sans)",
            fontSize: "1.36em",
            fontWeight: "650",
            lineHeight: "1.25",
            letterSpacing: "-0.025em",
            paddingTop: "0.58rem",
            paddingBottom: "0.14rem",
          },
          ".cm-md-heading-3": {
            fontFamily: "var(--font-sans)",
            fontSize: "1.15em",
            fontWeight: "640",
            lineHeight: "1.35",
            letterSpacing: "-0.015em",
            paddingTop: "0.42rem",
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
            backgroundColor: "color-mix(in oklab, var(--muted) 72%, transparent)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.92em",
            padding: "0.08em 0.24em",
          },
          ".cm-md-quote-line": {
            borderInlineStart:
              "2px solid color-mix(in oklab, var(--primary) 48%, var(--border))",
            color: "color-mix(in oklab, var(--foreground) 70%, transparent)",
            fontStyle: "normal",
            paddingInlineStart: "0.9rem",
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
          ".cm-md-link-unresolved": {
            color: "color-mix(in oklab, var(--warning, #f59e0b) 90%, var(--foreground))",
            cursor: "pointer",
            textDecoration: "underline dashed",
            textDecorationColor:
              "color-mix(in oklab, var(--warning, #f59e0b) 60%, transparent)",
            textUnderlineOffset: "0.16em",
          },
        }),
      ),
    ],
    [
      editorFontFamily,
      targets,
      onOpenLink,
      onLargeMarkdownPaste,
      spellcheck,
      spellcheckLanguage,
    ],
  );

  const dir = direction === "auto" ? undefined : direction;

  return (
    <div className={cn("relative h-full", usesRtlFont && "rtl-vazir", className)} dir={dir}>
      <CodeMirror
        ref={editorRef}
        value={editorValue}
        onChange={handleCodeMirrorChange}
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

      <InsertLinkDialog
        open={insertLinkOpen}
        onOpenChange={setInsertLinkOpen}
        editorRef={editorRef}
        linkableNotes={targets}
        currentNoteContent={editorValue}
        prefilledQuery={insertLinkQuery}
        replaceRange={insertLinkRange}
        onTargetCreated={handleTargetCreated}
      />

      <LinkPreviewPopover
        activeLink={activeLinkInfo}
        onClose={() => setActiveLinkInfo(null)}
        editorRef={editorRef}
        linkableNotes={targets}
        onOpenLink={onOpenLink}
      />
    </div>
  );
}


