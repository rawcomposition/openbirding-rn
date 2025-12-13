import Mapbox from "@rnmapbox/maps";
import { markerColors } from "@/lib/utils";

type Props = {
  id: string;
  filter?: any;
  shaded: boolean;
};

export default function CircleLayer({ id, filter, shaded }: Props) {
  return (
    <Mapbox.CircleLayer
      id={id}
      filter={filter}
      style={{
        circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 7, 12, 10],
        ...(shaded
          ? {
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
            }
          : {}),
        circleStrokeWidth: 0.5,
        circleStrokeColor: "#555",
      }}
    />
  );
}
