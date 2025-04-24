import { db } from './db';
import { roadAssets } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updateMoistureData() {
  console.log('Updating road moisture data...');
  
  try {
    // Get all the road assets
    const roads = await db.select().from(roadAssets);
    
    // Update each road with a moisture level
    for (const road of roads) {
      // Assign a moisture level inversely proportional to road condition
      // Roads in worse condition tend to have higher moisture levels
      let moistureLevel = 0;
      
      if (road.condition >= 80) {
        // Good condition roads - low moisture (2-8%)
        moistureLevel = 2 + (Math.random() * 6);
      } else if (road.condition >= 60) {
        // Fair condition roads - moderate moisture (8-15%)
        moistureLevel = 8 + (Math.random() * 7);
      } else if (road.condition >= 40) {
        // Poor condition roads - high moisture (15-25%)
        moistureLevel = 15 + (Math.random() * 10);
      } else {
        // Critical condition roads - very high moisture (25-40%)
        moistureLevel = 25 + (Math.random() * 15);
      }
      
      // Round to 1 decimal place
      moistureLevel = Math.round(moistureLevel * 10) / 10;
      
      // Last moisture reading was between 1-30 days ago
      const lastMoistureReading = new Date();
      lastMoistureReading.setDate(lastMoistureReading.getDate() - Math.floor(Math.random() * 30) - 1);
      
      // Update the road with the moisture data
      await db.update(roadAssets)
        .set({ 
          moistureLevel,
          lastMoistureReading
        })
        .where(eq(roadAssets.id, road.id));
        
      console.log(`Updated ${road.name} with moisture level: ${moistureLevel}%`);
    }
    
    console.log('Successfully updated moisture data for all roads!');
    
  } catch (error) {
    console.error('Error updating moisture data:', error);
  }
}

updateMoistureData().catch(console.error);