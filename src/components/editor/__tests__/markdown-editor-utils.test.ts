import { describe, it, expect } from "bun:test";
import {
  insertTextAtCursor,
  replaceEntireEditorContent,
  replaceSelectedEditorText,
  appendTextToEditor,
  prependTextToEditor,
  applyGentlePatch,
} from "../markdown-editor-utils";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";

function createMockEditorRef(initialText = "", selection?: { from: number; to: number }) {
  let state = EditorState.create({
    doc: initialText,
    selection: selection ? { anchor: selection.from, head: selection.to } : { anchor: 0 },
  });

  const mockView = {
    get state() {
      return state;
    },
    dispatch(tr: TransactionSpec) {
      const transaction = state.update(tr);
      state = transaction.state;
    },
    focus() {},
  } as unknown as EditorView;

  const ref = {
    current: {
      view: mockView,
      state: state,
    } as ReactCodeMirrorRef,
  };

  return { ref, view: mockView };
}

describe("Markdown Editor Utils - Safety & Bounds", () => {
  it("safely handles insertTextAtCursor on empty editor", () => {
    const { ref, view } = createMockEditorRef("");
    insertTextAtCursor(ref, "New text from AI");
    expect(view.state.doc.toString()).toBe("New text from AI");
  });

  it("safely replaces entire editor content with AI response of different lengths", () => {
    const { ref, view } = createMockEditorRef("Initial long content here with many lines\nLine 2\nLine 3");
    replaceEntireEditorContent(ref, "Short AI result");
    expect(view.state.doc.toString()).toBe("Short AI result");

    // Replace with much longer content
    replaceEntireEditorContent(ref, "Much longer content from AI with multiple paragraphs and tasks:\n- [ ] Task 1\n- [ ] Task 2");
    expect(view.state.doc.toString()).toContain("Task 1");
  });

  it("safely replaces selected text", () => {
    const initial = "Before [TARGET] After";
    const targetIdx = initial.indexOf("[TARGET]");
    const { ref, view } = createMockEditorRef(initial, {
      from: targetIdx,
      to: targetIdx + "[TARGET]".length,
    });
    replaceSelectedEditorText(ref, "REPLACED");
    expect(view.state.doc.toString()).toBe("Before REPLACED After");
  });

  it("safely appends and prepends AI text", () => {
    const { ref, view } = createMockEditorRef("Middle content");
    appendTextToEditor(ref, "Appended text");
    expect(view.state.doc.toString()).toBe("Middle content\n\nAppended text\n");

    prependTextToEditor(ref, "Prepended text");
    expect(view.state.doc.toString()).toBe("Prepended text\n\nMiddle content\n\nAppended text\n");
  });

  it("safely applies gentle patches for both selection and note scope", () => {
    const { ref: ref1, view: view1 } = createMockEditorRef("Whole note content");
    applyGentlePatch(ref1, "Patched whole note", "note");
    expect(view1.state.doc.toString()).toBe("Patched whole note");

    const { ref: ref2, view: view2 } = createMockEditorRef("Start SEL End", { from: 6, to: 9 });
    applyGentlePatch(ref2, "POLISHED", "selection");
    expect(view2.state.doc.toString()).toBe("Start POLISHED End");
  });

  it("gracefully handles null or undefined editor ref without throwing", () => {
    let threw = false;
    try {
      insertTextAtCursor(null, "text");
      replaceEntireEditorContent(null, "text");
      replaceSelectedEditorText(undefined, "text");
      appendTextToEditor(null, "text");
      prependTextToEditor(null, "text");
      applyGentlePatch(null, "text", "note");
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
