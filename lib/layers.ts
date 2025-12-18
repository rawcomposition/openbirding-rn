import { markerColors } from "@/lib/utils";

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
    markerColors[0],
    1,
    markerColors[1],
    2,
    markerColors[2],
    3,
    markerColors[3],
    4,
    markerColors[4],
    5,
    markerColors[5],
    6,
    markerColors[6],
    7,
    markerColors[7],
    8,
    markerColors[8],
    9,
    markerColors[9],
    markerColors[0],
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
