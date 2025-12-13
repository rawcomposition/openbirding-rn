import { create } from "zustand";

type MapLayerType = "default" | "satellite";

type MapStore = {
  currentLayer: MapLayerType;
  setCurrentLayer: (layer: MapLayerType) => void;
  hotspotId: string | null;
  setHotspotId: (id: string | null) => void;
  placeId: string | null;
  setPlaceId: (id: string | null) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  currentLayer: "default",
  setCurrentLayer: (layer) => set({ currentLayer: layer }),
  hotspotId: null,
  setHotspotId: (id) => set({ hotspotId: id }),
  placeId: null,
  setPlaceId: (id) => set({ placeId: id }),
}));
