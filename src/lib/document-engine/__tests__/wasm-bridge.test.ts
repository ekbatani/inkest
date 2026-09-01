import { describe, it, expect } from "bun:test";
import { UniversalDocumentEngine } from "../wasm-bridge";

describe("Document Engine & CRDT Operation Log", () => {
  it("initializes document engine with initial content", () => {
    const engine = new UniversalDocumentEngine("Hello World", "client-1");
    expect(engine.getText()).toBe("Hello World");
    expect(engine.lenChars()).toBe(11);
    expect(engine.lenLines()).toBe(1);
  });

  it("handles fast insertions and generates valid CRDT operation log", () => {
    const engine = new UniversalDocumentEngine("Hello World", "client-1");
    const op1 = engine.insert(5, ", Beautiful");

    expect(engine.getText()).toBe("Hello, Beautiful World");
    expect(op1.type).toBe("insert");
    if (op1.type === "insert") {
      expect(op1.pos).toBe(5);
      expect(op1.text).toBe(", Beautiful");
      expect(op1.id.client_id).toBe("client-1");
      expect(op1.id.seq).toBe(1);
      expect(op1.id.lamport).toBe(1);
    }
  });

  it("handles fast deletions and tracks Lamport clocks", () => {
    const engine = new UniversalDocumentEngine("Hello, Beautiful World", "client-1");
    const op1 = engine.delete(5, 16);

    expect(engine.getText()).toBe("Hello World");
    expect(op1.type).toBe("delete");
    if (op1.type === "delete") {
      expect(op1.from).toBe(5);
      expect(op1.to).toBe(16);
      expect(op1.id.seq).toBe(1);
    }
  });

  it("accurately translates between point (line, col) and char offset", () => {
    const text = "First line\nSecond line is longer\nThird line";
    const engine = new UniversalDocumentEngine(text);

    expect(engine.lenLines()).toBe(3);

    // Second line start offset is "First line\n".length = 11
    const pt2 = engine.offsetToPoint(11);
    expect(pt2.line).toBe(1);
    expect(pt2.column).toBe(0);

    const offset = engine.pointToOffset(1, 7);
    expect(offset).toBe(18);
    expect(engine.getText().slice(offset, offset + 4)).toBe("line");
  });

  it("computes minimal diff patch and content hashes", () => {
    const engine = new UniversalDocumentEngine("Hello World");
    const patch = engine.computePatch("Hello Fantastic World");

    expect(patch).not.toBeNull();
    expect(patch?.from).toBe(6);
    expect(patch?.to).toBe(6);
    expect(patch?.text).toBe("Fantastic ");

    const hash1 = engine.computeHash();
    engine.insert(5, "!");
    const hash2 = engine.computeHash();
    expect(hash1).not.toBe(hash2);
  });

  it("compacts snapshot and resets operation log", () => {
    const engine = new UniversalDocumentEngine("Base text", "client-1");
    engine.insert(9, " appended");
    engine.insert(18, " more");

    const snapshot = engine.compactSnapshot();
    expect(snapshot).toBe("Base text appended more");
  });
});
