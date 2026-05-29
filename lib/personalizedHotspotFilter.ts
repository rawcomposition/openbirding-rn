import { LifeListEntry } from "@/stores/settingsStore";
import { getTargetDataForHotspots } from "./database";
import { getMonthIndices, getTotalSamplesForMonths, parseHotspotTargetData } from "./hotspotTargets";

const CACHE_CAPACITY = 5_000;
const COMPUTE_BATCH_SIZE = 50;
const DEBUG_PERSONALIZED_FILTER = __DEV__;

let evaluationRunCounter = 0;

export type PersonalizedHotspotFilterBasis = {
  cacheKey: string;
  lifeListCodes: ReadonlySet<string>;
  excludedCodes: ReadonlySet<string>;
  selectedMonths: number[];
  neededSpeciesMinCount: number;
  neededSpeciesMinPercent: number;
};

export function logPersonalizedHotspotFilterDebug(message: string, details?: Record<string, unknown>) {
  if (!DEBUG_PERSONALIZED_FILTER) {
    return;
  }

  if (details) {
    console.log(`[personalized-hotspot-filter] ${message}`, details);
    return;
  }

  console.log(`[personalized-hotspot-filter] ${message}`);
}

export function normalizeNeededSpeciesMinCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function normalizeNeededSpeciesMinPercent(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(100, Math.max(0, value));
}

export function createPersonalizedHotspotFilterBasis(params: {
  lifelist: LifeListEntry[] | null;
  lifelistExclusions: string[] | null;
  targetMonths: number[];
  neededSpeciesMinCount: number;
  neededSpeciesMinPercent: number;
}): PersonalizedHotspotFilterBasis | null {
  const lifeListCodes = [...new Set((params.lifelist ?? []).map((entry) => entry.code))].sort();

  if (lifeListCodes.length === 0) {
    return null;
  }

  const excludedCodes = [...new Set(params.lifelistExclusions ?? [])].sort();
  const selectedMonths = [...new Set(params.targetMonths)].sort((a, b) => a - b);
  const neededSpeciesMinCount = normalizeNeededSpeciesMinCount(params.neededSpeciesMinCount);
  const neededSpeciesMinPercent = normalizeNeededSpeciesMinPercent(params.neededSpeciesMinPercent);

  return {
    cacheKey: JSON.stringify({
      lifeListCodes,
      excludedCodes,
      selectedMonths,
      neededSpeciesMinCount,
      neededSpeciesMinPercent,
    }),
    lifeListCodes: new Set(lifeListCodes),
    excludedCodes: new Set(excludedCodes),
    selectedMonths,
    neededSpeciesMinCount,
    neededSpeciesMinPercent,
  };
}

function createAbortError(): Error {
  const error = new Error("Personalized hotspot evaluation aborted");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function matchesPersonalizedHotspotFilter(rawData: string, basis: PersonalizedHotspotFilterBasis): boolean {
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
    if (percentage >= basis.neededSpeciesMinPercent) {
      qualifyingSpeciesCount += 1;
      if (qualifyingSpeciesCount >= basis.neededSpeciesMinCount) {
        return true;
      }
    }
  }

  return false;
}

class PersonalizedHotspotCache {
  private cache = new Map<string, boolean>();
  private activeSignals = new Set<AbortController>();

  clear() {
    logPersonalizedHotspotFilterDebug("cache clear", { previousSize: this.cache.size });
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
    if (this.activeSignals.size > 0) {
      logPersonalizedHotspotFilterDebug("cancel active runs", { activeRunCount: this.activeSignals.size });
    }

    for (const controller of this.activeSignals) {
      controller.abort();
    }
    this.activeSignals.clear();
  }

  async evaluateMany(
    hotspotIds: string[],
    basis: PersonalizedHotspotFilterBasis,
    signal?: AbortSignal
  ): Promise<void> {
    const missingHotspotIds = [...new Set(hotspotIds)].filter((hotspotId) => !this.cache.has(hotspotId));
    if (missingHotspotIds.length === 0) {
      return;
    }

    const runId = ++evaluationRunCounter;
    const controller = new AbortController();
    this.activeSignals.add(controller);

    const combinedSignal = controller.signal;
    const isAborted = () => combinedSignal.aborted || signal?.aborted;

    try {
      logPersonalizedHotspotFilterDebug("evaluate start", {
        runId,
        requestedCount: hotspotIds.length,
        missingCount: missingHotspotIds.length,
        cachedCount: hotspotIds.length - missingHotspotIds.length,
        cacheSize: this.cache.size,
        monthCount: basis.selectedMonths.length === 0 ? 12 : basis.selectedMonths.length,
        neededSpeciesMinCount: basis.neededSpeciesMinCount,
        neededSpeciesMinPercent: basis.neededSpeciesMinPercent,
      });

      throwIfAborted(signal);
      const targetData = await getTargetDataForHotspots(missingHotspotIds);
      throwIfAborted(signal);

      logPersonalizedHotspotFilterDebug("target data fetched", {
        runId,
        requestedCount: missingHotspotIds.length,
        foundCount: targetData.size,
        missingDataCount: missingHotspotIds.length - targetData.size,
      });

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
          this.set(hotspotId, rawData ? matchesPersonalizedHotspotFilter(rawData, basis) : false);
        }

        const processedCount = Math.min(index + batch.length, missingHotspotIds.length);
        if (
          processedCount === missingHotspotIds.length ||
          (missingHotspotIds.length > 250 && processedCount % 250 === 0)
        ) {
          logPersonalizedHotspotFilterDebug("evaluate progress", {
            runId,
            processedCount,
            totalCount: missingHotspotIds.length,
            cacheSize: this.cache.size,
          });
        }

        if (index + COMPUTE_BATCH_SIZE < missingHotspotIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      logPersonalizedHotspotFilterDebug("evaluate complete", {
        runId,
        computedCount: missingHotspotIds.length,
        cacheSize: this.cache.size,
      });
    } catch (error) {
      if ((error as Error | undefined)?.name === "AbortError") {
        logPersonalizedHotspotFilterDebug("evaluate aborted", {
          runId,
          processedCandidateCount: missingHotspotIds.length,
          cacheSize: this.cache.size,
        });
      }
      throw error;
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

export const personalizedHotspotCache = new PersonalizedHotspotCache();

let activeBasisKey: string | null = null;

export function syncPersonalizedHotspotCacheBasis(nextBasisKey: string | null) {
  if (activeBasisKey === nextBasisKey) {
    return;
  }

  logPersonalizedHotspotFilterDebug("basis changed", {
    hadBasis: activeBasisKey !== null,
    hasBasis: nextBasisKey !== null,
  });
  activeBasisKey = nextBasisKey;
  personalizedHotspotCache.cancelActiveRun();
  personalizedHotspotCache.clear();
}
