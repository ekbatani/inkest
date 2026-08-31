import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const outDir = path.join(rootDir, "out");
const tauriIconsDir = path.join(rootDir, "src-tauri", "icons");
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const storageDir = path.join(rootDir, "storage");

// 1. Ensure `data` and `storage` directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// 2. Ensure `out` directory exists for Capacitor and Tauri
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write out/index.html if missing
const outIndexPath = path.join(outDir, "index.html");
if (!fs.existsSync(outIndexPath)) {
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Inkest</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .container {
      max-width: 420px;
      padding: 24px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    p {
      color: #a1a1aa;
      font-size: 14px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Inkest</h1>
    <p>Connecting to your personal workspace...</p>
  </div>
</body>
</html>`;
  fs.writeFileSync(outIndexPath, indexHtml, "utf-8");
  console.log("Created out/index.html fallback.");
}

// 2. Ensure src-tauri/icons directory exists and copy icon assets
if (!fs.existsSync(tauriIconsDir)) {
  fs.mkdirSync(tauriIconsDir, { recursive: true });
}

const sourceIcon = fs.existsSync(path.join(publicDir, "app-icon.png"))
  ? path.join(publicDir, "app-icon.png")
  : fs.existsSync(path.join(publicDir, "logo-square.png"))
  ? path.join(publicDir, "logo-square.png")
  : null;

function pngToIco(pngBuffer) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // ICO Type: 1
  icoHeader.writeUInt16LE(1, 4); // Number of images: 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // Width: 0 (256px)
  entry.writeUInt8(0, 1); // Height: 0 (256px)
  entry.writeUInt8(0, 2); // Color palette count: 0 (>= 8bpp)
  entry.writeUInt8(0, 3); // Reserved: 0
  entry.writeUInt16LE(1, 4); // Color planes: 1
  entry.writeUInt16LE(32, 6); // Bits per pixel: 32
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  entry.writeUInt32LE(22, 12); // Offset of image data (6 + 16 = 22)

  return Buffer.concat([icoHeader, entry, pngBuffer]);
}

function pngToIcns(pngBuffer) {
  const tag = Buffer.from("ic08"); // 256x256 PNG block
  const blockLen = 8 + pngBuffer.length;
  const blockHeader = Buffer.alloc(8);
  tag.copy(blockHeader, 0);
  blockHeader.writeUInt32BE(blockLen, 4);

  const totalLen = 8 + blockLen;
  const icnsHeader = Buffer.alloc(8);
  Buffer.from("icns").copy(icnsHeader, 0);
  icnsHeader.writeUInt32BE(totalLen, 4);

  return Buffer.concat([icnsHeader, blockHeader, pngBuffer]);
}

if (sourceIcon) {
  const pngData = fs.readFileSync(sourceIcon);

  // PNG icon targets
  const pngTargets = ["32x32.png", "128x128.png", "128x128@2x.png"];
  for (const target of pngTargets) {
    fs.writeFileSync(path.join(tauriIconsDir, target), pngData);
  }

  // Windows 3.00 format ICO
  const icoData = pngToIco(pngData);
  fs.writeFileSync(path.join(tauriIconsDir, "icon.ico"), icoData);

  // macOS ICNS format
  const icnsData = pngToIcns(pngData);
  fs.writeFileSync(path.join(tauriIconsDir, "icon.icns"), icnsData);

  console.log("Populated src-tauri/icons with compliant ICO, ICNS, and PNG icons.");
}

// 4. Run database migrations to ensure local schema is ready for static build collection
try {
  const { execSync } = await import("node:child_process");
  execSync("bun scripts/migrate.mjs", { stdio: "inherit", cwd: rootDir });
} catch (err) {
  console.warn("Database migration step warning:", err?.message || err);
}

console.log("Native assets preparation completed successfully.");
