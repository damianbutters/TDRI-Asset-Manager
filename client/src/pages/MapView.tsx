import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RoadAsset, MoistureReading, getConditionState } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Map from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { getConditionBadgeColor } from "@/lib/utils/color-utils";
import { format } from "date-fns";
import { RefreshCw, CloudRain } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MapView() {
  const [selectedAsset, setSelectedAsset] = useState<RoadAsset | null>(null);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [mapFilter, setMapFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"pci" | "moisture">("pci");
  const { toast } = useToast();
  
  // Fetch road assets
  const { data: roadAssets = [], isLoading, refetch: refetchRoadAssets } = useQuery<RoadAsset[]>({
    queryKey: ['/api/road-assets'],
  });
  
  // Fetch latest moisture readings for all roads with moisture data (optimized for map view)
  const { data: allMoistureReadings = {} } = useQuery<Record<string, MoistureReading>>({
    queryKey: ['/api/moisture-readings/latest'],
    enabled: roadAssets.some(asset => asset.lastMoistureReading !== null),
  });

  // Debug: Log the structure of moisture readings
  console.log("Moisture readings structure:", allMoistureReadings);
  
  // Update rainfall mutation
  const updateRainfallMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/update-all-rainfall', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rainfall data update started. This may take a few minutes to complete.",
        variant: "default"
      });
      // Refetch road assets after a delay to allow time for the update to process
      setTimeout(() => {
        refetchRoadAssets();
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update rainfall data",
        variant: "destructive"
      });
    }
  });

  // Fetch maintenance projects for maintenance trigger view
  const { data: maintenanceProjects = [] } = useQuery({
    queryKey: ['/api/maintenance-projects'],
  });

  // Filter assets based on selected filter
  const filteredAssets = roadAssets.filter(asset => {
    if (mapFilter === "all") return true;
    
    const state = getConditionState(asset.condition);
    return state === mapFilter;
  });

  // Handle asset click on map
  const handleAssetClick = (asset: RoadAsset) => {
    setSelectedAsset(asset);
    setIsAssetDialogOpen(true);
  };

  // Map center coordinates (calculated from the assets)
  const getMapCenter = (): [number, number] => {
    if (roadAssets.length === 0) return [40, -74.5]; // Default center
    
    // Calculate center point from all geometries
    let lat = 0;
    let lng = 0;
    let pointCount = 0;
    
    roadAssets.forEach(asset => {
      if (asset.geometry && asset.geometry.coordinates && asset.geometry.coordinates.length > 0) {
        asset.geometry.coordinates.forEach(coord => {
          lat += coord[1]; // Latitude is the second value
          lng += coord[0]; // Longitude is the first value
          pointCount++;
        });
      }
    });
    
    if (pointCount === 0) return [40, -74.5]; // Default if no valid coordinates
    
    return [lat / pointCount, lng / pointCount];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Map View</h2>
          <p className="text-neutral-textSecondary">Visualize road assets and conditions spatially</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1 mr-2"
            onClick={() => updateRainfallMutation.mutate()}
            disabled={updateRainfallMutation.isPending}
          >
            {updateRainfallMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <CloudRain className="h-4 w-4" />
                <span>Update Rainfall Data</span>
              </>
            )}
          </Button>
          <Select value={mapFilter} onValueChange={setMapFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="good">Good (80-100)</SelectItem>
              <SelectItem value="fair">Fair (60-79)</SelectItem>
              <SelectItem value="poor">Poor (40-59)</SelectItem>
              <SelectItem value="critical">Critical (0-39)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Map Views */}
      <Tabs defaultValue="condition" className="space-y-6">
        <TabsList>
          <TabsTrigger value="condition">Condition Map</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Triggers</TabsTrigger>
        </TabsList>

        {/* Condition Map Tab */}
        <TabsContent value="condition">
          <Card className="mb-6">
            <CardHeader className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Road Condition Map</CardTitle>
                  <CardDescription>
                    Visual representation of road conditions and moisture levels
                  </CardDescription>
                </div>
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "pci" | "moisture")} className="mt-2">
                  <TabsList className="grid w-[260px] grid-cols-2">
                    <TabsTrigger value="pci">PCI Condition</TabsTrigger>
                    <TabsTrigger value="moisture">Moisture Levels</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {viewMode === "pci" ? (
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-3">
                  <div className="text-sm">PCI Legend:</div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-[#107C10] mr-1"></span>
                    <span className="text-xs">Good (80-100)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-[#FFB900] mr-1"></span>
                    <span className="text-xs">Fair (60-79)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-[#D83B01] mr-1"></span>
                    <span className="text-xs">Poor (40-59)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-[#A80000] mr-1"></span>
                    <span className="text-xs">Critical (0-39)</span>
                  </div>
                  <div className="ml-auto text-xs text-neutral-textSecondary">
                    {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'} shown
                  </div>
                </div>
              ) : (
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-3">
                  <div className="text-sm">Moisture Legend:</div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-[#0E6AC7] mr-1"></span>
                    <span className="text-xs">Very Wet (25%+)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-[#2088EF] mr-1"></span>
                    <span className="text-xs">Wet (15-25%)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-[#69B5FF] mr-1"></span>
                    <span className="text-xs">Moderate (8-15%)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-[#C7E4FF] mr-1"></span>
                    <span className="text-xs">Dry (0-8%)</span>
                  </div>
                  <div className="ml-auto text-xs text-neutral-textSecondary">
                    {filteredAssets.filter(asset => asset.moistureLevel !== null).length} assets with moisture data
                  </div>
                </div>
              )}
              <div className="h-[calc(100vh-300px)] min-h-[400px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Map 
                    roadAssets={filteredAssets}
                    moistureReadings={allMoistureReadings}
                    height="h-full" 
                    center={getMapCenter()}
                    onAssetClick={handleAssetClick}
                    initialLayer={viewMode === "pci" ? "pci" : "moisture"}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Road Assets Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-neutral-textSecondary">Total Road Assets</div>
                <div className="text-2xl font-semibold mt-1">{roadAssets.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-neutral-textSecondary">Total Length</div>
                <div className="text-2xl font-semibold mt-1">
                  {roadAssets.reduce((sum, asset) => sum + asset.length, 0).toFixed(1)} mi
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-neutral-textSecondary">Average Condition</div>
                <div className="text-2xl font-semibold mt-1">
                  {roadAssets.length ? Math.round(roadAssets.reduce((sum, asset) => sum + asset.condition, 0) / roadAssets.length) : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-neutral-textSecondary">Critical Segments</div>
                <div className="text-2xl font-semibold mt-1 text-[#A80000]">
                  {roadAssets.filter(asset => asset.condition < 40).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Triggers Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="p-4 border-b border-gray-200">
              <CardTitle>Maintenance Trigger Map</CardTitle>
              <CardDescription>
                Shows maintenance projects triggered by condition thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-3">
                <div className="text-sm">Legend:</div>
                <div className="flex items-center">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Planned</span>
                </div>
                <div className="flex items-center">
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">In Progress</span>
                </div>
                <div className="flex items-center">
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Completed</span>
                </div>
                <div className="ml-auto text-xs text-neutral-textSecondary">
                  {maintenanceProjects.length} {maintenanceProjects.length === 1 ? 'project' : 'projects'} shown
                </div>
              </div>
              <div className="h-[calc(100vh-300px)] min-h-[400px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Map 
                    roadAssets={roadAssets} 
                    height="h-full" 
                    center={getMapCenter()}
                    onAssetClick={handleAssetClick}
                    initialLayer="pci"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Asset Detail Dialog */}
      {selectedAsset && (
        <Dialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Road Asset Details</DialogTitle>
              <DialogDescription>
                {selectedAsset.assetId}: {selectedAsset.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Asset Information</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Road ID</p>
                        <p>{selectedAsset.assetId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Name</p>
                        <p>{selectedAsset.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Location</p>
                        <p>{selectedAsset.location}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Surface Type</p>
                        <p>{selectedAsset.surfaceType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Length</p>
                        <p>{selectedAsset.length.toFixed(1)} miles</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Width</p>
                        <p>{selectedAsset.width.toFixed(1)} feet</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium">Condition</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Current PCI</p>
                        <div className="flex items-center">
                          <Badge className={getConditionBadgeColor(getConditionState(selectedAsset.condition))}>
                            {getConditionState(selectedAsset.condition).charAt(0).toUpperCase() + 
                              getConditionState(selectedAsset.condition).slice(1)} ({selectedAsset.condition})
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Progress</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className={`rounded-full h-2 ${getConditionBadgeColor(getConditionState(selectedAsset.condition)).split(' ')[0]}`}
                            style={{ width: `${selectedAsset.condition}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium">Moisture Level</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        {selectedAsset.moistureLevel !== null ? (
                          <>
                            <p className="text-xs text-neutral-textSecondary">Current Moisture</p>
                            <div className="flex items-center">
                              <Badge className="bg-blue-500 hover:bg-blue-600">
                                {selectedAsset.moistureLevel.toFixed(1)}%
                              </Badge>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-neutral-textSecondary">No moisture data available</p>
                        )}
                      </div>
                      {selectedAsset.moistureLevel !== null && (
                        <div>
                          <p className="text-xs text-neutral-textSecondary">Last Reading</p>
                          <p className="text-xs">
                            {selectedAsset.lastMoistureReading ? format(new Date(selectedAsset.lastMoistureReading), "MM/dd/yyyy") : "N/A"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium">Inspection History</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Last Inspection</p>
                        <p>{format(new Date(selectedAsset.lastInspection), "MM/dd/yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Next Inspection</p>
                        <p>
                          {selectedAsset.nextInspection
                            ? format(new Date(selectedAsset.nextInspection), "MM/dd/yyyy")
                            : "Not scheduled"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium">Maintenance Status</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(() => {
                        const project = maintenanceProjects.find(p => p.roadAssetId === selectedAsset.id);
                        if (project) {
                          return (
                            <>
                              <div>
                                <p className="text-xs text-neutral-textSecondary">Project ID</p>
                                <p>{project.projectId}</p>
                              </div>
                              <div>
                                <p className="text-xs text-neutral-textSecondary">Status</p>
                                <p>{project.status}</p>
                              </div>
                            </>
                          );
                        } else {
                          return (
                            <div className="col-span-2">
                              <p className="text-xs">No maintenance projects scheduled</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="h-full">
                <h3 className="text-sm font-medium mb-2">Location Map</h3>
                <div className="h-60 md:h-full min-h-[200px]">
                  <Map 
                    roadAssets={[selectedAsset]} 
                    height="h-full"
                    center={[
                      selectedAsset.geometry.coordinates[0][1],
                      selectedAsset.geometry.coordinates[0][0]
                    ]}
                    zoom={14}
                    initialLayer={viewMode}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssetDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
