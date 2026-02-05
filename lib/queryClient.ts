import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { get } from "./utils";

const PERSIST_STORAGE_KEY = "REACT_QUERY_PERSIST";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 24 * 24 * 60 * 60 * 1000,
      staleTime: 0,
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        return get(url, (queryKey[1] || {}) as Record<string, string | number | boolean>);
      },
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_STORAGE_KEY,
});

/**
 * Filter function for the persister - only persist queries with `meta.persist: true`
 */
export const shouldPersistQuery = (query: { meta?: { persist?: boolean } }) => {
  return query.meta?.persist === true;
};
