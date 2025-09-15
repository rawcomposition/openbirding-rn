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

export type Pack = {
  id: number;
  name: string;
  hotspots: number;
  last_synced: string | null;
};

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};
