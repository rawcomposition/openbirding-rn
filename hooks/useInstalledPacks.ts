import { useQuery } from "@tanstack/react-query";
import { getDatabase } from "@/lib/database";

export function useInstalledPacks() {
  const { data } = useQuery({
    queryKey: ["installed-packs"],
    queryFn: async () => {
      const db = getDatabase();
      const result = await db.getAllAsync<{ id: number }>("SELECT id FROM packs");
      return new Set(result.map((pack) => pack.id));
    },
  });

  return data || new Set();
}
