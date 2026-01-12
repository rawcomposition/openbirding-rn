import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const DEFAULT_MAP_PROVIDER_KEY = "default_map_provider";

type DefaultMapProviderStore = {
  defaultProvider: string | null;
  isLoading: boolean;
  setDefaultProvider: (provider: string) => Promise<void>;
  clearDefaultProvider: () => Promise<void>;
  loadDefaultProvider: () => Promise<void>;
};

export const useDefaultMapProviderStore = create<DefaultMapProviderStore>((set, get) => ({
  defaultProvider: null,
  isLoading: true,
  loadDefaultProvider: async () => {
    try {
      const stored = await AsyncStorage.getItem(DEFAULT_MAP_PROVIDER_KEY);
      if (stored) {
        set({ defaultProvider: stored });
      }
    } catch (error) {
      console.log("Error loading default map provider:", error);
    } finally {
      set({ isLoading: false });
    }
  },
  setDefaultProvider: async (provider: string) => {
    try {
      await AsyncStorage.setItem(DEFAULT_MAP_PROVIDER_KEY, provider);
      set({ defaultProvider: provider });
    } catch (error) {
      console.log("Error saving default map provider:", error);
    }
  },
  clearDefaultProvider: async () => {
    try {
      await AsyncStorage.removeItem(DEFAULT_MAP_PROVIDER_KEY);
      set({ defaultProvider: null });
    } catch (error) {
      console.log("Error clearing default map provider:", error);
    }
  },
}));
