import {
  createTargetRichHotspotBasis,
  targetRichHotspotCache,
  syncTargetRichHotspotCacheBasis,
} from "@/lib/targetRichHotspots";
import { useFiltersStore } from "@/stores/filtersStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useEffect, useMemo, useRef, useState } from "react";

type UseTargetRichHotspotsOptions = {
  enabled?: boolean;
  blockWhileDisabled?: boolean;
};

type TargetRichHotspotState = {
  filteredIds: string[];
  isActive: boolean;
  isLoading: boolean;
  hasLifeList: boolean;
};

type AsyncTargetRichHotspotState = {
  filteredIds: string[];
  isLoading: boolean;
};

function filterResolvedHotspotIds(hotspotIds: string[]): string[] {
  return hotspotIds.filter((hotspotId) => targetRichHotspotCache.get(hotspotId) === true);
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function useTargetRichHotspots(
  hotspotIds: string[],
  options: UseTargetRichHotspotsOptions = {}
): TargetRichHotspotState {
  const targetRichEnabled = useFiltersStore((state) => state.targetRichEnabled);
  const minTargets = useFiltersStore((state) => state.minTargets);
  const minTargetFrequency = useFiltersStore((state) => state.minTargetFrequency);
  const lifelist = useSettingsStore((state) => state.lifelist);
  const lifelistExclusions = useSettingsStore((state) => state.lifelistExclusions);
  const targetMonths = useSettingsStore((state) => state.targetMonths);

  const basis = useMemo(
    () =>
      createTargetRichHotspotBasis({
        lifelist,
        lifelistExclusions,
        targetMonths,
        minTargets,
        minTargetFrequency,
      }),
    [lifelist, lifelistExclusions, targetMonths, minTargets, minTargetFrequency]
  );

  const hasLifeList = basis !== null;
  const isActive = targetRichEnabled && hasLifeList;
  const isEnabled = options.enabled ?? true;
  const candidateKey = useMemo(() => hotspotIds.join("|"), [hotspotIds]);
  const stableHotspotIdsRef = useRef(hotspotIds);
  const basisRef = useRef(basis);

  if (stableHotspotIdsRef.current !== hotspotIds && stableHotspotIdsRef.current.join("|") !== candidateKey) {
    stableHotspotIdsRef.current = hotspotIds;
  }

  const stableHotspotIds = stableHotspotIdsRef.current;

  const [asyncState, setAsyncState] = useState<AsyncTargetRichHotspotState>({
    filteredIds: [],
    isLoading: false,
  });

  useEffect(() => {
    basisRef.current = basis;
  }, [basis]);

  useEffect(() => {
    syncTargetRichHotspotCacheBasis(basis?.cacheKey ?? null);
  }, [basis?.cacheKey]);

  useEffect(() => {
    if (!isActive || !isEnabled || stableHotspotIds.length === 0 || !basisRef.current) {
      return;
    }

    const basisForRun = basisRef.current;
    const unresolvedHotspotIds = stableHotspotIds.filter((hotspotId) => !targetRichHotspotCache.has(hotspotId));
    if (unresolvedHotspotIds.length === 0) {
      const filteredIds = filterResolvedHotspotIds(stableHotspotIds);
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

    setAsyncState((currentState) => ({
      filteredIds: currentState.isLoading ? currentState.filteredIds : [],
      isLoading: true,
    }));

    void targetRichHotspotCache
      .evaluateMany(unresolvedHotspotIds, basisForRun, abortController.signal)
      .then(() => {
        if (abortController.signal.aborted) {
          return;
        }

        const stillUnresolved = stableHotspotIds.some((hotspotId) => !targetRichHotspotCache.has(hotspotId));
        if (stillUnresolved) {
          setAsyncState((currentState) => ({
            filteredIds: currentState.filteredIds,
            isLoading: true,
          }));
          return;
        }

        const filteredIds = filterResolvedHotspotIds(stableHotspotIds);
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
          return;
        }

        console.error("Failed to evaluate target-rich hotspot filter", error);
        setAsyncState((currentState) => ({
          filteredIds: currentState.filteredIds,
          isLoading: false,
        }));
      });

    return () => {
      abortController.abort();
    };
  }, [basis?.cacheKey, candidateKey, hasLifeList, isActive, isEnabled, stableHotspotIds]);

  return useMemo<TargetRichHotspotState>(() => {
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
