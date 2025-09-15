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
      last_synced TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS hotspots (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      region TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_hotspots_region_species 
    ON hotspots (region, species);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_hotspots_lat_lng 
    ON hotspots (lat, lng);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_hotspots_pack_id 
    ON hotspots (pack_id);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_packs_region 
    ON packs (region);
  `);
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("Database not initialized");
  return db;
}
