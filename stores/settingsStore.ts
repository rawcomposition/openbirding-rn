import { DEFAULT_RADIUS_INDEX } from "@/lib/nearbySpecies";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LifeListEntry = {
  code: string;
  date: string;
  location: string;
  checklistId: string | null;
  isManual?: boolean;
};

export type DistanceUnits = "metric" | "imperial";

export type TargetsDisplayMode = "chart" | "percent";

export type SpeciesHotspotSort = "best" | "distance";

// Default distance units from the device's region. measurementSystem is "us" | "uk" | "metric" | null;
// both the US and UK use miles for road distances, everything else is metric.
function getDeviceDistanceUnits(): DistanceUnits {
  const system = getLocales()[0]?.measurementSystem;
  return system === "us" || system === "uk" ? "imperial" : "metric";
}

type SettingsState = {
  version: number;
  directionsProvider: string | null;
  lifelist: LifeListEntry[] | null;
  lifelistExclusions: string[] | null;
  lifelistPromptDismissed: boolean;
  disableSunTimes: boolean;
  showAllSpecies: boolean;
  targetMonths: number[];
  distanceUnits: DistanceUnits;
  nearbyDisplayMode: TargetsDisplayMode;
  hotspotDisplayMode: TargetsDisplayMode;
  nearbyRadiusIndex: number;
  speciesHotspotSort: SpeciesHotspotSort;
};

type SettingsActions = {
  setDirectionsProvider: (provider: string | null) => void;
  setLifelist: (lifelist: LifeListEntry[] | null) => void;
  setLifelistExclusions: (exclusions: string[] | null) => void;
  setLifelistPromptDismissed: (value: boolean) => void;
  setDisableSunTimes: (value: boolean) => void;
  setShowAllSpecies: (value: boolean) => void;
  setTargetMonths: (months: number[]) => void;
  setDistanceUnits: (units: DistanceUnits) => void;
  setNearbyDisplayMode: (mode: TargetsDisplayMode) => void;
  setHotspotDisplayMode: (mode: TargetsDisplayMode) => void;
  setNearbyRadiusIndex: (index: number) => void;
  setSpeciesHotspotSort: (sort: SpeciesHotspotSort) => void;
};

type SettingsStore = SettingsState & SettingsActions;

type Migration = {
  version: number;
  migrate: (state: SettingsState) => Promise<SettingsState>;
};

// Migrations must be safe to run on fresh installs (no-op if nothing to migrate)
const migrations: Migration[] = [
  {
    version: 1,
    migrate: async (state) => {
      // Migrate from legacy default_map_provider key
      const legacyProvider = await AsyncStorage.getItem("default_map_provider");
      if (legacyProvider) {
        await AsyncStorage.removeItem("default_map_provider");
        return { ...state, directionsProvider: legacyProvider };
      }
      return state;
    },
  },
  {
    version: 2,
    migrate: async (state) => {
      // Seed distanceUnits from the device region for users upgrading from a build that
      // predates the setting, and persist it so it no longer relies on the rehydrate-merge default.
      if (state.distanceUnits == null) {
        return { ...state, distanceUnits: getDeviceDistanceUnits() };
      }
      return state;
    },
  },
];

const LATEST_VERSION = migrations[migrations.length - 1]?.version ?? 0;

const runMigrations = async (state: SettingsState): Promise<SettingsState> => {
  let currentState = state;

  for (const migration of migrations) {
    if (migration.version > currentState.version) {
      currentState = await migration.migrate(currentState);
      currentState.version = migration.version;
    }
  }

  return currentState;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      version: 0,
      directionsProvider: null,
      lifelist: null,
      lifelistExclusions: null,
      lifelistPromptDismissed: false,
      disableSunTimes: false,
      showAllSpecies: false,
      targetMonths: [],
      // Seeded from the device region; persisted values from earlier installs fall back to this default
      // via the shallow rehydrate merge, so existing users also pick up their locale's units.
      distanceUnits: getDeviceDistanceUnits(),
      // Bar charts by default for Nearby Species, progress bars for hotspot targets.
      nearbyDisplayMode: "chart",
      hotspotDisplayMode: "percent",
      nearbyRadiusIndex: DEFAULT_RADIUS_INDEX,
      speciesHotspotSort: "best",
      setDirectionsProvider: (provider) => set({ directionsProvider: provider || null }),
      setLifelist: (lifelist) => set({ lifelist }),
      setLifelistExclusions: (exclusions) => set({ lifelistExclusions: exclusions }),
      setLifelistPromptDismissed: (value) => set({ lifelistPromptDismissed: value }),
      setDisableSunTimes: (value) => set({ disableSunTimes: value }),
      setShowAllSpecies: (value) => set({ showAllSpecies: value }),
      setTargetMonths: (months) => set({ targetMonths: months }),
      setDistanceUnits: (units) => set({ distanceUnits: units }),
      setNearbyDisplayMode: (mode) => set({ nearbyDisplayMode: mode }),
      setHotspotDisplayMode: (mode) => set({ hotspotDisplayMode: mode }),
      setNearbyRadiusIndex: (index) => set({ nearbyRadiusIndex: index }),
      setSpeciesHotspotSort: (sort) => set({ speciesHotspotSort: sort }),
    }),
    {
      name: "settings",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => async (state, error) => {
        if (error || !state) return;

        if (state.version < LATEST_VERSION) {
          const migratedState = await runMigrations(state);
          useSettingsStore.setState(migratedState);
          console.log(`Settings migrated from v${state.version} to v${migratedState.version}`);
        }
      },
    }
  )
);
