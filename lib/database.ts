import * as SQLite from "expo-sqlite";
import { BirdPlanTripData, SavedPlace, StaticPackHotspot, StaticPackTarget, Trip } from "./types";

let db: SQLite.SQLiteDatabase | null = null;
let isInstallingPack = false;

export async function initializeDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync("openbirding.db");
    await createTables();
    await runMigrations();
    await createIndexes();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS packs (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      hotspots INTEGER,
      installed_at TEXT,
      version TEXT,
      updated_at TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS hotspots (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      species INTEGER NOT NULL DEFAULT 0,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      country TEXT,
      state TEXT,
      county TEXT,
      country_name TEXT,
      state_name TEXT,
      county_name TEXT,
      pack_id INTEGER,
      FOREIGN KEY (pack_id) REFERENCES packs (id) ON DELETE CASCADE
    );
  `);

  // Foreign keys are intentionally not enforced (PRAGMA foreign_keys is OFF).
  // This allows saved_hotspots to reference hotspot IDs that may not yet exist
  // in the hotspots table (e.g. trip imports), and survive pack uninstalls.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saved_hotspots (
      hotspot_id TEXT PRIMARY KEY NOT NULL,
      saved_at TEXT NOT NULL,
      notes TEXT,
      trip_id TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saved_places (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      icon TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      saved_at TEXT NOT NULL,
      trip_id TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      pack_id INTEGER,
      FOREIGN KEY (pack_id) REFERENCES packs (id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pinned_targets (
      hotspot_id TEXT NOT NULL,
      code TEXT NOT NULL,
      pinned_at TEXT NOT NULL,
      trip_id TEXT,
      PRIMARY KEY (hotspot_id, code)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL DEFAULT 'birdplan',
      name TEXT NOT NULL,
      start_month INTEGER,
      end_month INTEGER,
      min_lat REAL,
      max_lat REAL,
      min_lng REAL,
      max_lng REAL,
      imported_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      update_token TEXT
    );
  `);
}

