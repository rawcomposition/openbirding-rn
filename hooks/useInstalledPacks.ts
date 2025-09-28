import { useQuery } from "@tanstack/react-query";
import { getDatabase } from "@/lib/database";

export function useInstalledPacks() {
  const { data } = useQuery({
    queryKey: ["installed-packs"],
    queryFn: async () => {
      const db = getDatabase();
      const result = await db.getAllAsync<{ id: number; installed_at: string }>("SELECT id, installed_at FROM packs");
      return new Map(result.map((pack) => [pack.id, pack.installed_at]));
    },
  });

  return data || new Map();
}
