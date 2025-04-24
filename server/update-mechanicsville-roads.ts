import { db } from './db';
import { roadAssets } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updateRoads() {
  console.log('Updating road assets to Mechanicsville, VA roads...');
  
  try {
    // First, clear existing road assets
    await db.delete(roadAssets);
    console.log('Cleared existing road assets');
    
    const now = new Date();
    
    // Add Mechanicsville, VA roads with real road geometry
    const roads = [
      {
        assetId: "RS-1001",
        name: "Mechanicsville Turnpike",
        location: "Mechanicsville",
        length: 4.2,
        width: 32,
        surfaceType: "Asphalt",
        condition: 83,
        lastInspection: now,
        nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        geometry: {
          type: "LineString",
          coordinates: [
            [-77.3724, 37.6002], // Mechanicsville Turnpike (US-360) - start
            [-77.3697, 37.6024],
            [-77.3672, 37.6049],
            [-77.3641, 37.6070],
            [-77.3598, 37.6099]  // Mechanicsville Turnpike - end
          ]
        },
        createdAt: now,
        updatedAt: now
      },
      {
        assetId: "RS-1002",
        name: "Cold Harbor Road",
        location: "Mechanicsville",
        length: 3.6,
        width: 24,
        surfaceType: "Asphalt",
        condition: 68,
        lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 45),
        nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 45),
        geometry: {
          type: "LineString",
          coordinates: [
            [-77.3596, 37.6018], // Cold Harbor Rd - start
            [-77.3561, 37.6001],
            [-77.3530, 37.5980],
            [-77.3493, 37.5958],
            [-77.3452, 37.5934]  // Cold Harbor Rd - end
          ]
        },
        createdAt: now,
        updatedAt: now
      },
      {
        assetId: "RS-1003",
        name: "Lee Davis Road",
        location: "Mechanicsville",
        length: 2.8,
        width: 22,
        surfaceType: "Asphalt", 
        condition: 42,
        lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 78),
        nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 78),
        geometry: {
          type: "LineString",
          coordinates: [
            [-77.3649, 37.6124], // Lee Davis Rd - start
            [-77.3634, 37.6156],
            [-77.3614, 37.6199],
            [-77.3599, 37.6229],
            [-77.3585, 37.6262]  // Lee Davis Rd - end
          ]
        },
        createdAt: now,
        updatedAt: now
      },
      {
        assetId: "RS-1004",
        name: "Pole Green Road",
        location: "Mechanicsville",
        length: 5.2,
        width: 28,
        surfaceType: "Asphalt",
        condition: 77,
        lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 32),
        nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 32),
        geometry: {
          type: "LineString",
          coordinates: [
            [-77.3358, 37.6429], // Pole Green Rd - start
            [-77.3389, 37.6403],
            [-77.3417, 37.6376],
            [-77.3448, 37.6350],
            [-77.3480, 37.6325]  // Pole Green Rd - end
          ]
        },
        createdAt: now,
        updatedAt: now
      },
      {
        assetId: "RS-1005",
        name: "Atlee Road",
        location: "Mechanicsville",
        length: 1.8,
        width: 22,
        surfaceType: "Asphalt",
        condition: 35,
        lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 120),
        nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 120),
        geometry: {
          type: "LineString",
          coordinates: [
            [-77.3707, 37.6369], // Atlee Rd - start
            [-77.3737, 37.6385],
            [-77.3768, 37.6402],
            [-77.3798, 37.6415],
            [-77.3827, 37.6427]  // Atlee Rd - end
          ]
        },
        createdAt: now,
        updatedAt: now
      },
      {
        assetId: "RS-1006",
        name: "Shady Grove Road",
        location: "Mechanicsville",
        length: 3.4,
        width: 24,
        surfaceType: "Asphalt",
        condition: 62,
        lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 65),
        nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 65),
        geometry: {
          type: "LineString",
          coordinates: [
            [-77.3392, 37.6147], // Shady Grove Rd - start
            [-77.3427, 37.6179],
            [-77.3464, 37.6212],
            [-77.3505, 37.6246],
            [-77.3540, 37.6280]  // Shady Grove Rd - end
          ]
        },
        createdAt: now,
        updatedAt: now
      },
      {
        assetId: "RS-1007",
        name: "Bell Creek Road",
        location: "Mechanicsville",
        length: 2.2,
        width: 22,
        surfaceType: "Asphalt",
        condition: 54,
        lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90),
        nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 90),
        geometry: {
          type: "LineString",
          coordinates: [
            [-77.3285, 37.5967], // Bell Creek Rd - start
            [-77.3326, 37.5987],
            [-77.3367, 37.6008],
            [-77.3409, 37.6029],
            [-77.3450, 37.6050]  // Bell Creek Rd - end
          ]
        },
        createdAt: now,
        updatedAt: now
      },
      {
        assetId: "RS-1008",
        name: "Rural Point Road",
        location: "Mechanicsville",
        length: 4.1,
        width: 24,
        surfaceType: "Asphalt",
        condition: 80,
        lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15),
        nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 15),
        geometry: {
          type: "LineString",
          coordinates: [
            [-77.3518, 37.6582], // Rural Point Rd - start
            [-77.3550, 37.6548],
            [-77.3579, 37.6515],
            [-77.3612, 37.6483],
            [-77.3646, 37.6450]  // Rural Point Rd - end
          ]
        },
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Insert the new road data
    await db.insert(roadAssets).values(roads);
    
    console.log('Successfully updated road assets to Mechanicsville, VA roads!');
    console.log(`Added ${roads.length} roads.`);
    
  } catch (error) {
    console.error('Error updating road data:', error);
  }
}

updateRoads().catch(console.error);