async function createIndexes(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_hotspots_lat_lng 
    ON hotspots (lat, lng);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_hotspots_pack_id 
    ON hotspots (pack_id);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_saved_hotspots_saved_at 
    ON saved_hotspots (saved_at);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_saved_places_saved_at
    ON saved_places (saved_at);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_targets_pack_id
    ON targets (pack_id);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_saved_hotspots_trip_id
    ON saved_hotspots (trip_id);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_saved_places_trip_id
    ON saved_places (trip_id);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_pinned_targets_trip_id
    ON pinned_targets (trip_id);
  `);
}

async function runMigrations(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const packsTableInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(packs)");
  const packsColumns = packsTableInfo.map((col) => col.name);

  if (!packsColumns.includes("version")) {
    await db.execAsync(`ALTER TABLE packs ADD COLUMN version TEXT`);
  }
  if (!packsColumns.includes("updated_at")) {
    await db.execAsync(`ALTER TABLE packs ADD COLUMN updated_at TEXT`);
  }

  const savedHotspotsTableInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(saved_hotspots)");
  const savedHotspotsColumns = savedHotspotsTableInfo.map((col) => col.name);
  if (!savedHotspotsColumns.includes("trip_id")) {
    await db.execAsync(`ALTER TABLE saved_hotspots ADD COLUMN trip_id TEXT`);
  }

  const savedPlacesTableInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(saved_places)");
  const savedPlacesColumns = savedPlacesTableInfo.map((col) => col.name);
  if (!savedPlacesColumns.includes("trip_id")) {
    await db.execAsync(`ALTER TABLE saved_places ADD COLUMN trip_id TEXT`);
  }

  const pinnedTargetsTableInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(pinned_targets)");
  const pinnedTargetsColumns = pinnedTargetsTableInfo.map((col) => col.name);
  if (!pinnedTargetsColumns.includes("trip_id")) {
    await db.execAsync(`ALTER TABLE pinned_targets ADD COLUMN trip_id TEXT`);
  }

  const tripsTableInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(trips)");
  const tripsColumns = tripsTableInfo.map((col) => col.name);
  if (tripsColumns.length > 0 && !tripsColumns.includes("update_token")) {
    await db.execAsync(`ALTER TABLE trips ADD COLUMN update_token TEXT`);
  }
  if (tripsColumns.length > 0 && !tripsColumns.includes("type")) {
    await db.execAsync(`ALTER TABLE trips ADD COLUMN type TEXT NOT NULL DEFAULT 'birdplan'`);
  }

}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export async function getHotspotsWithinBounds(
  west: number,
  south: number,
  east: number,
  north: number
): Promise<{ id: string; lat: number; lng: number; species: number }[]> {
  if (!db) throw new Error("Database not initialized");

  // When west > east, the bounding box crosses the international date line
  const crossesDateLine = west > east;
  const lngCondition = crossesDateLine ? `(lng >= ? OR lng <= ?)` : `(lng >= ? AND lng <= ?)`;

  const result = await db.getAllAsync(
    `SELECT id, lat, lng, species FROM hotspots
     WHERE lat >= ? AND lat <= ? AND ${lngCondition}`,
    [south, north, west, east]
  );

  return result.map((row: any) => ({
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    species: row.species,
  }));
}

export async function getHotspotById(id: string): Promise<{
  id: string;
  name: string;
  species: number;
  lat: number;
  lng: number;
  country: string;
  state: string;
  county: string;
  countryName: string | null;
  stateName: string | null;
  countyName: string | null;
} | null> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(
    `SELECT id, name, species, lat, lng, country, state, county, country_name, state_name, county_name
     FROM hotspots WHERE id = ?`,
    [id]
  );

  if (!result) return null;

  const row = result as any;
  return {
    id: row.id as string,
    name: row.name as string,
    species: row.species as number,
    lat: row.lat as number,
    lng: row.lng as number,
    country: row.country as string,
    state: row.state as string,
    county: row.county as string,
    countryName: row.country_name as string | null,
    stateName: row.state_name as string | null,
    countyName: row.county_name as string | null,
  };
}

export async function getPackById(id: number): Promise<{
  id: number;
  name: string;
  hotspots: number;
  installed_at: string;
  version: string | null;
  updated_at: string | null;
} | null> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(
    `SELECT id, name, hotspots, installed_at, version, updated_at FROM packs WHERE id = ?`,
    [id]
  );

  if (!result) return null;

  const row = result as any;
  return {
    id: row.id as number,
    name: row.name as string,
    hotspots: row.hotspots as number,
    installed_at: row.installed_at as string,
    version: row.version as string | null,
    updated_at: row.updated_at as string | null,
  };
}

export async function saveHotspot(hotspotId: string, notes?: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const existing = await db.getFirstAsync<{ trip_id: string | null }>(
    `SELECT trip_id FROM saved_hotspots WHERE hotspot_id = ?`,
    [hotspotId]
  );
  const savedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO saved_hotspots (hotspot_id, saved_at, notes, trip_id) VALUES (?, ?, ?, ?)`,
    [hotspotId, savedAt, notes || null, existing?.trip_id ?? null]
  );
}

export async function unsaveHotspot(hotspotId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  await db.runAsync(`DELETE FROM saved_hotspots WHERE hotspot_id = ?`, [hotspotId]);
}

export async function isHotspotSaved(hotspotId: string): Promise<boolean> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(`SELECT 1 FROM saved_hotspots WHERE hotspot_id = ?`, [hotspotId]);

  return !!result;
}

export async function getSavedHotspotById(
  hotspotId: string
): Promise<{ hotspot_id: string; saved_at: string; notes: string | null } | null> {
  if (!db) throw new Error("Database not initialized");

  const row: any = await db.getFirstAsync(
    `SELECT hotspot_id, saved_at, notes FROM saved_hotspots WHERE hotspot_id = ?`,
    [hotspotId]
  );

  if (!row) return null;

  return {
    hotspot_id: row.hotspot_id as string,
    saved_at: row.saved_at as string,
    notes: row.notes as string | null,
  };
}

