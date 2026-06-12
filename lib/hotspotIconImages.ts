import { getMarkerColorIndex } from "./utils";

// Saved-hotspot marker PNGs keyed by species-color index. These are the circle
// markers (colored disc + star) used on the map; the hotspot list reuses them
// so a saved row's icon matches its map marker.
const savedHotspotImages: Record<number, any> = {
  0: require("@/assets/markers/saved-hotspot-0.png"),
  1: require("@/assets/markers/saved-hotspot-1.png"),
  2: require("@/assets/markers/saved-hotspot-2.png"),
  3: require("@/assets/markers/saved-hotspot-3.png"),
  4: require("@/assets/markers/saved-hotspot-4.png"),
  5: require("@/assets/markers/saved-hotspot-5.png"),
  6: require("@/assets/markers/saved-hotspot-6.png"),
  7: require("@/assets/markers/saved-hotspot-7.png"),
  8: require("@/assets/markers/saved-hotspot-8.png"),
  9: require("@/assets/markers/saved-hotspot-9.png"),
};

export function getSavedHotspotIconImage(species: number): any {
  const index = getMarkerColorIndex(species || 0);
  return savedHotspotImages[index] ?? savedHotspotImages[0];
}
