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
      open INTEGER CHECK (open IN (0, 1) OR open IS NULL),
      notes TEXT,
      last_updated_by TEXT,
      pack_id INTEGER,
      updated_at TEXT,
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
): Promise<{ id: string; lat: number; lng: number; species: number; open: boolean | null }[]> {
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
    open: row.open === 1 ? true : row.open === 0 ? false : null,
  }));
}

export async function getHotspotById(id: string): Promise<{
  id: string;
  name: string;
  species: number;
  lat: number;
  lng: number;
  open: boolean | null;
  notes: string | null;
  lastUpdatedBy: string | null;
  updatedAt: string | null;
} | null> {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync(
    `SELECT id, name, species, lat, lng, open, notes, last_updated_by, updated_at 
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
    open: row.open === 1 ? true : row.open === 0 ? false : null,
    notes: row.notes as string | null,
    lastUpdatedBy: row.last_updated_by as string | null,
    updatedAt: row.updated_at as string | null,
  };
}
