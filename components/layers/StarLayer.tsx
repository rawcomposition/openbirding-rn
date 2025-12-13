import Mapbox from "@rnmapbox/maps";

type Props = {
  id: string;
  filter?: any;
};

export default function StarLayer({ id, filter }: Props) {
  return (
    <Mapbox.SymbolLayer
      id={id}
      filter={filter}
      style={{
        textField: "★",
        textSize: ["interpolate", ["linear"], ["zoom"], 7, 12, 12, 16],
        textColor: ["case", ["all", [">=", ["get", "shade"], 3], ["<=", ["get", "shade"], 6]], "#666", "#eee"],
        textAllowOverlap: true,
        textIgnorePlacement: true,
        textAnchor: "center",
        textOffset: [0, -0.03],
      }}
    />
  );
}
