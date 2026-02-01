import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SettingsState = {
  version: number;
  directionsProvider: string | null;
};

type SettingsActions = {
  setDirectionsProvider: (provider: string | null) => void;
};

type SettingsStore = SettingsState & SettingsActions;

type Migration = {
  version: number;
  migrate: (state: SettingsState) => Promise<SettingsState>;
};

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
  const startVersion = state.version || 0;

  for (const migration of migrations) {
    if (migration.version > startVersion) {
      currentState = await migration.migrate(currentState);
      currentState.version = migration.version;
    }
  }

  return currentState;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      version: LATEST_VERSION,
      directionsProvider: null,
      setDirectionsProvider: (provider) => set({ directionsProvider: provider || null }),
    }),
    {
      name: "settings",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => async (state, error) => {
        if (error || !state) return;

        const currentVersion = state.version || 0;
        if (currentVersion < LATEST_VERSION) {
          const migratedState = await runMigrations({
            version: currentVersion,
            directionsProvider: state.directionsProvider,
          });
          useSettingsStore.setState(migratedState);
          console.log("Migrated settings to version", LATEST_VERSION);
        }
      },
    }
  )
);
