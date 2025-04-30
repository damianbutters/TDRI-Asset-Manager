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
import { Loader2, Download, ExternalLink, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { LatLngBounds, LatLng, LatLngTuple } from 'leaflet';
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
  const [selectedRoadId, setSelectedRoadId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Fetch road assets
  const { data: roadAssets, isLoading: isLoadingRoads } = useQuery({
    queryKey: ['/api/road-assets', currentTenant?.id],
    enabled: !!currentTenant,
  });

  // Fetch hotspots data when a road is selected
  const { 
    data: hotspotsData, 
    isLoading: isLoadingHotspots,
    refetch: refetchHotspots
  } = useQuery<HotspotsResponse>({
    queryKey: ['/api/road-assets', selectedRoadId, 'moisture-hotspots'],
    queryFn: () => 
      fetch(`/api/road-assets/${selectedRoadId}/moisture-hotspots?includeStreetView=true`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch hotspots data');
          }
          return res.json();
        }),
    enabled: !!selectedRoadId,
  });

  const handleGeneratePdf = async () => {
    if (!hotspotsData) return;
    
    setIsGeneratingPdf(true);
    
    try {
      console.log("Starting PDF generation");
      
      // Create a new PDF document with enhanced type
      const doc = new jsPDF() as EnhancedJsPDF;
      
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
      
      // Create a simple table without the plugin first
      try {
        // Try using autoTable function from the plugin
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: 100,
            head: [tableColumns],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 10 },
          });
        } else {
          // Fallback to manual table rendering if autoTable is not available
          console.log("AutoTable not available, falling back to manual table");
          const startY = 100;
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
      let yPosition = 100 + ((tableRows.length + 1) * 10) + 15;
      
      // Add map visualization section
      doc.text('Hotspot Distribution Map:', 14, yPosition);
      yPosition += 10;
      doc.text('(Refer to interactive map in application for detailed visualization)', 14, yPosition);
      yPosition += 15;
      
      // Add visual documentation section
      doc.text('Hotspot Visual Documentation:', 14, yPosition);
      yPosition += 10;
      
      // Add hotspot details with improved formatting and safety checks
      for (const hotspot of (hotspotsData.hotspots || [])) {
        // Skip if hotspot data is invalid
        if (!hotspot) continue;
        
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Add hotspot header with colored background
        doc.setFillColor(220, 220, 220);
        doc.rect(14, yPosition - 4, 180, 10, 'F');
        doc.setFont("helvetica", 'bold');
        
        // Safe id and moisture value handling
        const id = hotspot.id || 'N/A';
        const moistureValue = hotspot.moistureValue !== undefined ? 
          hotspot.moistureValue.toFixed(2) : 'N/A';
        doc.text(`Hotspot #${id} (${moistureValue}%)`, 16, yPosition);
        doc.setFont("helvetica", 'normal');
        yPosition += 10;
        
        // Safe coordinates handling
        const latitude = hotspot.latitude !== undefined ? hotspot.latitude.toFixed(6) : 'N/A';
        const longitude = hotspot.longitude !== undefined ? hotspot.longitude.toFixed(6) : 'N/A';
        doc.text(`Location: ${latitude}, ${longitude}`, 16, yPosition);
        yPosition += 7;
        
        // Safe date handling
        let formattedDate = 'N/A';
        if (hotspot.readingDate) {
          try {
            formattedDate = format(new Date(hotspot.readingDate), 'MMM d, yyyy');
          } catch (e) {
            console.error('Error formatting date:', e);
          }
        }
        doc.text(`Date: ${formattedDate}`, 16, yPosition);
        yPosition += 7;
        
        // Safe depth handling
        const depth = hotspot.depth !== undefined ? hotspot.depth.toFixed(1) : 'N/A';
        doc.text(`Measurement depth: ${depth} cm`, 16, yPosition);
        yPosition += 7;
        
        // Add Google Maps link if available
        if (hotspot.googleMapsUrl) {
          doc.setTextColor(0, 0, 255);
          doc.text('View on Google Maps', 16, yPosition);
          doc.setTextColor(0, 0, 0);
          
          // Add link annotation
          doc.link(16, yPosition - 5, 50, 5, { url: hotspot.googleMapsUrl });
          yPosition += 10;
        }
        
        // Add street view images if available
        if (hotspot.streetViewImages && hotspot.streetViewImages.length > 0) {
          yPosition += 5;
          doc.text('Street View Images:', 16, yPosition);
          yPosition += 8;
          
          try {
            // Calculate image layout
            const imageWidth = 80;
            const imageHeight = 60;
            const imagesPerRow = 2;
            const padding = 10;
            
            // Process street view images
            for (let i = 0; i < hotspot.streetViewImages.length; i++) {
              const image = hotspot.streetViewImages[i];
              
              // Skip if image data is missing
              if (!image || !image.url) continue;
              
              // Calculate position for this image
              const col = i % imagesPerRow;
              const row = Math.floor(i / imagesPerRow);
              const xPos = 16 + (col * (imageWidth + padding));
              const yPosTop = yPosition + (row * (imageHeight + 20));
              
              // Check if we need a new page
              if (yPosTop + imageHeight > 280) {
                doc.addPage();
                yPosition = 20;
                // Reset the row counter after page break
                i = i - col; // Reset to beginning of current row
                continue;
              }
              
              // Add direction label
              const directions = ['North', 'East', 'South', 'West'];
              const directionName = image.direction !== undefined ? 
                directions[Math.floor(image.direction / 90) % 4] : 'View';
                
              doc.setFontSize(8);
              doc.text(`${directionName} View`, xPos, yPosTop - 2);
              doc.setFontSize(12);
              
              // Add image if base64 data is available (preferred for PDF embedding)
              if (image.base64) {
                try {
                  // Remove the data URL prefix if it exists
                  const base64Data = image.base64.startsWith('data:image') ?
                    image.base64.split(',')[1] : image.base64;
                    
                  doc.addImage(
                    base64Data, 
                    'JPEG', 
                    xPos, 
                    yPosTop, 
                    imageWidth, 
                    imageHeight,
                    `img_${hotspot.id}_${i}`,
                    'MEDIUM'
                  );
                } catch (imgError) {
                  console.error('Error adding image to PDF:', imgError);
                  doc.setFillColor(240, 240, 240);
                  doc.rect(xPos, yPosTop, imageWidth, imageHeight, 'F');
                  doc.text('Image unavailable', xPos + 10, yPosTop + (imageHeight / 2));
                }
              } else if (image.url) {
                // If no base64 but URL is available, add a placeholder with link
                doc.setFillColor(240, 240, 240);
                doc.rect(xPos, yPosTop, imageWidth, imageHeight, 'F');
                doc.text('Image available online', xPos + 10, yPosTop + (imageHeight / 2));
                
                // Add link to the image
                doc.link(xPos, yPosTop, imageWidth, imageHeight, { url: image.url });
              }
              
              // Adjust yPosition based on the last row
              if (col === imagesPerRow - 1 || i === hotspot.streetViewImages.length - 1) {
                // If this is the last image in a row or the last image overall
                // and we're in the first column, update yPosition
                if (col === imagesPerRow - 1 || i === hotspot.streetViewImages.length - 1) {
                  yPosition = yPosTop + imageHeight + 15;
                }
              }
            }
          } catch (svError) {
            console.error('Error processing street view images:', svError);
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
          <CardTitle>Select Road Asset</CardTitle>
          <CardDescription>
            Choose a road asset to view its moisture hotspots (top 5% highest moisture readings)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="road-select" className="text-sm font-medium">
                Road Asset
              </label>
              <Select 
                value={selectedRoadId} 
                onValueChange={(value) => setSelectedRoadId(value)}
                disabled={isLoadingRoads}
              >
                <SelectTrigger id="road-select" className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a road asset" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(roadAssets) && roadAssets.map((road: RoadAsset) => (
                    <SelectItem key={road.id} value={road.id.toString()}>
                      {road.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            disabled={!selectedRoadId || isLoadingHotspots}
            onClick={() => refetchHotspots()}
          >
            {isLoadingHotspots ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading
              </>
            ) : (
              'Refresh Data'
            )}
          </Button>
        </CardFooter>
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
            <h2 className="text-2xl font-bold">
              Hotspots for {hotspotsData.roadAsset.name}
            </h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Total Readings</dt>
                    <dd className="font-medium">{hotspotsData.totalReadings}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Hotspot Count (Top 5%)</dt>
                    <dd className="font-medium">{hotspotsData.hotspotCount}</dd>
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
              </CardHeader>
              <CardContent>
                <div className="h-[300px] rounded-md relative">
                  {hotspotsData && hotspotsData.hotspots.length > 0 ? (
                    <MapHotspots hotspots={hotspotsData.hotspots} threshold={hotspotsData.threshold} />
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
            {hotspotsData.hotspots.map((hotspot) => (
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

const MapHotspots: React.FC<MapHotspotsProps> = ({ hotspots, threshold }) => {
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