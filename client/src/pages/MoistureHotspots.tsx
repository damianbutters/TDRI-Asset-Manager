import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Download, ExternalLink, MapPin, Edit3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Define enhanced PDF type with autoTable
interface AutoTableOptions {
  startY: number;
  head: string[][];
  body: any[][];
  theme: string;
  headStyles: {
    fillColor: number[];
    textColor: number;
  };
  styles: {
    fontSize: number;
  };
}

interface EnhancedJsPDF extends jsPDF {
  autoTable?: (options: AutoTableOptions) => void;
  lastAutoTable?: {
    finalY: number;
  };
}

// Leaflet imports for map visualization
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polygon } from 'react-leaflet';
import L, { LatLngBounds, LatLng, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RoadAsset {
  id: number;
  name: string;
  location: string;
  length: number;
  width: number;
  lanes: number;
  type: string;
  material: string;
  condition: number;
  lastInspection: string | null;
  lastMaintenance: string | null;
  lastMoistureReading: string | null;
  averageRainfall: number | null;
  geometry: any;
}

interface MoistureReading {
  id: number;
  roadAssetId: number;
  latitude: number;
  longitude: number;
  readingDate: string;
  moistureValue: number;
  depth: number;
  googleMapsUrl?: string;
  streetViewImages?: {
    url: string;
    direction: number;
    base64?: string;
  }[];
}

interface HotspotsResponse {
  roadAsset: RoadAsset;
  hotspots: MoistureReading[];
  totalReadings: number;
  hotspotCount: number;
  threshold: number;
}

const MoistureHotspots: React.FC = () => {
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState<boolean>(false);
  const [polygonCoordinates, setPolygonCoordinates] = useState<LatLngTuple[]>([]);
  const [areaHotspots, setAreaHotspots] = useState<MoistureReading[] | null>(null);
  const [isLoadingAreaData, setIsLoadingAreaData] = useState<boolean>(false);

  // Function to check if a point is inside a polygon using ray casting algorithm
  const isPointInPolygon = (point: LatLngTuple, polygon: LatLngTuple[]): boolean => {
    if (polygon.length < 3) return false;
    
    const [lat, lng] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Function to fetch moisture data for the selected area
  const fetchAreaMoistureData = async (coordinates: LatLngTuple[]) => {
    if (coordinates.length < 3) return;
    
    setIsLoadingAreaData(true);
    
    try {
      const response = await fetch('/api/moisture-hotspots/area', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          polygon: coordinates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch area moisture data');
      }

      const data = await response.json();
      setAreaHotspots(data.hotspots);
      
      toast({
        title: 'Area Analyzed',
        description: `Found ${data.totalReadings} moisture readings with ${data.hotspotCount} hotspots in the selected area across ${data.areaInfo.roadsInArea.length} roads.`,
      });
    } catch (error) {
      console.error('Error fetching area moisture data:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze the selected area. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAreaData(false);
    }
  };

  // Function to handle polygon completion
  const handlePolygonComplete = (coordinates: LatLngTuple[]) => {
    setPolygonCoordinates(coordinates);
    setIsDrawingPolygon(false);
    fetchAreaMoistureData(coordinates);
  };

  // Function to clear polygon selection
  const clearPolygonSelection = () => {
    setPolygonCoordinates([]);
    setAreaHotspots(null);
    setIsDrawingPolygon(false);
    
    toast({
      title: 'Selection Cleared',
      description: 'Area selection removed.',
    });
  };

  // Default area info for displaying when no polygon is selected
  const defaultAreaInfo = {
    totalReadingsInArea: 0,
    roadsInArea: [],
    polygonPoints: 0
  };

  // Reference to the map container for capturing
  const mapRef = useRef<HTMLDivElement>(null);
  
  const handleGeneratePdf = async () => {
    if (!hotspotsData) return;
    
    setIsGeneratingPdf(true);
    
    try {
      console.log("Starting PDF generation");
      
      // Create a new PDF document with enhanced type
      const doc = new jsPDF() as EnhancedJsPDF;
      
      // Capture the map view first before generating the rest of the PDF
      let mapImageData: string | null = null;
      
      // Try to capture the map element if it exists
      if (mapRef.current) {
        try {
          console.log("Capturing map view...");
          const mapCanvas = await html2canvas(mapRef.current, {
            logging: false,
            useCORS: true,
            scale: 1.5, // Higher quality
            backgroundColor: '#f8f9fa'
          });
          
          mapImageData = mapCanvas.toDataURL('image/jpeg', 0.85);
          console.log("Map view captured successfully");
        } catch (mapError) {
          console.error("Error capturing map:", mapError);
        }
      } else {
        console.log("Map reference not found, skipping map capture");
      }
      
      // Add title and summary
      doc.setFontSize(20);
      doc.text('Moisture Hotspots Report', 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Road: ${hotspotsData.roadAsset.name}`, 14, 30);
      doc.text(`Location: ${hotspotsData.roadAsset.location || 'N/A'}`, 14, 38);
      doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 46);
      doc.text(`Tenant: ${currentTenant?.name || 'All'}`, 14, 54);
      
      // Summary information with null/undefined checks
      doc.text('Report Summary:', 14, 66);
      doc.text(`• Total moisture readings: ${hotspotsData.totalReadings || 0}`, 20, 74);
      doc.text(`• Number of hotspots identified: ${hotspotsData.hotspotCount || 0}`, 20, 82);
      doc.text(`• Moisture threshold for hotspots: ${(hotspotsData.threshold || 0).toFixed(2)}%`, 20, 90);
      
      // Add hotspots table with improved formatting and safety checks
      const tableColumns = ['ID', 'Date', 'Moisture %', 'Depth (cm)', 'Coordinates'];
      const tableRows = (hotspotsData.hotspots || []).map(spot => {
        if (!spot) return ['N/A', 'N/A', 'N/A', 'N/A', 'N/A'];
        
        return [
          spot.id ? spot.id.toString() : 'N/A',
          spot.readingDate ? format(new Date(spot.readingDate), 'MM/dd/yyyy') : 'N/A',
          spot.moistureValue !== undefined ? spot.moistureValue.toFixed(2) : 'N/A',
          spot.depth !== undefined ? spot.depth.toFixed(1) : 'N/A',
          (spot.latitude !== undefined && spot.longitude !== undefined) ? 
            `${spot.latitude.toFixed(6)}, ${spot.longitude.toFixed(6)}` : 'N/A'
        ];
      });
      
      // Create a professional cover page
      // Blue background banner at top
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Report title on cover page
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", 'bold');
      doc.text("Moisture Hotspots Report", 105, 25, { align: "center" });
      
      // Road name subtitle
      doc.setFontSize(18);
      doc.text(hotspotsData.roadAsset.name, 105, 60, { align: "center" });
      
      // Add the current date
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(12);
      doc.setFont("helvetica", 'normal');
      const currentDate = format(new Date(), 'MMMM d, yyyy');
      doc.text(`Generated on: ${currentDate}`, 105, 75, { align: "center" });
      
      // Add organization info if available
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("TDRIPlanner", 105, 95, { align: "center" });
      doc.setFontSize(12);
      doc.text("Road Asset Management System", 105, 105, { align: "center" });
      
      // Add summary box
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.rect(30, 130, 150, 100, 'FD');
      
      // Summary heading
      doc.setFontSize(16);
      doc.setFont("helvetica", 'bold');
      doc.text("Summary", 105, 145, { align: "center" });
      doc.setFont("helvetica", 'normal');
      doc.setFontSize(12);
      
      // Summary content
      const summaryItems = [
        { label: "Total Readings", value: hotspotsData.totalReadings.toString() },
        { label: "Hotspot Count (Top 5%)", value: hotspotsData.hotspotCount.toString() },
        { label: "Moisture Threshold", value: `${hotspotsData.threshold.toFixed(2)}%` },
        { label: "Road Length", value: `${hotspotsData.roadAsset.length} meters` },
        { label: "Road Material", value: hotspotsData.roadAsset.material || "N/A" }
      ];
      
      let summaryY = 165;
      summaryItems.forEach(item => {
        doc.setFont("helvetica", 'bold');
        doc.text(item.label + ":", 45, summaryY);
        doc.setFont("helvetica", 'normal');
        doc.text(item.value, 160, summaryY, { align: "right" });
        summaryY += 12;
      });
      
      // Add a footer note
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("This report contains detailed information about moisture hotspots", 105, 250, { align: "center" });
      doc.text("Review the following pages for individual hotspot data", 105, 260, { align: "center" });
      
      // Move to the data section
      doc.addPage();
      
      // Data section header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", 'bold');
      doc.text("Detailed Moisture Readings", 16, 16);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", 'normal');
      doc.setFontSize(12);
      
      // Create the data table
      try {
        // Try using autoTable function from the plugin
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: 35,
            head: [tableColumns],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 10 },
          });
        } else {
          // Fallback to manual table rendering if autoTable is not available
          console.log("AutoTable not available, falling back to manual table");
          const startY = 35;
          const cellWidth = 35;
          const cellHeight = 10;
          const margin = 14;
          
          // Draw header
          doc.setFillColor(41, 128, 185);
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", 'bold');
          
          tableColumns.forEach((header, i) => {
            doc.rect(margin + (i * cellWidth), startY, cellWidth, cellHeight, 'F');
            doc.text(header, margin + 5 + (i * cellWidth), startY + 7);
          });
          
          // Draw rows
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", 'normal');
          
          tableRows.forEach((row, rowIndex) => {
            const rowY = startY + ((rowIndex + 1) * cellHeight);
            
            // Alternate row background for striped effect
            if (rowIndex % 2 === 0) {
              doc.setFillColor(240, 240, 240);
              doc.rect(margin, rowY, cellWidth * tableColumns.length, cellHeight, 'F');
            }
            
            row.forEach((cell, cellIndex) => {
              doc.text(String(cell), margin + 5 + (cellIndex * cellWidth), rowY + 7);
            });
          });
        }
      } catch (error) {
        console.error("Error creating table:", error);
        // Add a note about table generation error
        doc.text("Error generating table: " + (error instanceof Error ? error.message : String(error)), 14, 100);
      }
      
      // Calculate position for next content
      let yPosition = 40 + ((tableRows.length + 1) * 10) + 15;
      
      // Add map visualization section with captured image
      doc.setFontSize(14);
      doc.setFont("helvetica", 'bold');
      doc.text('Hotspot Distribution Map', 14, yPosition);
      doc.setFont("helvetica", 'normal');
      doc.setFontSize(12);
      yPosition += 10;
      
      // Add the captured map image if available
      if (mapImageData) {
        try {
          // Add a frame around the map image
          doc.setDrawColor(100, 100, 100);
          doc.setFillColor(245, 245, 245);
          doc.rect(14, yPosition, 180, 90, 'FD');
          
          // Add the map image
          doc.addImage(
            mapImageData, 
            'JPEG', 
            16, // x position
            yPosition + 2, // y position
            176, // width
            86, // height
            'map_image', // alias
            'MEDIUM' // compression
          );
          
          // Add a legend below the map
          yPosition += 95;
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text('* Map shows hotspot locations with color-coded moisture intensity.', 16, yPosition);
          doc.text('* Red markers indicate higher moisture concentration areas.', 16, yPosition + 4);
          yPosition += 15;
        } catch (imgError) {
          console.error('Error adding map image to PDF:', imgError);
          doc.text('Map image could not be added to the report.', 16, yPosition);
          yPosition += 10;
        }
      } else {
        doc.text('Interactive map not available for the report.', 16, yPosition);
        yPosition += 10;
      }
      
      yPosition += 5;
      
      // Add visual documentation section title
      doc.text('Hotspot Visual Documentation:', 14, yPosition);
      yPosition += 10;
      doc.text('(Each hotspot is presented on a separate page)', 14, yPosition);
      
      // Always start a new page for all hotspots, including the first one
      // Add hotspot details with improved formatting and safety checks
      for (const hotspot of (hotspotsData.hotspots || [])) {
        // Skip if hotspot data is invalid
        if (!hotspot) continue;
        
        // Create a new page for each hotspot
        doc.addPage();
        yPosition = 20;
        
        // Create a more professional header for each hotspot
        // Large hotspot header
        doc.setFillColor(41, 128, 185); // Blue header background
        doc.rect(0, 0, 210, 25, 'F'); // Full-width header
        
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(20);
        doc.setFont("helvetica", 'bold');
        
        // Safe id and moisture value handling
        const id = hotspot.id || 'N/A';
        const moistureValue = hotspot.moistureValue !== undefined ? 
          hotspot.moistureValue.toFixed(1) : 'N/A';
        
        doc.text(`Hotspot #${id}`, 16, 16);
        
        // Add moisture value on the right
        const moistureText = `Moisture: ${moistureValue}%`;
        const moistureTextWidth = doc.getTextWidth(moistureText);
        doc.text(moistureText, 195 - moistureTextWidth, 16);
        
        // Reset text color and font
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", 'normal');
        
        // Start content below header
        yPosition = 35;
        
        // Add a subtitle with the road name
        doc.setFontSize(14);
        doc.setFont("helvetica", 'bold');
        doc.text(`${hotspotsData.roadAsset.name}`, 16, yPosition);
        doc.setFont("helvetica", 'normal');
        yPosition += 10;
        
        // Add a horizontal separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(16, yPosition, 195, yPosition);
        yPosition += 10;
        
        // Create a box with key information
        doc.setFontSize(12);
        
        // Use a more structured layout
        const infoBoxY = yPosition;
        doc.setFillColor(245, 245, 245);
        doc.rect(16, infoBoxY, 180, 40, 'F');
        
        // Safe date handling
        let formattedDate = 'N/A';
        if (hotspot.readingDate) {
          try {
            formattedDate = format(new Date(hotspot.readingDate), 'MMMM d, yyyy');
          } catch (e) {
            console.error('Error formatting date:', e);
          }
        }
        
        // Safe coordinates handling
        const latitude = hotspot.latitude !== undefined ? hotspot.latitude.toFixed(6) : 'N/A';
        const longitude = hotspot.longitude !== undefined ? hotspot.longitude.toFixed(6) : 'N/A';
        
        // Safe depth handling
        const depth = hotspot.depth !== undefined ? hotspot.depth.toFixed(1) : 'N/A';
        
        // Create a nicely formatted info table
        doc.setFont("helvetica", 'bold');
        doc.text("Date:", 25, infoBoxY + 12);
        doc.text("Location:", 25, infoBoxY + 22);
        doc.text("Depth:", 25, infoBoxY + 32);
        
        doc.setFont("helvetica", 'normal');
        doc.text(formattedDate, 70, infoBoxY + 12);
        doc.text(`${latitude}, ${longitude}`, 70, infoBoxY + 22);
        doc.text(`${depth} cm`, 70, infoBoxY + 32);
        
        yPosition = infoBoxY + 50;
        
        // Add Google Maps link if available
        if (hotspot.googleMapsUrl) {
          doc.setTextColor(0, 80, 255);
          doc.setFont("helvetica", 'bold');
          const gmLinkText = 'View location on Google Maps';
          doc.text(gmLinkText, 16, yPosition);
          
          // Add underline manually
          const textWidth = doc.getTextWidth(gmLinkText);
          doc.setDrawColor(0, 80, 255);
          doc.line(16, yPosition + 1, 16 + textWidth, yPosition + 1);
          
          // Reset text appearance
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", 'normal');
          
          // Add link annotation
          doc.link(16, yPosition - 5, 80, 5, { url: hotspot.googleMapsUrl });
          yPosition += 15;
        }
        
        // Add street view images if available
        if (hotspot.streetViewImages && hotspot.streetViewImages.length > 0) {
          yPosition += 5;
          
          // Add a more professional section header for street view images
          doc.setFillColor(41, 128, 185, 0.1);  // Light blue background
          doc.rect(14, yPosition - 6, 180, 14, 'F');
          doc.setDrawColor(41, 128, 185);       // Blue border
          doc.rect(14, yPosition - 6, 180, 14, 'S');
          
          // Add a small icon-like element before the text
          doc.setFillColor(41, 128, 185);
          doc.circle(22, yPosition + 1, 3, 'F');
          
          doc.setFont("helvetica", 'bold');
          doc.text('Street View Images (360° Views)', 28, yPosition + 2);
          doc.setFont("helvetica", 'normal');
          yPosition += 18;
          
          try {
            // Define fixed locations for images to ensure consistent placement regardless of data order
            const directions = ['North', 'East', 'South', 'West'];
            const directionValues = [0, 90, 180, 270];
            
            // Calculate image layout for the 2x2 grid
            const imageWidth = 65;
            const imageHeight = 50;
            const padding = 8;
            
            // Fixed positions for the 2x2 grid
            const positions = [
              { x: 20, y: yPosition, name: 'North' },   // Top-left (North)
              { x: 110, y: yPosition, name: 'East' },   // Top-right (East)
              { x: 20, y: yPosition + imageHeight + 15, name: 'South' }, // Bottom-left (South)
              { x: 110, y: yPosition + imageHeight + 15, name: 'West' }  // Bottom-right (West)
            ];
            
            // Get image data by direction
            const imagesByDirection: Record<string, any> = {};
            for (const image of hotspot.streetViewImages || []) {
              if (image && image.direction !== undefined) {
                // Convert direction to string key (0, 90, 180, 270)
                const dirKey = image.direction.toString();
                imagesByDirection[dirKey] = image;
              }
            }
            
            console.log("Images by direction:", Object.keys(imagesByDirection).join(', '));
            
            // For each position in our grid, find and place the corresponding directional image
            for (let i = 0; i < positions.length; i++) {
              const pos = positions[i];
              const direction = directionValues[i];
              const dirKey = direction.toString();
              const image = imagesByDirection[dirKey] || null;
              
              // Draw the frame and label even if there's no image
              doc.setFontSize(8);
              doc.text(`${pos.name} View`, pos.x, pos.y - 2);
              doc.setFontSize(12);
              
              // Add a border frame around the image area
              doc.setDrawColor(100, 100, 100);
              doc.rect(pos.x, pos.y, imageWidth, imageHeight, 'S');
              
              // If we have an image for this direction, add it
              if (image) {
                console.log(`Found image for ${pos.name} (${direction})`);
                
                if (image.base64) {
                  try {
                    // Remove the data URL prefix if it exists
                    const base64Data = image.base64.startsWith('data:image') ?
                      image.base64.split(',')[1] : image.base64;
                      
                    doc.addImage(
                      base64Data, 
                      'JPEG', 
                      pos.x, 
                      pos.y, 
                      imageWidth, 
                      imageHeight,
                      `img_${hotspot.id}_${i}`,
                      'MEDIUM'
                    );
                  } catch (imgError) {
                    console.error(`Error adding ${pos.name} image to PDF:`, imgError);
                    doc.setFillColor(240, 240, 240);
                    doc.rect(pos.x, pos.y, imageWidth, imageHeight, 'F');
                    doc.setFontSize(9);
                    doc.text('Image unavailable', pos.x + imageWidth/2, pos.y + (imageHeight / 2), { align: 'center' });
                    doc.setFontSize(12);
                  }
                } else if (image.url) {
                  // If no base64 but URL is available, add a placeholder with link
                  doc.setFillColor(240, 240, 240);
                  doc.rect(pos.x, pos.y, imageWidth, imageHeight, 'F');
                  doc.setFontSize(9);
                  doc.text('Image available online', pos.x + imageWidth/2, pos.y + (imageHeight / 2), { align: 'center' });
                  doc.setFontSize(12);
                  
                  // Add link to the image
                  doc.link(pos.x, pos.y, imageWidth, imageHeight, { url: image.url });
                }
              } else {
                // No image found for this direction
                console.log(`No image found for ${pos.name} (${direction})`);
                doc.setFillColor(240, 240, 240);
                doc.rect(pos.x, pos.y, imageWidth, imageHeight, 'F');
                doc.setFontSize(9);
                doc.text('No view available', pos.x + imageWidth/2, pos.y + (imageHeight / 2), { align: 'center' });
                doc.setFontSize(12);
              }
            }
            
            // Update the yPosition to below the grid (after both rows)
            yPosition = positions[2].y + imageHeight + 15; // Use the South (bottom) row position + height + padding
          } catch (svError) {
            console.error('Error processing street view images:', svError);
            // Log detailed error information
            if (svError instanceof Error) {
              console.error('Error details:', svError.message, svError.stack);
            }
            doc.text('Street view images could not be processed', 16, yPosition);
            yPosition += 8;
          }
        } else {
          doc.text('No street view images available', 16, yPosition);
          yPosition += 8;
        }
        
        yPosition += 10;
      }
      
      console.log("PDF created, preparing to save");
      
      // Save the PDF with a descriptive filename
      const fileName = `moisture-hotspots-${hotspotsData.roadAsset.name.replace(/\s+/g, '-')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: 'Report Generated',
        description: `Your moisture hotspots report "${fileName}" has been downloaded.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="container p-6 mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Moisture Hotspots Report</h1>
        <p className="text-gray-500 mt-2">
          Identify and analyze the most problematic moisture areas in your road assets
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Area Selection for Moisture Analysis</CardTitle>
          <CardDescription>
            Draw a polygon on the map to select an area and analyze all moisture readings within that region (across all roads)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {polygonCoordinates.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <Edit3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Area Selected</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Click "Draw Area" to select a region on the map for moisture analysis
                </p>
                <Button 
                  onClick={() => setIsDrawingPolygon(true)}
                  disabled={isDrawingPolygon}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Draw Area
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-blue-900">Area Selected</h4>
                    <p className="text-sm text-blue-700">
                      {filteredHotspots?.length || 0} moisture readings found in the selected area
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={clearPolygonSelection}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Area
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoadingHotspots && selectedRoadId ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading hotspots data...</span>
        </div>
      ) : null}

      {hotspotsData ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                Hotspots for {hotspotsData.roadAsset.name}
              </h2>
              {filteredHotspots && (
                <p className="text-sm text-gray-600 mt-1">
                  Showing {filteredHotspots.length} of {hotspotsData.hotspots.length} hotspots in selected area
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {polygonCoordinates.length > 0 ? (
                <Button 
                  variant="outline"
                  onClick={clearPolygonSelection}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Area
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => setIsDrawingPolygon(true)}
                  disabled={isDrawingPolygon}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Select Area
                </Button>
              )}
              <Button 
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Generate PDF Report
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Total Readings</dt>
                    <dd className="font-medium">
                      {filteredHotspots ? filteredHotspots.length : hotspotsData.totalReadings}
                      {filteredHotspots && (
                        <span className="text-xs text-gray-400 ml-1">
                          (of {hotspotsData.totalReadings})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">
                      {filteredHotspots ? 'Selected Area Hotspots' : 'Hotspot Count (Top 5%)'}
                    </dt>
                    <dd className="font-medium">
                      {filteredHotspots ? filteredHotspots.length : hotspotsData.hotspotCount}
                      {filteredHotspots && (
                        <span className="text-xs text-gray-400 ml-1">
                          (of {hotspotsData.hotspotCount})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Moisture Threshold</dt>
                    <dd className="font-medium">{hotspotsData.threshold.toFixed(2)}%</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Road Length</dt>
                    <dd className="font-medium">{hotspotsData.roadAsset.length} meters</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Road Material</dt>
                    <dd className="font-medium">{hotspotsData.roadAsset.material}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hotspot Distribution</CardTitle>
                {isDrawingPolygon && (
                  <CardDescription className="text-blue-600">
                    Click on the map to draw a polygon area. Click the first point again to complete.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="h-[300px] rounded-md relative">
                  {hotspotsData && hotspotsData.hotspots.length > 0 ? (
                    <MapHotspots 
                      hotspots={filteredHotspots || hotspotsData.hotspots} 
                      threshold={hotspotsData.threshold}
                      isDrawingPolygon={isDrawingPolygon}
                      polygonCoordinates={polygonCoordinates}
                      onPolygonComplete={handlePolygonComplete}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-100">
                      <p className="text-gray-500">No hotspots data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-xl font-bold mt-12 mb-6">Detailed Hotspots</h3>
          
          <div className="grid grid-cols-1 gap-6">
            {(filteredHotspots || hotspotsData.hotspots).map((hotspot) => (
              <Card key={hotspot.id} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold">Hotspot #{hotspot.id}</h4>
                        <p className="text-sm text-gray-500">
                          {format(new Date(hotspot.readingDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className="bg-red-600">
                        {hotspot.moistureValue.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <dl className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Depth</dt>
                        <dd className="font-medium">{hotspot.depth} cm</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Latitude</dt>
                        <dd className="font-medium">{hotspot.latitude.toFixed(6)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Longitude</dt>
                        <dd className="font-medium">{hotspot.longitude.toFixed(6)}</dd>
                      </div>
                    </dl>
                    
                    <div className="mt-4">
                      <a 
                        href={hotspot.googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        View on map
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 bg-gray-50">
                    {hotspot.streetViewImages?.map((image, idx) => {
                      const directions = ['North', 'East', 'South', 'West'];
                      const directionName = directions[image.direction / 90] || 'View';
                      
                      return (
                        <div key={idx} className="p-2">
                          <div className="bg-white p-2 rounded-md">
                            <div className="text-xs font-medium text-gray-500 mb-1">
                              {directionName} View
                            </div>
                            <img 
                              src={image.url} 
                              alt={`Street view facing ${directionName}`}
                              className="rounded-md w-full h-auto object-cover"
                              style={{ maxHeight: '150px' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      {selectedRoadId && !isLoadingHotspots && !hotspotsData && (
        <Card className="p-8 text-center">
          <div className="text-lg text-gray-500">
            No moisture hotspots data available for this road asset
          </div>
          <p className="text-sm text-gray-400 mt-2">
            This may be because there are no moisture readings or there was an error fetching the data
          </p>
        </Card>
      )}
    </div>
  );
};

// MapHotspots component to display hotspots on a Leaflet map
interface MapHotspotsProps {
  hotspots: MoistureReading[];
  threshold: number;
  isDrawingPolygon?: boolean;
  polygonCoordinates?: LatLngTuple[];
  onPolygonComplete?: (coordinates: LatLngTuple[]) => void;
}

// Internal component that adjusts the map's view to the bounds
const MapBoundsComponent = ({ bounds }: { bounds: [[number, number], [number, number]] | undefined }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [map, bounds]);
  
  return null;
};

// Component for handling polygon drawing interactions
const PolygonDrawer: React.FC<{
  isDrawing: boolean;
  onComplete: (coordinates: LatLngTuple[]) => void;
}> = ({ isDrawing, onComplete }) => {
  const map = useMap();
  const [tempPoints, setTempPoints] = useState<LatLngTuple[]>([]);

  useEffect(() => {
    if (!isDrawing) {
      setTempPoints([]);
      return;
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const newPoint: LatLngTuple = [e.latlng.lat, e.latlng.lng];
      
      setTempPoints(prev => {
        const newPoints = [...prev, newPoint];
        
        // If clicking near the first point (within 50 meters), complete the polygon
        if (newPoints.length >= 3) {
          const firstPoint = newPoints[0];
          const distance = map.distance(firstPoint, newPoint);
          
          if (distance < 50) { // 50 meters tolerance
            onComplete(newPoints.slice(0, -1)); // Remove the duplicate last point
            return [];
          }
        }
        
        return newPoints;
      });
    };

    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawing, map, onComplete]);

  // Render temporary polygon while drawing
  if (tempPoints.length >= 2) {
    return (
      <Polygon
        positions={tempPoints}
        color="blue"
        fillColor="blue"
        fillOpacity={0.2}
        weight={2}
        dashArray="5, 5"
      />
    );
  }

  return null;
};

const MapHotspots: React.FC<MapHotspotsProps> = ({ 
  hotspots, 
  threshold, 
  isDrawingPolygon = false,
  polygonCoordinates = [],
  onPolygonComplete
}) => {
  // Calculate center point
  const center = useMemo((): LatLngTuple => {
    if (!hotspots || hotspots.length === 0) return [40.7128, -74.0060]; // Default: NYC
    
    const lats = hotspots.map(h => h.latitude);
    const lngs = hotspots.map(h => h.longitude);
    
    const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
    const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;
    
    return [centerLat, centerLng];
  }, [hotspots]);
  
  // Create map bounds that include all hotspots
  const bounds = useMemo(() => {
    if (!hotspots || hotspots.length === 0) return undefined;
    
    const lats = hotspots.map(h => h.latitude);
    const lngs = hotspots.map(h => h.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add padding to the bounds
    const latPadding = (maxLat - minLat) * 0.2 || 0.01; // Ensure minimum padding
    const lngPadding = (maxLng - minLng) * 0.2 || 0.01;
    
    return [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding]
    ] as [[number, number], [number, number]];
  }, [hotspots]);
  
  if (!hotspots || hotspots.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">No hotspot data available</p>
      </div>
    );
  }
  
  return (
    <div className="relative h-full">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%', borderRadius: '0.375rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Add map bounds handler component */}
        <MapBoundsComponent bounds={bounds} />
        
        {/* Render selected polygon area */}
        {polygonCoordinates.length >= 3 && (
          <Polygon
            positions={polygonCoordinates}
            color="blue"
            fillColor="blue"
            fillOpacity={0.1}
            weight={2}
          />
        )}
        
        {/* Polygon drawing component */}
        {isDrawingPolygon && onPolygonComplete && (
          <PolygonDrawer
            isDrawing={isDrawingPolygon}
            onComplete={onPolygonComplete}
          />
        )}
        
        {hotspots.map((hotspot) => {
          // Calculate color based on moisture (redder = higher moisture)
          const intensity = Math.min(100, (hotspot.moistureValue / threshold) * 100);
          const r = Math.round(255 * (intensity / 100));
          const g = Math.round(255 * (1 - (intensity / 100)));
          const b = 0;
          
          return (
            <CircleMarker
              key={hotspot.id}
              center={[hotspot.latitude, hotspot.longitude]}
              radius={8}
              fillColor={`rgb(${r}, ${g}, ${b})`}
              color="white"
              weight={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div className="p-1">
                  <div className="font-bold">Hotspot #{hotspot.id}</div>
                  <div className="text-sm">Moisture: {hotspot.moistureValue.toFixed(1)}%</div>
                  <div className="text-sm">Date: {format(new Date(hotspot.readingDate), 'MMM d, yyyy')}</div>
                  <div className="text-sm">Depth: {hotspot.depth} cm</div>
                  {hotspot.googleMapsUrl && (
                    <a 
                      href={hotspot.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 flex items-center mt-1"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      View in Google Maps
                    </a>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Map legend positioned over the map */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white px-3 py-2 rounded-md shadow-md text-xs">
        <div className="font-medium mb-1">Moisture Level</div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span>Low</span>
        </div>
        <div className="flex items-center mt-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center mt-1">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export default MoistureHotspots;