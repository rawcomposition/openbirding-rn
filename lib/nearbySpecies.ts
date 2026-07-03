import { getGridCellsWithinBounds, HotspotTargetsResult } from "./database";
import {
  aggregateHotspotTargets,
  getMonthIndices,
  getTotalSamplesForMonths,
  mergeRawTargetData,
  parseHotspotTargetData,
} from "./hotspotTargets";
import { calculateDistance, getBoundingBoxFromLocation } from "./utils";

const KM_PER_MILE = 1.609344;

// Radius per unit system. Both are chosen as clean round numbers for display;
// the actual search radius differs slightly between systems as a result.
export const NEARBY_RADIUS = {
  imperial: { km: 7.5 * KM_PER_MILE, label: "7.5 mi" },
  metric: { km: 12, label: "12 km" },
} as const;

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
