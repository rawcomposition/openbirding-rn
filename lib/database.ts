import * as SQLite from "expo-sqlite";
import { Hotspot } from "./types";

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
    CREATE TABLE IF NOT EXISTS hotspots (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      region TEXT,
      species INTEGER NOT NULL DEFAULT 0,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      open INTEGER CHECK (open IN (0, 1) OR open IS NULL),
      notes TEXT,
      updated_at TEXT
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
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("Database not initialized");
  return db;
}
