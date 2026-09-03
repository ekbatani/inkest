import { describe, expect, it, beforeEach } from "bun:test";
import { DocumentPersistenceManager } from "../storage/persistence-manager";

describe("Document Persistence - Draft Protection & Race Conditions", () => {
  const testDocId = "test-doc-draft-protection-123";
  const localStoragePrefix = "inkest_draft_";

  beforeEach(() => {
    if (typeof window === "undefined") {
      const store = new Map<string, string>();
      globalThis.window = {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => store.set(key, value),
          removeItem: (key: string) => store.delete(key),
          clear: () => store.clear(),
          length: 0,
          key: () => null,
        } as unknown as Storage,
      } as unknown as Window & typeof globalThis;
    } else {
      window.localStorage.clear();
    }
  });

  it("exposes public readonly documentId on persistence manager instance", () => {
    const manager = new DocumentPersistenceManager(testDocId);
    expect(manager.documentId).toBe(testDocId);
  });

  it("records local draft with synced: false in localStorage", async () => {
    const manager = new DocumentPersistenceManager(testDocId);
    await manager.recordLocalDraft("My Title", "Fast typed content");

    const raw = window.localStorage.getItem(`${localStoragePrefix}${testDocId}`);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.documentId).toBe(testDocId);
    expect(parsed.title).toBe("My Title");
    expect(parsed.content).toBe("Fast typed content");
    expect(parsed.synced).toBe(false);
  });

  it("prevents markSnapshotSynced from overwriting active unsaved drafts with older content", async () => {
    const manager = new DocumentPersistenceManager(testDocId);

    // User types fast -> local draft is recorded with latest text
    await manager.recordLocalDraft("My Title", "Version 2 - Fast typed text");

    // A stale in-flight server save resolves with Version 1 text
    await manager.markSynced(undefined, "hash-1", "My Title", "Version 1 - Stale text");

    // The local storage draft must NOT be overwritten by the stale text
    const raw = window.localStorage.getItem(`${localStoragePrefix}${testDocId}`);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.content).toBe("Version 2 - Fast typed text");
    expect(parsed.synced).toBe(false);
  });

  it("allows markSnapshotSynced when content matches", async () => {
    const manager = new DocumentPersistenceManager(testDocId);

    // Initial draft
    await manager.recordLocalDraft("Title", "Version 1 content");

    // Mark synced with same content
    await manager.markSynced(undefined, "hash-1", "Title", "Version 1 content");

    const raw = window.localStorage.getItem(`${localStoragePrefix}${testDocId}`);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.content).toBe("Version 1 content");
    expect(parsed.synced).toBe(true);
  });

  it("recovers unsaved document draft correctly", async () => {
    const manager = new DocumentPersistenceManager(testDocId);
    await manager.recordLocalDraft("Recoverable Title", "Important unsaved thoughts");

    const recovered = await DocumentPersistenceManager.recoverDocument(testDocId);
    expect(recovered).not.toBeNull();
    expect(recovered?.title).toBe("Recoverable Title");
    expect(recovered?.content).toBe("Important unsaved thoughts");
    expect(recovered?.synced).toBe(false);
  });
});
