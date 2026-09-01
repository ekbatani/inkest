import { describe, it, expect } from "bun:test";
import {
  compressText,
  decompressText,
  compressPayload,
  decompressPayload,
  compressToBase64,
  decompressFromBase64,
} from "../compression";

describe("Document Engine - Compression Pipeline", () => {
  it("compresses and decompresses short and empty strings losslessly", async () => {
    const empty = "";
    const compEmpty = await compressText(empty);
    expect(await decompressText(compEmpty)).toBe(empty);

    const short = "Hello Inkest";
    const compShort = await compressText(short);
    expect(await decompressText(compShort)).toBe(short);
  });

  it("compresses and decompresses Persian / Arabic UTF-8 text with emojis losslessly", async () => {
    const persianDoc = `# یادداشت‌های روزانه
این یک متن آزمایشی به زبان فارسی است که برای اعتبارسنجی فشرده‌سازی در پایگاه داده و مرورگر طراحی شده است.
- [x] تست همگام‌سازی 🚀
- [ ] ذخیره‌سازی ابری
## ویژگی‌ها
۱. سرعت بالا
۲. فشرده‌سازی هوشمند Deflate
۳. بدون اتلاف داده (Lossless)`;

    const compressed = await compressText(persianDoc);
    const decompressed = await decompressText(compressed);

    expect(decompressed).toBe(persianDoc);
  });

  it("achieves significant compression ratio on large markdown documents", async () => {
    const paragraphs = [];
    for (let i = 1; i <= 200; i++) {
      paragraphs.push(`## Section ${i}\n\nThis is paragraph ${i} with repeating markdown structures, tasks, and code samples.\n\`\`\`ts\nconst x = ${i};\nconsole.log(x);\n\`\`\`\n- [x] Item A\n- [ ] Item B\n`);
    }
    const largeDoc = paragraphs.join("\n");
    const rawByteLength = new TextEncoder().encode(largeDoc).length;

    const compressed = await compressText(largeDoc);
    expect(compressed.length < rawByteLength * 0.35).toBe(true); // Greater than 65% reduction

    const decompressed = await decompressText(compressed);
    expect(decompressed).toBe(largeDoc);
  });

  it("compresses and decompresses arbitrary structured JSON save payloads", async () => {
    const payload = {
      baseHash: "a1b2c3d4e5f60718",
      title: "Quarterly Strategy Document",
      patches: [
        { from: 100, to: 120, text: "updated market projections" },
        { from: 500, to: 510, text: "new conclusion" },
      ],
      metadata: {
        pinned: true,
        priority: "high",
        direction: "auto",
      },
    };

    const compressed = await compressPayload(payload);
    const recovered = await decompressPayload<typeof payload>(compressed);

    expect(recovered).toEqual(payload);
  });

  it("handles Base64 compressed string conversions", async () => {
    const original = "Some confidential content that needs base64 transport serialization";
    const b64 = await compressToBase64(original);
    expect(typeof b64).toBe("string");

    const restored = await decompressFromBase64(b64);
    expect(restored).toBe(original);
  });

  it("gracefully falls back when decoding uncompressed plain text bytes", async () => {
    const rawPlainBytes = new TextEncoder().encode("Uncompressed raw string");
    const result = await decompressText(rawPlainBytes);
    expect(result).toBe("Uncompressed raw string");
  });
});
