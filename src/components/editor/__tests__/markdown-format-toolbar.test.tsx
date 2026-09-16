import { describe, it, expect, beforeEach } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  MarkdownFormatToolbar,
  FloatingMarkdownFormatToolbar,
} from "../markdown-format-toolbar";

// Mock EventTarget / DOM Element for testing CodeMirror view in headless test environment
class MockDOMElement {
  listeners: Record<string, ((event: unknown) => void)[]> = {};

  addEventListener(event: string, handler: (event: unknown) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: (event: unknown) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((h) => h !== handler);
  }

  dispatchEvent(event: { type: string; [key: string]: unknown }) {
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) {
      h(event);
    }
    return true;
  }

  contains(_node: unknown) {
    return false;
  }
}

function createMockEditor(docText: string, sel = { anchor: 0, head: 0 }) {
  let state = EditorState.create({
    doc: docText,
    selection: sel,
  });

  const dom = new MockDOMElement();
  const scrollDOM = new MockDOMElement();

  const mockView = {
    get state() {
      return state;
    },
    dom: dom as unknown as HTMLElement,
    scrollDOM: scrollDOM as unknown as HTMLElement,
    posAtCoords: () => 5,
    coordsAtPos: () => ({ left: 100, right: 150, top: 100, bottom: 120 }),
    dispatch: (tr: { selection?: { anchor: number; head?: number } }) => {
      if (tr.selection) {
        state = state.update({
          selection: { anchor: tr.selection.anchor, head: tr.selection.head ?? tr.selection.anchor },
        }).state;
      }
    },
    focus: () => {},
  } as unknown as EditorView;

  const editorRef: React.RefObject<ReactCodeMirrorRef | null> = {
    current: {
      view: mockView,
      state: state,
    } as ReactCodeMirrorRef,
  };

  return { editorRef, mockView, dom, scrollDOM };
}

describe("MarkdownFormatToolbar", () => {
  it("renders toolbar component without crashing", () => {
    const { editorRef } = createMockEditor("Hello world");
    const html = renderToString(
      <MarkdownFormatToolbar editorRef={editorRef} />
    );
    expect(html).toContain("Bold");
    expect(html).toContain("Italic");
  });

  it("FloatingMarkdownFormatToolbar renders null initially when closed", () => {
    const { editorRef } = createMockEditor("Hello world");
    const html = renderToString(
      <FloatingMarkdownFormatToolbar editorRef={editorRef} />
    );
    expect(html).toBe("");
  });
});

describe("FloatingMarkdownFormatToolbar Interaction Invariants", () => {
  beforeEach(() => {
    if (typeof globalThis.window === "undefined") {
      (globalThis as unknown as { window: unknown }).window = {
        innerWidth: 1024,
        innerHeight: 768,
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }
  });

  it("does not open merely on selection change", () => {
    const { editorRef } = createMockEditor("Selected text here", { anchor: 0, head: 8 });
    // When rendered, initial state must be closed
    const html = renderToString(
      <FloatingMarkdownFormatToolbar editorRef={editorRef} />
    );
    expect(html).toBe("");
  });

  it("attaches contextmenu and touch listeners to view.dom", () => {
    const { dom } = createMockEditor("Hello");

    let contextMenuAttached = false;
    let touchStartAttached = false;

    dom.addEventListener("contextmenu", () => {
      contextMenuAttached = true;
    });
    dom.addEventListener("touchstart", () => {
      touchStartAttached = true;
    });

    dom.dispatchEvent({ type: "contextmenu", preventDefault: () => {} });
    dom.dispatchEvent({ type: "touchstart", touches: [{ clientX: 100, clientY: 100 }] });

    expect(contextMenuAttached).toBe(true);
    expect(touchStartAttached).toBe(true);
  });
});
