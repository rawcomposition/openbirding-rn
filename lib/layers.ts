import { markerColors } from "@/lib/utils";

export const haloInnerStyle = {
  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 8.5, 12, 10],
  circleColor: "transparent",
  circleStrokeWidth: 7,
  circleStrokeColor: "rgba(255, 255, 255, 0.5)",
};

export const haloOuterStyle = {
  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 12, 12, 17],
  circleColor: "transparent",
  circleStrokeWidth: 1,
  circleStrokeColor: "rgba(255, 255, 255, 0.7)",
};

export const hotspotCircleStyle = {
  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 7, 12, 10],
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
};

export const starLayerStyle = {
  textField: "★",
  textSize: ["interpolate", ["linear"], ["zoom"], 7, 12, 12, 16],
  textColor: ["case", ["all", [">=", ["get", "shade"], 3], ["<=", ["get", "shade"], 6]], "#666", "#eee"],
  textAllowOverlap: true,
  textIgnorePlacement: true,
  textAnchor: "center",
  textOffset: [0, -0.03],
};
