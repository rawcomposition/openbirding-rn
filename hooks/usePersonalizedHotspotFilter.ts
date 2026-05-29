import {
  createPersonalizedHotspotFilterBasis,
  logPersonalizedHotspotFilterDebug,
  personalizedHotspotCache,
  syncPersonalizedHotspotCacheBasis,
} from "@/lib/personalizedHotspotFilter";
import { useFiltersStore } from "@/stores/filtersStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useEffect, useMemo, useRef, useState } from "react";

type UsePersonalizedHotspotFilterOptions = {
  enabled?: boolean;
  blockWhileDisabled?: boolean;
};

type PersonalizedHotspotFilterState = {
  filteredIds: string[];
  isActive: boolean;
  isLoading: boolean;
  hasLifeList: boolean;
};

type AsyncPersonalizedHotspotFilterState = {
  filteredIds: string[];
  isLoading: boolean;
};

function filterResolvedHotspotIds(hotspotIds: string[]): string[] {
  return hotspotIds.filter((hotspotId) => personalizedHotspotCache.get(hotspotId) === true);
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function usePersonalizedHotspotFilter(
  hotspotIds: string[],
  options: UsePersonalizedHotspotFilterOptions = {}
): PersonalizedHotspotFilterState {
  const personalizedFilterEnabled = useFiltersStore((state) => state.personalizedFilterEnabled);
  const neededSpeciesMinCount = useFiltersStore((state) => state.neededSpeciesMinCount);
  const neededSpeciesMinPercent = useFiltersStore((state) => state.neededSpeciesMinPercent);
  const lifelist = useSettingsStore((state) => state.lifelist);
  const lifelistExclusions = useSettingsStore((state) => state.lifelistExclusions);
  const targetMonths = useSettingsStore((state) => state.targetMonths);

  const basis = useMemo(
    () =>
      createPersonalizedHotspotFilterBasis({
        lifelist,
        lifelistExclusions,
        targetMonths,
        neededSpeciesMinCount,
        neededSpeciesMinPercent,
      }),
    [lifelist, lifelistExclusions, targetMonths, neededSpeciesMinCount, neededSpeciesMinPercent]
  );

  const hasLifeList = basis !== null;
  const isActive = personalizedFilterEnabled && hasLifeList;
  const isEnabled = options.enabled ?? true;
  const candidateKey = useMemo(() => hotspotIds.join("|"), [hotspotIds]);
  const stableHotspotIdsRef = useRef(hotspotIds);
  const basisRef = useRef(basis);
  const asyncStateRef = useRef<AsyncPersonalizedHotspotFilterState>({ filteredIds: [], isLoading: false });
  const lastDebugStatusRef = useRef<string | null>(null);
  const logDebugStatusRef = useRef<(status: string, details?: Record<string, unknown>) => void>(() => {});

  if (stableHotspotIdsRef.current !== hotspotIds && stableHotspotIdsRef.current.join("|") !== candidateKey) {
    stableHotspotIdsRef.current = hotspotIds;
  }

  const stableHotspotIds = stableHotspotIdsRef.current;

  const [asyncState, setAsyncState] = useState<AsyncPersonalizedHotspotFilterState>({
    filteredIds: [],
    isLoading: false,
  });

  useEffect(() => {
    basisRef.current = basis;
  }, [basis]);

  useEffect(() => {
    asyncStateRef.current = asyncState;
  }, [asyncState]);

  logDebugStatusRef.current = (status: string, details?: Record<string, unknown>) => {
    const statusKey = JSON.stringify({
      status,
      candidateCount: stableHotspotIds.length,
      filteredCount: asyncStateRef.current.filteredIds.length,
      isLoading: asyncStateRef.current.isLoading,
      isEnabled,
      isActive,
      hasLifeList,
      ...details,
    });

    if (lastDebugStatusRef.current === statusKey) {
      return;
    }

    lastDebugStatusRef.current = statusKey;
    logPersonalizedHotspotFilterDebug(status, {
      candidateCount: stableHotspotIds.length,
      filteredCount: asyncStateRef.current.filteredIds.length,
      isLoading: asyncStateRef.current.isLoading,
      isEnabled,
      isActive,
      hasLifeList,
      ...details,
    });
  };

  useEffect(() => {
    syncPersonalizedHotspotCacheBasis(basis?.cacheKey ?? null);
  }, [basis?.cacheKey]);

  useEffect(() => {
    if (!isActive) {
      logDebugStatusRef.current("hook inactive");
      return;
    }

    if (!isEnabled) {
      logDebugStatusRef.current("waiting for prerequisites", {
        blockWhileDisabled: options.blockWhileDisabled ?? false,
      });
      return;
    }

    if (stableHotspotIds.length === 0) {
      logDebugStatusRef.current("no candidate hotspots");
      return;
    }

    if (!basisRef.current) {
      logDebugStatusRef.current("missing filter basis");
      return;
    }

    const basisForRun = basisRef.current;
    const unresolvedHotspotIds = stableHotspotIds.filter((hotspotId) => !personalizedHotspotCache.has(hotspotId));
    if (unresolvedHotspotIds.length === 0) {
      const filteredIds = filterResolvedHotspotIds(stableHotspotIds);
      logDebugStatusRef.current("all candidates resolved from cache", {
        matchedCount: filteredIds.length,
      });
      setAsyncState((currentState) => {
        if (!currentState.isLoading && areStringArraysEqual(currentState.filteredIds, filteredIds)) {
          return currentState;
        }

        return {
          filteredIds,
          isLoading: false,
        };
      });
      return;
    }

    const abortController = new AbortController();
    logDebugStatusRef.current("evaluating unresolved hotspots", {
      unresolvedCount: unresolvedHotspotIds.length,
      cachedCount: stableHotspotIds.length - unresolvedHotspotIds.length,
    });

    setAsyncState((currentState) => ({
      filteredIds: currentState.isLoading ? currentState.filteredIds : [],
      isLoading: true,
    }));

    void personalizedHotspotCache
      .evaluateMany(unresolvedHotspotIds, basisForRun, abortController.signal)
      .then(() => {
        if (abortController.signal.aborted) {
          return;
        }

        const stillUnresolved = stableHotspotIds.some((hotspotId) => !personalizedHotspotCache.has(hotspotId));
        if (stillUnresolved) {
          logDebugStatusRef.current("evaluation completed but candidates still unresolved");
          setAsyncState((currentState) => ({
            filteredIds: currentState.filteredIds,
            isLoading: true,
          }));
          return;
        }

        const filteredIds = filterResolvedHotspotIds(stableHotspotIds);
        logDebugStatusRef.current("evaluation resolved", {
          matchedCount: filteredIds.length,
          unresolvedCount: 0,
        });
        setAsyncState((currentState) => {
          if (!currentState.isLoading && areStringArraysEqual(currentState.filteredIds, filteredIds)) {
            return currentState;
          }

          return {
            filteredIds,
            isLoading: false,
          };
        });
      })
      .catch((error) => {
        if (abortController.signal.aborted || error?.name === "AbortError") {
          logDebugStatusRef.current("evaluation aborted");
          return;
        }

        logDebugStatusRef.current("evaluation failed");
        console.error("Failed to evaluate personalized hotspot filter", error);
        setAsyncState((currentState) => ({
          filteredIds: currentState.filteredIds,
          isLoading: false,
        }));
      });

    return () => {
      abortController.abort();
    };
  }, [
    candidateKey,
    hasLifeList,
    isActive,
    isEnabled,
    options.blockWhileDisabled,
    stableHotspotIds,
  ]);

  return useMemo<PersonalizedHotspotFilterState>(() => {
    if (!isActive) {
      return {
        filteredIds: stableHotspotIds,
        isActive: false,
        isLoading: false,
        hasLifeList,
      };
    }

    if (!isEnabled && !options.blockWhileDisabled) {
      return {
        filteredIds: stableHotspotIds,
        isActive: true,
        isLoading: false,
        hasLifeList,
      };
    }

    if (!isEnabled && options.blockWhileDisabled) {
      return {
        filteredIds: [],
        isActive: true,
        isLoading: stableHotspotIds.length > 0,
        hasLifeList,
      };
    }

    if (stableHotspotIds.length === 0) {
      return {
        filteredIds: [],
        isActive: true,
        isLoading: false,
        hasLifeList,
      };
    }

    return {
      filteredIds: asyncState.filteredIds,
      isActive: true,
      isLoading: asyncState.isLoading,
      hasLifeList,
    };
  }, [
    asyncState.filteredIds,
    asyncState.isLoading,
    hasLifeList,
    isActive,
    isEnabled,
    options.blockWhileDisabled,
    stableHotspotIds,
  ]);
}
