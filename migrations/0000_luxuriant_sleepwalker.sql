CREATE TABLE "asset_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"roadway_asset_id" integer NOT NULL,
	"inspection_date" timestamp NOT NULL,
	"inspector_id" integer,
	"condition" integer NOT NULL,
	"comments" text,
	"images" json,
	"maintenance_needed" boolean DEFAULT false,
	"maintenance_notes" text,
	"custom_inspection_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_maintenance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"roadway_asset_id" integer NOT NULL,
	"maintenance_date" timestamp NOT NULL,
	"maintenance_type_id" integer,
	"performed_by" integer,
	"cost" double precision,
	"description" text NOT NULL,
	"before_condition" integer,
	"after_condition" integer,
	"materials" json,
	"labor_hours" double precision,
	"equipment_used" text,
	"custom_maintenance_data" json,
	"images" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"condition_rating_scale" text DEFAULT '0-100' NOT NULL,
	"condition_rating_type" text DEFAULT 'numeric' NOT NULL,
	"category" text NOT NULL,
	"inspection_frequency_months" integer DEFAULT 12 NOT NULL,
	"map_shape" text DEFAULT 'circle' NOT NULL,
	"map_color" text DEFAULT '#3b82f6' NOT NULL,
	"custom_fields" json,
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "asset_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" integer,
	"username" text NOT NULL,
	"action" text NOT NULL,
	"details" text NOT NULL,
	"ip_address" text,
	"resource_type" text,
	"resource_id" text
);
--> statement-breakpoint
CREATE TABLE "budget_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fiscal_year" integer NOT NULL,
	"total_budget" double precision NOT NULL,
	"preventive_maintenance" double precision NOT NULL,
	"minor_rehabilitation" double precision NOT NULL,
	"major_rehabilitation" double precision NOT NULL,
	"reconstruction" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"active" text DEFAULT 'false' NOT NULL,
	CONSTRAINT "budget_allocations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "maintenance_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"road_asset_id" integer NOT NULL,
	"maintenance_type_id" integer NOT NULL,
	"status" text NOT NULL,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"cost" double precision,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "maintenance_projects_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "maintenance_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"lifespan_extension" integer NOT NULL,
	"condition_improvement" integer NOT NULL,
	"cost_per_mile" double precision NOT NULL,
	"applicable_min_condition" integer,
	"applicable_max_condition" integer,
	CONSTRAINT "maintenance_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "moisture_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"road_asset_id" integer NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"moisture_value" double precision NOT NULL,
	"reading_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"surface_type" text NOT NULL,
	"condition_threshold" integer NOT NULL,
	"maintenance_type_id" integer NOT NULL,
	"priority" integer NOT NULL,
	"active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "policies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rainfall_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"road_asset_id" integer NOT NULL,
	"month" text NOT NULL,
	"rainfall_inches" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "road_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"length" double precision NOT NULL,
	"width" double precision NOT NULL,
	"surface_type" text NOT NULL,
	"condition" integer NOT NULL,
	"moisture_level" double precision,
	"last_moisture_reading" timestamp,
	"last_inspection" timestamp NOT NULL,
	"next_inspection" timestamp,
	"geometry" json,
	"weather_station_id" text,
	"weather_station_name" text,
	"last_rainfall_update" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "road_assets_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE "roadway_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"asset_type_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"location" text NOT NULL,
	"road_asset_id" integer,
	"install_date" timestamp,
	"manufacture_date" timestamp,
	"manufacturer" text,
	"model" text,
	"serial_number" text,
	"condition" integer DEFAULT 100 NOT NULL,
	"last_inspection" timestamp,
	"next_inspection" timestamp,
	"latitude" double precision,
	"longitude" double precision,
	"geometry" json,
	"custom_data" json,
	"last_maintenance_date" timestamp,
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "roadway_assets_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_road_assets" (
	"tenant_id" integer NOT NULL,
	"road_asset_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_road_assets_tenant_id_road_asset_id_pk" PRIMARY KEY("tenant_id","road_asset_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_roadway_assets" (
	"tenant_id" integer NOT NULL,
	"roadway_asset_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_roadway_assets_tenant_id_roadway_asset_id_pk" PRIMARY KEY("tenant_id","roadway_asset_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"code" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_name_unique" UNIQUE("name"),
	CONSTRAINT "tenants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_tenants" (
	"user_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"role" text NOT NULL,
	"is_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_tenants_user_id_tenant_id_pk" PRIMARY KEY("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"is_system_admin" boolean DEFAULT false,
	"current_tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "asset_inspections" ADD CONSTRAINT "asset_inspections_roadway_asset_id_roadway_assets_id_fk" FOREIGN KEY ("roadway_asset_id") REFERENCES "public"."roadway_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_inspections" ADD CONSTRAINT "asset_inspections_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_roadway_asset_id_roadway_assets_id_fk" FOREIGN KEY ("roadway_asset_id") REFERENCES "public"."roadway_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_maintenance_type_id_maintenance_types_id_fk" FOREIGN KEY ("maintenance_type_id") REFERENCES "public"."maintenance_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moisture_readings" ADD CONSTRAINT "moisture_readings_road_asset_id_road_assets_id_fk" FOREIGN KEY ("road_asset_id") REFERENCES "public"."road_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadway_assets" ADD CONSTRAINT "roadway_assets_asset_type_id_asset_types_id_fk" FOREIGN KEY ("asset_type_id") REFERENCES "public"."asset_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadway_assets" ADD CONSTRAINT "roadway_assets_road_asset_id_road_assets_id_fk" FOREIGN KEY ("road_asset_id") REFERENCES "public"."road_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_road_assets" ADD CONSTRAINT "tenant_road_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_road_assets" ADD CONSTRAINT "tenant_road_assets_road_asset_id_road_assets_id_fk" FOREIGN KEY ("road_asset_id") REFERENCES "public"."road_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_roadway_assets" ADD CONSTRAINT "tenant_roadway_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_roadway_assets" ADD CONSTRAINT "tenant_roadway_assets_roadway_asset_id_roadway_assets_id_fk" FOREIGN KEY ("roadway_asset_id") REFERENCES "public"."roadway_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;