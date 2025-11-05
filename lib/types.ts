export type ApiPackResponse = {
  hotspots: {
    id: string;
    name: string;
    species: number;
    lat: number;
    lng: number;
    country?: string;
    state?: string;
    county?: string;
  }[];
};

export type ApiPack = {
  id: number;
  name: string;
  hotspots: number;
};

export type Pack = {
  id: number;
  name: string;
  hotspots: number;
  installed_at: string | null;
  lat?: number | null;
  lng?: number | null;
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
