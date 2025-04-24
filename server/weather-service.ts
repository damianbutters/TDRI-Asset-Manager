import { db } from "./db";
import { RoadAsset, insertRainfallHistorySchema, rainfallHistory, roadAssets } from "@shared/schema";
import { eq } from "drizzle-orm";

// Interface for weather station data
interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
}

// Interface for monthly rainfall data
interface MonthlyRainfall {
  month: string; // "YYYY-MM" format
  rainfallInches: number;
}

/**
 * Service to handle weather data fetching and management
 */
export class WeatherService {
  private apiKey: string;
  
  constructor() {
    // Get API key from environment variables
    this.apiKey = process.env.OPENWEATHERMAP_API_KEY || '';
    
    if (!this.apiKey) {
      console.error("WARNING: OpenWeatherMap API key not found in environment variables");
    }
  }
  
  /**
   * Find the nearest weather station for a road asset location
   */
  async findNearestWeatherStation(longitude: number, latitude: number): Promise<WeatherStation | null> {
    try {
      console.log(`Finding nearest weather station for coordinates: ${longitude}, ${latitude}`);
      
      // Call OpenWeatherMap API to find stations near the coordinates
      const url = `https://api.openweathermap.org/data/3.0/stations?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`OpenWeatherMap API returned status ${response.status}`);
      }
      
      const stations = await response.json();
      console.log(`Found ${stations.length} weather stations near coordinates`);
      
      if (!stations || stations.length === 0) {
        return null;
      }
      
      // Calculate distance to each station and find the closest one
      const stationsWithDistance: WeatherStation[] = stations.map((station: any) => {
        const distance = this.calculateDistance(
          latitude, longitude,
          station.external_id?.split("_")[1] || station.coord?.lat || station.latitude || 0,
          station.external_id?.split("_")[2] || station.coord?.lon || station.longitude || 0
        );
        
        return {
          id: station.id || station.station_id || '',
          name: station.name || 'Unknown Station',
          lat: station.coord?.lat || station.latitude || 0,
          lon: station.coord?.lon || station.longitude || 0,
          distance
        };
      });
      
      // Sort by distance and get the closest
      stationsWithDistance.sort((a, b) => a.distance - b.distance);
      const nearest = stationsWithDistance[0];
      
      console.log(`Nearest weather station: ${nearest.name} (${nearest.id}) at distance ${nearest.distance.toFixed(2)} km`);
      return nearest;
      
    } catch (error) {
      console.error("Error finding nearest weather station:", error);
      return null;
    }
  }
  
  /**
   * Calculate distance between two coordinates in kilometers using the Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
  
  /**
   * Get rainfall data for the past 12 months from a specific date
   */
  async getRainfallHistory(longitude: number, latitude: number, fromDate?: Date): Promise<MonthlyRainfall[]> {
    try {
      // Use current date if not specified
      const endDate = fromDate || new Date();
      
      // Calculate date 12 months ago
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 12);
      
      // Format dates for API
      const start = Math.floor(startDate.getTime() / 1000);
      const end = Math.floor(endDate.getTime() / 1000);
      
      console.log(`Fetching rainfall data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Call OpenWeatherMap Historical API
      const url = `https://history.openweathermap.org/data/2.5/history/city?lat=${latitude}&lon=${longitude}&type=month&start=${start}&end=${end}&appid=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`OpenWeatherMap API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process the monthly data
      const monthlyData: MonthlyRainfall[] = [];
      const months = this.generatePast12Months(endDate);
      
      // Map data to months - even if we don't have data for some months, we still include them
      months.forEach(monthStr => {
        const [year, month] = monthStr.split('-').map(Number);
        
        // Find matching data for this month
        const matchingData = data.list ? data.list.find((item: any) => {
          const date = new Date(item.dt * 1000);
          return date.getFullYear() === year && date.getMonth() + 1 === month;
        }) : null;
        
        // Get rainfall data - default to 0 if not found
        const rainfallMm = matchingData?.rain?.['1h'] || matchingData?.rain || 0;
        const rainfallInches = this.convertMmToInches(rainfallMm);
        
        monthlyData.push({
          month: monthStr,
          rainfallInches
        });
      });
      
      return monthlyData;
      
    } catch (error) {
      console.error("Error getting rainfall history:", error);
      // Return empty array in case of error
      return this.generateEmptyRainfallData();
    }
  }
  
