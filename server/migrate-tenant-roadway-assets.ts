import { db } from "./db";
import { sql } from "drizzle-orm";

// Run this script to create or update the tenant_roadway_assets table
async function migrateTenantRoadwayAssetsTable() {
  console.log("Checking if tenant_roadway_assets table exists...");
  
  try {
    // Check if the table exists
    const tableResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tenant_roadway_assets'
      );
    `);
    
    const tableExists = tableResult.rows[0].exists;
    
    if (!tableExists) {
      console.log("tenant_roadway_assets table does not exist. Creating it...");
      
      // Create the table
      await db.execute(sql`
        CREATE TABLE tenant_roadway_assets (
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          roadway_asset_id INTEGER NOT NULL REFERENCES roadway_assets(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
          PRIMARY KEY (tenant_id, roadway_asset_id)
        );
      `);
      
      console.log("tenant_roadway_assets table created successfully.");
    } else {
      console.log("tenant_roadway_assets table already exists. Checking columns...");
      
      // Check if created_at column exists
      const columnResult = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'tenant_roadway_assets' AND column_name = 'created_at'
        );
      `);
      
      const createdAtExists = columnResult.rows[0].exists;
      
      if (!createdAtExists) {
        console.log("created_at column does not exist in tenant_roadway_assets table. Adding it...");
        
        // Add the created_at column
        await db.execute(sql`
          ALTER TABLE tenant_roadway_assets
          ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
        `);
        
        console.log("created_at column added successfully.");
      } else {
        console.log("created_at column already exists in tenant_roadway_assets table.");
      }
    }
  } catch (error) {
    console.error("Error migrating tenant_roadway_assets table:", error);
  }
}

// Execute the migration
migrateTenantRoadwayAssetsTable()
  .then(() => console.log("Migration completed successfully."))
  .catch(err => console.error("Migration failed:", err));