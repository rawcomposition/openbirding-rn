type PlaceEditCallback = (title: string, notes: string) => void;

let placeEditCallback: PlaceEditCallback | null = null;

export function setPlaceEditCallback(callback: PlaceEditCallback | null) {
  placeEditCallback = callback;
}

export function getPlaceEditCallback(): PlaceEditCallback | null {
  return placeEditCallback;
}

export function clearPlaceEditCallback() {
  placeEditCallback = null;
}

