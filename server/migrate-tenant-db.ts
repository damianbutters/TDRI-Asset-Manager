import { pool } from "./db";

async function createTenantTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("Creating tenants table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        address TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log("Creating user_tenants table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_tenants (
        user_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, tenant_id)
      )
    `);
    
    console.log("Creating tenant_road_assets table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_road_assets (
        tenant_id INTEGER NOT NULL,
        road_asset_id INTEGER NOT NULL,
        PRIMARY KEY (tenant_id, road_asset_id)
      )
    `);
    
    console.log("Creating tenant_roadway_assets table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_roadway_assets (
        tenant_id INTEGER NOT NULL,
        roadway_asset_id INTEGER NOT NULL,
        PRIMARY KEY (tenant_id, roadway_asset_id)
      )
    `);
    
    // Check if users table exists
    const usersTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists
    `);
    
    if (usersTableResult.rows[0].exists) {
      // Check if current_tenant_id column exists in users table
      const columnResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'current_tenant_id'
        ) as exists
      `);
      
      if (!columnResult.rows[0].exists) {
        console.log("Adding current_tenant_id column to users table...");
        await client.query(`
          ALTER TABLE users ADD COLUMN current_tenant_id INTEGER NULL;
        `);
      }
    } else {
      console.log("Creating users table with tenant support...");
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL,
          is_system_admin BOOLEAN DEFAULT false,
          current_tenant_id INTEGER,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);
    }
    
    // Create initial tenant data
    console.log("Creating initial tenant data...");
    await client.query(`
      INSERT INTO tenants (name, code, description, contact_email, contact_phone, address, active)
      VALUES 
        ('Mechanicsville', 'MECH', 'Town of Mechanicsville, VA', 'info@mechanicsville.gov', '(804) 555-1212', '123 Main Street, Mechanicsville, VA 23111', true),
        ('Ashland', 'ASHL', 'Town of Ashland, VA', 'info@ashland.gov', '(804) 555-2323', '456 Center Street, Ashland, VA 23005', true)
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Create initial user if not exists
    console.log("Ensuring admin user exists...");
    const userResult = await client.query(`
      SELECT id FROM users WHERE username = 'admin'
    `);
    
    let adminUserId;
    if (userResult.rows.length === 0) {
      // Insert admin user
      const insertResult = await client.query(`
        INSERT INTO users (username, password, full_name, role, is_system_admin)
        VALUES ('admin', 'admin123', 'John Rodriguez', 'Road Manager', true)
        RETURNING id
      `);
      adminUserId = insertResult.rows[0].id;
    } else {
      adminUserId = userResult.rows[0].id;
    }
    
    // Get tenant IDs
    const tenantsResult = await client.query(`
      SELECT id FROM tenants WHERE code IN ('MECH', 'ASHL')
    `);
    
    // Add user to tenants
    for (const tenant of tenantsResult.rows) {
      await client.query(`
        INSERT INTO user_tenants (user_id, tenant_id, role, is_admin)
        VALUES ($1, $2, 'Road Manager', true)
        ON CONFLICT (user_id, tenant_id) DO NOTHING
      `, [adminUserId, tenant.id]);
    }
    
    // Set current tenant for user
    await client.query(`
      UPDATE users 
      SET current_tenant_id = (SELECT id FROM tenants WHERE code = 'MECH')
      WHERE id = $1
    `, [adminUserId]);
    
    await client.query('COMMIT');
    console.log("Tenant tables created successfully!");
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error creating tenant tables:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createTenantTables();
    console.log("Tenant database migration completed successfully!");
  } catch (error) {
    console.error("Error during tenant database migration:", error);
  } finally {
    await pool.end();
  }
}

main();