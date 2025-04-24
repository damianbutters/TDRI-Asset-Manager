import { db } from './db';
import { maintenanceProjects } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updateProjects() {
  console.log('Updating maintenance projects...');
  
  try {
    // Update the project to use Lee Davis Road (id 9) which is in poor condition (PCI 42)
    await db.update(maintenanceProjects)
      .set({
        roadAssetId: 9, // Lee Davis Road
        notes: "Mill & Overlay for Lee Davis Road"
      })
      .where(eq(maintenanceProjects.id, 1));
    
    console.log('Successfully updated maintenance project');
    
  } catch (error) {
    console.error('Error updating maintenance projects:', error);
  }
}

updateProjects().catch(console.error);