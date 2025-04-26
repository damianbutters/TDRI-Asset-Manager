import { pgTable, text, serial, integer, timestamp, doublePrecision, json, boolean, unique, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Tenant table
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  code: text("code").notNull().unique(), // Short unique code for the tenant
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  isSystemAdmin: boolean("is_system_admin").default(false), // System admins can access all tenants
  currentTenantId: integer("current_tenant_id"), // Currently selected tenant
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Many-to-many relationship between users and tenants
export const userTenants = pgTable("user_tenants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  role: text("role").notNull(), // Role within this specific tenant
  isAdmin: boolean("is_admin").default(false), // Admin for this specific tenant
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    compoundKey: unique({ columns: [table.userId, table.tenantId] })
  };
});

export const insertUserTenantSchema = createInsertSchema(userTenants).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  isSystemAdmin: true,
});

// Road Asset table
export const roadAssets = pgTable("road_assets", {
  id: serial("id").primaryKey(),
  assetId: text("asset_id").notNull().unique(), // e.g. RS-1024
  name: text("name").notNull(), // e.g. Main St
  location: text("location").notNull(), // e.g. Mile 0-2.4
  length: doublePrecision("length").notNull(), // in miles
  width: doublePrecision("width").notNull(), // in feet
  surfaceType: text("surface_type").notNull(), // e.g. Asphalt, Concrete
  condition: integer("condition").notNull(), // 0-100 PCI
  moistureLevel: doublePrecision("moisture_level"), // moisture level in percentage
  lastMoistureReading: timestamp("last_moisture_reading"), // date of last moisture reading
  lastInspection: timestamp("last_inspection").notNull(),
  nextInspection: timestamp("next_inspection"),
  geometry: json("geometry"), // GeoJSON for the road segment
  weatherStationId: text("weather_station_id"), // ID of the nearest weather station
  weatherStationName: text("weather_station_name"), // Name of the nearest weather station
  lastRainfallUpdate: timestamp("last_rainfall_update"), // When rainfall data was last updated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRoadAssetSchema = createInsertSchema(roadAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Moisture Reading table - stores individual moisture readings at specific coordinates
export const moistureReadings = pgTable("moisture_readings", {
  id: serial("id").primaryKey(),
  roadAssetId: integer("road_asset_id").notNull().references(() => roadAssets.id, { onDelete: 'cascade' }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  moistureValue: doublePrecision("moisture_value").notNull(), // moisture level in percentage
  readingDate: timestamp("reading_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create the initial schema
const baseInsertMoistureReadingSchema = createInsertSchema(moistureReadings).omit({
  id: true,
  createdAt: true,
});

// Create a modified schema that accepts string dates and converts them to Date objects
export const insertMoistureReadingSchema = baseInsertMoistureReadingSchema.extend({
  readingDate: z.preprocess(
    (arg) => {
      if (typeof arg === 'string' || arg instanceof Date) {
        return new Date(arg);
      }
      return arg;
    },
    z.date()
  )
});

// Define relations
export const moistureReadingsRelations = relations(moistureReadings, ({ one }) => ({
  roadAsset: one(roadAssets, {
    fields: [moistureReadings.roadAssetId],
    references: [roadAssets.id],
  }),
}));

// Condition state descriptors
export const conditionStates = {
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
  CRITICAL: "critical",
} as const;

export type ConditionState = typeof conditionStates[keyof typeof conditionStates];

// Helper function to convert numerical condition to state
export function getConditionState(condition: number): ConditionState {
  if (condition >= 80) return conditionStates.GOOD;
  if (condition >= 60) return conditionStates.FAIR;
  if (condition >= 40) return conditionStates.POOR;
  return conditionStates.CRITICAL;
}

// Maintenance table
export const maintenanceTypes = pgTable("maintenance_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  lifespanExtension: integer("lifespan_extension").notNull(), // in years
  conditionImprovement: integer("condition_improvement").notNull(), // points added to condition
  costPerMile: doublePrecision("cost_per_mile").notNull(), // in dollars
  applicableMinCondition: integer("applicable_min_condition"), // minimum condition score for this maintenance type
  applicableMaxCondition: integer("applicable_max_condition"), // maximum condition score for this maintenance type
});

export const insertMaintenanceTypeSchema = createInsertSchema(maintenanceTypes).omit({
  id: true,
});

// Maintenance Projects table
export const maintenanceProjects = pgTable("maintenance_projects", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull().unique(), // e.g. PR-2023-042
  roadAssetId: integer("road_asset_id").notNull(), // reference to road_assets.id
  maintenanceTypeId: integer("maintenance_type_id").notNull(), // reference to maintenance_types.id
  status: text("status").notNull(), // e.g. Planned, In Progress, Completed
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  cost: doublePrecision("cost"), // actual cost if available
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedBy: integer("updated_by"), // reference to users.id
});

export const insertMaintenanceProjectSchema = createInsertSchema(maintenanceProjects).omit({
  id: true,
  createdAt: true,
});

// Policies for maintenance triggers based on condition
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  surfaceType: text("surface_type").notNull(), // applies to which surface type
  conditionThreshold: integer("condition_threshold").notNull(), // trigger when condition falls below this
  maintenanceTypeId: integer("maintenance_type_id").notNull(), // what maintenance to apply
  priority: integer("priority").notNull(), // 1 = highest
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPolicySchema = createInsertSchema(policies);

// Budget allocations
export const budgetAllocations = pgTable("budget_allocations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g. "FY 2023 Budget"
  description: text("description"),
  fiscalYear: integer("fiscal_year").notNull(),
  totalBudget: doublePrecision("total_budget").notNull(), // in dollars
  preventiveMaintenance: doublePrecision("preventive_maintenance").notNull(), // in dollars
  minorRehabilitation: doublePrecision("minor_rehabilitation").notNull(), // in dollars
  majorRehabilitation: doublePrecision("major_rehabilitation").notNull(), // in dollars
  reconstruction: doublePrecision("reconstruction").notNull(), // in dollars
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by"), // reference to users.id
  active: text("active").notNull().default("false"),
});

export const insertBudgetAllocationSchema = createInsertSchema(budgetAllocations);

// Audit logs
// Rainfall history for each road asset
export const rainfallHistory = pgTable("rainfall_history", {
  id: serial("id").primaryKey(),
  roadAssetId: integer("road_asset_id").notNull(), // reference to road_assets.id
  month: text("month").notNull(), // Format: "YYYY-MM"
  rainfallInches: doublePrecision("rainfall_inches").notNull(), // rainfall in inches
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertRainfallHistorySchema = createInsertSchema(rainfallHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userId: integer("user_id"), // reference to users.id
  username: text("username").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  ipAddress: text("ip_address"),
  resourceType: text("resource_type"), // e.g. "road_asset", "maintenance_project"
  resourceId: text("resource_id"), // id of the affected resource
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Define relationships between tables
export const roadAssetsRelations = relations(roadAssets, ({ many }) => ({
  maintenanceProjects: many(maintenanceProjects),
  rainfallHistory: many(rainfallHistory),
  moistureReadings: many(moistureReadings),
}));

export const rainfallHistoryRelations = relations(rainfallHistory, ({ one }) => ({
  roadAsset: one(roadAssets, {
    fields: [rainfallHistory.roadAssetId],
    references: [roadAssets.id],
  }),
}));

export const maintenanceTypesRelations = relations(maintenanceTypes, ({ many }) => ({
  maintenanceProjects: many(maintenanceProjects),
  policies: many(policies),
}));

export const maintenanceProjectsRelations = relations(maintenanceProjects, ({ one }) => ({
  roadAsset: one(roadAssets, {
    fields: [maintenanceProjects.roadAssetId],
    references: [roadAssets.id],
  }),
  maintenanceType: one(maintenanceTypes, {
    fields: [maintenanceProjects.maintenanceTypeId],
    references: [maintenanceTypes.id],
  }),
  updatedByUser: one(users, {
    fields: [maintenanceProjects.updatedBy],
    references: [users.id],
    relationName: "user_maintenance_projects"
  })
}));

export const policiesRelations = relations(policies, ({ one }) => ({
  maintenanceType: one(maintenanceTypes, {
    fields: [policies.maintenanceTypeId],
    references: [maintenanceTypes.id],
  })
}));

export const budgetAllocationsRelations = relations(budgetAllocations, ({ one }) => ({
  createdByUser: one(users, {
    fields: [budgetAllocations.createdBy],
    references: [users.id],
    relationName: "user_budget_allocations"
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
    relationName: "user_audit_logs"
  })
}));

// Tenant-related relations will be defined later to prevent circular dependencies

// User-tenant relations
export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, {
    fields: [userTenants.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenants.tenantId],
    references: [tenants.id],
  }),
}));

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenants: many(userTenants),
  currentTenant: one(tenants, {
    fields: [users.currentTenantId],
    references: [tenants.id],
  }),
  maintenanceProjects: many(maintenanceProjects, { relationName: "user_maintenance_projects" }),
  budgetAllocations: many(budgetAllocations, { relationName: "user_budget_allocations" }),
  auditLogs: many(auditLogs, { relationName: "user_audit_logs" }),
  assetInspections: many(assetInspections),
  assetMaintenanceRecords: many(assetMaintenanceRecords),
}));

