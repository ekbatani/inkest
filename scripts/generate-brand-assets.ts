// Regenerates every raster brand icon from the vector mark in
// src/components/brand/logo-mark.tsx, so no PNG/ICO/ICNS drifts from the SVG:
//   - public/          web app icons (PWA, Apple touch fallback, native source)
//   - src/app/         favicon.ico
//   - src-tauri/icons/ desktop (Windows/Linux PNG + ICO, macOS ICNS), Windows
//                      Store tiles, iOS AppIcon set, Android mipmaps
// Usage: bun scripts/generate-brand-assets.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  LOGO_GRADIENT_STOPS,
  LOGO_MARK_PATH,
  LOGO_MARK_VIEWBOX,
} from "../src/components/brand/logo-mark";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(rootDir, "public");
const tauriIconsDir = path.join(rootDir, "src-tauri", "icons");

// Mirrors LOGO_TILE_GRADIENT (a CSS gradient) as SVG stops.
const TILE_STOPS = [
  { offset: "0", color: "#4338CA" },
  { offset: "0.55", color: "#7C3AED" },
  { offset: "1", color: "#A855F7" },
];

/**
 * - rounded: gradient squircle filling the canvas (web, Windows, Linux)
 * - dark:    the same tile on the midnight canvas with a gradient mark
 * - macos:   Apple grid — 824/1024 tile, centred, with a soft drop shadow
 * - bleed:   full-bleed opaque square; the OS applies its own mask (iOS, Android bg)
 * - circle:  round tile (Android ic_launcher_round)
 * - mark:    white mark only on transparent (Android adaptive foreground)
 */
type Variant = "rounded" | "dark" | "macos" | "bleed" | "circle" | "mark";

function stops(list: readonly { offset: string; color: string }[]) {
  return list.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join("");
}

function iconSvg(size: number, variant: Variant) {
  let tileX = 0;
  let tileSize = size;
  if (variant === "macos") {
    tileSize = size * (824 / 1024);
    tileX = (size - tileSize) / 2;
  }
  const radius = variant === "circle" ? tileSize / 2 : variant === "bleed" ? 0 : tileSize * 0.225;

  // How much of the tile the 32-unit mark grid occupies. Tiny favicons get a
  // tighter inset so the quill stays legible; the Android foreground keeps the
  // mark inside the 66/108 safe zone of the adaptive mask.
  const markRatio =
    variant === "mark" ? 0.42 : variant === "circle" ? 0.6 : size <= 32 ? 0.76 : 0.66;
  const markSize = tileSize * markRatio;
  const markX = tileX + (tileSize - markSize) / 2;
  const markY = (variant === "macos" ? tileX - size * 0.008 : 0) + (tileSize - markSize) / 2;

  const tileY = variant === "macos" ? tileX - size * 0.008 : 0;
  let background = "";
  if (variant === "dark") {
    background = `<rect width="${tileSize}" height="${tileSize}" rx="${radius}" fill="#0F111A"/>
      <rect x="0.5" y="0.5" width="${tileSize - 1}" height="${tileSize - 1}" rx="${radius}" fill="none" stroke="#818CF8" stroke-opacity="0.22"/>`;
  } else if (variant !== "mark") {
    const shadow = variant === "macos" ? ` filter="url(#shadow)"` : "";
    background = `<rect x="${tileX}" y="${tileY}" width="${tileSize}" height="${tileSize}" rx="${radius}" fill="url(#tile)"${shadow}/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="tile" x1="${tileX}" y1="${tileY + tileSize}" x2="${tileX + tileSize}" y2="${tileY}" gradientUnits="userSpaceOnUse">${stops(TILE_STOPS)}</linearGradient>
    <linearGradient id="mark" x1="6" y1="27" x2="27" y2="5" gradientUnits="userSpaceOnUse">${stops(LOGO_GRADIENT_STOPS)}</linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="${size * 0.012}" stdDeviation="${size * 0.014}" flood-color="#0B0D16" flood-opacity="0.35"/>
    </filter>
  </defs>
  ${background}
  <svg x="${markX}" y="${markY}" width="${markSize}" height="${markSize}" viewBox="${LOGO_MARK_VIEWBOX}">
    <path d="${LOGO_MARK_PATH}" fill-rule="evenodd" fill="${variant === "dark" ? "url(#mark)" : "#FFFFFF"}"/>
  </svg>
</svg>`;
}

async function renderPng(size: number, variant: Variant) {
  const image = sharp(Buffer.from(iconSvg(size, variant))).png();
  // iOS rejects app icons with an alpha channel.
  return variant === "bleed" ? image.flatten({ background: "#4338CA" }).removeAlpha().png().toBuffer() : image.toBuffer();
}

async function writePng(file: string, size: number, variant: Variant) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, await renderPng(size, variant));
  console.log(`✓ ${path.relative(rootDir, file)} (${size}×${size})`);
}

/** ICO container with embedded PNG frames (Windows Vista+). */
async function writeIco(file: string, sizes: number[], variant: Variant) {
  const frames = await Promise.all(sizes.map((size) => renderPng(size, variant)));
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((frame, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], entry);
    header.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], entry + 1);
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  fs.writeFileSync(file, Buffer.concat([header, ...frames]));
  console.log(`✓ ${path.relative(rootDir, file)} (${sizes.join(", ")})`);
}

