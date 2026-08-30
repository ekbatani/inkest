import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  parseMarkdownCheckboxes,
  reconcileMarkdownStatus,
} from "../service";

describe("parseMarkdownCheckboxes", () => {
  test("parses bullet and ordered checkboxes with line numbers", () => {
    const content = [
      "# Plan",
      "",
      "- [x] done item",
      "- [ ] open item",
      "* [ ] star item",
      "1. [X] ordered item",
      "- [ ]    spaced title",
      "not a checkbox",
    ].join("\n");

    const parsed = parseMarkdownCheckboxes(content);
    assert.deepEqual(
      parsed.map((cb) => ({ line: cb.line, checked: cb.checked, title: cb.title })),
      [
        { line: 2, checked: true, title: "done item" },
        { line: 3, checked: false, title: "open item" },
        { line: 4, checked: false, title: "star item" },
        { line: 5, checked: true, title: "ordered item" },
        { line: 6, checked: false, title: "spaced title" },
      ],
    );
  });

  test("skips empty checkbox titles", () => {
    const parsed = parseMarkdownCheckboxes("- [ ]\n- [ ]   \n- [ ] real");
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.title, "real");
  });
});

describe("reconcileMarkdownStatus", () => {
  test("checking a box always completes the task", () => {
    assert.equal(reconcileMarkdownStatus(true, "todo"), "done");
    assert.equal(reconcileMarkdownStatus(true, "doing"), "done");
    assert.equal(reconcileMarkdownStatus(true, "done"), "done");
    assert.equal(reconcileMarkdownStatus(true, "canceled"), "done");
  });

  test("unchecking reopens completed or plain tasks to todo", () => {
    assert.equal(reconcileMarkdownStatus(false, "done"), "todo");
    assert.equal(reconcileMarkdownStatus(false, "todo"), "todo");
  });

  test("unchecking preserves workflow statuses markdown cannot express", () => {
    assert.equal(reconcileMarkdownStatus(false, "doing"), "doing");
    assert.equal(reconcileMarkdownStatus(false, "canceled"), "canceled");
  });
});
