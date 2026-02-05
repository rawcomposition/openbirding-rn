import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Platform } from "react-native";
import { hotspotColor } from "./constants";
import { MapFeature } from "./types";

dayjs.extend(customParseFormat);

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

export { hotspotColor };

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
  // Check if bbox crosses the date line (west > east)
  const crossesDateLine = bbox.west > bbox.east;
  const width = crossesDateLine ? 180 - bbox.west + (bbox.east + 180) : bbox.east - bbox.west;
  const height = bbox.north - bbox.south;
  const span = Math.max(width, height);

  // Big bbox → smaller padding, small bbox → bigger padding
  let paddingPct = 0.1; // default 10%
  if (span < 1) paddingPct = 0.4; // zoomed in: 40%
  else if (span < 5) paddingPct = 0.25;
  else if (span < 20) paddingPct = 0.15;

  const dx = width * paddingPct;
  const dy = height * paddingPct;

  let west = bbox.west - dx;
  let east = bbox.east + dx;

  // Wrap around the date line if needed
  if (west < -180) west += 360;
  if (east > 180) east -= 360;

  return {
    west,
    south: bbox.south - dy,
    east,
    north: bbox.north + dy,
  };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  let dLngDeg = lon2 - lon1;
  if (dLngDeg > 180) dLngDeg -= 360;
  if (dLngDeg < -180) dLngDeg += 360;
  const dLon = toRad(dLngDeg);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getBoundingBoxFromLocation(lat: number, lng: number, radiusKm: number): Bbox {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  let east = lng + lngDelta;
  let west = lng - lngDelta;

  // Wrap around the date line instead of clamping
  // When west > east, it indicates the bbox crosses the date line
  if (east > 180) east -= 360;
  if (west < -180) west += 360;

  return {
    north: Math.min(90, lat + latDelta),
    south: Math.max(-90, lat - latDelta),
    east,
    west,
  };
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
  const isIOS = Platform.OS === "ios";

  switch (provider) {
    case "google":
      return isIOS
        ? `comgooglemaps://?q=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    case "apple":
      if (!isIOS) {
        throw new Error("Apple Maps is not available on Android");
      }
      return `maps://?q=${lat},${lng}`;
    case "waze":
      return `waze://?ll=${lat},${lng}&navigate=yes`;
    case "organic":
      return `om://map?ll=${lat},${lng}`;
    default:
      throw new Error(`Unsupported map provider: ${provider}`);
  }
};

export function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) {
    const mb = bytes / 1_000_000;
    return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
  }
  const kb = bytes / 1000;
  return kb < 10 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
}

export const generateId = (length: number): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

type LifeListEntry = {
  code: string;
  date: string;
  location: string;
  checklistId: string;
};

type TaxonomyEntry = {
  sciName: string;
  code: string;
};

function parseEbirdDate(dateStr: string): string {
  if (!dateStr) return "";
  const parsed = dayjs(dateStr, "DD MMM YYYY");
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : dateStr;
}

export type ProcessLifeListResult =
  | { success: true; entries: LifeListEntry[]; unmatchedCount: number }
  | { success: false; error: string };

export async function processLifeListCSV(csvText: string): Promise<ProcessLifeListResult> {
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    return { success: false, error: "No data found in the CSV file" };
  }

  const countableRows = rows.filter((row) => row["Countable"] === "1");

  if (countableRows.length === 0) {
    return { success: false, error: "No countable species found in the life list" };
  }

  const taxonomyResponse = (await get("/taxonomy")) as unknown as TaxonomyEntry[];

  if (!Array.isArray(taxonomyResponse)) {
    return { success: false, error: "Failed to fetch taxonomy data" };
  }

  const sciNameToCode = new Map<string, string>();
  taxonomyResponse.forEach((entry) => {
    sciNameToCode.set(entry.sciName, entry.code);
  });

  const entries: LifeListEntry[] = [];
  let unmatchedCount = 0;

  countableRows.forEach((row) => {
    const sciName = row["Scientific Name"];
    const code = sciNameToCode.get(sciName);

    if (code) {
      entries.push({
        code,
        date: parseEbirdDate(row["Date"]),
        location: row["Location"] || "",
        checklistId: row["SubID"] || "",
      });
    } else {
      unmatchedCount++;
    }
  });

  if (entries.length === 0) {
    return { success: false, error: "Could not match any species to the taxonomy" };
  }

  return { success: true, entries, unmatchedCount };
}
