import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SavedLocation = {
  center: [number, number];
  zoom: number;
};

type UseSavedLocationReturn = {
  isLoadingLocation: boolean;
  savedLocation: SavedLocation | null;
  hadSavedLocationOnInit: boolean;
  updateLocation: (center: [number, number], zoom: number) => Promise<void>;
  clearLocation: () => Promise<void>;
};

const LOCATION_STORAGE_KEY = "user_last_location";

export function useSavedLocation(): UseSavedLocationReturn {
  const [hadSavedLocationOnInit, setHadSavedLocationOnInit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);

  const loadSavedLocation = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const location = JSON.parse(stored) as SavedLocation;
        setSavedLocation(location);
        setHadSavedLocationOnInit(true);
      }
    } catch (error) {
      console.log("Error loading saved location:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLocation = useCallback(async (center: [number, number], zoom: number) => {
    try {
      const location: SavedLocation = { center, zoom };
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
      setSavedLocation(location);
    } catch (error) {
      console.log("Error saving location:", error);
    }
  }, []);

  const clearLocation = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
      setSavedLocation(null);
    } catch (error) {
      console.log("Error clearing location:", error);
    }
  }, []);

  useEffect(() => {
    loadSavedLocation();
  }, [loadSavedLocation]);

  const isInvalidLocation = savedLocation?.center && (savedLocation.center[0] === 0 || savedLocation.center[1] === 0);

  return {
    isLoadingLocation: isLoading,
    savedLocation: isInvalidLocation ? null : savedLocation,
    hadSavedLocationOnInit,
    updateLocation,
    clearLocation,
  };
}
