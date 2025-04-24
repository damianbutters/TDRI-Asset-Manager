import { RoadAsset } from "@shared/schema";

/**
 * Generate a random coordinate near a central point
 * @param centerLat Central latitude
 * @param centerLng Central longitude
 * @param radiusKm Radius in kilometers
 */
export function getRandomCoordinate(
  centerLat: number, 
  centerLng: number, 
  radiusKm: number = 5
): [number, number] {
  const radiusInDegrees = radiusKm / 111; // Rough approximation (1 degree ~ 111 km)
  
  const u = Math.random();
  const v = Math.random();
  
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  
  // Adjust for longitudinal convergence
  const newLng = x / Math.cos(centerLat * Math.PI / 180) + centerLng;
  const newLat = y + centerLat;
  
  return [newLat, newLng];
}

/**
 * Generate a random road segment
 * @param centerLat Central latitude
 * @param centerLng Central longitude
 * @param lengthKm Length of the road segment in kilometers
 */
export function generateRandomRoadSegment(
  centerLat: number, 
  centerLng: number,
  lengthKm: number = 2
): [number, number][] {
  const start = getRandomCoordinate(centerLat, centerLng);
  
  // Random angle in radians
  const angle = Math.random() * 2 * Math.PI;
  
  // Convert length to approximate degrees
  const lengthInDegrees = lengthKm / 111;
  
  // Calculate end point
  const endLat = start[0] + lengthInDegrees * Math.sin(angle);
  const endLng = start[1] + lengthInDegrees * Math.cos(angle) / Math.cos(start[0] * Math.PI / 180);
  
  // Create a few points along the segment
  const numPoints = Math.max(2, Math.floor(lengthKm * 2));
  const points: [number, number][] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const lat = start[0] + fraction * (endLat - start[0]);
    const lng = start[1] + fraction * (endLng - start[1]);
    
    // Add some small random variations to make it look more natural
    const jitterLat = (Math.random() - 0.5) * 0.001;
    const jitterLng = (Math.random() - 0.5) * 0.001;
    
    points.push([lat + jitterLat, lng + jitterLng]);
  }
  
  return points;
}

/**
 * Get the center point of a road asset's geometry
 */
export function getRoadAssetCenter(asset: RoadAsset): [number, number] {
  if (!asset.geometry || !asset.geometry.coordinates || asset.geometry.coordinates.length === 0) {
    return [40, -74.5]; // Default center
  }
  
  // For LineString geometries
  const coordinates = asset.geometry.coordinates;
  const midIndex = Math.floor(coordinates.length / 2);
  
  // Swap coordinates from [lng, lat] to [lat, lng] for Leaflet
  return [coordinates[midIndex][1], coordinates[midIndex][0]];
}
