import { db } from "./db";
import { tenants, userTenants, tenantRoadAssets, tenantRoadwayAssets } from "@shared/schema";

/**
 * Creates the tables for the multi-tenant system
 */
async function createTenantTables() {
  console.log("Creating tenants table...");
  await db.schema.createTable(tenants).ifNotExists().execute();
  
  console.log("Creating userTenants table...");
  await db.schema.createTable(userTenants).ifNotExists().execute();
  
  console.log("Creating tenantRoadAssets table...");
  await db.schema.createTable(tenantRoadAssets).ifNotExists().execute();
  
  console.log("Creating tenantRoadwayAssets table...");
  await db.schema.createTable(tenantRoadwayAssets).ifNotExists().execute();
  
  console.log("Tenant system tables created successfully!");
}

/**
 * Migrates the multi-tenant system tables
 */
async function migrateTenantSystem() {
  try {
    await createTenantTables();
    console.log("Tenant system migration completed successfully!");
  } catch (error) {
    console.error("Error migrating tenant system:", error);
  }
}

// Run the migration
migrateTenantSystem().then(() => {
  console.log("Tenant system migration process finished");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error during tenant system migration:", error);
  process.exit(1);
});