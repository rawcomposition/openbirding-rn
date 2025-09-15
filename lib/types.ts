export type ApiHotspot = {
  id: string;
  name: string;
  region: string;
  species: number;
  lat: number;
  lng: number;
  open: number | null;
  notes: string | null;
  lastUpdatedBy: string | null;
  updatedAt: string | null;
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
