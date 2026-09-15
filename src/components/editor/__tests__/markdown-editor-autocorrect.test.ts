import { describe, expect, it } from "bun:test";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createEditorContentAttributes } from "../markdown-editor";

describe("Markdown Editor Browser Auto-Correction Attributes", () => {
  it("configures autocorrect='on', autocapitalize='sentences', writingsuggestions='true' when enabled by default", () => {
    const ext = createEditorContentAttributes();
    const state = EditorState.create({
      extensions: [ext],
    });

    const attrsFacet = state.facet(EditorView.contentAttributes);
    expect(attrsFacet.length > 0).toBe(true);

    // Merge attribute objects in the facet
    const combinedAttrs = Object.assign({}, ...attrsFacet.filter((a) => typeof a === "object"));

    expect(combinedAttrs.spellcheck).toBe("true");
    expect(combinedAttrs.autocorrect).toBe("on");
    expect(combinedAttrs.autocapitalize).toBe("sentences");
    expect(combinedAttrs.writingsuggestions).toBe("true");
  });

  it("configures autocorrect='off', autocapitalize='off', writingsuggestions='false' when explicitly disabled", () => {
    const ext = createEditorContentAttributes({
      autocorrect: false,
      spellcheck: false,
    });
    const state = EditorState.create({
      extensions: [ext],
    });

    const attrsFacet = state.facet(EditorView.contentAttributes);
    const combinedAttrs = Object.assign({}, ...attrsFacet.filter((a) => typeof a === "object"));

    expect(combinedAttrs.spellcheck).toBe("false");
    expect(combinedAttrs.autocorrect).toBe("off");
    expect(combinedAttrs.autocapitalize).toBe("off");
    expect(combinedAttrs.writingsuggestions).toBe("false");
  });

  it("sets language attribute when spellcheckLanguage is specified", () => {
    const extEn = createEditorContentAttributes({
      spellcheckLanguage: "en",
      autocorrect: true,
    });
    const stateEn = EditorState.create({
      extensions: [extEn],
    });

    const attrsEn = Object.assign(
      {},
      ...stateEn.facet(EditorView.contentAttributes).filter((a) => typeof a === "object"),
    );
    expect(attrsEn.lang).toBe("en");
    expect(attrsEn.autocorrect).toBe("on");

    const extFa = createEditorContentAttributes({
      spellcheckLanguage: "fa",
      autocorrect: true,
    });
    const stateFa = EditorState.create({
      extensions: [extFa],
    });

    const attrsFa = Object.assign(
      {},
      ...stateFa.facet(EditorView.contentAttributes).filter((a) => typeof a === "object"),
    );
    expect(attrsFa.lang).toBe("fa");
    expect(attrsFa.autocorrect).toBe("on");
  });
});
