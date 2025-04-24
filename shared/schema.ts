import { pgTable, text, serial, integer, timestamp, doublePrecision, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
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

export const usersRelations = relations(users, ({ many }) => ({
  maintenanceProjects: many(maintenanceProjects, { relationName: "user_maintenance_projects" }),
  budgetAllocations: many(budgetAllocations, { relationName: "user_budget_allocations" }),
  auditLogs: many(auditLogs, { relationName: "user_audit_logs" }),
}));

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