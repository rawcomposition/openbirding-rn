import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  normalizeNeededSpeciesMinCount,
  normalizeNeededSpeciesMinPercent,
} from "@/lib/personalizedHotspotFilter";

type FiltersState = {
  showSavedOnly: boolean;
  personalizedFilterEnabled: boolean;
  neededSpeciesMinCount: number;
  neededSpeciesMinPercent: number;
};

type FiltersActions = {
  setShowSavedOnly: (value: boolean) => void;
  setPersonalizedFilterEnabled: (value: boolean) => void;
  setNeededSpeciesMinCount: (value: number) => void;
  setNeededSpeciesMinPercent: (value: number) => void;
  resetFilters: () => void;
};

export const useFiltersStore = create<FiltersState & FiltersActions>()(
  persist(
    (set) => ({
      showSavedOnly: false,
      personalizedFilterEnabled: false,
      neededSpeciesMinCount: 1,
      neededSpeciesMinPercent: 1,
      setShowSavedOnly: (value) => set({ showSavedOnly: value }),
      setPersonalizedFilterEnabled: (value) => set({ personalizedFilterEnabled: value }),
      setNeededSpeciesMinCount: (value) => set({ neededSpeciesMinCount: normalizeNeededSpeciesMinCount(value) }),
      setNeededSpeciesMinPercent: (value) =>
        set({ neededSpeciesMinPercent: normalizeNeededSpeciesMinPercent(value) }),
      resetFilters: () =>
        set({
          showSavedOnly: false,
          personalizedFilterEnabled: false,
          neededSpeciesMinCount: 1,
          neededSpeciesMinPercent: 1,
        }),
    }),
    {
      name: "filters-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
