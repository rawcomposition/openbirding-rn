import * as SQLite from "expo-sqlite";
import { ApiPackResponse, SavedPlace } from "./types";

let db: SQLite.SQLiteDatabase | null = null;
let isInstallingPack = false;

export async function initializeDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync("openbirding.db");
    await createTables();
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
      installed_at TEXT
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
      color TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      saved_at TEXT NOT NULL
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

  const result = await db.getAllAsync(
    `SELECT id, lat, lng, species FROM hotspots 
     WHERE lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?`,
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
} | null> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(`SELECT id, name, hotspots, installed_at FROM packs WHERE id = ?`, [id]);

  if (!result) return null;

  const row = result as any;
  return {
    id: row.id as number,
    name: row.name as string,
    hotspots: row.hotspots as number,
    installed_at: row.installed_at as string,
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

export function checkIsPackInstalling(): boolean {
  return isInstallingPack;
}

export async function installPack(
  packId: number,
  packName: string,
  hotspots: ApiPackResponse["hotspots"]
): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  isInstallingPack = true;
  try {
    const database = db;
    await database.withTransactionAsync(async () => {
      await database.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);

      await database.runAsync(`INSERT OR REPLACE INTO packs (id, name, hotspots, installed_at) VALUES (?, ?, ?, ?)`, [
        packId,
        packName,
        hotspots.length,
        new Date().toISOString(),
      ]);

      if (hotspots.length === 0) {
        return;
      }

      const batchSize = 500;
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
    });
  } finally {
    isInstallingPack = false;
  }
}

export async function uninstallPack(packId: number): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const database = db;
  await database.withTransactionAsync(async () => {
    await database.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);
    await database.runAsync(`DELETE FROM packs WHERE id = ?`, [packId]);
  });
}

export async function savePlace({ id, name, notes, color, lat, lng }: Omit<SavedPlace, "saved_at">): Promise<string> {
  if (!db) throw new Error("Database not initialized");

  const savedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO saved_places (id, name, notes, color, lat, lng, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, notes, color, lat, lng, savedAt]
  );
  return id;
}

export async function getSavedPlaceById(id: string): Promise<SavedPlace | null> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(
    `SELECT id, name, notes, color, lat, lng, saved_at FROM saved_places WHERE id = ?`,
    [id]
  );

  if (!result) return null;

  const row = result as any;
  return {
    id: row.id as string,
    name: row.name as string,
    notes: row.notes as string,
    color: row.color as string,
    lat: row.lat as number,
    lng: row.lng as number,
    saved_at: row.saved_at as string,
  };
}