export async function getSavedHotspots(): Promise<
  {
    hotspot_id: string;
    saved_at: string;
    notes: string | null;
  }[]
> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getAllAsync(`SELECT hotspot_id, saved_at, notes FROM saved_hotspots ORDER BY saved_at DESC`);

  return result.map((row: any) => ({
    hotspot_id: row.hotspot_id as string,
    saved_at: row.saved_at as string,
    notes: row.notes as string | null,
  }));
}

export async function uninstallPack(packId: number): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const database = db;
  await database.withTransactionAsync(async () => {
    await database.runAsync(`DELETE FROM targets WHERE pack_id = ?`, [packId]);
    await database.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);
    await database.runAsync(`DELETE FROM packs WHERE id = ?`, [packId]);
  });
}

export async function installPackWithTargets(
  packId: number,
  packName: string,
  version: string,
  updatedAt: string,
  hotspots: StaticPackHotspot[],
  targets: StaticPackTarget[]
): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const totalStart = Date.now();
  isInstallingPack = true;

  try {
    const database = db;

    // Optimize SQLite for bulk inserts
    await database.execAsync(`PRAGMA synchronous = OFF`);
    await database.execAsync(`PRAGMA journal_mode = MEMORY`);
    await database.execAsync(`PRAGMA cache_size = -64000`);

    await database.withTransactionAsync(async () => {
      // Delete existing data for this pack
      await database.runAsync(`DELETE FROM targets WHERE pack_id = ?`, [packId]);
      await database.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);

      // Insert/update pack record
      await database.runAsync(
        `INSERT OR REPLACE INTO packs (id, name, hotspots, installed_at, version, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [packId, packName, hotspots.length, new Date().toISOString(), version, updatedAt]
      );

      if (hotspots.length === 0) {
        return;
      }

      const batchSize = 1000;

      // Batch insert hotspots
      for (let i = 0; i < hotspots.length; i += batchSize) {
        const batch = hotspots.slice(i, i + batchSize);
        const values = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
        const params = batch.flatMap((hotspot) => [
          hotspot.id,
          hotspot.name,
          hotspot.species,
          hotspot.lat,
          hotspot.lng,
          hotspot.country || null,
          hotspot.state || null,
          hotspot.county || null,
          hotspot.countryName || null,
          hotspot.stateName || null,
          hotspot.countyName || null,
          packId,
        ]);

        await database.runAsync(
          `INSERT INTO hotspots (id, name, species, lat, lng, country, state, county, country_name, state_name, county_name, pack_id) VALUES ${values}`,
          params
        );
      }

      // Pre-stringify targets data outside the insert loop for better performance
      const targetsData = targets.map((target) => ({
        id: target.id,
        data: JSON.stringify({ samples: target.samples, species: target.species }),
      }));

      // Batch insert targets
      for (let i = 0; i < targetsData.length; i += batchSize) {
        const batch = targetsData.slice(i, i + batchSize);
        const values = batch.map(() => "(?, ?, ?)").join(", ");
        const params = batch.flatMap((target) => [target.id, target.data, packId]);

        await database.runAsync(`INSERT INTO targets (id, data, pack_id) VALUES ${values}`, params);
      }
    });

    // Reset PRAGMA settings to safe defaults
    await database.execAsync(`PRAGMA synchronous = NORMAL`);
    await database.execAsync(`PRAGMA journal_mode = WAL`);

    console.log(`[Pack] Installed in ${((Date.now() - totalStart) / 1000).toFixed(1)}s`);
  } finally {
    isInstallingPack = false;
  }
}

export async function cleanupPartialInstall(packId: number): Promise<void> {
  if (!db) return;

  const database = db;
  await database.withTransactionAsync(async () => {
    await database.runAsync(`DELETE FROM targets WHERE pack_id = ?`, [packId]);
    await database.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);
    await database.runAsync(`DELETE FROM packs WHERE id = ?`, [packId]);
  });
}

export async function savePlace({ id, name, notes, icon, lat, lng }: Omit<SavedPlace, "saved_at">): Promise<string> {
  if (!db) throw new Error("Database not initialized");

  const existing = await db.getFirstAsync<{ trip_id: string | null }>(
    `SELECT trip_id FROM saved_places WHERE id = ?`,
    [id]
  );
  const savedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO saved_places (id, name, notes, icon, lat, lng, saved_at, trip_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, notes, icon, lat, lng, savedAt, existing?.trip_id ?? null]
  );

  return id;
}

export async function getSavedPlaces(): Promise<SavedPlace[]> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getAllAsync(
    `SELECT id, name, notes, icon, lat, lng, saved_at FROM saved_places ORDER BY saved_at DESC`
  );

  return result.map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    notes: row.notes as string,
    icon: row.icon as string,
    lat: row.lat as number,
    lng: row.lng as number,
    saved_at: row.saved_at as string,
  }));
}

export async function getSavedPlaceById(id: string): Promise<SavedPlace | null> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(
    `SELECT id, name, notes, icon, lat, lng, saved_at FROM saved_places WHERE id = ?`,
    [id]
  );

  if (!result) return null;

  const row = result as any;
  return {
    id: row.id as string,
    name: row.name as string,
    notes: row.notes as string,
    icon: row.icon as string,
    lat: row.lat as number,
    lng: row.lng as number,
    saved_at: row.saved_at as string,
  };
}

export async function savePlaceNotes(id: string, notes: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  await db.runAsync(`UPDATE saved_places SET notes = ? WHERE id = ?`, [notes || null, id]);
}

export async function deletePlace(id: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  await db.runAsync(`DELETE FROM saved_places WHERE id = ?`, [id]);
}

type HotspotResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  species: number;
  country: string | null;
};

export async function getAllHotspots(limit: number, savedOnly = false): Promise<HotspotResult[]> {
  if (!db) throw new Error("Database not initialized");

  const query = savedOnly
    ? `SELECT h.id, h.name, h.lat, h.lng, h.species, h.country
       FROM hotspots h
       INNER JOIN saved_hotspots s ON h.id = s.hotspot_id
       ORDER BY h.name LIMIT ?`
    : `SELECT id, name, lat, lng, species, country FROM hotspots ORDER BY name LIMIT ?`;

  const result = await db.getAllAsync(query, [limit]);

  return result.map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    lat: row.lat as number,
    lng: row.lng as number,
    species: row.species as number,
    country: row.country as string | null,
  }));
}

type BoundingBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export async function getNearbyHotspots(bbox: BoundingBox, savedOnly = false): Promise<HotspotResult[]> {
  if (!db) throw new Error("Database not initialized");

  // When west > east, the bounding box crosses the international date line
  const crossesDateLine = bbox.west > bbox.east;
  const lngCondition = crossesDateLine ? `(h.lng >= ? OR h.lng <= ?)` : `(h.lng >= ? AND h.lng <= ?)`;

  const query = savedOnly
    ? `SELECT h.id, h.name, h.lat, h.lng, h.species, h.country
       FROM hotspots h
       INNER JOIN saved_hotspots s ON h.id = s.hotspot_id
       WHERE h.lat >= ? AND h.lat <= ? AND ${lngCondition}`
    : `SELECT id, name, lat, lng, species, country FROM hotspots h WHERE h.lat >= ? AND h.lat <= ? AND ${lngCondition}`;

  const result = await db.getAllAsync(query, [bbox.south, bbox.north, bbox.west, bbox.east]);

  return result.map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    lat: row.lat as number,
    lng: row.lng as number,
    species: row.species as number,
    country: row.country as string | null,
  }));
}

export async function searchHotspots(query: string, limit: number, savedOnly = false): Promise<HotspotResult[]> {
  if (!db) throw new Error("Database not initialized");

  const sql = savedOnly
    ? `SELECT h.id, h.name, h.lat, h.lng, h.species, h.country
       FROM hotspots h
       INNER JOIN saved_hotspots s ON h.id = s.hotspot_id
       WHERE h.name LIKE ? ORDER BY h.name LIMIT ?`
    : `SELECT id, name, lat, lng, species, country FROM hotspots WHERE name LIKE ? ORDER BY name LIMIT ?`;

  const result = await db.getAllAsync(sql, [`%${query}%`, limit]);

  return result.map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    lat: row.lat as number,
    lng: row.lng as number,
    species: row.species as number,
    country: row.country as string | null,
  }));
}

export type HotspotTarget = {
  speciesCode: string;
  observations: number;
  percentage: number;
};

export type HotspotTargetsResult = {
  samples: number;
  targets: HotspotTarget[];
  version: string | null;
};

export async function getTargetsForHotspot(hotspotId: string, months?: number[]): Promise<HotspotTargetsResult | null> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(
    `SELECT t.data, p.version FROM targets t LEFT JOIN packs p ON t.pack_id = p.id WHERE t.id = ?`,
    [hotspotId]
  );

  if (!result) return null;

  const row = result as { data: string; version: string | null };
  const data = JSON.parse(row.data) as {
    samples: (number | null)[];
    species: (string | number)[][];
  };

  // Determine which month indices to aggregate (0-11)
  const monthIndices = months && months.length > 0 ? months : data.samples.map((_, i) => i);

  const totalSamples = monthIndices.reduce((sum, i) => sum + (data.samples[i] ?? 0), 0);

  if (totalSamples === 0) return { samples: 0, targets: [], version: row.version };

  // Aggregate observations per species for selected months
  const speciesMap = new Map<string, number>();
  for (const speciesEntry of data.species) {
    const speciesCode = String(speciesEntry[0]);
    // Species entry layout: [code, janObs, febObs, ..., decObs] — index i+1 for month i
    const totalObs = monthIndices.reduce((sum, i) => {
      const val = speciesEntry[i + 1];
      return sum + (typeof val === "number" ? val : 0);
    }, 0);
    if (totalObs > 0) {
      speciesMap.set(speciesCode, (speciesMap.get(speciesCode) ?? 0) + totalObs);
    }
  }

  // Convert to array, calculate percentages, and sort by percentage descending
  const targets: HotspotTarget[] = Array.from(speciesMap.entries())
    .map(([speciesCode, observations]) => ({
      speciesCode,
      observations,
      percentage: (observations / totalSamples) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return { samples: totalSamples, targets, version: row.version };
}

export async function getPinnedTargets(hotspotId: string): Promise<string[]> {
  if (!db) throw new Error("Database not initialized");
  const rows = await db.getAllAsync<{ code: string }>(
    `SELECT code FROM pinned_targets WHERE hotspot_id = ? ORDER BY pinned_at`,
    [hotspotId]
  );
  return rows.map((r) => r.code);
}

export async function pinTarget(hotspotId: string, speciesCode: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const existing = await db.getFirstAsync<{ trip_id: string | null }>(
    `SELECT trip_id FROM pinned_targets WHERE hotspot_id = ? AND code = ?`,
    [hotspotId, speciesCode]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO pinned_targets (hotspot_id, code, pinned_at, trip_id) VALUES (?, ?, ?, ?)`,
    [hotspotId, speciesCode, new Date().toISOString(), existing?.trip_id ?? null]
  );
}

export async function unpinTarget(hotspotId: string, speciesCode: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await db.runAsync(`DELETE FROM pinned_targets WHERE hotspot_id = ? AND code = ?`, [hotspotId, speciesCode]);
}

export async function getTrips(): Promise<Trip[]> {
  if (!db) throw new Error("Database not initialized");

  const rows = await db.getAllAsync<Trip>(
    `SELECT
       t.id, t.type, t.name, t.start_month, t.end_month,
       t.min_lat, t.max_lat, t.min_lng, t.max_lng,
       t.imported_at, t.updated_at, t.update_token,
       (SELECT COUNT(*) FROM saved_hotspots WHERE trip_id = t.id) AS hotspot_count,
       (SELECT COUNT(*) FROM saved_places WHERE trip_id = t.id) AS marker_count
     FROM trips t
     ORDER BY t.imported_at DESC`
  );

  return rows;
}

export async function getTripById(tripId: string): Promise<Trip | null> {
  if (!db) throw new Error("Database not initialized");

  const row = await db.getFirstAsync<Trip>(
    `SELECT
       t.id, t.type, t.name, t.start_month, t.end_month,
       t.min_lat, t.max_lat, t.min_lng, t.max_lng,
       t.imported_at, t.updated_at, t.update_token,
       (SELECT COUNT(*) FROM saved_hotspots WHERE trip_id = t.id) AS hotspot_count,
       (SELECT COUNT(*) FROM saved_places WHERE trip_id = t.id) AS marker_count
     FROM trips t
     WHERE t.id = ?`,
    [tripId]
  );

  return row ?? null;
}

export async function importTrip(data: BirdPlanTripData): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const database = db;
  const now = new Date().toISOString();
  const existing = await database.getFirstAsync<{ imported_at: string; update_token: string | null }>(
    `SELECT imported_at, update_token FROM trips WHERE id = ?`,
    [data.id]
  );
  const importedAt = existing?.imported_at ?? now;
  // On initial import we receive a fresh updateToken. Refresh responses omit it — keep the one we already have.
  const updateToken = data.updateToken ?? existing?.update_token ?? null;

  await database.withTransactionAsync(async () => {
    // Remove any existing trip content so we start fresh.
    await deleteTripContent(database, data.id);

    await database.runAsync(
      `INSERT OR REPLACE INTO trips
        (id, type, name, start_month, end_month, min_lat, max_lat, min_lng, max_lng, imported_at, updated_at, update_token)
        VALUES (?, 'birdplan', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.startMonth ?? null,
        data.endMonth ?? null,
        data.bounds?.minY ?? null,
        data.bounds?.maxY ?? null,
        data.bounds?.minX ?? null,
        data.bounds?.maxX ?? null,
        importedAt,
        now,
        updateToken,
      ]
    );

    for (const hotspot of data.hotspots) {
      await database.runAsync(
        `INSERT OR REPLACE INTO saved_hotspots (hotspot_id, saved_at, notes, trip_id) VALUES (?, ?, ?, ?)`,
        [hotspot.id, now, hotspot.notes?.trim() || null, data.id]
      );

      if (hotspot.favs?.length) {
        for (const fav of hotspot.favs) {
          await database.runAsync(
            `INSERT OR REPLACE INTO pinned_targets (hotspot_id, code, pinned_at, trip_id) VALUES (?, ?, ?, ?)`,
            [hotspot.id, fav.code, now, data.id]
          );
        }
      }
    }

    for (const marker of data.markers) {
      const placeId = `${data.id}_${marker.id}`;
      await database.runAsync(
        `INSERT OR REPLACE INTO saved_places (id, name, notes, icon, lat, lng, saved_at, trip_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [placeId, marker.name, marker.notes?.trim() || null, marker.icon, marker.lat, marker.lng, now, data.id]
      );
    }
  });
}

async function deleteTripContent(database: SQLite.SQLiteDatabase, tripId: string): Promise<void> {
  await database.runAsync(`DELETE FROM saved_places WHERE trip_id = ?`, [tripId]);
  await database.runAsync(`DELETE FROM pinned_targets WHERE trip_id = ?`, [tripId]);
  await database.runAsync(`DELETE FROM saved_hotspots WHERE trip_id = ?`, [tripId]);
}

export async function deleteTrip(tripId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const database = db;
  await database.withTransactionAsync(async () => {
    await deleteTripContent(database, tripId);
    await database.runAsync(`DELETE FROM trips WHERE id = ?`, [tripId]);
  });
}
