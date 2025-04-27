import { db, pool } from "./db";
import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";

async function createTestUser() {
  try {
    // Generate a random username based on email
    const randomSuffix = randomBytes(4).toString('hex');
    const username = `damian_${randomSuffix}`;
    
    // Check if user already exists using raw SQL
    const checkQuery = `
      SELECT * FROM users WHERE email = $1
    `;
    const existingUserResult = await pool.query(checkQuery, ["damian@tdrisolutions.com"]);
    
    if (existingUserResult.rows.length > 0) {
      console.log("User with this email already exists");
      return;
    }
    
    // Create the user with raw SQL to avoid issues with schema mismatches
    const createUserQuery = `
      INSERT INTO users (username, email, full_name, role, is_system_admin, current_tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const userResult = await pool.query(createUserQuery, [
      username,
      "damian@tdrisolutions.com",
      "Damian Butters",
      "admin",
      true,
      1 // Set Mechanicsville as the current tenant
    ]);
    
    const userId = userResult.rows[0].id;
    console.log("Created test user with ID:", userId);
    
    // Add the user to the Mechanicsville tenant using raw SQL
    const addTenantQuery = `
      INSERT INTO user_tenants (user_id, tenant_id, role, is_admin)
      VALUES ($1, $2, $3, $4)
    `;
    
    await pool.query(addTenantQuery, [
      userId,
      1, // Mechanicsville tenant
      "admin",
      true
    ]);
    
    console.log("Added user to Mechanicsville tenant");
    
    console.log("User creation complete");
  } catch (error) {
    console.error("Error creating test user:", error);
  }
}

createTestUser().then(() => {
  console.log("User creation process completed");
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});