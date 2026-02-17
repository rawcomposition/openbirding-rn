export type StaticPack = {
  v: string;
  id: number;
  region: string;
  name: string;
  hotspots: number;
  clusters: number[][];
  size: number;
  updatedAt: string;
  url: string;
};

export type StaticPacksIndex = {
  packs: StaticPack[];
};

export type StaticPackHotspot = {
  id: string;
  name: string;
  species: number;
  lat: number;
  lng: number;
  country: string;
  state: string | null;
  county: string | null;
  countryName: string;
  stateName: string | null;
  countyName: string | null;
};

export type StaticPackTarget = {
  id: string;
  samples: (number | null)[];
  species: (string | number)[][];
};

export type StaticPackResponse = {
  v: string;
  updatedAt: string;
  hotspots: StaticPackHotspot[];
  targets: StaticPackTarget[];
};

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type MapFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    id: string;
    shade?: number;
  };
};

export type OnPressEvent = {
  features: Array<GeoJSON.Feature>;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  point: {
    x: number;
    y: number;
  };
};

export type SavedPlace = {
  id: string;
  name: string;
  notes: string;
  icon: string;
  lat: number;
  lng: number;
  saved_at: string;
};

export type Hotspot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  species: number;
  country: string | null;
};
