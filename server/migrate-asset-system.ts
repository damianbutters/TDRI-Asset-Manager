import { db } from "./db";
import { 
  assetTypes, 
  roadwayAssets, 
  assetInspections, 
  assetMaintenanceRecords 
} from "@shared/schema";
import { sql } from "drizzle-orm";

// Define default asset types
const defaultAssetTypes = [
  {
    name: "Pavement",
    description: "Road pavement sections including asphalt, concrete, and other surface materials",
    conditionRatingScale: "0-100",
    conditionRatingType: "numeric",
    category: "Surface",
    inspectionFrequencyMonths: 12,
    customFields: JSON.stringify({
      fields: [
        { name: "thickness", type: "number", label: "Pavement Thickness (inches)", required: true },
        { name: "material", type: "select", label: "Material Type", options: ["Asphalt", "Concrete", "Gravel", "Chip Seal"], required: true },
        { name: "baseType", type: "select", label: "Base Type", options: ["Aggregate", "Stabilized", "None"], required: false }
      ]
    })
  },
  {
    name: "Pavement Marking",
    description: "Road markings including centerlines, edge lines, stop bars, crosswalks, etc.",
    conditionRatingScale: "0-100",
    conditionRatingType: "numeric",
    category: "Surface",
    inspectionFrequencyMonths: 6,
    customFields: JSON.stringify({
      fields: [
        { name: "markingType", type: "select", label: "Marking Type", options: ["Centerline", "Edge Line", "Stop Bar", "Crosswalk", "Other"], required: true },
        { name: "material", type: "select", label: "Material", options: ["Paint", "Thermoplastic", "Tape", "Epoxy"], required: true },
        { name: "color", type: "select", label: "Color", options: ["White", "Yellow", "Red", "Blue"], required: true },
        { name: "length", type: "number", label: "Length (feet)", required: true }
      ]
    })
  },
  {
    name: "Traffic Sign",
    description: "Regulatory, warning, and informational road signs",
    conditionRatingScale: "0-100",
    conditionRatingType: "numeric",
    category: "Safety",
    inspectionFrequencyMonths: 6,
    customFields: JSON.stringify({
      fields: [
        { name: "signType", type: "select", label: "Sign Type", options: ["Stop", "Yield", "Speed Limit", "Warning", "Information", "Other"], required: true },
        { name: "mutcdCode", type: "text", label: "MUTCD Code", required: false },
        { name: "material", type: "select", label: "Material", options: ["Aluminum", "Steel", "Plastic", "Wood"], required: true },
        { name: "retroreflectivity", type: "number", label: "Retroreflectivity", required: false },
        { name: "size", type: "select", label: "Size", options: ["Standard", "Oversized", "Mini"], required: true },
        { name: "mounting", type: "select", label: "Mounting Type", options: ["Post", "Signal Mast", "Overhead", "Bridge", "Other"], required: true }
      ]
    })
  },
  {
    name: "Guard Rail",
    description: "Safety barriers along road edges",
    conditionRatingScale: "0-100",
    conditionRatingType: "numeric",
    category: "Safety",
    inspectionFrequencyMonths: 12,
    customFields: JSON.stringify({
      fields: [
        { name: "railType", type: "select", label: "Rail Type", options: ["W-Beam", "Thrie-Beam", "Cable", "Concrete", "Other"], required: true },
        { name: "length", type: "number", label: "Length (feet)", required: true },
        { name: "height", type: "number", label: "Height (inches)", required: true },
        { name: "endTreatment", type: "select", label: "End Treatment", options: ["Energy Absorbing", "Flared", "Buried", "None"], required: true }
      ]
    })
  },
  {
    name: "Curb",
    description: "Raised edge along the side of a road",
    conditionRatingScale: "0-100",
    conditionRatingType: "numeric",
    category: "Drainage",
    inspectionFrequencyMonths: 12,
    customFields: JSON.stringify({
      fields: [
        { name: "curbType", type: "select", label: "Curb Type", options: ["Barrier", "Mountable", "Roll", "Other"], required: true },
        { name: "material", type: "select", label: "Material", options: ["Concrete", "Granite", "Asphalt", "Other"], required: true },
        { name: "length", type: "number", label: "Length (feet)", required: true },
        { name: "height", type: "number", label: "Height (inches)", required: true }
      ]
    })
  }
];