// Relation definitions moved after the table definitions to fix reference errors

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type RoadAsset = typeof roadAssets.$inferSelect;
export type InsertRoadAsset = z.infer<typeof insertRoadAssetSchema>;

export type MaintenanceType = typeof maintenanceTypes.$inferSelect;
export type InsertMaintenanceType = z.infer<typeof insertMaintenanceTypeSchema>;

export type MaintenanceProject = typeof maintenanceProjects.$inferSelect;
export type InsertMaintenanceProject = z.infer<typeof insertMaintenanceProjectSchema>;

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type InsertBudgetAllocation = z.infer<typeof insertBudgetAllocationSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type RainfallHistory = typeof rainfallHistory.$inferSelect;
export type InsertRainfallHistory = z.infer<typeof insertRainfallHistorySchema>;

export type MoistureReading = typeof moistureReadings.$inferSelect;
export type InsertMoistureReading = z.infer<typeof insertMoistureReadingSchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type UserTenant = typeof userTenants.$inferSelect;
export type InsertUserTenant = z.infer<typeof insertUserTenantSchema>;

// Many-to-many relationship between tenants and road assets
export const tenantRoadAssets = pgTable("tenant_road_assets", {
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  roadAssetId: integer("road_asset_id").notNull().references(() => roadAssets.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.tenantId, table.roadAssetId] })
  };
});

