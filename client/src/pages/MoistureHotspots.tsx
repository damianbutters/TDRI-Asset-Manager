import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, useMap } from 'react-leaflet';
import { Loader2, FileText, Trash2, Edit3, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'leaflet/dist/leaflet.css';

// Type definitions
type LatLngTuple = [number, number];

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

interface MapHotspotsProps {
  hotspots: MoistureReading[];
  threshold: number;
  isDrawingPolygon?: boolean;
  polygonCoordinates?: LatLngTuple[];
  onPolygonComplete?: (coordinates: LatLngTuple[]) => void;
}

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

// Map bounds management component
const MapBoundsComponent: React.FC<{ bounds: L.LatLngBounds | null }> = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.isValid()) {
      try {
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch (error) {
        console.error('Error setting map bounds:', error);
      }
    }
  }, [bounds, map]);

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
    
    const avgLat = hotspots.reduce((sum, h) => sum + h.latitude, 0) / hotspots.length;
    const avgLng = hotspots.reduce((sum, h) => sum + h.longitude, 0) / hotspots.length;
    
    return [avgLat, avgLng];
  }, [hotspots]);

  // Calculate bounds for all hotspots
  const bounds = useMemo(() => {
    if (!hotspots || hotspots.length === 0) return null;
    
    const lats = hotspots.map(h => h.latitude);
    const lngs = hotspots.map(h => h.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
  }, [hotspots]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ width: '100%', height: '100%' }}
      className="z-0"
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
        const b = 50;

        return (
          <CircleMarker
            key={hotspot.id}
            center={[hotspot.latitude, hotspot.longitude]}
            radius={8}
            fillColor={`rgb(${r}, ${g}, ${b})`}
            color="white"
            weight={2}
            fillOpacity={0.8}
          >
            <Popup>
              <div className="p-2">
                <h4 className="font-semibold">Moisture Reading #{hotspot.id}</h4>
                <p className="text-sm">
                  <strong>Moisture:</strong> {hotspot.moistureValue.toFixed(2)}%
                </p>
                <p className="text-sm">
                  <strong>Date:</strong> {format(new Date(hotspot.readingDate), 'MMM d, yyyy')}
                </p>
                <p className="text-sm">
                  <strong>Depth:</strong> {hotspot.depth}cm
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                </p>
                {hotspot.googleMapsUrl && (
                  <a 
                    href={hotspot.googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm underline"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

const MoistureHotspots: React.FC = () => {
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const [selectedRoadId, setSelectedRoadId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState<boolean>(false);
  const [polygonCoordinates, setPolygonCoordinates] = useState<LatLngTuple[]>([]);
  const [areaHotspots, setAreaHotspots] = useState<MoistureReading[] | null>(null);
  const [isLoadingAreaData, setIsLoadingAreaData] = useState<boolean>(false);
  const [filteredHotspots, setFilteredHotspots] = useState<MoistureReading[] | null>(null);

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

  // Function to filter hotspots by polygon area
  const filterHotspotsByPolygon = (hotspots: MoistureReading[], polygon: LatLngTuple[]): MoistureReading[] => {
    if (polygon.length < 3) return hotspots;
    
    return hotspots.filter(hotspot => 
      isPointInPolygon([hotspot.latitude, hotspot.longitude], polygon)
    );
  };

  // Fetch road assets
  const { data: roadAssets, isLoading: isLoadingRoads } = useQuery({
    queryKey: ['/api/road-assets', currentTenant?.id],
    enabled: !!currentTenant,
  });

  // Fetch hotspots data when road is selected
  const { data: hotspotsData, isLoading: isLoadingHotspots, refetch: refetchHotspots } = useQuery<HotspotsResponse>({
    queryKey: ['/api/road-assets', selectedRoadId, 'moisture-hotspots'],
    enabled: !!selectedRoadId,
  });

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
    
    if (hotspotsData?.hotspots) {
      // If we have road data, filter it by polygon
      const filtered = filterHotspotsByPolygon(hotspotsData.hotspots, coordinates);
      setFilteredHotspots(filtered);
      
      toast({
        title: 'Area Selected',
        description: `${filtered.length} hotspots found in the selected area.`,
      });
    } else {
      // If no road selected, fetch area data across all roads
      fetchAreaMoistureData(coordinates);
    }
  };

  // Function to clear polygon selection
  const clearPolygonSelection = () => {
    setPolygonCoordinates([]);
    setFilteredHotspots(null);
    setAreaHotspots(null);
    setIsDrawingPolygon(false);
    
    toast({
      title: 'Selection Cleared',
      description: 'Area selection removed.',
    });
  };

  // Reference to the map container for capturing
  const mapRef = useRef<HTMLDivElement>(null);
  
  const handleGeneratePdf = async () => {
    const currentHotspots = filteredHotspots || areaHotspots || hotspotsData?.hotspots;
    
    if (!currentHotspots || currentHotspots.length === 0) {
      toast({
        title: 'No Data Available',
        description: 'Please select a road or area with moisture readings to generate a report.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsGeneratingPdf(true);
    
    try {
      console.log("Starting PDF generation");
      
      // Create a new PDF document with enhanced type
      const doc = new jsPDF() as EnhancedJsPDF;
      
      // Capture map view if available
      let mapImageData = null;
      if (mapRef.current) {
        try {
          const mapCanvas = await html2canvas(mapRef.current, {
            height: 400,
            width: 600,
            logging: false,
            useCORS: true,
            scale: 1.5,
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
      
      // Determine report type and data source
      const isAreaAnalysis = !!areaHotspots;
      const isRoadWithPolygon = !!filteredHotspots && !!hotspotsData;
      const isRoadOnly = !!hotspotsData && !filteredHotspots;
      
      // Calculate statistics
      const totalReadings = currentHotspots.length;
      const averageMoisture = currentHotspots.reduce((sum, h) => sum + h.moistureValue, 0) / totalReadings;
      const maxMoisture = Math.max(...currentHotspots.map(h => h.moistureValue));
      const minMoisture = Math.min(...currentHotspots.map(h => h.moistureValue));
      
      // Add title and summary
      doc.setFontSize(20);
      let reportTitle = 'Moisture Hotspots Report';
      if (isAreaAnalysis) {
        reportTitle += ' - Multi-Road Area Analysis';
      } else if (isRoadWithPolygon) {
        reportTitle += ` - ${hotspotsData.roadAsset.name} (Selected Area)`;
      } else if (isRoadOnly) {
        reportTitle += ` - ${hotspotsData.roadAsset.name}`;
      }
      
      doc.text(reportTitle, 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      if (isAreaAnalysis) {
        doc.text(`Analysis Type: Polygon Area Selection (Multi-Road)`, 14, 30);
        doc.text(`Area Points: ${polygonCoordinates.length} vertices`, 14, 38);
      } else if (isRoadWithPolygon) {
        doc.text(`Road: ${hotspotsData.roadAsset.name}`, 14, 30);
        doc.text(`Analysis Type: Road with Polygon Filter`, 14, 38);
        doc.text(`Polygon Points: ${polygonCoordinates.length} vertices`, 14, 46);
      } else {
        doc.text(`Road: ${hotspotsData.roadAsset.name}`, 14, 30);
        doc.text(`Analysis Type: Full Road Analysis`, 14, 38);
        doc.text(`Road Length: ${hotspotsData.roadAsset.length}m`, 14, 46);
      }
      
      doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, 14, isRoadWithPolygon ? 54 : 46);
      doc.text(`Tenant: ${currentTenant?.name || 'All'}`, 14, isRoadWithPolygon ? 62 : 54);
      
      // Summary information
      const summaryStart = isRoadWithPolygon ? 74 : 66;
      doc.text('Report Summary:', 14, summaryStart);
      doc.text(`• Total moisture readings: ${totalReadings}`, 20, summaryStart + 8);
      doc.text(`• Average moisture level: ${averageMoisture.toFixed(2)}%`, 20, summaryStart + 16);
      doc.text(`• Highest moisture reading: ${maxMoisture.toFixed(2)}%`, 20, summaryStart + 24);
      doc.text(`• Lowest moisture reading: ${minMoisture.toFixed(2)}%`, 20, summaryStart + 32);
      
      if (isRoadOnly) {
        doc.text(`• Road condition score: ${hotspotsData.roadAsset.condition}/100`, 20, summaryStart + 40);
        doc.text(`• Road material: ${hotspotsData.roadAsset.material}`, 20, summaryStart + 48);
      }
      
      // Add hotspots table
      const tableColumns = ['ID', 'Date', 'Moisture %', 'Depth (cm)', 'Coordinates'];
      const tableRows = currentHotspots.map(spot => [
        spot.id.toString(),
        format(new Date(spot.readingDate), 'MM/dd/yyyy'),
        spot.moistureValue.toFixed(2),
        spot.depth.toFixed(1),
        `${spot.latitude.toFixed(6)}, ${spot.longitude.toFixed(6)}`
      ]);
      
      // Create a professional cover page
      // Blue background banner at top
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Report title on cover page
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", 'bold');
      doc.text("Moisture Hotspots Report", 105, 25, { align: "center" });
      
      // Area analysis subtitle
      doc.setFontSize(18);
      doc.text("Area Analysis Report", 105, 60, { align: "center" });
      
      // Add the current date
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(12);
      doc.text(format(new Date(), 'MMMM d, yyyy'), 105, 80, { align: "center" });
      
      // Add map image if captured
      if (mapImageData) {
        try {
          doc.addImage(mapImageData, 'JPEG', 15, 100, 180, 120);
          console.log("Map image added to PDF");
        } catch (imageError) {
          console.error("Error adding map image to PDF:", imageError);
        }
      }
      
      // Add new page for data
      doc.addPage();
      
      // Reset text color for content
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", 'normal');
      
      // Add detailed summary
      doc.setFontSize(16);
      doc.text('Area Analysis Summary', 14, 20);
      
      doc.setFontSize(12);
      let yPosition = 35;
      
      doc.text(`Total Readings in Selected Area: ${totalReadings}`, 14, yPosition);
      yPosition += 8;
      doc.text(`Average Moisture Level: ${averageMoisture.toFixed(2)}%`, 14, yPosition);
      yPosition += 8;
      doc.text(`Highest Moisture Reading: ${maxMoisture.toFixed(2)}%`, 14, yPosition);
      yPosition += 8;
      doc.text(`Lowest Moisture Reading: ${minMoisture.toFixed(2)}%`, 14, yPosition);
      yPosition += 8;
      doc.text(`Analysis Date: ${format(new Date(), 'MMMM d, yyyy')}`, 14, yPosition);
      yPosition += 8;
      doc.text(`Polygon Vertices: ${polygonCoordinates.length}`, 14, yPosition);
      
      // Add moisture readings table using autoTable if available
      if (doc.autoTable) {
        doc.autoTable({
          startY: yPosition + 15,
          head: [tableColumns],
          body: tableRows,
          theme: 'striped',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255
          },
          styles: {
            fontSize: 8
          }
        });
      } else {
        // Fallback: manually add table data
        yPosition += 20;
        doc.setFontSize(14);
        doc.text('Moisture Readings:', 14, yPosition);
        
        yPosition += 10;
        doc.setFontSize(8);
        
        // Add table headers
        doc.text('ID', 14, yPosition);
        doc.text('Date', 30, yPosition);
        doc.text('Moisture %', 60, yPosition);
        doc.text('Depth (cm)', 90, yPosition);
        doc.text('Coordinates', 120, yPosition);
        yPosition += 5;
        
        // Add table rows
        tableRows.forEach((row, rowIndex) => {
          if (yPosition > 270) { // Check if we need a new page
            doc.addPage();
            yPosition = 20;
          }
          
          row.forEach((cell, cellIndex) => {
            const xPositions = [14, 30, 60, 90, 120];
            doc.text(cell.toString(), xPositions[cellIndex], yPosition);
          });
          yPosition += 5;
        });
      }
      
      // Save the PDF
      const fileName = `moisture-hotspots-area-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: 'PDF Generated',
        description: `Report saved as ${fileName}`,
      });
      
      console.log("PDF generation completed successfully");
      
    } catch (error) {
      console.error('Error generating PDF:', error);
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moisture Hotspots Analysis</h1>
        <p className="text-muted-foreground">
          Identify and analyze the most problematic moisture areas using polygon area selection
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
                      {areaHotspots?.length || 0} moisture readings found in the selected area
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

      {isLoadingAreaData ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <span className="ml-4 text-lg">Analyzing area moisture data...</span>
        </div>
      ) : areaHotspots && areaHotspots.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Moisture Hotspots Map - Area Analysis</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={clearPolygonSelection}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Area
                    </Button>
                    <Button 
                      onClick={handleGeneratePdf}
                      disabled={isGeneratingPdf}
                    >
                      {isGeneratingPdf ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={mapRef} className="h-[600px] rounded-lg overflow-hidden border">
                  <MapHotspots 
                    hotspots={areaHotspots} 
                    threshold={Math.max(...areaHotspots.map(h => h.moistureValue)) * 0.95}
                    isDrawingPolygon={isDrawingPolygon}
                    polygonCoordinates={polygonCoordinates}
                    onPolygonComplete={handlePolygonComplete}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Area Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Total Readings in Area</dt>
                    <dd className="font-medium">{areaHotspots.length}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Average Moisture</dt>
                    <dd className="font-medium">
                      {(areaHotspots.reduce((sum, h) => sum + h.moistureValue, 0) / areaHotspots.length).toFixed(2)}%
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Highest Moisture</dt>
                    <dd className="font-medium">{Math.max(...areaHotspots.map(h => h.moistureValue)).toFixed(2)}%</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Lowest Moisture</dt>
                    <dd className="font-medium">{Math.min(...areaHotspots.map(h => h.moistureValue)).toFixed(2)}%</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-gray-500">Area Points</dt>
                    <dd className="font-medium">{polygonCoordinates.length} vertices</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Moisture Readings</CardTitle>
                <CardDescription>
                  {areaHotspots.length} readings found in selected area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {areaHotspots.map((hotspot) => {
                    const maxMoisture = Math.max(...areaHotspots.map(h => h.moistureValue));
                    const intensity = Math.min(100, (hotspot.moistureValue / maxMoisture) * 100);
                    const r = Math.round(255 * (intensity / 100));
                    const g = Math.round(255 * (1 - (intensity / 100)));
                    const b = 50;

                    return (
                      <div 
                        key={hotspot.id} 
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                            style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                          />
                          <span className="text-sm font-medium">
                            {hotspot.moistureValue.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>ID: {hotspot.id}</div>
                          <div>Date: {format(new Date(hotspot.readingDate), 'MMM d, yyyy')}</div>
                          <div>Depth: {hotspot.depth}cm</div>
                          <div>Location: {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}</div>
                          {hotspot.streetViewImages && hotspot.streetViewImages.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1">Street View:</div>
                              <div className="grid grid-cols-2 gap-1">
                                {hotspot.streetViewImages.slice(0, 2).map((image: any, idx: number) => (
                                  <img 
                                    key={idx}
                                    src={image.url} 
                                    alt={`Street view ${idx + 1}`}
                                    className="w-full h-16 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : polygonCoordinates.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Area Selected</h3>
          <p className="text-gray-500 mb-4">Draw a polygon on the map above to analyze moisture readings in a specific area</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
          <p className="text-gray-500">No moisture readings found in the selected area. Try selecting a different area.</p>
        </div>
      )}
    </div>
  );
};

export default MoistureHotspots;