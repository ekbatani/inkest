import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  parseMarkdownCheckboxes,
  getChecklistProgress,
  hasSubstantialContent,
} from "../checkboxes";

describe("checkboxes helper", () => {
  test("parseMarkdownCheckboxes parses markdown checkboxes accurately", () => {
    const markdown = [
      "# Heading",
      "- [ ] First item",
      "- [x] Completed item",
      "* [X] Another completed",
      "1. [ ] Ordered open item",
    ].join("\n");

    const result = parseMarkdownCheckboxes(markdown);
    assert.equal(result.length, 4);
    assert.equal(result[0]?.checked, false);
    assert.equal(result[0]?.title, "First item");
    assert.equal(result[1]?.checked, true);
    assert.equal(result[2]?.checked, true);
    assert.equal(result[3]?.checked, false);
  });

  test("getChecklistProgress calculates completion percentages", () => {
    assert.equal(getChecklistProgress(""), null);
    assert.equal(getChecklistProgress("No checkboxes here"), null);

    const progress = getChecklistProgress("- [x] Done\n- [ ] Todo\n- [ ] Later");
    assert.deepEqual(progress, {
      total: 3,
      completed: 1,
      percent: 33,
    });
  });

  test("hasSubstantialContent detects notes with body text beyond headings and checkboxes", () => {
    assert.equal(hasSubstantialContent(""), false);
    assert.equal(hasSubstantialContent("# Heading\n\n- [ ] item"), false);
    assert.equal(hasSubstantialContent("# Heading\nSome detailed notes here\n- [ ] item"), true);
  });
});
