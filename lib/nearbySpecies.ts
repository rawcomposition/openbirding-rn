import { getGridCellsWithinBounds, getNearbyHotspots, getTargetDataForHotspots, HotspotTargetsResult } from "./database";
import {
  aggregateHotspotTargets,
  getMonthIndices,
  getTotalSamplesForMonths,
  mergeRawTargetData,
  parseHotspotTargetData,
} from "./hotspotTargets";
import type { DistanceUnits } from "@/stores/settingsStore";
import { calculateDistance, getBoundingBoxFromLocation } from "./utils";

const KM_PER_MILE = 1.609344;

export type RadiusOption = { km: number; label: string };

// Radius choices per unit system, index-aligned so a stored selection maps to a
// comparable size if the user switches units. Labels are clean round numbers, so
// the actual search radius differs slightly between systems.
export const RADIUS_OPTIONS: Record<DistanceUnits, RadiusOption[]> = {
  imperial: [
    { km: 2 * KM_PER_MILE, label: "2 mi" },
    { km: 5 * KM_PER_MILE, label: "5 mi" },
    { km: 7.5 * KM_PER_MILE, label: "7.5 mi" },
    { km: 10 * KM_PER_MILE, label: "10 mi" },
    { km: 15 * KM_PER_MILE, label: "15 mi" },
    { km: 25 * KM_PER_MILE, label: "25 mi" },
  ],
  metric: [
    { km: 3, label: "3 km" },
    { km: 8, label: "8 km" },
    { km: 12, label: "12 km" },
    { km: 16, label: "16 km" },
    { km: 25, label: "25 km" },
    { km: 40, label: "40 km" },
  ],
};

export const DEFAULT_RADIUS_INDEX = 2;

export function getRadiusOption(units: DistanceUnits, index: number): RadiusOption {
  const options = RADIUS_OPTIONS[units];
  return options[Math.min(Math.max(index, 0), options.length - 1)];
}

export async function getNearbySpeciesData(
  lat: number,
  lng: number,
  radiusKm: number,
  months?: number[]
): Promise<HotspotTargetsResult> {
  const bounds = getBoundingBoxFromLocation(lat, lng, radiusKm);
  const rows = await getGridCellsWithinBounds(bounds);

  // The bounding box is a coarse pre-filter; keep only cells whose center is
  // actually within the radius (matches our "center-in-radius" cell rule).
  const withinRadius = rows.filter((row) => calculateDistance(lat, lng, row.lat, row.lng) <= radiusKm);

  console.log(`[nearbySpecies] ${withinRadius.length} grid cells within ${radiusKm.toFixed(2)} km (${rows.length} in bbox)`);

  if (withinRadius.length === 0) {
    return { samples: 0, targets: [], version: null };
  }

  const version = withinRadius.find((row) => row.version)?.version ?? null;
  const merged = mergeRawTargetData(withinRadius.map((row) => parseHotspotTargetData(row.data)));
  const monthIndices = getMonthIndices(merged, months);
  const totalSamples = getTotalSamplesForMonths(merged, monthIndices);

  if (totalSamples === 0) {
    return { samples: 0, targets: [], version };
  }

  const targets = aggregateHotspotTargets(merged, monthIndices, totalSamples);
  return { samples: totalSamples, targets, version };
}

export type SpeciesHotspot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Total species ever reported at the hotspot (drives the marker color). */
  speciesCount: number;
  /** Checklists at this hotspot for the selected months. */
  samples: number;
  /** Reporting frequency (%) of the species at this hotspot for the selected months. */
  percentage: number;
  /** Distance from the search center. */
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
    if (observations === 0) continue;

    results.push({
      id: hotspot.id,
      name: hotspot.name,
      lat: hotspot.lat,
      lng: hotspot.lng,
      speciesCount: hotspot.species,
      samples: totalSamples,
      percentage: (observations / totalSamples) * 100,
      distanceKm: hotspot.distanceKm,
    });
  }

  return results.sort((a, b) => b.percentage - a.percentage);
}
