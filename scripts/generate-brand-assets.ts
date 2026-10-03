// Regenerates the raster brand icons in public/ from the vector mark in
// src/components/brand/logo-mark.tsx, so PNGs never drift from the SVG.
// Usage: bun scripts/generate-brand-assets.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  LOGO_GRADIENT_STOPS,
  LOGO_MARK_PATH,
  LOGO_MARK_VIEWBOX,
} from "../src/components/brand/logo-mark";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

// Mirrors LOGO_TILE_GRADIENT (a CSS gradient) as SVG stops.
const TILE_STOPS = [
  { offset: "0", color: "#4338CA" },
  { offset: "0.55", color: "#7C3AED" },
  { offset: "1", color: "#A855F7" },
];

type Tile = "gradient" | "dark";

function iconSvg(size: number, tile: Tile, radiusRatio = 0.225) {
  const radius = size * radiusRatio;
  // The mark sits on a 32-unit grid; inset it so the quill breathes inside the tile.
  const inset = size * 0.17;
  const markSize = size - inset * 2;
  const stops = (list: readonly { offset: string; color: string }[]) =>
    list.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join("");

  const background =
    tile === "gradient"
      ? `<rect width="${size}" height="${size}" rx="${radius}" fill="url(#tile)"/>`
      : `<rect width="${size}" height="${size}" rx="${radius}" fill="#0F111A"/>
         <rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="${radius}" fill="none" stroke="#818CF8" stroke-opacity="0.22"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="tile" x1="0" y1="${size}" x2="${size}" y2="0" gradientUnits="userSpaceOnUse">${stops(TILE_STOPS)}</linearGradient>
    <linearGradient id="mark" x1="6" y1="27" x2="27" y2="5" gradientUnits="userSpaceOnUse">${stops(LOGO_GRADIENT_STOPS)}</linearGradient>
  </defs>
  ${background}
  <svg x="${inset}" y="${inset}" width="${markSize}" height="${markSize}" viewBox="${LOGO_MARK_VIEWBOX}">
    <path d="${LOGO_MARK_PATH}" fill-rule="evenodd" fill="${tile === "gradient" ? "#FFFFFF" : "url(#mark)"}"/>
  </svg>
</svg>`;
}

const outputs: { file: string; size: number; tile: Tile }[] = [
  { file: "icon-1024.png", size: 1024, tile: "gradient" },
  { file: "logo-square.png", size: 512, tile: "gradient" },
  { file: "app-icon.png", size: 192, tile: "gradient" },
  { file: "app-icon-black.png", size: 192, tile: "dark" },
];

for (const { file, size, tile } of outputs) {
  await sharp(Buffer.from(iconSvg(size, tile))).png().toFile(path.join(publicDir, file));
  console.log(`✓ public/${file} (${size}×${size})`);
}
