// Generates PWA icons from the cube mark: `node scripts/make-icons.mjs`.
import { readFileSync } from "node:fs";
import sharp from "sharp";

const cube = readFileSync("public/brand/offbook-cube.svg", "utf8");
const inner = cube.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// The cube sits on a light tile; `pad` is the share of the tile left around it.
function tile(pad, bg) {
  const size = 236 / (1 - 2 * pad);
  const x = 150 - (size - 236) / 2;
  const y = 280 - (size - 246) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}"><rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${bg}"/>${inner}</svg>`;
}

const jobs = [
  ["public/icons/icon-192.png", 192, tile(0.12, "#F5F0FF")],
  ["public/icons/icon-512.png", 512, tile(0.12, "#F5F0FF")],
  // Maskable: keep the mark inside the 80% safe zone.
  ["public/icons/maskable-512.png", 512, tile(0.22, "#F5F0FF")],
  ["public/icons/apple-touch-icon.png", 180, tile(0.14, "#F5F0FF")],
];
for (const [out, px, svg] of jobs) {
  await sharp(Buffer.from(svg)).resize(px, px).png().toFile(out);
  console.log("wrote", out);
}
