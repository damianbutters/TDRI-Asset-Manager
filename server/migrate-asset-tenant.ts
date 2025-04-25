import { db } from "./db";
import { sql } from "drizzle-orm";

// Run this script to add tenant_id column to asset_types table
async function migrateAssetTypes() {
  console.log("Checking if tenant_id column exists in asset_types table...");
  
  try {
    // Check if the column already exists
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'asset_types' AND column_name = 'tenant_id';
    `);
    
    if (result.rowCount === 0) {
      console.log("tenant_id column does not exist in asset_types table. Adding it...");
      
      // Add the tenant_id column
      await db.execute(sql`
        ALTER TABLE asset_types
        ADD COLUMN tenant_id INTEGER;
      `);
      
      console.log("tenant_id column added successfully.");
    } else {
      console.log("tenant_id column already exists in asset_types table.");
    }
  } catch (error) {
    console.error("Error migrating asset_types table:", error);
  }
}

// Execute the migration
migrateAssetTypes()
  .then(() => console.log("Migration completed successfully."))
  .catch(err => console.error("Migration failed:", err));