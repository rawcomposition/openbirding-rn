import { useQuery } from "@tanstack/react-query";
import { getTaxonomy, type TaxonomyEntry } from "@/lib/taxonomy";

const TEN_MINUTES_MS = 10 * 60 * 1000;

const taxonomyQueryOptions = {
  queryKey: ["taxonomy"],
  queryFn: getTaxonomy,
  staleTime: TEN_MINUTES_MS,
  gcTime: Infinity,
  refetchOnReconnect: true,
};

export function useTaxonomy() {
  return useQuery<TaxonomyEntry[]>(taxonomyQueryOptions);
}

export function useTaxonomyMap() {
  const { data, ...rest } = useTaxonomy();

  const taxonomyMap = data ? new Map(data.map((entry) => [entry.code, entry.name])) : new Map<string, string>();

  return { taxonomyMap, ...rest };
}
