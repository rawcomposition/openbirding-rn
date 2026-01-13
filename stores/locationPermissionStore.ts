import * as Location from "expo-location";
import { create } from "zustand";

type PermissionStatus = "undetermined" | "granted" | "denied";

type LocationPermissionStore = {
  status: PermissionStatus;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  checkPermission: () => Promise<void>;
};

export const useLocationPermissionStore = create<LocationPermissionStore>((set) => ({
  status: "undetermined",
  isLoading: false,
  checkPermission: async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      set({
        status: status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined",
      });
    } catch (error) {
      console.log("Error checking location permission:", error);
    }
  },
  requestPermission: async () => {
    const currentStatus = await Location.getForegroundPermissionsAsync();
    if (currentStatus.status === "granted") {
      set({ status: "granted", isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      set({
        status: status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined",
        isLoading: false,
      });
    } catch (error) {
      console.log("Error requesting location permission:", error);
      set({ isLoading: false });
    }
  },
}));