// Asset Types table - for defining custom asset types
export const assetTypes = pgTable("asset_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g. "Pavement", "Sign", "Guardrail", etc.
  description: text("description").notNull(),
  conditionRatingScale: text("condition_rating_scale").notNull().default("0-100"), // e.g. "0-100", "1-5", etc.
  conditionRatingType: text("condition_rating_type").notNull().default("numeric"), // e.g. "numeric", "text", etc.
  category: text("category").notNull(), // e.g. "Surface", "Safety", "Drainage", etc.
  inspectionFrequencyMonths: integer("inspection_frequency_months").notNull().default(12), // default frequency in months
  mapShape: text("map_shape").notNull().default("circle"), // e.g. "circle", "square", "triangle", "diamond", etc.
  mapColor: text("map_color").notNull().default("#3b82f6"), // Default to blue
  customFields: json("custom_fields"), // Store additional field definitions specific to this asset type
  tenantId: integer("tenant_id"), // Which tenant owns this asset type, null means global/system
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
});

export const insertAssetTypeSchema = createInsertSchema(assetTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Roadway Assets table - generic table for all types of road assets
export const roadwayAssets = pgTable("roadway_assets", {
  id: serial("id").primaryKey(),
  assetId: text("asset_id").notNull(), // e.g. "SG-2023-001" (sign), "GR-2023-002" (guardrail)
  assetTypeId: integer("asset_type_id").notNull().references(() => assetTypes.id),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  roadAssetId: integer("road_asset_id").references(() => roadAssets.id), // Associated with which road (optional)
  installDate: timestamp("install_date"),
  manufactureDate: timestamp("manufacture_date"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  condition: integer("condition").notNull().default(100), // General condition score (0-100)
  lastInspection: timestamp("last_inspection"),
  nextInspection: timestamp("next_inspection"),
  latitude: doublePrecision("latitude"), // Exact location
  longitude: doublePrecision("longitude"), // Exact location
  geometry: json("geometry"), // For line/polygon assets like guardrails or pavement markings
  customData: json("custom_data"), // Store type-specific data (varies by asset type)
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  tenantId: integer("tenant_id"), // Which tenant owns this asset, null means global/system
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
}, (table) => {
  return {
    assetIdUnique: unique().on(table.assetId),
  };
});

// Many-to-many relationship between tenants and roadway assets
export const tenantRoadwayAssets = pgTable("tenant_roadway_assets", {
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  roadwayAssetId: integer("roadway_asset_id").notNull().references(() => roadwayAssets.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.tenantId, table.roadwayAssetId] })
  };
});

