import * as SQLite from "expo-sqlite";
import { SavedPlace, StaticPackHotspot, StaticPackTarget } from "./types";

let db: SQLite.SQLiteDatabase | null = null;
let isInstallingPack = false;

export async function initializeDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync("openbirding.db");
    await createTables();
    await createIndexes();
    await runMigrations();
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

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saved_hotspots (
      hotspot_id TEXT PRIMARY KEY NOT NULL,
      saved_at TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (hotspot_id) REFERENCES hotspots (id) ON DELETE CASCADE
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
      saved_at TEXT NOT NULL
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
}

async function runMigrations(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const tableInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(packs)");
  const columns = tableInfo.map((col) => col.name);

  if (!columns.includes("version")) {
    await db.execAsync(`ALTER TABLE packs ADD COLUMN version TEXT`);
  }
  if (!columns.includes("updated_at")) {
    await db.execAsync(`ALTER TABLE packs ADD COLUMN updated_at TEXT`);
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

  const savedAt = new Date().toISOString();
  await db.runAsync(`INSERT OR REPLACE INTO saved_hotspots (hotspot_id, saved_at, notes) VALUES (?, ?, ?)`, [
    hotspotId,
    savedAt,
    notes || null,
  ]);
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

  const savedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO saved_places (id, name, notes, icon, lat, lng, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, notes, icon, lat, lng, savedAt]
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
