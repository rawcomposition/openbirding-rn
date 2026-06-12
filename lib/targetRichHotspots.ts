import { LifeListEntry } from "@/stores/settingsStore";
import { getTargetDataForHotspots } from "./database";
import { getMonthIndices, getTotalSamplesForMonths, parseHotspotTargetData } from "./hotspotTargets";

const CACHE_CAPACITY = 5_000;
const COMPUTE_BATCH_SIZE = 50;

export type TargetRichHotspotBasis = {
  cacheKey: string;
  lifeListCodes: ReadonlySet<string>;
  excludedCodes: ReadonlySet<string>;
  selectedMonths: number[];
  minTargets: number;
  minTargetFrequency: number;
};

export function normalizeMinTargets(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function normalizeMinTargetFrequency(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(100, Math.max(0, value));
}

export function createTargetRichHotspotBasis(params: {
  lifelist: LifeListEntry[] | null;
  lifelistExclusions: string[] | null;
  targetMonths: number[];
  minTargets: number;
  minTargetFrequency: number;
}): TargetRichHotspotBasis | null {
  const lifeListCodes = [...new Set((params.lifelist ?? []).map((entry) => entry.code))].sort();

  if (lifeListCodes.length === 0) {
    return null;
  }

  const excludedCodes = [...new Set(params.lifelistExclusions ?? [])].sort();
  const selectedMonths = [...new Set(params.targetMonths)].sort((a, b) => a - b);
  const minTargets = normalizeMinTargets(params.minTargets);
  const minTargetFrequency = normalizeMinTargetFrequency(params.minTargetFrequency);

  return {
    cacheKey: JSON.stringify({
      lifeListCodes,
      excludedCodes,
      selectedMonths,
      minTargets,
      minTargetFrequency,
    }),
    lifeListCodes: new Set(lifeListCodes),
    excludedCodes: new Set(excludedCodes),
    selectedMonths,
    minTargets,
    minTargetFrequency,
  };
}

function createAbortError(): Error {
  const error = new Error("Target-rich hotspot evaluation aborted");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function matchesTargetRichHotspot(rawData: string, basis: TargetRichHotspotBasis): boolean {
  const parsed = parseHotspotTargetData(rawData);
  const monthIndices = getMonthIndices(parsed, basis.selectedMonths);
  const totalSamples = getTotalSamplesForMonths(parsed, monthIndices);

  if (totalSamples === 0) {
    return false;
  }

  let qualifyingSpeciesCount = 0;

  for (const speciesEntry of parsed.species) {
    const speciesCode = String(speciesEntry[0]);

    if (basis.lifeListCodes.has(speciesCode) || basis.excludedCodes.has(speciesCode)) {
      continue;
    }

    const observations = monthIndices.reduce((sum, monthIndex) => {
      const value = speciesEntry[monthIndex + 1];
      return sum + (typeof value === "number" ? value : 0);
    }, 0);

    if (observations === 0) {
      continue;
    }

    const percentage = (observations / totalSamples) * 100;
    if (percentage >= basis.minTargetFrequency) {
      qualifyingSpeciesCount += 1;
      if (qualifyingSpeciesCount >= basis.minTargets) {
        return true;
      }
    }
  }

  return false;
}

class TargetRichHotspotCache {
  private cache = new Map<string, boolean>();
  private activeSignals = new Set<AbortController>();

  clear() {
    this.cache.clear();
  }

  has(hotspotId: string): boolean {
    return this.cache.has(hotspotId);
  }

  get(hotspotId: string): boolean | undefined {
    const value = this.cache.get(hotspotId);
    if (value === undefined) {
      return undefined;
    }

    this.cache.delete(hotspotId);
    this.cache.set(hotspotId, value);
    return value;
  }

  cancelActiveRun() {
    for (const controller of this.activeSignals) {
      controller.abort();
    }
    this.activeSignals.clear();
  }

  async evaluateMany(
    hotspotIds: string[],
    basis: TargetRichHotspotBasis,
    signal?: AbortSignal
  ): Promise<void> {
    const missingHotspotIds = [...new Set(hotspotIds)].filter((hotspotId) => !this.cache.has(hotspotId));
    if (missingHotspotIds.length === 0) {
      return;
    }

    const controller = new AbortController();
    this.activeSignals.add(controller);

    const combinedSignal = controller.signal;
    const isAborted = () => combinedSignal.aborted || signal?.aborted;

    try {
      throwIfAborted(signal);
      const targetData = await getTargetDataForHotspots(missingHotspotIds);
      throwIfAborted(signal);

      for (let index = 0; index < missingHotspotIds.length; index += COMPUTE_BATCH_SIZE) {
        if (isAborted()) {
          throw createAbortError();
        }

        const batch = missingHotspotIds.slice(index, index + COMPUTE_BATCH_SIZE);
        for (const hotspotId of batch) {
          if (isAborted()) {
            throw createAbortError();
          }

          const rawData = targetData.get(hotspotId);
          this.set(hotspotId, rawData ? matchesTargetRichHotspot(rawData, basis) : false);
        }

        if (index + COMPUTE_BATCH_SIZE < missingHotspotIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    } finally {
      this.activeSignals.delete(controller);
    }
  }

  private set(hotspotId: string, value: boolean) {
    if (this.cache.has(hotspotId)) {
      this.cache.delete(hotspotId);
    }

    this.cache.set(hotspotId, value);

    while (this.cache.size > CACHE_CAPACITY) {
      const oldestHotspotId = this.cache.keys().next().value;
      if (!oldestHotspotId) {
        break;
      }
      this.cache.delete(oldestHotspotId);
    }
  }
}

export const targetRichHotspotCache = new TargetRichHotspotCache();

let activeBasisKey: string | null = null;

export function syncTargetRichHotspotCacheBasis(nextBasisKey: string | null) {
  if (activeBasisKey === nextBasisKey) {
    return;
  }

  activeBasisKey = nextBasisKey;
  targetRichHotspotCache.cancelActiveRun();
  targetRichHotspotCache.clear();
}
