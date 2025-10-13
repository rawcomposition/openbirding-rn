import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_MAP_PROVIDER_KEY = "default_map_provider";

type UseDefaultMapProviderReturn = {
  defaultProvider: string | null;
  setDefaultProvider: (provider: string) => Promise<void>;
  clearDefaultProvider: () => Promise<void>;
  isLoading: boolean;
};

export function useDefaultMapProvider(): UseDefaultMapProviderReturn {
  const [defaultProvider, setDefaultProviderState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDefaultProvider = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(DEFAULT_MAP_PROVIDER_KEY);
      if (stored) {
        setDefaultProviderState(stored);
      }
    } catch (error) {
      console.log("Error loading default map provider:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setDefaultProvider = useCallback(async (provider: string) => {
    try {
      await AsyncStorage.setItem(DEFAULT_MAP_PROVIDER_KEY, provider);
      setDefaultProviderState(provider);
    } catch (error) {
      console.log("Error saving default map provider:", error);
    }
  }, []);

  const clearDefaultProvider = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DEFAULT_MAP_PROVIDER_KEY);
      setDefaultProviderState(null);
    } catch (error) {
      console.log("Error clearing default map provider:", error);
    }
  }, []);

  useEffect(() => {
    loadDefaultProvider();
  }, [loadDefaultProvider]);

  return {
    defaultProvider,
    setDefaultProvider,
    clearDefaultProvider,
    isLoading,
  };
}
