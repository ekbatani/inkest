import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const outDir = path.join(rootDir, "out");
const tauriIconsDir = path.join(rootDir, "src-tauri", "icons");
const publicDir = path.join(rootDir, "public");

// 1. Ensure `out` directory exists for Capacitor and Tauri
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

if (sourceIcon) {
  const iconTargets = [
    "32x32.png",
    "128x128.png",
    "128x128@2x.png",
    "icon.ico",
    "icon.icns",
  ];
  for (const target of iconTargets) {
    const dest = path.join(tauriIconsDir, target);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(sourceIcon, dest);
    }
  }
  console.log("Populated src-tauri/icons with application icons.");
}

console.log("Native assets preparation completed successfully.");
