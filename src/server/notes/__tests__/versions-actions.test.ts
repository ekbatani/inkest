import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  listNoteVersionsAction,
  restoreNoteVersionAction,
} from "../versions-actions";

describe("version history server actions", () => {
  describe("input validation", () => {
    test("listNoteVersionsAction rejects empty noteId", async () => {
      await assert.rejects(
        async () => {
          await listNoteVersionsAction("");
        },
        (err: unknown) => {
          return err instanceof Error;
        },
      );
    });

    test("restoreNoteVersionAction rejects empty noteId or versionId", async () => {
      await assert.rejects(
        async () => {
          await restoreNoteVersionAction("", "ver_123");
        },
        (err: unknown) => {
          return err instanceof Error;
        },
      );

      await assert.rejects(
        async () => {
          await restoreNoteVersionAction("note_123", "");
        },
        (err: unknown) => {
          return err instanceof Error;
        },
      );
    });
  });

  describe("authorization & permissions", () => {
    test("restoreNoteVersionAction rejects unauthenticated calls", async () => {
      // When getCurrentUser returns null (default in test environment without auth)
      const res = await restoreNoteVersionAction("note_test_123", "ver_test_123");
      assert.ok("error" in res);
      assert.equal(res.error, "Unauthorized.");
    });
  });
});
