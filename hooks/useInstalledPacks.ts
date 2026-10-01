import { PACK_FORMAT_VERSION } from "@/lib/config";
import { getDatabase } from "@/lib/database";
import { useQuery } from "@tanstack/react-query";

export type InstalledPackInfo = {
  installed_at: string;
  version: string | null;
  format: number | null;
};

export function packNeedsUpdate(installedPack: InstalledPackInfo, remoteVersion: string): boolean {
  return installedPack.version !== remoteVersion || (installedPack.format ?? 0) < PACK_FORMAT_VERSION;
}

export function useInstalledPacks() {
  const { data, isLoading } = useQuery({
    queryKey: ["installed-packs"],
    queryFn: async () => {
      const db = getDatabase();
      const result = await db.getAllAsync<{
        id: number;
        installed_at: string;
        version: string | null;
        format: number | null;
      }>("SELECT id, installed_at, version, format FROM packs");
      return new Map<number, InstalledPackInfo>(
        result.map((pack) => [
          pack.id,
          { installed_at: pack.installed_at, version: pack.version, format: pack.format },
        ])
      );
    },
  });

  return { data: data || new Map<number, InstalledPackInfo>(), isLoading };
}
