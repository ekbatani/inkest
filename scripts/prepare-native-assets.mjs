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

// Write interactive out/index.html native launcher
const outIndexPath = path.join(outDir, "index.html");
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Inkest Workspace</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background-color: #121215;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px 28px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .logo {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border-radius: 14px;
      background: linear-gradient(135deg, #27272a, #18181b);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #3f3f46;
    }
    h1 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: #ffffff;
    }
    p.subtitle {
      font-size: 14px;
      color: #a1a1aa;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .form-group {
      text-align: left;
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #a1a1aa;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    input[type="url"], input[type="text"] {
      width: 100%;
      padding: 12px 14px;
      background-color: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #f4f4f5;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
    }
    input[type="url"]:focus, input[type="text"]:focus {
      border-color: #71717a;
    }
    .btn-primary {
      width: 100%;
      padding: 12px;
      background-color: #f4f4f5;
      color: #09090b;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease, opacity 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-primary:hover {
      background-color: #e4e4e7;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .presets {
      display: flex;
      gap: 8px;
      margin-top: 14px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn-preset {
      background: none;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 12px;
      padding: 6px 10px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-preset:hover {
      background-color: #18181b;
      color: #f4f4f5;
      border-color: #3f3f46;
    }
    .status-msg {
      margin-top: 16px;
      font-size: 13px;
      line-height: 1.4;
      min-height: 20px;
    }
    .status-error {
      color: #f87171;
    }
    .status-info {
      color: #a1a1aa;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
      vertical-align: middle;
      margin-right: 6px;
    }
    .spinner-dark {
      border: 2px solid rgba(0,0,0,0.2);
      border-top-color: #09090b;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .footer-note {
      margin-top: 24px;
      font-size: 12px;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f4f4f5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        <path d="M2 2l7.586 7.586"/>
        <circle cx="11" cy="11" r="2"/>
      </svg>
    </div>
    <h1>Inkest Workspace</h1>
    <p class="subtitle" id="subtitle">Connecting to your personal workspace...</p>

    <div id="connectingView">
      <div class="status-msg status-info" id="connectStatus">
        <span class="spinner"></span> Connecting to workspace...
      </div>
    </div>

    <form id="connectForm" style="display: none;" onsubmit="handleManualConnect(event)">
      <div class="form-group">
        <label for="serverUrl">Workspace Server URL</label>
        <input type="url" id="serverUrl" placeholder="https://inkest.natrademind.com" required spellcheck="false" autocomplete="url" />
      </div>
      <button type="submit" class="btn-primary" id="submitBtn">
        Connect to Workspace
      </button>
      <div class="presets">
        <button type="button" class="btn-preset" onclick="setPreset('https://inkest.natrademind.com')">Cloud Instance</button>
        <button type="button" class="btn-preset" onclick="setPreset('http://localhost:3000')">Localhost:3000</button>
      </div>
      <div class="status-msg status-error" id="formError"></div>
    </form>

    <div class="footer-note" id="footerNote">
      Inkest · Markdown-First Personal Workspace
    </div>
  </div>

  <script>
    const STORAGE_KEY = "inkest_server_url";
    const DEFAULT_URL = "https://inkest.natrademind.com";

    function normalizeUrl(url) {
      let trimmed = (url || "").trim().replace(/\\/+$/, "");
      if (!trimmed) return "";
      if (!/^https?:\\/\\//i.test(trimmed)) {
        trimmed = "http://" + trimmed;
      }
      return trimmed;
    }

    async function checkServerHealth(baseUrl) {
      const normalized = normalizeUrl(baseUrl);
      if (!normalized) return false;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        await fetch(normalized + "/api/diagnostics", {
          method: "GET",
          signal: controller.signal,
          mode: "cors"
        }).catch(async () => {
          return await fetch(normalized + "/", {
            method: "HEAD",
            signal: controller.signal,
            mode: "no-cors"
          });
        });
        clearTimeout(timeoutId);
        return true;
      } catch (err) {
        return false;
      }
    }

    function showForm(prefillUrl, errorMessage) {
      document.getElementById("connectingView").style.display = "none";
      document.getElementById("connectForm").style.display = "block";
      document.getElementById("subtitle").innerText = "Enter your Inkest server URL to connect.";
      const input = document.getElementById("serverUrl");
      input.value = prefillUrl || localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
      if (errorMessage) {
        document.getElementById("formError").innerText = errorMessage;
      }
      input.focus();
    }

    function setPreset(url) {
      const input = document.getElementById("serverUrl");
      input.value = url;
      document.getElementById("formError").innerText = "";
    }

    async function handleManualConnect(e) {
      e.preventDefault();
      const input = document.getElementById("serverUrl");
      const submitBtn = document.getElementById("submitBtn");
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner spinner-dark"></span> Connecting...';

      const url = normalizeUrl(input.value);
      const isHealthy = await checkServerHealth(url);
      if (isHealthy) {
        localStorage.setItem(STORAGE_KEY, url);
        window.location.replace(url);
      } else {
        submitBtn.disabled = false;
        submitBtn.innerText = "Connect to Workspace";
        document.getElementById("formError").innerText = "Could not reach " + url + ". Ensure Inkest is running at this address.";
      }
    }

    window.addEventListener("DOMContentLoaded", async () => {
      const savedUrl = localStorage.getItem(STORAGE_KEY);
      if (savedUrl) {
        const isHealthy = await checkServerHealth(savedUrl);
        if (isHealthy) {
          window.location.replace(savedUrl);
          return;
        }
      }

      const isLocalhostHealthy = await checkServerHealth(DEFAULT_URL);
      if (isLocalhostHealthy) {
        localStorage.setItem(STORAGE_KEY, DEFAULT_URL);
        window.location.replace(DEFAULT_URL);
        return;
      }

      showForm(savedUrl || DEFAULT_URL);
    });
  </script>
</body>
</html>`;

fs.writeFileSync(outIndexPath, indexHtml, "utf-8");
console.log("Generated interactive native launcher in out/index.html.");

// 3. Ensure src-tauri/icons directory exists and generate icons
if (!fs.existsSync(tauriIconsDir)) {
  fs.mkdirSync(tauriIconsDir, { recursive: true });
}

const sourceIconPath = fs.existsSync(path.join(publicDir, "icon-1024.png"))
  ? path.join(publicDir, "icon-1024.png")
  : fs.existsSync(path.join(publicDir, "app-icon.png"))
  ? path.join(publicDir, "app-icon.png")
  : null;

if (sourceIconPath) {
  try {
    const sharp = (await import("sharp")).default;
    const androidIconsDir = path.join(tauriIconsDir, "android");

    const densities = [
      { name: "mdpi", size: 48, fgSize: 108 },
      { name: "hdpi", size: 72, fgSize: 162 },
      { name: "xhdpi", size: 96, fgSize: 216 },
      { name: "xxhdpi", size: 144, fgSize: 324 },
      { name: "xxxhdpi", size: 192, fgSize: 432 },
    ];

    for (const d of densities) {
      const dir = path.join(androidIconsDir, `mipmap-${d.name}`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 1. Standard square/adaptive ic_launcher.png
      await sharp(sourceIconPath)
        .resize(d.size, d.size)
        .png()
        .toFile(path.join(dir, "ic_launcher.png"));

      // 2. Round ic_launcher_round.png
      const circleSvg = Buffer.from(
        `<svg width="${d.size}" height="${d.size}"><circle cx="${d.size / 2}" cy="${d.size / 2}" r="${d.size / 2}" fill="#fff" /></svg>`
      );
      await sharp(sourceIconPath)
        .resize(d.size, d.size)
        .composite([{ input: circleSvg, blend: "dest-in" }])
        .png()
        .toFile(path.join(dir, "ic_launcher_round.png"));

      // 3. Foreground layer ic_launcher_foreground.png (inner icon padded for Android adaptive icons)
      const innerSize = Math.round(d.fgSize * 0.666);
      const innerBuffer = await sharp(sourceIconPath)
        .resize(innerSize, innerSize)
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: d.fgSize,
          height: d.fgSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: innerBuffer, gravity: "center" }])
        .png()
        .toFile(path.join(dir, "ic_launcher_foreground.png"));
    }

    // Write Android adaptive icon XML declarations
    const anyDpiDir = path.join(androidIconsDir, "mipmap-anydpi-v26");
    if (!fs.existsSync(anyDpiDir)) {
      fs.mkdirSync(anyDpiDir, { recursive: true });
    }
    const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
    fs.writeFileSync(path.join(anyDpiDir, "ic_launcher.xml"), adaptiveXml, "utf-8");
    fs.writeFileSync(path.join(anyDpiDir, "ic_launcher_round.xml"), adaptiveXml, "utf-8");

    const valuesDir = path.join(androidIconsDir, "values");
    if (!fs.existsSync(valuesDir)) {
      fs.mkdirSync(valuesDir, { recursive: true });
    }
    const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#0b0d16</color>
</resources>`;
    fs.writeFileSync(path.join(valuesDir, "ic_launcher_background.xml"), bgXml, "utf-8");

    console.log("Successfully generated all Android mipmap and adaptive icons.");

    // Sync Android icons directly into Capacitor Android project if it exists
    const capAndroidResDir = path.join(rootDir, "android", "app", "src", "main", "res");
    if (fs.existsSync(capAndroidResDir)) {
      fs.cpSync(androidIconsDir, capAndroidResDir, { recursive: true, force: true });
      console.log("Synchronized Android icons to android/app/src/main/res.");
    }
  } catch (err) {
    console.warn("Could not generate Android icons:", err?.message || err);
  }
}

const mainIcoPath = path.join(tauriIconsDir, "icon.ico");
if (!fs.existsSync(mainIcoPath) || fs.statSync(mainIcoPath).size < 1000) {
  if (sourceIconPath) {
    try {
      const { execSync } = await import("node:child_process");
      execSync(`bun x @tauri-apps/cli icon "${sourceIconPath}" -o src-tauri/icons`, {
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
