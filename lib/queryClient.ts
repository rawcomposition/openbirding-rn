import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 24 * 24 * 60 * 60 * 1000,
      staleTime: 0,
    },
  },
});
