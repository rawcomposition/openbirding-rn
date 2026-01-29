import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FiltersState = {
  showSavedOnly: boolean;
  // Future filters can be added here (e.g., minSpeciesCount, maxDistance)
};

type FiltersActions = {
  setShowSavedOnly: (value: boolean) => void;
  resetFilters: () => void;
};

export const useFiltersStore = create<FiltersState & FiltersActions>()(
  persist(
    (set) => ({
      showSavedOnly: false,
      setShowSavedOnly: (value) => set({ showSavedOnly: value }),
      resetFilters: () => set({ showSavedOnly: false }),
    }),
    {
      name: "filters-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
