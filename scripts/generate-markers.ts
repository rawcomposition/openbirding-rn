import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { hotspotColor } from "../lib/constants";

const OUT_DIR = path.join(__dirname, "..", "assets", "markers");
const SIZE = 64;

const circleSvg = fs.readFileSync(path.join(__dirname, "..", "assets", "images", "marker-base.svg"), "utf8");
const starSvg = fs.readFileSync(path.join(__dirname, "..", "assets", "images", "star-base.svg"), "utf8");

function tintSvg(svg: string, color: string) {
  return svg.replace("CURRENT_COLOR", color);
}

const PLACE_ICONS = [
  {
    name: "star",
    color: "#0284c7",
    iconColor: "white",
  },
];

const HOTSPOT_STAR_COLOR = {
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
  const tintedStarSvg = tintSvg(starSvg, HOTSPOT_STAR_COLOR[colorIndex as keyof typeof HOTSPOT_STAR_COLOR]);
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

async function makePlaceMarker({ name, color, iconColor }: { name: string; color: string; iconColor: string }) {
  const tintedBaseSvg = tintSvg(circleSvg, color);
  const base = sharp(Buffer.from(tintedBaseSvg)).resize(SIZE, SIZE);
  const tintedStarSvg = tintSvg(starSvg, iconColor);
  const star = sharp(Buffer.from(tintedStarSvg)).resize(parseInt(String(SIZE * 0.58)), parseInt(String(SIZE * 0.58)));

  const layers = [
    {
      input: await star.toBuffer(),
      gravity: "center",
    },
  ];

  await base.composite(layers).png().toFile(path.join(OUT_DIR, name));
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

  for (const icon of PLACE_ICONS) {
    await makePlaceMarker({
      name: `place-${icon.name}.png`,
      color: icon.color,
      iconColor: icon.iconColor,
    });
  }

  console.log("Markers generated");
}

main().catch(console.error);
