import { PlaceIconT } from "./placeIcons";

// Marker PNGs keyed by saved-place icon. Shared by the map markers, the place
// edit sheet, and the hotspot list's place rows.
export const placeIconImages: Record<PlaceIconT, any> = {
  hike: require("@/assets/markers/place-hike.png"),
  mountain: require("@/assets/markers/place-mountain.png"),
  tent: require("@/assets/markers/place-tent.png"),
  house: require("@/assets/markers/place-house.png"),
  airbnb: require("@/assets/markers/place-airbnb.png"),
  bed: require("@/assets/markers/place-bed.png"),
  bins: require("@/assets/markers/place-bins.png"),
  camera: require("@/assets/markers/place-camera.png"),
  airport: require("@/assets/markers/place-airport.png"),
  boat: require("@/assets/markers/place-boat.png"),
  car: require("@/assets/markers/place-car.png"),
  bus: require("@/assets/markers/place-bus.png"),
  utensils: require("@/assets/markers/place-utensils.png"),
  mug: require("@/assets/markers/place-mug.png"),
  trolley: require("@/assets/markers/place-trolley.png"),
  bike: require("@/assets/markers/place-bike.png"),
  dog: require("@/assets/markers/place-dog.png"),
  fuel: require("@/assets/markers/place-fuel.png"),
  parking: require("@/assets/markers/place-parking.png"),
  building: require("@/assets/markers/place-building.png"),
  hotspot: require("@/assets/markers/place-hotspot.png"),
};

// Resolve a (possibly legacy) saved-place icon value to an image, defaulting to
// the generic hotspot pin for unknown icons (e.g. the old "star" value).
export function getPlaceIconImage(icon: string): any {
  return placeIconImages[icon as PlaceIconT] ?? placeIconImages.hotspot;
}
