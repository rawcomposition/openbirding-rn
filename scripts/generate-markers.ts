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

const HOTSPOT_STAR_COLOR: Record<number, string> = {
  0: "#444",
  1: "white",
  2: "white",
  3: "#444",
  4: "#444",
  5: "#444",
  6: "#444",
  7: "white",
  8: "white",
  9: "white",
};

const starSvg = fs.readFileSync(path.join(__dirname, "..", "assets", "images", "star-base.svg"), "utf8");

async function makeHotspotMarker({
  name,
  color,
  colorIndex,
  withStar,
}: {
  name: string;
  color: string;
  colorIndex: number;
  withStar: boolean;
}) {
  const tintedBaseSvg = tintSvg(circleSvg, color);
  const base = sharp(Buffer.from(tintedBaseSvg)).resize(SIZE, SIZE);
  const tintedStarSvg = tintSvg(starSvg, HOTSPOT_STAR_COLOR[colorIndex]);
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
      colorIndex: i,
      withStar: false,
    });

    await makeHotspotMarker({
      name: `saved-hotspot-${i}.png`,
      color: hotspotColor[i],
      colorIndex: i,
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
