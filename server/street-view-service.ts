import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

// Directions for street view images
export enum Direction {
  NORTH = 0,
  EAST = 90,
  SOUTH = 180,
  WEST = 270
}

interface StreetViewImage {
  url: string;
  direction: Direction;
  base64?: string; // Base64-encoded image data for PDF embedding
}

/**
 * Get Google Street View images from the given location facing each cardinal direction
 */
export async function getStreetViewImages(latitude: number, longitude: number, size = '400x300'): Promise<StreetViewImage[]> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set');
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const directions = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST];
  
  return Promise.all(directions.map(async (direction) => {
    const url = `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${latitude},${longitude}&heading=${direction}&key=${apiKey}`;
    
    try {
      // Fetch the image and convert to base64 for embedding in PDF
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      
      return {
        url,
        direction,
        base64
      };
    } catch (error) {
      console.error(`Error fetching street view image for direction ${direction}:`, error);
      return { url, direction };
    }
  }));
}

/**
 * Generate a Google Maps URL for the given coordinates
 */
export function getGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Get direction name from enum value
 */
export function getDirectionName(direction: Direction): string {
  switch (direction) {
    case Direction.NORTH: return 'North';
    case Direction.EAST: return 'East';
    case Direction.SOUTH: return 'South';
    case Direction.WEST: return 'West';
    default: return 'Unknown';
  }
}