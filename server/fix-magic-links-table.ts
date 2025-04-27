import { pool } from "./db";

/**
 * This script adds the missing created_at column to the magic_links table
 */
async function fixMagicLinksTable() {
  console.log("Starting fix for magic_links table...");

  try {
    // Check if the column already exists
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'magic_links' AND column_name = 'created_at'
    `;
    
    const result = await pool.query(checkQuery);
    
    if (result.rows.length > 0) {
      console.log("created_at column already exists in magic_links table.");
      return;
    }
    
    // Add the created_at column with default value of current timestamp
    const alterQuery = `
      ALTER TABLE magic_links
      ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW()
    `;
    
    await pool.query(alterQuery);
    console.log("Successfully added created_at column to magic_links table");
  } catch (error) {
    console.error("Error fixing magic_links table:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixMagicLinksTable().then(() => {
  console.log("Fix completed successfully");
  process.exit(0);
}).catch(error => {
  console.error("Fix failed:", error);
  process.exit(1);
});