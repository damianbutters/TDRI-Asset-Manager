import { db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

async function migrateTables() {
  try {
    console.log("Starting database migration...");

    // Add weather station fields to road assets table
    console.log("Adding weather station fields to road_assets table...");
    await db.execute(sql`
      ALTER TABLE road_assets 
      ADD COLUMN IF NOT EXISTS weather_station_id TEXT,
      ADD COLUMN IF NOT EXISTS weather_station_name TEXT,
      ADD COLUMN IF NOT EXISTS last_rainfall_update TIMESTAMP;
    `);
    console.log("Road assets table updated successfully");

    // Create rainfall history table if it doesn't exist
    console.log("Creating rainfall_history table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rainfall_history (
        id SERIAL PRIMARY KEY,
        road_asset_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        rainfall_inches DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (road_asset_id) REFERENCES road_assets(id) ON DELETE CASCADE
      );
    `);
    console.log("Rainfall history table created successfully");

    // Add any indexes needed
    console.log("Adding indexes...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_rainfall_road_asset ON rainfall_history (road_asset_id);
      CREATE INDEX IF NOT EXISTS idx_rainfall_month ON rainfall_history (month);
    `);
    console.log("Indexes created successfully");

    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Error during database migration:", error);
    throw error;
  }
}

// Execute migration
migrateTables()
  .then(() => {
    console.log("Migration completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });