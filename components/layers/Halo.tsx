import Mapbox from "@rnmapbox/maps";

export default function Halo() {
  return (
    <>
      <Mapbox.CircleLayer
        id="hotspot-halo"
        filter={["==", ["get", "isSelected"], true]}
        style={{
          circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 8.5, 12, 10],
          circleColor: "transparent",
          circleStrokeWidth: 7,
          circleStrokeColor: "rgba(255, 255, 255, 0.5)",
        }}
      />
      <Mapbox.CircleLayer
        id="hotspot-halo-outer"
        filter={["==", ["get", "isSelected"], true]}
        style={{
          circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 12, 12, 17],
          circleColor: "transparent",
          circleStrokeWidth: 1,
          circleStrokeColor: "rgba(255, 255, 255, 0.7)",
        }}
      />
    </>
  );
}
