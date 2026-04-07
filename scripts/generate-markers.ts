// Requires `sharp` installed locally (npm install --no-save sharp). It's not in
// package.json because it fails to compile on EAS build servers.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { hotspotColor } from "../lib/constants";
import { placeIcons, getIconSvg } from "../lib/placeIcons";

const OUT_DIR = path.join(__dirname, "..", "assets", "markers");
const SIZE = 64;

const circleSvg = fs.readFileSync(path.join(__dirname, "..", "assets", "images", "marker-base.svg"), "utf8");

function tintSvg(svg: string, color: string) {
  return svg.replace("CURRENT_COLOR", color);
}

function makeIconSvg(iconName: string, color: string): string {
  const iconDef = getIconSvg(iconName as any);
  return `<svg viewBox="${iconDef.viewBox}" xmlns="http://www.w3.org/2000/svg" fill="${color}"><path d="${iconDef.path}"/></svg>`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function relativeLuminance(hex: string): number {
  const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const r = linearize(parseInt(hex.slice(1, 3), 16) / 255);
  const g = linearize(parseInt(hex.slice(3, 5), 16) / 255);
  const b = linearize(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getStarColor(bgHex: string): string {
  const [h, s, l] = hexToHsl(bgHex);
  if (relativeLuminance(bgHex) > 0.3) return hslToHex(h, s * 0.7, l * 0.4);
  return hslToHex(h, s * 0.35, l + (1 - l) * 0.85);
}

const starSvg = fs.readFileSync(path.join(__dirname, "..", "assets", "images", "star-base.svg"), "utf8");

async function makeHotspotMarker({
  name,
  color,
  withStar,
}: {
  name: string;
  color: string;
  withStar: boolean;
}) {
  const tintedBaseSvg = tintSvg(circleSvg, color);
  const base = sharp(Buffer.from(tintedBaseSvg)).resize(SIZE, SIZE);
  const tintedStarSvg = tintSvg(starSvg, getStarColor(color));
  const star = sharp(Buffer.from(tintedStarSvg)).resize(parseInt(String(SIZE * 0.58)), parseInt(String(SIZE * 0.58)));

  const layers: sharp.OverlayOptions[] = [];

  if (withStar) {
    layers.push({
      input: await star.toBuffer(),
      gravity: "center",
    });
  }

  await base.composite(layers).png().toFile(path.join(OUT_DIR, name));
}

async function makePlaceMarker({
  name,
  color,
  iconName,
  iconColor,
}: {
  name: string;
  color: string;
  iconName: string;
  iconColor: string;
}) {
  const tintedBaseSvg = tintSvg(circleSvg, color);
  const base = sharp(Buffer.from(tintedBaseSvg)).resize(SIZE, SIZE);
  const iconSvgStr = makeIconSvg(iconName, iconColor);
  const iconSize = parseInt(String(SIZE * 0.5));
  const icon = sharp(Buffer.from(iconSvgStr)).resize(iconSize, iconSize, { fit: "inside" });

  await base
    .composite([{ input: await icon.toBuffer(), gravity: "center" }])
    .png()
    .toFile(path.join(OUT_DIR, name));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let i = 0; i < hotspotColor.length; i++) {
    await makeHotspotMarker({
      name: `hotspot-${i}.png`,
      color: hotspotColor[i],
      withStar: false,
    });

    await makeHotspotMarker({
      name: `saved-hotspot-${i}.png`,
      color: hotspotColor[i],
      withStar: true,
    });
  }

  for (const [markerName, def] of Object.entries(placeIcons)) {
    await makePlaceMarker({
      name: `place-${markerName}.png`,
      color: def.color,
      iconName: def.icon,
      iconColor: "white",
    });
  }

  console.log("Markers generated");
}

main().catch(console.error);
