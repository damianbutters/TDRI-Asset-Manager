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
      // Split by new lines first
      const lines = csvData.trim().split('\n');
      
      // Skip empty lines
      const nonEmptyLines = lines.filter(line => line.trim().length > 0);
      
      if (nonEmptyLines.length === 0) {
        throw new Error("CSV file is empty");
      }
      
      // Process the first line to extract headers
      // Split by commas, but be careful with quoted values that might contain commas
      const extractValues = (line: string): string[] => {
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = "";
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            // Toggle quote state
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            // End of value
            values.push(currentValue.trim());
            currentValue = "";
          } else {
            // Part of value
            currentValue += char;
          }
        }
        
        // Add the last value
        values.push(currentValue.trim());
        
        return values;
      };
      
      // Extract headers from the first line
      const headers = extractValues(nonEmptyLines[0]).map(header => header.trim().toLowerCase());
      
      // Check if the first row is a header row by looking for expected column names
      const isFirstRowHeader = headers.some(header => 
        ['assetid', 'name', 'location', 'surfacetype', 'condition'].includes(header)
      );
      
      console.log("Road asset import headers:", headers);
      console.log("Is first row header:", isFirstRowHeader);
      
      // Determine which row to start processing from (skip header row if present)
      const startRow = isFirstRowHeader ? 1 : 0;
      
      let importedCount = 0;
      let errorCount = 0;
      let errorDetails: Array<{ row: number, message: string }> = [];
      
      for (let i = startRow; i < nonEmptyLines.length; i++) {
        try {
          // For data rows, use the same careful splitting 
          const values = extractValues(nonEmptyLines[i]);
          
          console.log(`Road asset row ${i} values:`, values);
          
          const assetData: any = {};
          
          // Store what we found in the row for better error messages
          const rowData: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            if (!value) return;
            
            // Store what we found for better error reporting
            rowData[header.toLowerCase()] = value;
            
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
                try {
                  const date = new Date(value);
                  if (isNaN(date.getTime())) {
                    throw new Error(`Invalid date format: "${value}". Try using a standard format like YYYY-MM-DD`);
                  }
                  assetData.lastInspection = date;
                } catch (err) {
                  throw new Error(`Failed to parse lastInspection date: "${value}"`);
                }
                break;
              case 'nextinspection':
                if (value) {
                  try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                      throw new Error(`Invalid date format: "${value}". Try using a standard format like YYYY-MM-DD`);
                    }
                    assetData.nextInspection = date;
                  } catch (err) {
                    throw new Error(`Failed to parse nextInspection date: "${value}"`);
                  }
                }
                break;
            }
          });
          
          // Validate required fields
          if (!assetData.assetId) {
            throw new Error(`Missing required field: assetId`);
          }
          
          if (!assetData.name) {
            throw new Error(`Missing required field: name`);
          }
          
          if (assetData.condition === undefined || isNaN(assetData.condition)) {
            const foundValue = rowData['condition'] || 'missing';
            throw new Error(`Missing or invalid condition value: "${foundValue}" (must be a numeric value between 0-100)`);
          }
          
          if (assetData.condition < 0 || assetData.condition > 100) {
            throw new Error(`Condition value out of range: ${assetData.condition} (must be between 0-100)`);
          }
          
          // Create a simplified geometry (for Mechanicsville, VA area)
          assetData.geometry = {
            type: "LineString",
            coordinates: [
              [-77.34 + Math.random() * 0.01, 37.6 + Math.random() * 0.01],
              [-77.34 + Math.random() * 0.01, 37.6 + Math.random() * 0.01]
            ]
          };
          
          // Validate and create the asset
          const validatedData = insertRoadAssetSchema.parse(assetData);
          await storage.createRoadAsset(validatedData);
          importedCount++;
        } catch (error) {
          console.error(`Error importing row ${i}:`, error);
          errorCount++;
          
          // Adjust row number for error display to account for 1-based counting that users expect
          const displayRowNumber = i + 1;
          
          errorDetails.push({
            row: displayRowNumber,
            message: error instanceof Error ? error.message : "Unknown error processing row"
          });
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
        message: `Successfully imported ${importedCount} road assets. Errors: ${errorCount}.`,
        errors: errorDetails.map(err => ({
          message: `Row ${err.row}: ${err.message}`
        }))
      });
    } catch (error) {
      console.error("Error importing road assets:", error);
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

  // Moisture Data Import
  app.post("/api/import/moisture-data", async (req: Request, res: Response) => {
    try {
      const schema = zfd.formData({
        csvData: zfd.text(),
      });
      
      const { csvData } = schema.parse(req.body);
      
      // Parse CSV data with moisture readings - handle potential double quotes and comma escaping
      // Split by new lines first
      const lines = csvData.trim().split('\n');
      
      // Skip empty lines
      const nonEmptyLines = lines.filter(line => line.trim().length > 0);
      
      if (nonEmptyLines.length === 0) {
        throw new Error("CSV file is empty");
      }
      
      // Process the first line to extract headers
      // Split by commas, but be careful with quoted values that might contain commas
      const extractValues = (line: string): string[] => {
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = "";
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            // Toggle quote state
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            // End of value
            values.push(currentValue.trim());
            currentValue = "";
          } else {
            // Part of value
            currentValue += char;
          }
        }
        
        // Add the last value
        values.push(currentValue.trim());
        
        return values;
      };
      
      // Extract headers from the first line
      const headers = extractValues(nonEmptyLines[0]).map(header => header.trim().toLowerCase());
      
      // Check if the first row is a header row by looking for expected column names
      const isFirstRowHeader = headers.some(header => 
        ['longitude', 'latitude', 'moisture', 'readingdate', 'roadassetid'].includes(header)
      );
      
      console.log("Headers:", headers);
      console.log("Is first row header:", isFirstRowHeader);
      
      // Determine which row to start processing from (skip header row if present)
      const startRow = isFirstRowHeader ? 1 : 0;
      
      let importedCount = 0;
      let errorCount = 0;
      let updatedAssets = new Set<number>();
      let errorDetails: Array<{ row: number, message: string }> = [];
      
      // Loop through data rows (skipping header if present)
      for (let i = startRow; i < nonEmptyLines.length; i++) {
        try {
          // For data rows, use the same careful splitting
          const values = extractValues(nonEmptyLines[i]);
          
          console.log(`Row ${i} values:`, values);
          
          // Extract data from the CSV line
          let longitude: number | undefined;
          let latitude: number | undefined;
          let moisture: number | undefined;
          let readingDate: Date | undefined;
          let roadAssetId: string | undefined;
          
          // Store what we found in the row for better error messages
          const rowData: Record<string, string> = {};
          
          // Check if the CSV line has enough values
          if (values.length < 3) {
            throw new Error(`Insufficient data in row (expected at least longitude, latitude, and moisture values but found only ${values.length} column(s))`);
          }
          
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            if (!value) return;
            
            // Store what we found for better error reporting
            rowData[header.toLowerCase()] = value;
            
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
                // Handle a variety of date formats using a more robust parsing approach
                try {
                  // Try standard Date constructor first
                  const parsedDate = new Date(value);
                  
                  // Check if the date is valid
                  if (!isNaN(parsedDate.getTime())) {
                    readingDate = parsedDate;
                  } else {
                    // Handle formats like "2024-9-3T04:18:59 GMT+0000 (Coordinated Universal Time).000"
                    // by removing the timezone name in parentheses and handling non-standard separators
                    const cleanedValue = value
                      .replace(/\(.*\)/g, '') // Remove anything in parentheses
                      .replace(/\.(\d+)$/, 'Z') // Replace trailing milliseconds with Z
                      .trim();
                      
                    readingDate = new Date(cleanedValue);
                    
                    // If still invalid, try one more approach with manual parsing
                    if (isNaN(readingDate.getTime())) {
                      // Try to match various date formats with regex
                      const dateRegex = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[T ]?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/;
                      const match = value.match(dateRegex);
                      
                      if (match) {
                        const [_, year, month, day, hour = '0', minute = '0', second = '0'] = match;
                        readingDate = new Date(
                          parseInt(year), 
                          parseInt(month) - 1, // JS months are 0-indexed
                          parseInt(day),
                          parseInt(hour),
                          parseInt(minute),
                          parseInt(second)
                        );
                      }
                    }
                  }
                  
                  // If all parsing attempts failed, throw an error with the problematic value
                  if (readingDate === undefined || isNaN(readingDate.getTime())) {
                    throw new Error(`Invalid date format: "${value}". Try using a standard format like YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS`);
                  }
                } catch (err) {
                  console.error("Error parsing date:", value, err);
                  if (err instanceof Error && err.message.includes("Invalid date format")) {
                    // Rethrow the specific error we created above
                    throw err;
                  }
                  // For other parsing errors, provide specific feedback
                  throw new Error(`Failed to parse date: "${value}". Error: ${err instanceof Error ? err.message : "Unknown error"}`);
                }
                break;
              case 'roadassetid':
                roadAssetId = value;
                break;
            }
          });
          
          // Validate required fields with specific error messages that include the actual values
          if (longitude === undefined || isNaN(longitude)) {
            const foundValue = rowData['longitude'] || 'missing';
            throw new Error(`Missing or invalid longitude value: "${foundValue}" (must be a numeric value)`);
          }
          
          // Validate longitude range (-180 to 180 degrees)
          if (longitude < -180 || longitude > 180) {
            throw new Error(`Longitude value out of range: ${longitude} (must be between -180 and 180 degrees)`);
          }
          
          if (latitude === undefined || isNaN(latitude)) {
            const foundValue = rowData['latitude'] || 'missing';
            throw new Error(`Missing or invalid latitude value: "${foundValue}" (must be a numeric value)`);
          }
          
          // Validate latitude range (-90 to 90 degrees)
          if (latitude < -90 || latitude > 90) {
            throw new Error(`Latitude value out of range: ${latitude} (must be between -90 and 90 degrees)`);
          }
          
          if (moisture === undefined || isNaN(moisture)) {
            const foundValue = rowData['moisture'] || 'missing';
            throw new Error(`Missing or invalid moisture value: "${foundValue}" (must be a numeric value between 0-100)`);
          }
          
          // Add range validation for moisture
          if (moisture < 0 || moisture > 100) {
            throw new Error(`Moisture value out of range: ${moisture} (must be between 0-100)`);
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
          // Adjust row number for error display to account for 1-based counting that users expect
          // and potentially skipped header row
          const displayRowNumber = i + 1;
          
          errorDetails.push({
            row: displayRowNumber,
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
