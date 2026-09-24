/**
 * Génère les icônes PWA et les écrans de lancement iOS à partir du logo SVG.
 * Usage : node scripts/generate-brand-assets.mjs (utilise « sharp », fourni avec Next.js).
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const INK = "#0e1116";
const PAPER = "#f4f5f7";
const ACCENT_ON_INK = "#7b96ff";

/** Monogramme « N » en route + point d'arrivée, centré dans une zone de `size`. */
function glyph(size, scale, stroke, dot) {
  const s = (size * scale) / 32;
  const offset = (size - 32 * s) / 2;
  return `<g transform="translate(${offset} ${offset}) scale(${s})">
    <path d="M10 22.5V9.5l12 13V11" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="22" cy="9.5" r="2.4" fill="${dot}"/>
  </g>`;
}

function iconSvg(size, { rounded, scale }) {
  const radius = rounded ? size * 0.225 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
    ${glyph(size, scale, "#ffffff", ACCENT_ON_INK)}
  </svg>`;
}

function splashSvg(width, height) {
  const mark = Math.round(Math.min(width, height) * 0.22);
  const x = (width - mark) / 2;
  const y = height * 0.42 - mark / 2;
  const fontSize = Math.round(mark * 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${PAPER}"/>
    <g transform="translate(${x} ${y})">
      <rect width="${mark}" height="${mark}" rx="${mark * 0.28}" fill="${INK}"/>
      ${glyph(mark, 1, "#ffffff", ACCENT_ON_INK)}
    </g>
    <text x="50%" y="${y + mark + fontSize * 2.4}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="${fontSize * 0.28}" fill="${INK}">NAERA</text>
  </svg>`;
}

async function png(svg, path) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path);
  console.log(`✓ ${path}`);
}

await mkdir("public/icons", { recursive: true });
await mkdir("public/splash", { recursive: true });

await png(iconSvg(192, { rounded: true, scale: 0.78 }), "public/icons/icon-192.png");
await png(iconSvg(512, { rounded: true, scale: 0.78 }), "public/icons/icon-512.png");
await png(iconSvg(512, { rounded: false, scale: 0.6 }), "public/icons/maskable-512.png");
await png(iconSvg(180, { rounded: false, scale: 0.72 }), "src/app/apple-icon.png");
await png(iconSvg(64, { rounded: true, scale: 0.9 }), "src/app/icon.png");
await writeFile(
  "src/app/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="${INK}"/><path d="M10 22.5V9.5l12 13V11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="9.5" r="2.4" fill="${ACCENT_ON_INK}"/></svg>\n`,
);
console.log("✓ src/app/icon.svg");

for (const [width, height] of [
  [1170, 2532],
  [1179, 2556],
  [1290, 2796],
  [750, 1334],
]) {
  await png(splashSvg(width, height), `public/splash/apple-splash-${width}x${height}.png`);
}
