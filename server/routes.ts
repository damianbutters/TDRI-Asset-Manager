import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { insertRoadAssetSchema, insertMaintenanceTypeSchema, insertMaintenanceProjectSchema, insertPolicySchema, insertBudgetAllocationSchema, insertAuditLogSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Road Assets
  app.get("/api/road-assets", async (req: Request, res: Response) => {
    try {
      const assets = await storage.getRoadAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error getting road assets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/road-assets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const asset = await storage.getRoadAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Road asset not found" });
      }

      res.json(asset);
    } catch (error) {
      console.error("Error getting road asset:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/road-assets", async (req: Request, res: Response) => {
    try {
      const validatedData = insertRoadAssetSchema.parse(req.body);
      const asset = await storage.createRoadAsset(validatedData);

      // Log the action
      await storage.createAuditLog({
        userId: 1, // We're using a default admin user for this demo
        username: "admin",
        action: "Created road asset",
        details: `Created ${asset.assetId}: ${asset.name} (${asset.location})`,
        ipAddress: req.ip,
        resourceType: "road_asset",
        resourceId: asset.id.toString(),
      });

      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating road asset:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/road-assets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const existingAsset = await storage.getRoadAsset(id);
      if (!existingAsset) {
        return res.status(404).json({ message: "Road asset not found" });
      }

      const validatedData = insertRoadAssetSchema.partial().parse(req.body);
      const updatedAsset = await storage.updateRoadAsset(id, validatedData);

      // Log the action
      await storage.createAuditLog({
        userId: 1,
        username: "admin",
        action: "Updated road asset",
        details: `Updated ${existingAsset.assetId}: ${existingAsset.name}`,
        ipAddress: req.ip,
        resourceType: "road_asset",
        resourceId: id.toString(),
      });

      res.json(updatedAsset);
    } catch (error) {
      console.error("Error updating road asset:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/road-assets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const existingAsset = await storage.getRoadAsset(id);
      if (!existingAsset) {
        return res.status(404).json({ message: "Road asset not found" });
      }

      await storage.deleteRoadAsset(id);

      // Log the action
      await storage.createAuditLog({
        userId: 1,
        username: "admin",
        action: "Deleted road asset",
        details: `Deleted ${existingAsset.assetId}: ${existingAsset.name}`,
        ipAddress: req.ip,
        resourceType: "road_asset",
        resourceId: id.toString(),
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting road asset:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Maintenance Types
  app.get("/api/maintenance-types", async (req: Request, res: Response) => {
    try {
      const types = await storage.getMaintenanceTypes();
      res.json(types);
    } catch (error) {
      console.error("Error getting maintenance types:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/maintenance-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const type = await storage.getMaintenanceType(id);
      if (!type) {
        return res.status(404).json({ message: "Maintenance type not found" });
      }

      res.json(type);
    } catch (error) {
      console.error("Error getting maintenance type:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/maintenance-types", async (req: Request, res: Response) => {
    try {
      const validatedData = insertMaintenanceTypeSchema.parse(req.body);
      const type = await storage.createMaintenanceType(validatedData);

      // Log the action
      await storage.createAuditLog({
        userId: 1,
        username: "admin",
        action: "Created maintenance type",
        details: `Created maintenance type: ${type.name}`,
        ipAddress: req.ip,
        resourceType: "maintenance_type",
        resourceId: type.id.toString(),
      });

      res.status(201).json(type);
    } catch (error) {
      console.error("Error creating maintenance type:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Maintenance Projects
  app.get("/api/maintenance-projects", async (req: Request, res: Response) => {
    try {
      const projects = await storage.getMaintenanceProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error getting maintenance projects:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/maintenance-projects", async (req: Request, res: Response) => {
    try {
      const validatedData = insertMaintenanceProjectSchema.parse(req.body);
      const project = await storage.createMaintenanceProject(validatedData);

      // Log the action
      await storage.createAuditLog({
        userId: 1,
        username: "admin",
        action: "Created maintenance project",
        details: `Created project ${project.projectId}`,
        ipAddress: req.ip,
        resourceType: "maintenance_project",
        resourceId: project.id.toString(),
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating maintenance project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Policies
  app.get("/api/policies", async (req: Request, res: Response) => {
    try {
      const policies = await storage.getPolicies();
      res.json(policies);
    } catch (error) {
      console.error("Error getting policies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/policies", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPolicySchema.parse(req.body);
      const policy = await storage.createPolicy(validatedData);

      // Log the action
      await storage.createAuditLog({
        userId: 1,
        username: "admin",
        action: "Created policy",
        details: `Created policy: ${policy.name}`,
        ipAddress: req.ip,
        resourceType: "policy",
        resourceId: policy.id.toString(),
      });

      res.status(201).json(policy);
    } catch (error) {
      console.error("Error creating policy:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Budget Allocations
  app.get("/api/budget-allocations", async (req: Request, res: Response) => {
    try {
      const budgets = await storage.getBudgetAllocations();
      res.json(budgets);
    } catch (error) {
      console.error("Error getting budget allocations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/budget-allocations/active", async (req: Request, res: Response) => {
    try {
      const budget = await storage.getActiveBudgetAllocation();
      if (!budget) {
        return res.status(404).json({ message: "No active budget allocation found" });
      }
      res.json(budget);
    } catch (error) {
      console.error("Error getting active budget allocation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/budget-allocations", async (req: Request, res: Response) => {
    try {
      const validatedData = insertBudgetAllocationSchema.parse(req.body);
      const budget = await storage.createBudgetAllocation(validatedData);

      // Log the action
      await storage.createAuditLog({
        userId: 1,
        username: "admin",
        action: "Created budget allocation",
        details: `Created budget: ${budget.name} for fiscal year ${budget.fiscalYear}`,
        ipAddress: req.ip,
        resourceType: "budget_allocation",
        resourceId: budget.id.toString(),
      });

      res.status(201).json(budget);
    } catch (error) {
      console.error("Error creating budget allocation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Audit Logs
  app.get("/api/audit-logs", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error getting audit logs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CSV Upload for Road Assets
  app.post("/api/import/road-assets", async (req: Request, res: Response) => {
    try {
      const schema = zfd.formData({
        csvData: zfd.text(),
      });

      const { csvData } = schema.parse(req.body);
      
      // Parse CSV data and create road assets
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',');
      
      let importedCount = 0;
      let errorCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',');
          const assetData: any = {};
          
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            
            switch (header.toLowerCase()) {
              case 'assetid':
                assetData.assetId = value;
                break;
              case 'name':
                assetData.name = value;
                break;
              case 'location':
                assetData.location = value;
                break;
              case 'length':
                assetData.length = parseFloat(value);
                break;
              case 'width':
                assetData.width = parseFloat(value);
                break;
              case 'surfacetype':
                assetData.surfaceType = value;
                break;
              case 'condition':
                assetData.condition = parseInt(value);
                break;
              case 'lastinspection':
                assetData.lastInspection = new Date(value);
                break;
              case 'nextinspection':
                assetData.nextInspection = new Date(value);
                break;
            }
          });
          
          // Create a simplified geometry
          assetData.geometry = {
            type: "LineString",
            coordinates: [
              [-74.5 + Math.random() * 0.1, 40 + Math.random() * 0.1],
              [-74.5 + Math.random() * 0.1, 40 + Math.random() * 0.1]
            ]
          };
          
          // Validate and create the asset
          const validatedData = insertRoadAssetSchema.parse(assetData);
          await storage.createRoadAsset(validatedData);
          importedCount++;
        } catch (error) {
          console.error(`Error importing row ${i}:`, error);
          errorCount++;
        }
      }
      
      // Log the action
      await storage.createAuditLog({
        userId: 1,
        username: "admin",
        action: "Imported road assets",
        details: `Imported ${importedCount} road assets. Errors: ${errorCount}`,
        ipAddress: req.ip,
        resourceType: "road_asset",
        resourceId: "bulk-import",
      });
      
      res.json({ 
        success: true, 
        message: `Successfully imported ${importedCount} road assets. Errors: ${errorCount}.` 
      });
    } catch (error) {
      console.error("Error importing road assets:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Moisture Data Import
  app.post("/api/import/moisture-data", async (req: Request, res: Response) => {
    try {
      const schema = zfd.formData({
        csvData: zfd.text(),
      });
      
      const { csvData } = schema.parse(req.body);
      
      // Parse CSV data with moisture readings
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',');
      
      let importedCount = 0;
      let errorCount = 0;
      let updatedAssets = new Set<number>();
      let errorDetails: Array<{ row: number, message: string }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',');
          
          // Extract data from the CSV line
          let longitude: number | undefined;
          let latitude: number | undefined;
          let moisture: number | undefined;
          let readingDate: Date | undefined;
          let roadAssetId: string | undefined;
          
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            if (!value) return;
            
            switch (header.toLowerCase()) {
              case 'longitude':
                longitude = parseFloat(value);
                break;
              case 'latitude':
                latitude = parseFloat(value);
                break;
              case 'moisture':
                moisture = parseFloat(value);
                break;
              case 'readingdate':
                readingDate = new Date(value);
                break;
              case 'roadassetid':
                roadAssetId = value;
                break;
            }
          });
          
          // Validate required fields
          if (longitude === undefined || isNaN(longitude) || 
              latitude === undefined || isNaN(latitude) || 
              moisture === undefined || isNaN(moisture)) {
            throw new Error("Missing or invalid required fields (longitude, latitude, moisture)");
          }
          
          // If no date is provided, use current date
          if (!readingDate || isNaN(readingDate.getTime())) {
            readingDate = new Date();
          }
          
          // Find the road asset to update, either by ID or by proximity
          let assetToUpdate;
          
          if (roadAssetId) {
            // If road asset ID is provided, find that specific asset
            assetToUpdate = await storage.getRoadAssetByAssetId(roadAssetId);
            if (!assetToUpdate) {
              throw new Error(`Road asset with ID ${roadAssetId} not found`);
            }
          } else {
            // Otherwise, find the nearest road asset by coordinates
            // For now, we'll just get all assets and find the closest one
            const allAssets = await storage.getRoadAssets();
            if (allAssets.length === 0) {
              throw new Error("No road assets found to update with moisture data");
            }
            
            // Find the closest asset based on the coordinates in the geometry
            // This is a simplified approach - in a production app, this would use proper geospatial calculations
            let closestAsset = null;
            let minDistance = Number.MAX_VALUE;
            
            for (const asset of allAssets) {
              if (asset.geometry?.type === "LineString" && Array.isArray(asset.geometry.coordinates)) {
                // Calculate distance to each point in the line and find the minimum
                for (const point of asset.geometry.coordinates) {
                  if (Array.isArray(point) && point.length >= 2) {
                    const assetLong = point[0];
                    const assetLat = point[1];
                    
                    // Simple Euclidean distance calculation (not accurate for geographic coordinates but works for demo)
                    const distance = Math.sqrt(
                      Math.pow(longitude - assetLong, 2) + 
                      Math.pow(latitude - assetLat, 2)
                    );
                    
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestAsset = asset;
                    }
                  }
                }
              }
            }
            
            assetToUpdate = closestAsset || allAssets[0]; // Fallback to first asset if no geometry
          }
          
          // Update the moisture data for the road asset
          if (assetToUpdate) {
            const updatedAsset = await storage.updateRoadAsset(assetToUpdate.id, {
              moistureLevel: moisture,
              lastMoistureReading: readingDate
            });
            
            if (updatedAsset) {
              importedCount++;
              updatedAssets.add(assetToUpdate.id);
            } else {
              throw new Error(`Failed to update road asset with ID ${assetToUpdate.id}`);
            }
          }
        } catch (error) {
          console.error(`Error importing moisture data row ${i}:`, error);
          errorCount++;
          errorDetails.push({
            row: i,
            message: error instanceof Error ? error.message : "Unknown error processing row"
          });
        }
      }
      
      // Log the action
      await storage.createAuditLog({
        userId: 1,
        username: "admin",
        action: "Imported moisture data",
        details: `Updated ${updatedAssets.size} road assets with ${importedCount} moisture readings. Errors: ${errorCount}`,
        ipAddress: req.ip,
        resourceType: "road_asset",
        resourceId: "moisture-import",
      });
      
      res.json({ 
        success: true, 
        message: `Successfully imported ${importedCount} moisture readings, updating ${updatedAssets.size} road assets. Errors: ${errorCount}.`,
        errors: errorDetails.map(err => ({
          message: `Row ${err.row}: ${err.message}`
        }))
      });
    } catch (error) {
      console.error("Error importing moisture data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: "Validation error", 
          errors: error.errors.map(err => ({
            message: `${err.path.join('.')} - ${err.message}`
          }))
        });
      }
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
        errors: [{
          message: error instanceof Error ? error.message : "An unexpected error occurred"
        }]
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
