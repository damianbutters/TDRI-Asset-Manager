import { db, pool } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * This script adds the email column to the users table and creates the magic_links table.
 */
async function migrateUsers() {
  console.log("Starting user schema migration...");

  try {
    // Add email column to users table
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
      ALTER COLUMN password DROP NOT NULL;
    `);
    
    console.log("Added email column to users table");

    // Create magic_links table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("Created magic_links table if it didn't exist");

    console.log("User schema migration completed successfully");
  } catch (error) {
    console.error("Failed to migrate user schema:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateUsers().catch(console.error);