import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LifeListEntry = {
  code: string;
  date: string;
  location: string;
  checklistId: string | null;
};

type SettingsState = {
  version: number;
  directionsProvider: string | null;
  lifelist: LifeListEntry[] | null;
  lifelistExclusions: string[] | null;
};

type SettingsActions = {
  setDirectionsProvider: (provider: string | null) => void;
  setLifelist: (lifelist: LifeListEntry[] | null) => void;
  setLifelistExclusions: (exclusions: string[] | null) => void;
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
      setDirectionsProvider: (provider) => set({ directionsProvider: provider || null }),
      setLifelist: (lifelist) => set({ lifelist }),
      setLifelistExclusions: (exclusions) => set({ lifelistExclusions: exclusions }),
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
