import { Platform } from "react-native";
import { MapFeature } from "./types";

type Params = {
  [key: string]: string | number | boolean;
};

export const API_URL = "https://api.openbirding.org/api/v1";

export const get = async (url: string, params: Params = {}) => {
  const cleanParams = Object.keys(params).reduce((accumulator: Record<string, string>, key) => {
    if (params[key]) accumulator[key] = String(params[key]);
    return accumulator;
  }, {});

  const queryParams = new URLSearchParams(cleanParams).toString();

  let urlWithParams = url;
  if (queryParams) {
    urlWithParams += url.includes("?") ? `&${queryParams}` : `?${queryParams}`;
  }

  const fullUrl = `${API_URL}${urlWithParams}`;

  const res = await fetch(fullUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  let json: Record<string, unknown> = {};

  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid JSON response");
  }

  if (!res.ok) {
    const errorMessage = (json.error || json.message || "") as string;
    if (res.status === 401) throw new Error(errorMessage || "Unauthorized");
    if (res.status === 403) throw new Error(errorMessage || "Forbidden");
    if (res.status === 404) throw new Error(errorMessage || "Route not found");
    if (res.status === 405) throw new Error(errorMessage || "Method not allowed");
    if (res.status === 504) throw new Error(errorMessage || "Operation timed out. Please try again.");
    throw new Error(errorMessage || "An error occurred");
  }
  return json;
};

export const mutate = async (method: "POST" | "PUT" | "DELETE" | "PATCH", url: string, data?: unknown) => {
  const fullUrl = `${API_URL}${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  let json: Record<string, unknown> = {};

  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid JSON response");
  }

  if (!res.ok) {
    const errorMessage = (json.error || json.message || "") as string;
    if (res.status === 401) throw new Error(errorMessage || "Unauthorized");
    if (res.status === 403) throw new Error(errorMessage || "Forbidden");
    if (res.status === 404) throw new Error(errorMessage || "Route not found");
    if (res.status === 405) throw new Error(errorMessage || "Method not allowed");
    if (res.status === 504) throw new Error(errorMessage || "Operation timed out. Please try again.");
    throw new Error(errorMessage || "An error occurred");
  }

  return json;
};

export const hotspotColor = [
  "#bcbcbc",
  "#8f9ca0",
  "#9bc4cf",
  "#aaddeb",
  "#c7e466",
  "#eaeb1f",
  "#fac500",
  "#e57701",
  "#ce0d02",
  "#ad0002",
];

export const placeColor: Record<string, string> = {
  blue: "#0284c7",
};

export const getMarkerColor = (count: number) => {
  if (count === 0) return hotspotColor[0];
  if (count <= 15) return hotspotColor[1];
  if (count <= 50) return hotspotColor[2];
  if (count <= 100) return hotspotColor[3];
  if (count <= 150) return hotspotColor[4];
  if (count <= 200) return hotspotColor[5];
  if (count <= 250) return hotspotColor[6];
  if (count <= 300) return hotspotColor[7];
  if (count <= 400) return hotspotColor[8];
  if (count <= 1000) return hotspotColor[9];
  return hotspotColor[0];
};

export const getMarkerColorIndex = (count: number) => {
  const color = getMarkerColor(count);
  return hotspotColor.indexOf(color);
};

type Bbox = { west: number; south: number; east: number; north: number };

export function padBoundsBySize(bbox: Bbox): Bbox {
  const width = bbox.east - bbox.west;
  const height = bbox.north - bbox.south;
  const span = Math.max(width, height);

  // Big bbox → smaller padding, small bbox → bigger padding
  let paddingPct = 0.1; // default 10%
  if (span < 1) paddingPct = 0.4; // zoomed in: 40%
  else if (span < 5) paddingPct = 0.25;
  else if (span < 20) paddingPct = 0.15;

  const dx = width * paddingPct;
  const dy = height * paddingPct;

  return {
    west: bbox.west - dx,
    south: bbox.south - dy,
    east: bbox.east + dx,
    north: bbox.north + dy,
  };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findClosestFeature(features: GeoJSON.Feature[], tapLocation: [number, number]) {
  if (!features || features.length === 0 || !tapLocation) return null;

  return features.reduce((closest: { feature: MapFeature; distance: number } | null, current: GeoJSON.Feature) => {
    if (!current?.geometry || current.geometry.type !== "Point" || !current.geometry.coordinates) return closest;

    const pointGeometry = current.geometry as GeoJSON.Point;
    const coordinates = pointGeometry.coordinates as [number, number];
    const [lng, lat] = coordinates;
    const currentDistance = calculateDistance(tapLocation[1], tapLocation[0], lat, lng);

    if (!closest) {
      const mapFeature: MapFeature = {
        geometry: { coordinates },
        properties: {
          id: (current.properties?.id as string) || "",
          shade: current.properties?.shade as number,
        },
      };
      return { feature: mapFeature, distance: currentDistance };
    }

    const closestCoordinates = closest.feature.geometry.coordinates;
    const closestDistance = calculateDistance(
      tapLocation[1],
      tapLocation[0],
      closestCoordinates[1],
      closestCoordinates[0]
    );

    if (currentDistance < closestDistance) {
      const mapFeature: MapFeature = {
        geometry: { coordinates },
        properties: {
          id: (current.properties?.id as string) || "",
          shade: current.properties?.shade as number,
        },
      };
      return { feature: mapFeature, distance: currentDistance };
    }

    return closest;
  }, null);
}

type MapProvider = {
  id: string;
  name: string;
};

export const getExternalMapProviders = (): MapProvider[] => {
  const providers: MapProvider[] = [{ id: "google", name: "Google Maps" }];

  if (Platform.OS === "ios") {
    providers.push({ id: "apple", name: "Apple Maps" });
  }

  providers.push({ id: "organic", name: "Organic Maps" });
  providers.push({ id: "waze", name: "Waze" });

  return providers;
};

export const getDirections = (provider: string, lat: number, lng: number): string => {
  switch (provider) {
    case "google":
      return `comgooglemaps://?q=${lat},${lng}`;
    case "apple":
      return `maps://?q=${lat},${lng}`;
    case "waze":
      return `waze://?ll=${lat},${lng}&navigate=yes`;
    case "organic":
      return `om://map?ll=${lat},${lng}`;
    default:
      throw new Error(`Unsupported map provider: ${provider}`);
  }
};

export const generateId = (length: number): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
