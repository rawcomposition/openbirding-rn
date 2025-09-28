export type ApiPackResponse = {
  hotspots: {
    id: string;
    name: string;
    species: number;
    lat: number;
    lng: number;
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
