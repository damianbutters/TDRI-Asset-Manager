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
      
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add title and summary
      doc.setFontSize(20);
      doc.text('Moisture Hotspots Report', 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Road: ${hotspotsData.roadAsset.name}`, 14, 30);
      doc.text(`Location: ${hotspotsData.roadAsset.location || 'N/A'}`, 14, 38);
      doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 46);
      doc.text(`Tenant: ${currentTenant?.name || 'All'}`, 14, 54);
      
      // Summary information
      doc.text('Report Summary:', 14, 66);
      doc.text(`• Total moisture readings: ${hotspotsData.totalReadings}`, 20, 74);
      doc.text(`• Number of hotspots identified: ${hotspotsData.hotspotCount}`, 20, 82);
      doc.text(`• Moisture threshold for hotspots: ${hotspotsData.threshold.toFixed(2)}%`, 20, 90);
      
      // Add hotspots table with improved formatting
      const tableColumns = ['ID', 'Date', 'Moisture %', 'Depth (cm)', 'Coordinates'];
      const tableRows = hotspotsData.hotspots.map(spot => [
        spot.id.toString(),
        format(new Date(spot.readingDate), 'MM/dd/yyyy'),
        spot.moistureValue.toFixed(2),
        spot.depth.toFixed(1),
        `${spot.latitude.toFixed(6)}, ${spot.longitude.toFixed(6)}`
      ]);
      
      // Use autoTable plugin
      (doc as any).autoTable({
        startY: 100,
        head: [tableColumns],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10 },
      });
      
      let yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Add map visualization section
      doc.text('Hotspot Distribution Map:', 14, yPosition);
      yPosition += 10;
      doc.text('(Refer to interactive map in application for detailed visualization)', 14, yPosition);
      yPosition += 15;
      
      // Add visual documentation section
      doc.text('Hotspot Visual Documentation:', 14, yPosition);
      yPosition += 10;
      
      // Add hotspot details with improved formatting
      for (const hotspot of hotspotsData.hotspots) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Add hotspot header with colored background
        doc.setFillColor(220, 220, 220);
        doc.rect(14, yPosition - 4, 180, 10, 'F');
        doc.setFont(undefined, 'bold');
        doc.text(`Hotspot #${hotspot.id} (${hotspot.moistureValue.toFixed(2)}%)`, 16, yPosition);
        doc.setFont(undefined, 'normal');
        yPosition += 10;
        
        // Add coordinates
        doc.text(`Location: ${hotspot.latitude.toFixed(6)}, ${hotspot.longitude.toFixed(6)}`, 16, yPosition);
        yPosition += 7;
        
        // Add date and depth
        doc.text(`Date: ${format(new Date(hotspot.readingDate), 'MMM d, yyyy')}`, 16, yPosition);
        yPosition += 7;
        doc.text(`Measurement depth: ${hotspot.depth.toFixed(1)} cm`, 16, yPosition);
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
        
        yPosition += 8;
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