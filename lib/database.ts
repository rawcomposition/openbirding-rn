import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

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
} | null> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(
    `SELECT id, name, species, lat, lng 
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