/**
 * Creates the tables for the asset inventory system
 */
async function createAssetInventoryTables() {
  try {
    // Check if asset_types table exists
    const assetTypesExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'asset_types'
      );
    `);

    if (!assetTypesExists.rows[0].exists) {
      console.log("Creating asset inventory tables...");
      
      // Create tables
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS asset_types (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL,
          condition_rating_scale TEXT NOT NULL DEFAULT '0-100',
          condition_rating_type TEXT NOT NULL DEFAULT 'numeric',
          category TEXT NOT NULL,
          inspection_frequency_months INTEGER NOT NULL DEFAULT 12,
          custom_fields JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          active BOOLEAN NOT NULL DEFAULT TRUE
        );

        CREATE TABLE IF NOT EXISTS roadway_assets (
          id SERIAL PRIMARY KEY,
          asset_id TEXT NOT NULL,
          asset_type_id INTEGER NOT NULL REFERENCES asset_types(id),
          name TEXT NOT NULL,
          description TEXT,
          location TEXT NOT NULL,
          road_asset_id INTEGER REFERENCES road_assets(id),
          install_date TIMESTAMP,
          manufacture_date TIMESTAMP,
          manufacturer TEXT,
          model TEXT,
          serial_number TEXT,
          condition INTEGER NOT NULL DEFAULT 100,
          last_inspection TIMESTAMP,
          next_inspection TIMESTAMP,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          geometry JSONB,
          custom_data JSONB,
          last_maintenance_date TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          active BOOLEAN NOT NULL DEFAULT TRUE,
          CONSTRAINT roadway_assets_asset_id_unique UNIQUE (asset_id)
        );

        CREATE TABLE IF NOT EXISTS asset_inspections (
          id SERIAL PRIMARY KEY,
          roadway_asset_id INTEGER NOT NULL REFERENCES roadway_assets(id) ON DELETE CASCADE,
          inspection_date TIMESTAMP NOT NULL,
          inspector_id INTEGER REFERENCES users(id),
          condition INTEGER NOT NULL,
          comments TEXT,
          images JSONB,
          maintenance_needed BOOLEAN DEFAULT FALSE,
          maintenance_notes TEXT,
          custom_inspection_data JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS asset_maintenance_records (
          id SERIAL PRIMARY KEY,
          roadway_asset_id INTEGER NOT NULL REFERENCES roadway_assets(id) ON DELETE CASCADE,
          maintenance_date TIMESTAMP NOT NULL,
          maintenance_type_id INTEGER REFERENCES maintenance_types(id),
          performed_by INTEGER REFERENCES users(id),
          cost DOUBLE PRECISION,
          description TEXT NOT NULL,
          before_condition INTEGER,
          after_condition INTEGER,
          materials JSONB,
          labor_hours DOUBLE PRECISION,
          equipment_used TEXT,
          custom_maintenance_data JSONB,
          images JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Insert default asset types
      console.log("Inserting default asset types...");
      for (const assetType of defaultAssetTypes) {
        await db.insert(assetTypes).values(assetType);
      }

      console.log("Asset inventory tables created successfully!");
    } else {
      console.log("Asset inventory tables already exist.");
    }
  } catch (error) {
    console.error("Error creating asset inventory tables:", error);
    throw error;
  }
}

// Run the migration
async function migrateAssetInventorySystem() {
  try {
    console.log("Starting asset inventory system migration...");
    await createAssetInventoryTables();
    console.log("Asset inventory system migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Asset inventory system migration failed:", error);
    process.exit(1);
  }
}

// Execute the migration
migrateAssetInventorySystem();