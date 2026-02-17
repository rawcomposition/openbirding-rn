import { getDatabase } from "@/lib/database";
import { useQuery } from "@tanstack/react-query";

export type InstalledPackInfo = {
  installed_at: string;
  version: string | null;
};

export function useInstalledPacks() {
  const { data, isLoading } = useQuery({
    queryKey: ["installed-packs"],
    queryFn: async () => {
      const db = getDatabase();
      const result = await db.getAllAsync<{ id: number; installed_at: string; version: string | null }>(
        "SELECT id, installed_at, version FROM packs"
      );
      return new Map<number, InstalledPackInfo>(
        result.map((pack) => [pack.id, { installed_at: pack.installed_at, version: pack.version }])
      );
    },
  });

  return { data: data || new Map<number, InstalledPackInfo>(), isLoading };
}