export const insertRoadwayAssetSchema = createInsertSchema(roadwayAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Asset inspections table
export const assetInspections = pgTable("asset_inspections", {
  id: serial("id").primaryKey(),
  roadwayAssetId: integer("roadway_asset_id").notNull().references(() => roadwayAssets.id, { onDelete: 'cascade' }),
  inspectionDate: timestamp("inspection_date").notNull(),
  inspectorId: integer("inspector_id").references(() => users.id),
  condition: integer("condition").notNull(), // 0-100 or other scale as defined in asset type
  comments: text("comments"),
  images: json("images"), // Array of image URLs or base64 strings
  maintenanceNeeded: boolean("maintenance_needed").default(false),
  maintenanceNotes: text("maintenance_notes"),
  customInspectionData: json("custom_inspection_data"), // Additional inspection data specific to asset type
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssetInspectionSchema = createInsertSchema(assetInspections).omit({
  id: true,
  createdAt: true,
});

// Asset maintenance records
export const assetMaintenanceRecords = pgTable("asset_maintenance_records", {
  id: serial("id").primaryKey(),
  roadwayAssetId: integer("roadway_asset_id").notNull().references(() => roadwayAssets.id, { onDelete: 'cascade' }),
  maintenanceDate: timestamp("maintenance_date").notNull(),
  maintenanceTypeId: integer("maintenance_type_id").references(() => maintenanceTypes.id),
  performedBy: integer("performed_by").references(() => users.id),
  cost: doublePrecision("cost"),
  description: text("description").notNull(),
  beforeCondition: integer("before_condition"),
  afterCondition: integer("after_condition"),
  materials: json("materials"), // Materials used
  laborHours: doublePrecision("labor_hours"),
  equipmentUsed: text("equipment_used"),
  customMaintenanceData: json("custom_maintenance_data"), // Additional maintenance data
  images: json("images"), // Array of image URLs or base64 strings
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssetMaintenanceRecordSchema = createInsertSchema(assetMaintenanceRecords).omit({
  id: true,
  createdAt: true,
});

// Define relationships for new tables
export const assetTypesRelations = relations(assetTypes, ({ many }) => ({
  roadwayAssets: many(roadwayAssets),
}));

export const roadwayAssetsRelations = relations(roadwayAssets, ({ one, many }) => ({
  assetType: one(assetTypes, {
    fields: [roadwayAssets.assetTypeId],
    references: [assetTypes.id],
  }),
  roadAsset: one(roadAssets, {
    fields: [roadwayAssets.roadAssetId],
    references: [roadAssets.id],
  }),
  inspections: many(assetInspections),
  maintenanceRecords: many(assetMaintenanceRecords),
}));

export const assetInspectionsRelations = relations(assetInspections, ({ one }) => ({
  roadwayAsset: one(roadwayAssets, {
    fields: [assetInspections.roadwayAssetId],
    references: [roadwayAssets.id],
  }),
  inspector: one(users, {
    fields: [assetInspections.inspectorId],
    references: [users.id],
  }),
}));

export const assetMaintenanceRecordsRelations = relations(assetMaintenanceRecords, ({ one }) => ({
  roadwayAsset: one(roadwayAssets, {
    fields: [assetMaintenanceRecords.roadwayAssetId],
    references: [roadwayAssets.id],
  }),
  maintenanceType: one(maintenanceTypes, {
    fields: [assetMaintenanceRecords.maintenanceTypeId],
    references: [maintenanceTypes.id],
  }),
  performedByUser: one(users, {
    fields: [assetMaintenanceRecords.performedBy],
    references: [users.id],
  }),
}));

// Relations were defined above in usersRelations

// Export types for the new tables
export type AssetType = typeof assetTypes.$inferSelect;
export type InsertAssetType = z.infer<typeof insertAssetTypeSchema>;

export type RoadwayAsset = typeof roadwayAssets.$inferSelect;
export type InsertRoadwayAsset = z.infer<typeof insertRoadwayAssetSchema>;

export type AssetInspection = typeof assetInspections.$inferSelect;
export type InsertAssetInspection = z.infer<typeof insertAssetInspectionSchema>;

export type AssetMaintenanceRecord = typeof assetMaintenanceRecords.$inferSelect;
export type InsertAssetMaintenanceRecord = z.infer<typeof insertAssetMaintenanceRecordSchema>;

// Define tenant-related relations now that all tables are defined
export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(userTenants),
  roadAssets: many(tenantRoadAssets),
  roadwayAssets: many(tenantRoadwayAssets),
  assetTypes: many(assetTypes, { relationName: "tenant_asset_types" }),
}));

// Tenant-roadAsset relations
export const tenantRoadAssetsRelations = relations(tenantRoadAssets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantRoadAssets.tenantId],
    references: [tenants.id],
  }),
  roadAsset: one(roadAssets, {
    fields: [tenantRoadAssets.roadAssetId],
    references: [roadAssets.id],
  }),
}));

// Tenant-roadwayAsset relations
export const tenantRoadwayAssetsRelations = relations(tenantRoadwayAssets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantRoadwayAssets.tenantId],
    references: [tenants.id],
  }),
  roadwayAsset: one(roadwayAssets, {
    fields: [tenantRoadwayAssets.roadwayAssetId],
    references: [roadwayAssets.id],
  }),
}));

// Update assetTypes to include tenant relation
export const assetTypesTenantRelation = relations(assetTypes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assetTypes.tenantId],
    references: [tenants.id],
    relationName: "tenant_asset_types"
  })
}));