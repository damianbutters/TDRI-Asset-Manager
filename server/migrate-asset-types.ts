import { pool } from "./db";

/**
 * Updates the asset_types table to add the new map_shape and map_color columns
 */
async function updateAssetTypesTable() {
  try {
    console.log("Adding map_shape and map_color columns to asset_types table...");
    
    // Check if columns exist first
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'asset_types' 
      AND column_name IN ('map_shape', 'map_color');
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    
    // Add map_shape column if it doesn't exist
    if (!existingColumns.includes('map_shape')) {
      await pool.query(`
        ALTER TABLE asset_types 
        ADD COLUMN map_shape TEXT NOT NULL DEFAULT 'circle';
      `);
      console.log("Added map_shape column");
    } else {
      console.log("map_shape column already exists");
    }
    
    // Add map_color column if it doesn't exist
    if (!existingColumns.includes('map_color')) {
      await pool.query(`
        ALTER TABLE asset_types 
        ADD COLUMN map_color TEXT NOT NULL DEFAULT '#3b82f6';
      `);
      console.log("Added map_color column");
    } else {
      console.log("map_color column already exists");
    }
    
    console.log("Successfully updated asset_types table");
    
    // Set default shapes and colors based on category
    await pool.query(`
      UPDATE asset_types SET map_shape = 'square', map_color = '#ef4444' WHERE category = 'Safety';
      UPDATE asset_types SET map_shape = 'triangle', map_color = '#f97316' WHERE category = 'Drainage';
      UPDATE asset_types SET map_shape = 'diamond', map_color = '#84cc16' WHERE category = 'Structure';
      UPDATE asset_types SET map_shape = 'circle', map_color = '#3b82f6' WHERE category = 'Surface';
    `);
    
    console.log("Updated default shapes and colors based on categories");
    
  } catch (error) {
    console.error("Error updating asset_types table:", error);
    throw error;
  }
}

async function main() {
  try {
    await updateAssetTypesTable();
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

main();