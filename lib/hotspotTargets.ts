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

const MONTH_COUNT = 12;

export function mergeRawTargetData(cells: RawHotspotTargetData[]): RawHotspotTargetData {
  const samples: number[] = new Array(MONTH_COUNT).fill(0);
  const speciesMap = new Map<string, number[]>();

  for (const cell of cells) {
    for (let month = 0; month < MONTH_COUNT; month++) {
      samples[month] += cell.samples[month] ?? 0;
    }

    for (const speciesEntry of cell.species) {
      const speciesCode = String(speciesEntry[0]);
      let counts = speciesMap.get(speciesCode);
      if (!counts) {
        counts = new Array(MONTH_COUNT).fill(0);
        speciesMap.set(speciesCode, counts);
      }
      for (let month = 0; month < MONTH_COUNT; month++) {
        const value = speciesEntry[month + 1];
        counts[month] += typeof value === "number" ? value : 0;
      }
    }
  }

  const species: (string | number)[][] = Array.from(speciesMap.entries()).map(([code, counts]) => [code, ...counts]);

  return { samples, species };
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
