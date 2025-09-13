export type Hotspot = {
  id: string;
  name: string;
  region: string;
  species: number;
  lat: number;
  lng: number;
  open: number | null;
  notes: string | null;
  last_updated_by: string | null;
  pack_id: number | null;
};

export type Pack = {
  id: number;
  region: string;
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
