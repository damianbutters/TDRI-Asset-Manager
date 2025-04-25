import { db } from "./db";
import { sql } from "drizzle-orm";

// Run this script to add tenant_id column to roadway_assets table
async function migrateRoadwayAssets() {
  console.log("Checking if tenant_id column exists in roadway_assets table...");
  
  try {
    // Check if the column already exists
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'roadway_assets' AND column_name = 'tenant_id';
    `);
    
    if (result.rowCount === 0) {
      console.log("tenant_id column does not exist in roadway_assets table. Adding it...");
      
      // Add the tenant_id column
      await db.execute(sql`
        ALTER TABLE roadway_assets
        ADD COLUMN tenant_id INTEGER;
      `);
      
      console.log("tenant_id column added successfully.");
    } else {
      console.log("tenant_id column already exists in roadway_assets table.");
    }
  } catch (error) {
    console.error("Error migrating roadway_assets table:", error);
  }
}

// Execute the migration
migrateRoadwayAssets()
  .then(() => console.log("Migration completed successfully."))
  .catch(err => console.error("Migration failed:", err));