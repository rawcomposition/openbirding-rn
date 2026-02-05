import { queryClient } from "@/lib/queryClient";
import { get } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

type TaxonomyEntry = {
  name: string;
  sciName: string;
  code: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const taxonomyQueryOptions = {
  queryKey: ["/taxonomy"] as const,
  queryFn: async () => {
    const data = (await get("/taxonomy")) as unknown as TaxonomyEntry[];
    console.log(`[Taxonomy] Loaded ${data.length} species`);
    return data;
  },
  staleTime: ONE_DAY_MS,
  gcTime: Infinity,
  meta: { persist: true },
};

export function useTaxonomy() {
  return useQuery<TaxonomyEntry[]>(taxonomyQueryOptions);
}

export function prefetchTaxonomy() {
  return queryClient.prefetchQuery(taxonomyQueryOptions);
}

export function useTaxonomyMap() {
  const { data, ...rest } = useTaxonomy();

  const taxonomyMap = data ? new Map(data.map((entry) => [entry.code, entry.name])) : new Map<string, string>();

  return { taxonomyMap, ...rest };
}
