import { weatherService } from "./weather-service";
import { storage } from "./storage";

/**
 * Scheduler for recurring tasks
 */
class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;
  
  /**
   * Start the scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.log("Scheduler is already running");
      return;
    }

    console.log("Starting monthly rainfall data scheduler...");

    // Check if it's the first day of the month (or the right time to update)
    this.checkAndUpdateRainfallData();

    // Set interval to check daily (we'll only update on the first day of the month)
    // 24 hours * 60 minutes * 60 seconds * 1000 milliseconds = 86400000 milliseconds
    const DAILY_CHECK_INTERVAL = 86400000;
    
    this.intervalId = setInterval(() => {
      this.checkAndUpdateRainfallData();
    }, DAILY_CHECK_INTERVAL);

    console.log("Scheduler started successfully");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Scheduler stopped");
    }
  }

  /**
   * Check if it's time to update rainfall data and do it if needed
   */
  private async checkAndUpdateRainfallData(): Promise<void> {
    try {
      const now = new Date();
      const isFirstDayOfMonth = now.getDate() === 1;

      // Only update on the first day of the month
      if (isFirstDayOfMonth) {
        console.log(`It's the first day of ${now.toLocaleString('default', { month: 'long' })} - updating rainfall data for all road assets`);
        
        // Create an audit log entry
        await storage.createAuditLog({
          userId: 1,
          username: "system",
          action: "Monthly rainfall update",
          details: `Started monthly rainfall data update for ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
          ipAddress: "system",
          resourceType: "system",
          resourceId: "monthly-rainfall-update",
        });
        
        // Run the actual update
        await weatherService.updateAllRoadAssets();
        
        console.log("Monthly rainfall update completed");
      } else {
        console.log(`Not the first day of the month (day ${now.getDate()}), skipping rainfall update`);
      }
    } catch (error) {
      console.error("Error in scheduled rainfall update:", error);
    }
  }

  /**
   * Force a manual update of all rainfall data
   */
  async forceUpdate(): Promise<void> {
    try {
      console.log("Forcing manual update of rainfall data...");
      
      // Create an audit log entry
      await storage.createAuditLog({
        userId: 1,
        username: "system",
        action: "Manual rainfall update",
        details: "Manually triggered rainfall data update for all road assets",
        ipAddress: "system",
        resourceType: "system",
        resourceId: "manual-rainfall-update",
      });
      
      // Run the update
      await weatherService.updateAllRoadAssets();
      
      console.log("Manual rainfall update completed");
    } catch (error) {
      console.error("Error in manual rainfall update:", error);
    }
  }
}

// Export a singleton instance
export const scheduler = new Scheduler();