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

// Polygon Drawing Map Component
const PolygonDrawingMap: React.FC<{ onMapClick: (e: any) => void }> = ({ onMapClick }) => {
  const map = useMap();

  useEffect(() => {
    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [map, onMapClick]);

  return null;
};

// Map Component for Hotspots
const MapHotspots: React.FC<MapHotspotsProps> = ({ 
  hotspots, 
  threshold, 
  isDrawingPolygon = false, 
  polygonCoordinates = [], 
  onPolygonComplete 
}) => {
  const handleMapClick = (e: any) => {
    if (isDrawingPolygon && onPolygonComplete) {
      const newPoint: LatLngTuple = [e.latlng.lat, e.latlng.lng];
      const newCoordinates = [...polygonCoordinates, newPoint];
      
      if (newCoordinates.length >= 3) {
        onPolygonComplete(newCoordinates);
      }
    }
  };

  const center = useMemo((): LatLngTuple => {
    if (hotspots && hotspots.length > 0) {
      const totalLat = hotspots.reduce((sum, hotspot) => sum + hotspot.latitude, 0);
      const totalLng = hotspots.reduce((sum, hotspot) => sum + hotspot.longitude, 0);
      return [totalLat / hotspots.length, totalLng / hotspots.length];
    }
    return [37.608, -77.374];
  }, [hotspots]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {isDrawingPolygon && <PolygonDrawingMap onMapClick={handleMapClick} />}
      
      {polygonCoordinates.length > 0 && (
        <Polygon
          positions={polygonCoordinates}
          pathOptions={{
            color: 'blue',
            fillColor: 'lightblue',
            fillOpacity: 0.3,
            weight: 2
          }}
        />
      )}

      {hotspots.map((hotspot) => {
        const isHighMoisture = hotspot.moistureValue > threshold;
        return (
          <CircleMarker
            key={hotspot.id}
            center={[hotspot.latitude, hotspot.longitude]}
            radius={isHighMoisture ? 8 : 4}
            pathOptions={{
              color: isHighMoisture ? 'red' : 'orange',
              fillColor: isHighMoisture ? 'red' : 'orange',
              fillOpacity: 0.7,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">Reading #{hotspot.id}</div>
                <div>Moisture: {hotspot.moistureValue.toFixed(2)}%</div>
                <div>Depth: {hotspot.depth}cm</div>
                <div>Date: {format(new Date(hotspot.readingDate), 'MM/dd/yyyy')}</div>
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
        body: JSON.stringify({ coordinates }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch area moisture data');
      }
      
      const data = await response.json();
      setAreaHotspots(data.readings || []);
      
      toast({
        title: 'Area Analysis Complete',
        description: `Found ${data.readings?.length || 0} moisture readings in the selected area.`,
      });
    } catch (error) {
      console.error('Error fetching area moisture data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch moisture data for the selected area.',
        variant: 'destructive',
      });
      setAreaHotspots([]);
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
      const doc = new jsPDF() as EnhancedJsPDF;
      
      // Capture map if available
      if (mapRef.current) {
        try {
          const canvas = await html2canvas(mapRef.current, {
            useCORS: true,
            scale: 1,
          });
          const imgData = canvas.toDataURL('image/png');
          console.log("Map captured successfully");
        } catch (mapError) {
          console.log("Could not capture map:", mapError);
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
      
      // White text on blue background
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('TDRIPlanner', 105, 25, { align: 'center' });
      
      // Reset text color to black
      doc.setTextColor(0, 0, 0);
      
      // Try to add table using autoTable if available
      let yPosition = summaryStart + (isRoadOnly ? 60 : 50);
      
      if (doc.autoTable) {
        doc.autoTable({
          startY: yPosition,
          head: [tableColumns],
          body: tableRows,
          theme: 'grid',
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
      const fileName = `moisture-hotspots-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moisture Hotspots Analysis</h1>
          <p className="text-muted-foreground">
            Select a specific road or draw custom areas to analyze moisture readings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map and Controls */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Moisture Analysis Map
              </CardTitle>
              <CardDescription>
                Select a road or draw an area to analyze moisture hotspots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Selection Controls */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Road Selection */}
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Select Road</label>
                      <Select value={selectedRoadId} onValueChange={(value) => {
                        setSelectedRoadId(value);
                        // Clear polygon when selecting a road
                        if (value) {
                          setPolygonCoordinates([]);
                          setFilteredHotspots(null);
                          setAreaHotspots(null);
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a road..." />
                        </SelectTrigger>
                        <SelectContent>
                          {roadAssets?.map((road: RoadAsset) => (
                            <SelectItem key={road.id} value={road.id.toString()}>
                              {road.name} - {road.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* OR separator */}
                    <div className="flex items-center justify-center">
                      <span className="text-sm text-muted-foreground bg-background px-2 py-1 rounded border">OR</span>
                    </div>

                    {/* Area Drawing */}
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Draw Custom Area</label>
                      <Button
                        onClick={() => {
                          if (isDrawingPolygon) {
                            setIsDrawingPolygon(false);
                            toast({
                              title: 'Drawing Cancelled',
                              description: 'Polygon drawing cancelled.',
                            });
                          } else {
                            setIsDrawingPolygon(true);
                            setPolygonCoordinates([]);
                            setFilteredHotspots(null);
                            setAreaHotspots(null);
                            // Clear road selection when drawing
                            setSelectedRoadId('');
                            toast({
                              title: 'Drawing Mode',
                              description: 'Click on the map to draw a polygon.',
                            });
                          }
                        }}
                        variant={isDrawingPolygon ? "destructive" : "default"}
                        disabled={isLoadingAreaData}
                        className="w-full"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {isDrawingPolygon ? 'Cancel Drawing' : 'Draw Area'}
                      </Button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {polygonCoordinates.length > 0 && (
                      <Button
                        onClick={clearPolygonSelection}
                        variant="outline"
                        disabled={isLoadingAreaData}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Area
                      </Button>
                    )}

                    {((filteredHotspots && filteredHotspots.length > 0) || 
                      (areaHotspots && areaHotspots.length > 0) ||
                      (hotspotsData && hotspotsData.hotspots.length > 0)) && (
                      <Button
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf}
                        variant="outline"
                      >
                        {isGeneratingPdf ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Export PDF
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Map Container */}
                <div ref={mapRef} style={{ height: '500px', width: '100%' }}>
                  <MapHotspots
                    hotspots={filteredHotspots || areaHotspots || hotspotsData?.hotspots || []}
                    threshold={hotspotsData?.threshold || 35}
                    isDrawingPolygon={isDrawingPolygon}
                    polygonCoordinates={polygonCoordinates}
                    onPolygonComplete={handlePolygonComplete}
                  />
                </div>

                {(isLoadingHotspots || isLoadingAreaData) && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-muted-foreground">
                      {isLoadingHotspots ? 'Loading road moisture data...' : 'Loading area moisture data...'}
                    </span>
                  </div>
                )}

                {polygonCoordinates.length > 0 && polygonCoordinates.length < 3 && (
                  <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Click at least 3 points to create a selection area</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
              <CardDescription>
                Statistics for the selected road or area
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const currentHotspots = filteredHotspots || areaHotspots || hotspotsData?.hotspots;
                const currentThreshold = hotspotsData?.threshold || 35;
                
                if (currentHotspots && currentHotspots.length > 0) {
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {currentHotspots.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Readings</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {currentHotspots.filter(h => h.moistureValue > currentThreshold).length}
                          </div>
                          <div className="text-sm text-muted-foreground">High Moisture</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Average Moisture:</span>
                          <span className="text-sm font-medium">
                            {(currentHotspots.reduce((sum, h) => sum + h.moistureValue, 0) / currentHotspots.length).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Max Moisture:</span>
                          <span className="text-sm font-medium">
                            {Math.max(...currentHotspots.map(h => h.moistureValue)).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Min Moisture:</span>
                          <span className="text-sm font-medium">
                            {Math.min(...currentHotspots.map(h => h.moistureValue)).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {hotspotsData && (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">Road Details</h4>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Name: {hotspotsData.roadAsset.name}</div>
                            <div>Length: {hotspotsData.roadAsset.length}m</div>
                            <div>Condition: {hotspotsData.roadAsset.condition}/100</div>
                            {filteredHotspots && (
                              <div>Area filter: {polygonCoordinates.length} vertices</div>
                            )}
                          </div>
                        </div>
                      )}

                      {areaHotspots && (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">Area Details</h4>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Polygon vertices: {polygonCoordinates.length}</div>
                            <div>Multi-road analysis</div>
                            <div>Analysis timestamp: {format(new Date(), 'HH:mm:ss')}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } else if ((selectedRoadId && isLoadingHotspots) || isLoadingAreaData) {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      <p className="text-sm">Loading moisture data...</p>
                    </div>
                  );
                } else if (polygonCoordinates.length > 0) {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No moisture readings found in the selected area</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      <MapPin className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Select a road or draw an area to view analysis</p>
                    </div>
                  );
                }
              })()}
            </CardContent>
          </Card>

          {/* Recent Hotspots List */}
          {(() => {
            const currentHotspots = filteredHotspots || areaHotspots || hotspotsData?.hotspots;
            
            if (currentHotspots && currentHotspots.length > 0) {
              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Moisture Readings</CardTitle>
                    <CardDescription>
                      {filteredHotspots ? 'Readings in selected area of road' : 
                       areaHotspots ? 'Readings within selected area' : 
                       'All readings for selected road'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {currentHotspots
                        .sort((a, b) => b.moistureValue - a.moistureValue)
                        .slice(0, 20)
                        .map((hotspot) => (
                          <div
                            key={hotspot.id}
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-medium">Reading #{hotspot.id}</div>
                              <div className={`text-sm font-bold ${
                                hotspot.moistureValue > 35 ? 'text-red-600' : 
                                hotspot.moistureValue > 25 ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                {hotspot.moistureValue.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Depth: {hotspot.depth}cm</div>
                              <div>Date: {format(new Date(hotspot.readingDate), 'MM/dd/yyyy')}</div>
                              <div>Location: {hotspot.latitude.toFixed(6)}, {hotspot.longitude.toFixed(6)}</div>
                            </div>
                            {hotspot.streetViewImages && hotspot.streetViewImages.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-muted-foreground mb-1">Street View:</div>
                                <div className="flex gap-1 flex-wrap">
                                  {hotspot.streetViewImages.map((image: any, idx: number) => (
                                    <img
                                      key={idx}
                                      src={`data:image/jpeg;base64,${image.base64}`}
                                      alt={`Street view ${idx + 1}`}
                                      className="w-16 h-12 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                                      onClick={() => {
                                        // Open in new tab for larger view
                                        const newWindow = window.open();
                                        if (newWindow) {
                                          newWindow.document.write(`<img src="data:image/jpeg;base64,${image.base64}" style="max-width: 100%; height: auto;" />`);
                                        }
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
};

export default MoistureHotspots;