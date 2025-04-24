import { db } from './db';
import {
  users, roadAssets, maintenanceTypes, maintenanceProjects, policies, budgetAllocations, auditLogs
} from "@shared/schema";

async function seed() {
  console.log('Starting database seed...');
  
  try {
    // Check if data already exists
    const userCount = await db.select({ count: { value: db.fn.count() } }).from(users);
    if (userCount[0].count.value > 0) {
      console.log('Database already seeded. Skipping...');
      return;
    }
    
    // Create a default user
    const [admin] = await db.insert(users).values({
      username: "admin",
      password: "admin123", // In a real app, this would be hashed
      fullName: "John Rodriguez",
      role: "Road Manager",
    }).returning();
    console.log('Created admin user:', admin.id);
    
    // Create default maintenance types
    const [crackSealing] = await db.insert(maintenanceTypes).values({
      name: "Crack Sealing",
      description: "Sealing cracks with asphalt emulsion to prevent water intrusion",
      lifespanExtension: 2,
      conditionImprovement: 5,
      costPerMile: 3000,
      applicableMinCondition: 60,
      applicableMaxCondition: 100
    }).returning();
    
    const [surfaceTreatment] = await db.insert(maintenanceTypes).values({
      name: "Surface Treatment",
      description: "Application of a thin surface treatment to preserve the pavement",
      lifespanExtension: 5,
      conditionImprovement: 10,
      costPerMile: 30000,
      applicableMinCondition: 50,
      applicableMaxCondition: 80
    }).returning();
    
    const [millOverlay] = await db.insert(maintenanceTypes).values({
      name: "Mill & Overlay",
      description: "Milling the existing surface and applying a new layer of asphalt",
      lifespanExtension: 10,
      conditionImprovement: 25,
      costPerMile: 135000,
      applicableMinCondition: 30,
      applicableMaxCondition: 60
    }).returning();
    
    const [reconstruction] = await db.insert(maintenanceTypes).values({
      name: "Reconstruction",
      description: "Complete removal and replacement of the road structure",
      lifespanExtension: 20,
      conditionImprovement: 100,
      costPerMile: 500000,
      applicableMinCondition: 0,
      applicableMaxCondition: 40
    }).returning();
    
    console.log('Created maintenance types');
    
    // Create default budget allocation
    const [budget] = await db.insert(budgetAllocations).values({
      name: "FY 2023 Budget",
      description: "Fiscal Year 2023 Road Asset Budget",
      fiscalYear: 2023,
      totalBudget: 24800000,
      preventiveMaintenance: 8200000,
      minorRehabilitation: 6500000,
      majorRehabilitation: 5300000,
      reconstruction: 4800000,
      createdBy: admin.id,
      active: "true"
    }).returning();
    
    console.log('Created budget allocation:', budget.id);
    
    // Create some sample road assets
    const now = new Date();
    
    // Main Street - Good condition
    const [mainStreet] = await db.insert(roadAssets).values({
      assetId: "RS-1024",
      name: "Main Street",
      location: "Downtown",
      length: 2.4,
      width: 24,
      surfaceType: "Asphalt",
      condition: 87,
      lastInspection: now,
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.9877, 40.7484], // NYC - Broadway/Times Square start
          [-73.9871, 40.7519],
          [-73.9866, 40.7548],
          [-73.9860, 40.7577],
          [-73.9855, 40.7604] // Broadway heading north
        ]
      },
      createdAt: now,
      updatedAt: now
    }).returning();
    
    // 7th Avenue - Fair condition
    const [seventhAve] = await db.insert(roadAssets).values({
      assetId: "RS-0872",
      name: "7th Avenue",
      location: "Midtown",
      length: 1.2,
      width: 22,
      surfaceType: "Asphalt",
      condition: 65,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 4),
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.9819, 40.7489], // 7th Ave at 42nd
          [-73.9804, 40.7521], // 7th Ave at 45th
          [-73.9789, 40.7554], // 7th Ave at 48th
          [-73.9778, 40.7580], // 7th Ave at 51st
          [-73.9761, 40.7618]  // 7th Ave at 55th
        ]
      },
      createdAt: now,
      updatedAt: now
    }).returning();
    
    // FDR Drive - Poor condition
    const [fdrDrive] = await db.insert(roadAssets).values({
      assetId: "RS-1543",
      name: "FDR Drive",
      location: "East Side",
      length: 2.6,
      width: 20,
      surfaceType: "Asphalt",
      condition: 48,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 7),
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.9738, 40.7560], // FDR at 53rd
          [-73.9708, 40.7590], // FDR heading north
          [-73.9675, 40.7624], // FDR continuing
          [-73.9654, 40.7648], // FDR continuing
          [-73.9621, 40.7683], // FDR at 63rd
          [-73.9595, 40.7708]  // FDR at 67th
        ]
      },
      createdAt: now,
      updatedAt: now
    }).returning();
    
    // Lexington Avenue - Critical condition
    const [lexAvenue] = await db.insert(roadAssets).values({
      assetId: "RS-0932",
      name: "Lexington Avenue",
      location: "East Midtown",
      length: 3.1,
      width: 26,
      surfaceType: "Concrete",
      condition: 34,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 12),
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.9730, 40.7523], // Lex at 45th
          [-73.9711, 40.7565], // Lex at 50th
          [-73.9692, 40.7608], // Lex at 55th
          [-73.9672, 40.7650], // Lex at 60th
          [-73.9653, 40.7693], // Lex at 65th
          [-73.9634, 40.7735]  // Lex at 70th
        ]
      },
      createdAt: now,
      updatedAt: now
    }).returning();
    
    // Central Park East Drive - Good condition
    const [cpEastDrive] = await db.insert(roadAssets).values({
      assetId: "RS-1128",
      name: "Central Park East Drive",
      location: "Upper East Side",
      length: 2.4,
      width: 24,
      surfaceType: "Asphalt",
      condition: 82,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 17),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 17),
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.9645, 40.7730], // East Drive at 70th
          [-73.9654, 40.7757], // East Drive curve
          [-73.9663, 40.7782], // East Drive at 75th
          [-73.9668, 40.7809], // East Drive at 80th
          [-73.9664, 40.7835]  // East Drive at 85th
        ]
      },
      createdAt: now,
      updatedAt: now
    }).returning();
    
    // Create Central Park Loop - Fair condition
    const [cpLoop] = await db.insert(roadAssets).values({
      assetId: "RS-3392",
      name: "Central Park Loop",
      location: "Central Park",
      length: 1.5,
      width: 26,
      surfaceType: "Asphalt",
      condition: 72,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 8),
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.9725, 40.7704], // CP loop west side
          [-73.9710, 40.7730], // CP loop curve
          [-73.9686, 40.7754], // CP loop north curve
          [-73.9656, 40.7758], // CP loop east curve
          [-73.9645, 40.7730], // CP loop south curve
          [-73.9659, 40.7706], // CP loop southwest
          [-73.9685, 40.7690], // CP loop south
          [-73.9725, 40.7704]  // CP loop completing circle
        ]
      },
      createdAt: now,
      updatedAt: now
    }).returning();
    
    console.log('Created road assets');
    
    // Create a maintenance project
    const [project] = await db.insert(maintenanceProjects).values({
      projectId: "PR-2023-042",
      roadAssetId: fdrDrive.id,
      maintenanceTypeId: millOverlay.id,
      status: "Planned",
      scheduledDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      cost: 351000,
      notes: "Mill & Overlay for FDR Drive",
      updatedBy: admin.id,
      createdAt: now
    }).returning();
    
    console.log('Created maintenance project:', project.id);
    
    // Create some policies
    await db.insert(policies).values([
      {
        name: "Preventive Maintenance for Asphalt",
        description: "Apply preventive maintenance for asphalt roads",
        surfaceType: "Asphalt",
        conditionThreshold: 75,
        maintenanceTypeId: crackSealing.id,
        priority: 1,
        active: "true",
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Surface Treatment for Asphalt",
        description: "Apply surface treatment for asphalt roads",
        surfaceType: "Asphalt",
        conditionThreshold: 60,
        maintenanceTypeId: surfaceTreatment.id,
        priority: 2,
        active: "true",
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Mill & Overlay for Asphalt",
        description: "Apply mill & overlay for asphalt roads",
        surfaceType: "Asphalt",
        conditionThreshold: 45,
        maintenanceTypeId: millOverlay.id,
        priority: 3,
        active: "true",
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Reconstruction for Asphalt",
        description: "Apply reconstruction for asphalt roads",
        surfaceType: "Asphalt",
        conditionThreshold: 30,
        maintenanceTypeId: reconstruction.id,
        priority: 4,
        active: "true",
        createdAt: now,
        updatedAt: now
      }
    ]);
    
    console.log('Created maintenance policies');
    
    // Create an audit log
    await db.insert(auditLogs).values({
      userId: admin.id,
      username: admin.username,
      action: "SYSTEM_INITIALIZATION",
      details: "System initialized with default data",
      ipAddress: "127.0.0.1",
      resourceType: "SYSTEM",
      resourceId: "0",
      timestamp: now
    });
    
    console.log('Created audit log');
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed().catch(console.error);