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

// 3. Ensure src-tauri/icons directory exists
if (!fs.existsSync(tauriIconsDir)) {
  fs.mkdirSync(tauriIconsDir, { recursive: true });
}

const mainIcoPath = path.join(tauriIconsDir, "icon.ico");
if (!fs.existsSync(mainIcoPath) || fs.statSync(mainIcoPath).size < 1000) {
  const sourceIcon = fs.existsSync(path.join(publicDir, "icon-1024.png"))
    ? path.join(publicDir, "icon-1024.png")
    : fs.existsSync(path.join(publicDir, "app-icon.png"))
    ? path.join(publicDir, "app-icon.png")
    : null;

  if (sourceIcon) {
    try {
      const { execSync } = await import("node:child_process");
      execSync(`bun x @tauri-apps/cli icon "${sourceIcon}" -o src-tauri/icons`, {
        stdio: "inherit",
        cwd: rootDir,
      });
      console.log("Generated Tauri icons with official CLI.");
    } catch (e) {
      console.warn("Could not run tauri icon generator:", e?.message || e);
    }
  }
} else {
  console.log("Found valid multi-resolution Tauri icons.");
}

// 4. Run database migrations to ensure local schema is ready for static build collection
try {
  const { execSync } = await import("node:child_process");
  execSync("bun scripts/migrate.mjs", { stdio: "inherit", cwd: rootDir });
} catch (err) {
  console.warn("Database migration step warning:", err?.message || err);
}

console.log("Native assets preparation completed successfully.");