/** ICNS container with PNG-encoded entries (macOS 10.7+). */
async function writeIcns(file: string) {
  const entries: [string, number][] = [
    ["icp4", 16], ["icp5", 32], ["icp6", 64], ["ic07", 128], ["ic08", 256], ["ic09", 512], ["ic10", 1024],
    ["ic11", 32], ["ic12", 64], ["ic13", 256], ["ic14", 512],
  ];
  const chunks = await Promise.all(
    entries.map(async ([type, size]) => {
      const png = await renderPng(size, "macos");
      const head = Buffer.alloc(8);
      head.write(type, 0, "ascii");
      head.writeUInt32BE(png.length + 8, 4);
      return Buffer.concat([head, png]);
    }),
  );
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(body.length + 8, 4);
  fs.writeFileSync(file, Buffer.concat([head, body]));
  console.log(`✓ ${path.relative(rootDir, file)} (16–1024, macOS grid)`);
}

// Web
await writePng(path.join(publicDir, "icon-1024.png"), 1024, "rounded");
await writePng(path.join(publicDir, "logo-square.png"), 512, "rounded");
await writePng(path.join(publicDir, "app-icon.png"), 192, "rounded");
await writePng(path.join(publicDir, "app-icon-black.png"), 192, "dark");
await writeIco(path.join(rootDir, "src", "app", "favicon.ico"), [16, 32, 48], "rounded");

// Desktop (Tauri): Windows/Linux PNGs + ICO, macOS ICNS
for (const [name, size] of [["32x32", 32], ["64x64", 64], ["128x128", 128], ["128x128@2x", 256], ["icon", 512]] as const) {
  await writePng(path.join(tauriIconsDir, `${name}.png`), size, "rounded");
}
await writeIco(path.join(tauriIconsDir, "icon.ico"), [16, 24, 32, 48, 64, 256], "rounded");
await writeIcns(path.join(tauriIconsDir, "icon.icns"));

// Windows Store tiles
for (const size of [30, 44, 71, 89, 107, 142, 150, 284, 310]) {
  await writePng(path.join(tauriIconsDir, `Square${size}x${size}Logo.png`), size, "rounded");
}
await writePng(path.join(tauriIconsDir, "StoreLogo.png"), 50, "rounded");

// iOS AppIcon set — full-bleed and opaque; iOS applies the corner mask.
const iosIcons: [string, number][] = [
  ["20x20@1x", 20], ["20x20@2x", 40], ["20x20@2x-1", 40], ["20x20@3x", 60],
  ["29x29@1x", 29], ["29x29@2x", 58], ["29x29@2x-1", 58], ["29x29@3x", 87],
  ["40x40@1x", 40], ["40x40@2x", 80], ["40x40@2x-1", 80], ["40x40@3x", 120],
  ["60x60@2x", 120], ["60x60@3x", 180], ["76x76@1x", 76], ["76x76@2x", 152],
  ["83.5x83.5@2x", 167], ["512@2x", 1024],
];
for (const [name, size] of iosIcons) {
  await writePng(path.join(tauriIconsDir, "ios", `AppIcon-${name}.png`), size, "bleed");
}

// Android: legacy + round launcher, and an adaptive pair (gradient
// background layer + white quill foreground kept inside the safe zone).
const androidDir = path.join(tauriIconsDir, "android");
const densities = [
  { name: "mdpi", size: 48, layer: 108 },
  { name: "hdpi", size: 72, layer: 162 },
  { name: "xhdpi", size: 96, layer: 216 },
  { name: "xxhdpi", size: 144, layer: 324 },
  { name: "xxxhdpi", size: 192, layer: 432 },
];
for (const d of densities) {
  const dir = path.join(androidDir, `mipmap-${d.name}`);
  await writePng(path.join(dir, "ic_launcher.png"), d.size, "rounded");
  await writePng(path.join(dir, "ic_launcher_round.png"), d.size, "circle");
  await writePng(path.join(dir, "ic_launcher_foreground.png"), d.layer, "mark");
  await writePng(path.join(dir, "ic_launcher_background.png"), d.layer, "bleed");
}
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
fs.mkdirSync(path.join(androidDir, "mipmap-anydpi-v26"), { recursive: true });
fs.writeFileSync(path.join(androidDir, "mipmap-anydpi-v26", "ic_launcher.xml"), adaptiveXml);
fs.writeFileSync(path.join(androidDir, "mipmap-anydpi-v26", "ic_launcher_round.xml"), adaptiveXml);
fs.mkdirSync(path.join(androidDir, "values"), { recursive: true });
fs.writeFileSync(
  path.join(androidDir, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#5B34E0</color>
</resources>
`,
);
console.log("✓ src-tauri/icons/android adaptive icon XML");

// Keep a Capacitor Android project in sync when one exists.
const capAndroidResDir = path.join(rootDir, "android", "app", "src", "main", "res");
if (fs.existsSync(capAndroidResDir)) {
  fs.cpSync(androidDir, capAndroidResDir, { recursive: true, force: true });
  console.log("✓ synced Android icons to android/app/src/main/res");
}
