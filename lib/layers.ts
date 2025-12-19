import { hotspotColor } from "@/lib/constants";
import { placeColor } from "@/lib/utils";

export const haloInnerStyle = (size: number = 1) => ({
  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 8.5 * size, 12, 10 * size],
  circleColor: "transparent",
  circleStrokeWidth: 7,
  circleStrokeColor: "rgba(255, 255, 255, 0.5)",
});

export const haloOuterStyle = (size: number = 1) => ({
  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 12 * size, 12, 17 * size],
  circleColor: "transparent",
  circleStrokeWidth: 1,
  circleStrokeColor: "rgba(255, 255, 255, 0.7)",
});

export const hotspotSymbolStyle = () => ({
  iconImage: [
    "match",
    ["get", "shade"],
    0,
    "hotspot-0",
    1,
    "hotspot-1",
    2,
    "hotspot-2",
    3,
    "hotspot-3",
    4,
    "hotspot-4",
    5,
    "hotspot-5",
    6,
    "hotspot-6",
    7,
    "hotspot-7",
    8,
    "hotspot-8",
    9,
    "hotspot-9",
    "hotspot-0",
  ],
  iconSize: ["interpolate", ["linear"], ["zoom"], 7, 0.25, 12, 0.375],
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconAnchor: "center",
});

export const savedHotspotSymbolStyle = () => ({
  iconImage: [
    "match",
    ["get", "shade"],
    0,
    "saved-hotspot-0",
    1,
    "saved-hotspot-1",
    2,
    "saved-hotspot-2",
    3,
    "saved-hotspot-3",
    4,
    "saved-hotspot-4",
    5,
    "saved-hotspot-5",
    6,
    "saved-hotspot-6",
    7,
    "saved-hotspot-7",
    8,
    "saved-hotspot-8",
    9,
    "saved-hotspot-9",
    "saved-hotspot-0",
  ],
  iconSize: ["interpolate", ["linear"], ["zoom"], 7, 0.35, 12, 0.45],
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconAnchor: "center",
});

export const savedPlaceCircleStyle = (size: number = 1) => ({
  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 9.1 * size, 12, 13 * size],
  circleColor: ["match", ["get", "color"], ...Object.entries(placeColor).flat(), ["get", "color"]],
  circleStrokeWidth: 0.5,
  circleStrokeColor: "#555",
});

export const savedPlaceSymbolStyle = () => ({
  iconImage: "place-star",
  iconSize: ["interpolate", ["linear"], ["zoom"], 7, 0.35, 12, 0.45],
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconAnchor: "center",
});
