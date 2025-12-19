import { hotspotColor, placeColor } from "@/lib/utils";

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

export const hotspotCircleStyle = (size: number = 1) => ({
  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 7 * size, 12, 10 * size],
  circleColor: [
    "match",
    ["get", "shade"],
    0,
    hotspotColor[0],
    1,
    hotspotColor[1],
    2,
    hotspotColor[2],
    3,
    hotspotColor[3],
    4,
    hotspotColor[4],
    5,
    hotspotColor[5],
    6,
    hotspotColor[6],
    7,
    hotspotColor[7],
    8,
    hotspotColor[8],
    9,
    hotspotColor[9],
    hotspotColor[0],
  ],
  circleStrokeWidth: 0.5,
  circleStrokeColor: "#555",
});

export const savedHotspotLayerStyle = () => ({
  iconImage: ["case", ["all", [">=", ["get", "shade"], 2], ["<=", ["get", "shade"], 6]], "star", "star-light"],
  iconSize: ["interpolate", ["linear"], ["zoom"], 7, 0.25, 12, 0.35],
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconAnchor: "center",
  iconOffset: [0, -0.03],
});

export const savedPlaceCircleStyle = (size: number = 1) => ({
  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 9.1 * size, 12, 13 * size],
  circleColor: ["match", ["get", "color"], ...Object.entries(placeColor).flat(), ["get", "color"]],
  circleStrokeWidth: 0.5,
  circleStrokeColor: "#555",
});

export const savedPlaceLayerStyle = () => ({
  iconImage: "star-light",
  iconSize: ["interpolate", ["linear"], ["zoom"], 7, 0.25, 12, 0.35],
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconAnchor: "center",
  iconOffset: [0, -0.03],
});
