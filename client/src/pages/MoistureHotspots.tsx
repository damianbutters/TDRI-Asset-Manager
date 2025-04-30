import React, { useState } from 'react';
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
      
      // Add hotspots table
      (doc as any).autoTable({
        startY: 100,
        head: [['ID', 'Date', 'Moisture %', 'Depth (cm)', 'Coordinates']],
        body: hotspotsData.hotspots.map(spot => [
          spot.id,
          format(new Date(spot.readingDate), 'MM/dd/yyyy'),
          spot.moistureValue.toFixed(2),
          spot.depth.toFixed(1),
          `${spot.latitude.toFixed(6)}, ${spot.longitude.toFixed(6)}`
        ]),
      });
      
      let yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Add street view images for each hotspot if available
      doc.text('Hotspot Visual Documentation:', 14, yPosition);
      yPosition += 10;
      
      for (const hotspot of hotspotsData.hotspots) {
        if (hotspot.streetViewImages && hotspot.streetViewImages.length > 0) {
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(`Hotspot #${hotspot.id} (${hotspot.moistureValue.toFixed(2)}%)`, 14, yPosition);
          yPosition += 8;
          
          // Add Google Maps link
          doc.setTextColor(0, 0, 255);
          doc.text('View on Google Maps', 14, yPosition);
          doc.setTextColor(0, 0, 0);
          
          // Add link annotation
          doc.link(14, yPosition - 5, 50, 5, { url: hotspot.googleMapsUrl || '' });
          yPosition += 15;
          
          // Street view images with direction labels
          let hasImages = false;
          const directions = ['North', 'East', 'South', 'West'];
          
          for (let i = 0; i < Math.min(2, hotspot.streetViewImages.length); i++) {
            const image = hotspot.streetViewImages[i];
            if (image.base64) {
              // Only process first two images per hotspot to save space
              if (i === 0) {
                hasImages = true;
              }
              
              const directionName = directions[image.direction / 90] || 'View';
              
              // Check if we need a new page
              if (yPosition > 180) {
                doc.addPage();
                yPosition = 20;
              }
              
              try {
                doc.text(`${directionName} View`, 14 + (i * 100), yPosition);
                doc.addImage(
                  'data:image/jpeg;base64,' + image.base64,
                  'JPEG',
                  14 + (i * 100),
                  yPosition + 5,
                  80,
                  60
                );
              } catch (e) {
                console.error('Error adding image to PDF:', e);
              }
            }
          }
          
          // Move position down past images or to next hotspot
          yPosition += hasImages ? 80 : 15;
        }
      }
      
      // Save the PDF
      doc.save(`moisture-hotspots-${hotspotsData.roadAsset.name.replace(/\\s+/g, '-')}.pdf`);
      
      toast({
        title: 'Report Generated',
        description: 'Your moisture hotspots report has been downloaded.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report.',
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
                <div className="h-[200px] flex items-center justify-center bg-gray-100 rounded-md">
                  {/* We'll implement a more complex visualization in the future */}
                  <p className="text-gray-500">Hotspot visualization coming soon</p>
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

export default MoistureHotspots;