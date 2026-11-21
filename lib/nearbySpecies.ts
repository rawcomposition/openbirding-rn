import {
  getGridCellsWithinBounds,
  getNearbyHotspots,
  getTargetDataForHotspots,
  hasPacksBelowFormat,
  HotspotTargetsResult,
} from "./database";
import {
  aggregateHotspotTargets,
  getMonthIndices,
  getTotalSamplesForMonths,
  mergeRawTargetData,
  parseHotspotTargetData,
  RawHotspotTargetData,
  wilsonScore,
} from "./hotspotTargets";
import type { DistanceUnits } from "@/stores/settingsStore";
import { NEARBY_SPECIES_MIN_PACK_FORMAT } from "./config";
import { calculateDistance, getBoundingBoxFromLocation } from "./utils";

const KM_PER_MILE = 1.609344;

const MIN_OBSERVATIONS = 2;

export type RadiusOption = { km: number; label: string };

// Radius choices per unit system, index-aligned so a stored selection maps to a
// comparable size if the user switches units. Labels are clean round numbers, so
// the actual search radius differs slightly between systems.
export const RADIUS_OPTIONS: Record<DistanceUnits, RadiusOption[]> = {
  imperial: [
    { km: 5 * KM_PER_MILE, label: "5 mi" },
    { km: 10 * KM_PER_MILE, label: "10 mi" },
    { km: 15 * KM_PER_MILE, label: "15 mi" },
    { km: 25 * KM_PER_MILE, label: "25 mi" },
    { km: 50 * KM_PER_MILE, label: "50 mi" },
    { km: 100 * KM_PER_MILE, label: "100 mi" },
    { km: 200 * KM_PER_MILE, label: "200 mi" },
  ],
  metric: [
    { km: 8, label: "8 km" },
    { km: 16, label: "16 km" },
    { km: 25, label: "25 km" },
    { km: 40, label: "40 km" },
    { km: 80, label: "80 km" },
    { km: 160, label: "160 km" },
    { km: 320, label: "320 km" },
  ],
};

export const DEFAULT_RADIUS_INDEX = 1;

export function getRadiusOption(units: DistanceUnits, index: number): RadiusOption {
  const options = RADIUS_OPTIONS[units];
  return options[Math.min(Math.max(index, 0), options.length - 1)];
}

function range(from: number, to: number, step: number): number[] {
  return Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
}

// When the radius follows the map view it snaps to this ladder, whose step size grows with
// the distance so the label stays within ~10% of the view. Snapping keeps the label a clean
// round number and stops small zoom changes from invalidating the cached query.
const AUTO_RADIUS_STEPS: Record<DistanceUnits, RadiusOption[]> = {
  imperial: [...range(1, 10, 1), ...range(15, 50, 5), ...range(60, 100, 10), ...range(125, 200, 25)].map((mi) => ({
    km: mi * KM_PER_MILE,
    label: `${mi} mi`,
  })),
  metric: [...range(2, 10, 1), ...range(15, 50, 5), ...range(60, 100, 10), ...range(125, 200, 25), 250, 320].map(
    (km) => ({ km, label: `${km} km` })
  ),
};

export function getAutoRadiusOption(units: DistanceUnits, viewRadiusKm: number | null): RadiusOption {
  if (viewRadiusKm == null || !(viewRadiusKm > 0)) return getRadiusOption(units, DEFAULT_RADIUS_INDEX);
  return AUTO_RADIUS_STEPS[units].reduce((best, step) =>
    Math.abs(Math.log(step.km / viewRadiusKm)) < Math.abs(Math.log(best.km / viewRadiusKm)) ? step : best
  );
}

export const NEARBY_MIN_PERCENTAGE = 0.1;

export type NearbySpeciesCount = {
  count: number;
  total: number;
  isTargetsOnly: boolean;
};

export function countNearbySpecies(result: HotspotTargetsResult, seenCodes: Set<string> | null): NearbySpeciesCount {
  let count = 0;
  let total = 0;
  for (const target of result.targets) {
    if (target.percentage < NEARBY_MIN_PERCENTAGE) continue;
    total++;
    if (!seenCodes?.has(target.speciesCode)) count++;
  }
  return { count, total, isTargetsOnly: !!seenCodes };
}

export function formatNearbySpeciesCount({ count, isTargetsOnly }: NearbySpeciesCount): string {
  const noun = isTargetsOnly ? (count === 1 ? "target" : "targets") : "species";
  return `${count.toLocaleString()} ${noun}`;
}

type LatLng = { lat: number; lng: number };

const AUTO_SNAP_KM = 1;

