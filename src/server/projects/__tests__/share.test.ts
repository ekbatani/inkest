import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
  removeProjectMemberSchema,
  MAX_PROJECT_MEMBERS,
  shareRoleEnum,
} from "../validation";
import { findShareRoot } from "../access";

describe("project sharing validation", () => {
  test("defines the member limit and role set", () => {
    assert.equal(MAX_PROJECT_MEMBERS, 20);
    assert.deepEqual([...shareRoleEnum], ["viewer", "editor"]);
  });

  test("normalizes email and defaults the role to viewer", () => {
    const parsed = addProjectMemberSchema.parse({
      email: "  Person@Example.COM ",
    });
    assert.equal(parsed.email, "person@example.com");
    assert.equal(parsed.role, "viewer");
  });

  test("accepts an explicit editor role", () => {
    const parsed = addProjectMemberSchema.safeParse({
      email: "a@example.com",
      role: "editor",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.role, "editor");
  });

  test("rejects invalid emails and unknown roles", () => {
    assert.equal(
      addProjectMemberSchema.safeParse({ email: "not-an-email" }).success,
      false,
    );
    assert.equal(
      addProjectMemberSchema.safeParse({ email: "a@b.co", role: "admin" })
        .success,
      false,
    );
    assert.equal(
      updateProjectMemberRoleSchema.safeParse({ role: "owner" }).success,
      false,
    );
  });

  test("rejects an empty member user id on removal", () => {
    assert.equal(removeProjectMemberSchema.safeParse({ userId: "" }).success, false);
  });
});

describe("findShareRoot", () => {
  const rows = [
    { id: "root-project", parentId: null, type: "project" },
    { id: "sub-project", parentId: "root-project", type: "project" },
    { id: "task-note", parentId: "sub-project", type: "note" },
    { id: "plain-note", parentId: "root-project", type: "note" },
    { id: "standalone-note", parentId: null, type: "note" },
    { id: "daily", parentId: null, type: "daily" },
  ];

  test("a project is its own share root", () => {
    assert.equal(findShareRoot(rows, "root-project"), "root-project");
  });

  test("descendants resolve to the outermost project in the chain", () => {
    assert.equal(findShareRoot(rows, "sub-project"), "root-project");
    assert.equal(findShareRoot(rows, "task-note"), "root-project");
    assert.equal(findShareRoot(rows, "plain-note"), "root-project");
  });

  test("notes outside any project have no share root", () => {
    assert.equal(findShareRoot(rows, "standalone-note"), null);
    assert.equal(findShareRoot(rows, "daily"), null);
  });

  test("handles a corrupted parent cycle without looping", () => {
    const cycled = [
      { id: "a", parentId: "b", type: "project" },
      { id: "b", parentId: "a", type: "note" },
    ];
    // The cycle breaks the walk; whichever project is reached first from "a"
    // (itself) becomes the root.
    assert.equal(findShareRoot(cycled, "a"), "a");
    assert.equal(findShareRoot(cycled, "b"), "a");
  });

  test("missing rows end the walk instead of throwing", () => {
    assert.equal(findShareRoot(rows, "unknown-id"), null);
    const orphan = [{ id: "orphan", parentId: "gone", type: "note" }];
    assert.equal(findShareRoot(orphan, "orphan"), null);
  });
});
