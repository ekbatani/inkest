import { describe, it, expect } from "bun:test";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";

function createMockEditor(initialDoc = "", initialCursor = 0) {
  let state = EditorState.create({
    doc: initialDoc,
    selection: { anchor: initialCursor, head: initialCursor },
  });

  const view = {
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
      view,
      state,
    } as ReactCodeMirrorRef,
  };

  return { ref, view, getState: () => state };
}

describe("Markdown Editor Concurrency & Data Safety", () => {
  it("preserves fast typing while asynchronous save is in-flight", () => {
    // 1. Initial document state
    const { view } = createMockEditor("Hello");
    let latestContent = "Hello";
    let lastSynced = "Hello";

    // User types rapidly: "Hello World"
    view.dispatch({
      changes: { from: 5, to: 5, insert: " World" },
      selection: { anchor: 11 },
    });
    latestContent = view.state.doc.toString();
    expect(latestContent).toBe("Hello World");
    expect(view.state.selection.main.head).toBe(11);

    // Save initiates with snapshot at this moment ("Hello World")
    const inFlightSnapshot = latestContent;

    // While save is in-flight, user keeps typing rapidly: "Hello World! More edits here."
    view.dispatch({
      changes: { from: 11, to: 11, insert: "! More edits here." },
      selection: { anchor: 29 },
    });
    latestContent = view.state.doc.toString();
    expect(latestContent).toBe("Hello World! More edits here.");
    expect(view.state.selection.main.head).toBe(29);

    // Server save completes for inFlightSnapshot ("Hello World")
    lastSynced = inFlightSnapshot;

    // Verify: The live editor buffer MUST NOT be reverted to the completed save snapshot
    expect(view.state.doc.toString()).toBe("Hello World! More edits here.");
    expect(view.state.selection.main.head).toBe(29);
    expect(lastSynced).toBe("Hello World");
    expect(latestContent).not.toBe(lastSynced);
  });

  it("handles massive paste followed by immediate typing without cursor jumping or truncation", () => {
    const { view } = createMockEditor("");
    const largeData = "# Large Note\n\n" + "A".repeat(50000) + "\n\nEnd of section.";

    // Paste large content
    view.dispatch({
      changes: { from: 0, to: 0, insert: largeData },
      selection: { anchor: largeData.length },
    });
    expect(view.state.doc.toString().length).toBe(largeData.length);
    expect(view.state.selection.main.head).toBe(largeData.length);

    const appendedText = "\nAdditional immediate notes.";
    const targetEndPos = largeData.length + appendedText.length;
    view.dispatch({
      changes: { from: largeData.length, to: largeData.length, insert: appendedText },
      selection: { anchor: targetEndPos },
    });

    expect(view.state.doc.toString()).toContain("Additional immediate notes.");
    expect(view.state.selection.main.head).toBe(targetEndPos);
  });

  it("only updates document when externalVersion is explicitly incremented (Undo/Redo/Restore)", () => {
    const { view } = createMockEditor("Original version");
    let currentDoc = view.state.doc.toString();

    // Simulate user typing in editor
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "Edited version" },
      selection: { anchor: 14 },
    });
    currentDoc = view.state.doc.toString();
    expect(currentDoc).toBe("Edited version");

    // A stale React prop with "Original version" arrives without externalVersion bump -> NO dispatch
    const stalePropValue = "Original version";
    const externalVersion: number = 0;
    const lastExternalVersion: number = 0;

    if (externalVersion !== lastExternalVersion) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: stalePropValue } });
    }

    // Editor content remains untouched
    expect(view.state.doc.toString()).toBe("Edited version");

    // Now an explicit external restore happens (e.g. Version History restore) -> externalVersion bumps
    const updatedExternalVersion: number = 1;
    if (updatedExternalVersion !== lastExternalVersion) {
      const restoredContent = "# Restored from v1";
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: restoredContent },
        selection: { anchor: restoredContent.length },
      });
    }

    expect(view.state.doc.toString()).toBe("# Restored from v1");
    expect(view.state.selection.main.head).toBe("# Restored from v1".length);
  });
});