export function isMapCenteredOnUser(mapCenter: LatLng | null, userLocation: LatLng | null): boolean {
  return (
    !!userLocation &&
    !!mapCenter &&
    calculateDistance(mapCenter.lat, mapCenter.lng, userLocation.lat, userLocation.lng) <= AUTO_SNAP_KM
  );
}

export type NearbySpeciesRaw = {
  data: RawHotspotTargetData | null;
  version: string | null;
};

// Fetching and JSON-parsing hundreds of grid cells is the expensive part, so it runs once
// per (center, radius) and is cached; month filtering happens in aggregateNearbySpecies so
// toggling months never re-parses.
export async function getNearbySpeciesRaw(
  lat: number,
  lng: number,
  radiusKm: number,
  signal?: AbortSignal
): Promise<NearbySpeciesRaw> {
  const bounds = getBoundingBoxFromLocation(lat, lng, radiusKm);
  const rows = await getGridCellsWithinBounds(bounds);

  const withinRadius = rows.filter((row) => calculateDistance(lat, lng, row.lat, row.lng) <= radiusKm);

  console.log(`[nearbySpecies] ${withinRadius.length} grid cells within ${radiusKm.toFixed(2)} km (${rows.length} in bbox)`);

  if (withinRadius.length === 0) {
    return { data: null, version: null };
  }

  const version = withinRadius.find((row) => row.version)?.version ?? null;

  // Yield to the event loop periodically so large radii don't freeze the UI mid-parse.
  const parsed: RawHotspotTargetData[] = [];
  for (let i = 0; i < withinRadius.length; i++) {
    parsed.push(parseHotspotTargetData(withinRadius[i].data));
    if (i % 100 === 99) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (signal?.aborted) throw new Error("Nearby species query cancelled");
    }
  }

  return { data: mergeRawTargetData(parsed), version };
}

export function aggregateNearbySpecies(raw: NearbySpeciesRaw, months?: number[]): HotspotTargetsResult {
  if (!raw.data) {
    return { samples: 0, targets: [], version: raw.version };
  }

  const monthIndices = getMonthIndices(raw.data, months);
  const totalSamples = getTotalSamplesForMonths(raw.data, monthIndices);

  if (totalSamples === 0) {
    return { samples: 0, targets: [], version: raw.version };
  }

  const targets = aggregateHotspotTargets(raw.data, monthIndices, totalSamples);
  return { samples: totalSamples, targets, version: raw.version };
}

export function hasOutdatedNearbySpeciesPacks(): Promise<boolean> {
  return hasPacksBelowFormat(NEARBY_SPECIES_MIN_PACK_FORMAT);
}

export type SpeciesHotspot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speciesCount: number;
  samples: number;
  percentage: number;
  score: number;
  distanceKm: number;
};

export async function getBestHotspotsForSpecies(
  lat: number,
  lng: number,
  radiusKm: number,
  speciesCode: string,
  months?: number[]
): Promise<SpeciesHotspot[]> {
  const bounds = getBoundingBoxFromLocation(lat, lng, radiusKm);
  const candidates = await getNearbyHotspots(bounds);
  const withinRadius = candidates
    .map((hotspot) => ({ ...hotspot, distanceKm: calculateDistance(lat, lng, hotspot.lat, hotspot.lng) }))
    .filter((hotspot) => hotspot.distanceKm <= radiusKm);

  if (withinRadius.length === 0) return [];

  const targetData = await getTargetDataForHotspots(withinRadius.map((hotspot) => hotspot.id));
  const results: SpeciesHotspot[] = [];

  for (const hotspot of withinRadius) {
    const rawData = targetData.get(hotspot.id);
    if (!rawData) continue;

    const data = parseHotspotTargetData(rawData);
    const monthIndices = getMonthIndices(data, months);
    const totalSamples = getTotalSamplesForMonths(data, monthIndices);
    if (totalSamples === 0) continue;

    const speciesEntry = data.species.find((entry) => String(entry[0]) === speciesCode);
    if (!speciesEntry) continue;

    const observations = monthIndices.reduce((sum, monthIndex) => {
      const value = speciesEntry[monthIndex + 1];
      return sum + (typeof value === "number" ? value : 0);
    }, 0);
    if (observations < MIN_OBSERVATIONS) continue;

    results.push({
      id: hotspot.id,
      name: hotspot.name,
      lat: hotspot.lat,
      lng: hotspot.lng,
      speciesCount: hotspot.species,
      samples: totalSamples,
      percentage: (observations / totalSamples) * 100,
      score: wilsonScore(observations, totalSamples),
      distanceKm: hotspot.distanceKm,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
