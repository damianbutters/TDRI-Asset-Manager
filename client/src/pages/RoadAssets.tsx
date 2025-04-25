import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { RoadAsset, getConditionState, insertRoadAssetSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { getConditionBadgeColor } from "@/lib/utils/color-utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Map from "@/components/ui/map";
import { generateRandomRoadSegment } from "@/lib/utils/map-utils";
import RainfallChart from "@/components/RainfallChart";
import { useLocation } from "wouter";
import { Droplet } from "lucide-react";

export default function RoadAssets() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<RoadAsset | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch road assets
  const { data: roadAssets = [], isLoading } = useQuery<RoadAsset[]>({
    queryKey: ['/api/road-assets'],
  });

  // Form validation schema
  const formSchema = insertRoadAssetSchema.extend({
    assetId: z.string().min(1, "Road ID is required"),
    name: z.string().min(1, "Name is required"),
    location: z.string().min(1, "Location is required"),
    length: z.coerce.number().positive("Length must be positive"),
    width: z.coerce.number().positive("Width must be positive"),
    surfaceType: z.string().min(1, "Surface type is required"),
    condition: z.coerce.number().min(0).max(100, "Condition must be between 0 and 100"),
    moistureLevel: z.coerce.number().min(0).max(100, "Moisture level must be between 0 and 100").optional(),
    lastInspection: z.string().min(1, "Last inspection date is required"),
    nextInspection: z.string().optional(),
    lastMoistureReading: z.string().optional()
  });

  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetId: "",
      name: "",
      location: "",
      length: undefined,
      width: undefined,
      surfaceType: "",
      condition: undefined,
      moistureLevel: undefined,
      lastInspection: new Date().toISOString().split('T')[0],
      lastMoistureReading: new Date().toISOString().split('T')[0],
      nextInspection: ""
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Convert string dates to ISO strings
      const lastInspection = new Date(values.lastInspection).toISOString();
      let nextInspection = undefined;
      if (values.nextInspection) {
        nextInspection = new Date(values.nextInspection).toISOString();
      }
      
      let lastMoistureReading = undefined;
      if (values.lastMoistureReading) {
        lastMoistureReading = new Date(values.lastMoistureReading).toISOString();
      }

      // Generate random geometry for the new asset
      const geometry = {
        type: "LineString",
        coordinates: generateRandomRoadSegment(40, -74.5).map(point => [point[1], point[0]])
      };

      // API request
      const res = await apiRequest('POST', '/api/road-assets', {
        ...values,
        lastInspection,
        nextInspection,
        lastMoistureReading,
        geometry
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/road-assets'] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Road asset created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create road asset",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values);
  };

  // Handle view asset
  const handleViewAsset = (asset: RoadAsset) => {
    setSelectedAsset(asset);
    setIsViewDialogOpen(true);
  };

  // Table columns
  const columns: ColumnDef<RoadAsset>[] = [
    {
      accessorKey: "assetId",
      header: "Road ID"
    },
    {
      accessorKey: "name",
      header: "Name"
    },
    {
      accessorKey: "location",
      header: "Location"
    },
    {
      accessorKey: "surfaceType",
      header: "Surface Type"
    },
    {
      accessorKey: "length",
      header: "Length (mi)",
      cell: ({ row }) => {
        return `${row.getValue<number>("length").toFixed(1)}`;
      }
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => {
        const condition = row.getValue<number>("condition");
        const state = getConditionState(condition);
        const badgeColor = getConditionBadgeColor(state);
        
        return (
          <Badge className={badgeColor}>
            {state.charAt(0).toUpperCase() + state.slice(1)} ({condition})
          </Badge>
        );
      }
    },
    {
      accessorKey: "moistureLevel",
      header: "Moisture (%)",
      cell: ({ row }) => {
        const moisture = row.getValue<number | null>("moistureLevel");
        
        if (moisture === null) {
          return "N/A";
        }
        
        // Different color badges based on moisture level
        let badgeColor = "bg-blue-100 text-blue-800";
        if (moisture > 25) {
          badgeColor = "bg-blue-700 text-white";
        } else if (moisture > 15) {
          badgeColor = "bg-blue-500 text-white";
        } else if (moisture > 8) {
          badgeColor = "bg-blue-300 text-blue-900";
        }
        
        return (
          <Badge className={badgeColor}>
            {moisture.toFixed(1)}%
          </Badge>
        );
      }
    },
    {
      accessorKey: "lastInspection",
      header: "Last Inspection",
      cell: ({ row }) => {
        return format(new Date(row.getValue("lastInspection")), "MM/dd/yyyy");
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <Button 
            variant="link" 
            className="text-primary hover:text-secondary"
            onClick={() => handleViewAsset(row.original)}
          >
            View
          </Button>
        );
      }
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Road Assets</h2>
          <p className="text-neutral-textSecondary">Manage and view road asset inventory</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Road Asset
          </Button>
        </div>
      </div>

      {/* Map of all road assets */}
      <Card className="mb-6">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200">
          <CardTitle>Road Asset Map</CardTitle>
          <div className="flex space-x-2 mt-2 md:mt-0">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-[#107C10] mr-1"></span>
              <span className="text-xs">Good</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-[#FFB900] mr-1"></span>
              <span className="text-xs">Fair</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-[#D83B01] mr-1"></span>
              <span className="text-xs">Poor</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-[#A80000] mr-1"></span>
              <span className="text-xs">Critical</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Map 
            roadAssets={roadAssets} 
            height="h-80" 
            onAssetClick={handleViewAsset}
          />
        </CardContent>
      </Card>

      {/* Road Assets Table */}
      <Card>
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle>Road Asset Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={roadAssets}
              searchKey="name"
              searchPlaceholder="Search road assets..."
            />
          )}
        </CardContent>
      </Card>

      {/* Add Road Asset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Road Asset</DialogTitle>
            <DialogDescription>
              Enter the details of the new road asset
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Road ID</FormLabel>
                      <FormControl>
                        <Input placeholder="RS-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Mile 0-2.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Length (miles)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Width (feet)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="surfaceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a surface type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Asphalt">Asphalt</SelectItem>
                        <SelectItem value="Concrete">Concrete</SelectItem>
                        <SelectItem value="Chip Seal">Chip Seal</SelectItem>
                        <SelectItem value="Gravel">Gravel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition (0-100)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} />
                    </FormControl>
                    <FormDescription>
                      Pavement Condition Index (PCI)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="moistureLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moisture Level (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Pavement Moisture Content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lastInspection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Inspection</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextInspection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Inspection</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="lastMoistureReading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Moisture Reading</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Asset"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Road Asset Dialog */}
      {selectedAsset && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
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
                    <h3 className="text-sm font-medium">Moisture Data</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Moisture Readings</p>
                        <div className="flex items-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-1" 
                            onClick={() => {
                              setIsViewDialogOpen(false);
                              navigate(`/moisture?roadId=${selectedAsset.id}`);
                            }}
                          >
                            <Droplet className="h-3 w-3 mr-1" />
                            View Moisture Map
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Detailed Data</p>
                        <p className="text-xs text-muted-foreground">
                          Multiple readings available along the road segment
                        </p>
                      </div>
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
                    <h3 className="text-sm font-medium">System Information</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Created</p>
                        <p>{format(new Date(selectedAsset.createdAt), "MM/dd/yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-textSecondary">Last Updated</p>
                        <p>{format(new Date(selectedAsset.updatedAt), "MM/dd/yyyy")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col h-full space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Location Map</h3>
                  <div className="h-60 min-h-[200px]">
                    <Map 
                      roadAssets={[selectedAsset]} 
                      height="h-full"
                      center={[
                        selectedAsset.geometry.coordinates[0][1],
                        selectedAsset.geometry.coordinates[0][0]
                      ]}
                      zoom={14}
                    />
                  </div>
                </div>
                
                <div className="flex-grow">
                  <h3 className="text-sm font-medium mb-2">Rainfall History</h3>
                  <div className="h-60 md:h-[calc(100%-2rem)] min-h-[200px]">
                    <RainfallChart roadAssetId={selectedAsset.id} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
