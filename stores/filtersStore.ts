import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  normalizeMinTargets,
  normalizeMinTargetFrequency,
} from "@/lib/targetRichHotspots";

type FiltersState = {
  showSavedOnly: boolean;
  targetRichEnabled: boolean;
  minTargets: number;
  minTargetFrequency: number;
};

type FiltersActions = {
  setShowSavedOnly: (value: boolean) => void;
  setTargetRichEnabled: (value: boolean) => void;
  setMinTargets: (value: number) => void;
  setMinTargetFrequency: (value: number) => void;
  resetFilters: () => void;
};

export const useFiltersStore = create<FiltersState & FiltersActions>()(
  persist(
    (set) => ({
      showSavedOnly: false,
      targetRichEnabled: false,
      minTargets: 5,
      minTargetFrequency: 50,
      setShowSavedOnly: (value) => set({ showSavedOnly: value }),
      setTargetRichEnabled: (value) => set({ targetRichEnabled: value }),
      setMinTargets: (value) => set({ minTargets: normalizeMinTargets(value) }),
      setMinTargetFrequency: (value) =>
        set({ minTargetFrequency: normalizeMinTargetFrequency(value) }),
      resetFilters: () =>
        set({
          showSavedOnly: false,
          targetRichEnabled: false,
          minTargets: 5,
          minTargetFrequency: 50,
        }),
    }),
    {
      name: "filters-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
