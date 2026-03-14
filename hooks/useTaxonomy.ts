import { useQuery } from "@tanstack/react-query";
import { getTaxonomy, type TaxonomyEntry } from "@/lib/taxonomy";

const taxonomyQueryOptions = {
  queryKey: ["taxonomy"],
  queryFn: getTaxonomy,
  staleTime: 0,
  gcTime: Infinity,
  refetchOnMount: "always" as const,
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
