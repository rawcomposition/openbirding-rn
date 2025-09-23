import { create } from "zustand";

type MapLayerType = "default" | "satellite";

type MapStore = {
  currentLayer: MapLayerType;
  setCurrentLayer: (layer: MapLayerType) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  currentLayer: "default",
  setCurrentLayer: (layer) => set({ currentLayer: layer }),
}));
