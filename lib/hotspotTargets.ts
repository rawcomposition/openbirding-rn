export type RawHotspotTargetData = {
  samples: (number | null)[];
  species: (string | number)[][];
};

export type AggregatedHotspotTarget = {
  speciesCode: string;
  observations: number;
  percentage: number;
};

export function parseHotspotTargetData(rawData: string): RawHotspotTargetData {
  return JSON.parse(rawData) as RawHotspotTargetData;
}

export function getMonthIndices(data: RawHotspotTargetData, months?: number[]): number[] {
  return months && months.length > 0 ? months : data.samples.map((_, index) => index);
}

export function getTotalSamplesForMonths(data: RawHotspotTargetData, monthIndices: number[]): number {
  return monthIndices.reduce((sum, monthIndex) => sum + (data.samples[monthIndex] ?? 0), 0);
}

export function aggregateHotspotTargets(
  data: RawHotspotTargetData,
  monthIndices: number[],
  totalSamples: number
): AggregatedHotspotTarget[] {
  if (totalSamples === 0) {
    return [];
  }

  const speciesMap = new Map<string, number>();

  for (const speciesEntry of data.species) {
    const speciesCode = String(speciesEntry[0]);
    const totalObservations = monthIndices.reduce((sum, monthIndex) => {
      const value = speciesEntry[monthIndex + 1];
      return sum + (typeof value === "number" ? value : 0);
    }, 0);

    if (totalObservations > 0) {
      speciesMap.set(speciesCode, (speciesMap.get(speciesCode) ?? 0) + totalObservations);
    }
  }

  return Array.from(speciesMap.entries())
    .map(([speciesCode, observations]) => ({
      speciesCode,
      observations,
      percentage: (observations / totalSamples) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