  /**
   * Generate an array of month strings for the past 12 months from a given date
   * Format: 'YYYY-MM'
   */
  private generatePast12Months(fromDate: Date): string[] {
    const months: string[] = [];
    const date = new Date(fromDate);
    
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript months are 0-indexed
      months.unshift(`${year}-${month.toString().padStart(2, '0')}`);
      date.setMonth(date.getMonth() - 1);
    }
    
    return months;
  }
  
  /**
   * Convert millimeters to inches
   */
  private convertMmToInches(mm: number): number {
    return parseFloat((mm / 25.4).toFixed(2));
  }
  
  /**
   * Generate empty rainfall data for past 12 months
   * Used as a fallback if API fails
   */
  private generateEmptyRainfallData(): MonthlyRainfall[] {
    const months = this.generatePast12Months(new Date());
    return months.map(month => ({
      month,
      rainfallInches: 0
    }));
  }
  
  /**
   * Update rainfall data for a road asset
   */
  async updateRainfallData(roadAsset: RoadAsset): Promise<boolean> {
    try {
      console.log(`Updating rainfall data for road asset ${roadAsset.id}: ${roadAsset.name}`);
      
      // Skip if no geometry data is available
      if (!roadAsset.geometry) {
        console.log(`No geometry data for road asset ${roadAsset.id}, skipping rainfall update`);
        return false;
      }
      
      // Extract coordinates from geometry
      const geometry = roadAsset.geometry as any;
      if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates) || !geometry.coordinates[0]) {
        console.log(`Invalid geometry for road asset ${roadAsset.id}, skipping rainfall update`);
        return false;
      }
      
      const [longitude, latitude] = geometry.coordinates[0];
      
      // Find nearest weather station
      const station = await this.findNearestWeatherStation(longitude, latitude);
      
      if (!station) {
        console.log(`No weather station found near road asset ${roadAsset.id}`);
        return false;
      }
      
      // Update road asset with weather station info
      await db.update(roadAssets)
        .set({
          weatherStationId: station.id,
          weatherStationName: station.name,
          lastRainfallUpdate: new Date()
        })
        .where(eq(roadAssets.id, roadAsset.id));
      
      // Get rainfall data
      const rainfallData = await this.getRainfallHistory(longitude, latitude);
      
      // Delete existing rainfall data for this road asset
      await db.delete(rainfallHistory)
        .where(eq(rainfallHistory.roadAssetId, roadAsset.id));
      
      // Insert new rainfall data
      for (const data of rainfallData) {
        await db.insert(rainfallHistory)
          .values({
            roadAssetId: roadAsset.id,
            month: data.month,
            rainfallInches: data.rainfallInches
          });
      }
      
      console.log(`Successfully updated rainfall data for road asset ${roadAsset.id}`);
      return true;
      
    } catch (error) {
      console.error(`Error updating rainfall data for road asset ${roadAsset.id}:`, error);
      return false;
    }
  }
  
  /**
   * Get rainfall data for a specific road asset
   */
  async getRainfallDataForRoadAsset(roadAssetId: number): Promise<MonthlyRainfall[]> {
    try {
      const data = await db.select()
        .from(rainfallHistory)
        .where(eq(rainfallHistory.roadAssetId, roadAssetId))
        .orderBy(rainfallHistory.month);
      
      return data.map(item => ({
        month: item.month,
        rainfallInches: item.rainfallInches
      }));
      
    } catch (error) {
      console.error(`Error getting rainfall data for road asset ${roadAssetId}:`, error);
      return [];
    }
  }
  
  /**
   * Update rainfall data for all road assets
   */
  async updateAllRoadAssets(): Promise<void> {
    try {
      console.log("Starting rainfall data update for all road assets");
      
      // Get all road assets
      const allRoadAssets = await db.select().from(roadAssets);
      
      let successCount = 0;
      let failCount = 0;
      
      // Update each road asset
      for (const asset of allRoadAssets) {
        const success = await this.updateRainfallData(asset);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // Add a short delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Rainfall update complete. Success: ${successCount}, Failed: ${failCount}`);
      
    } catch (error) {
      console.error("Error updating rainfall data for all road assets:", error);
    }
  }
}

// Export singleton instance
export const weatherService = new WeatherService();