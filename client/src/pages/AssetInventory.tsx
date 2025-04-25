import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Pencil, Trash2, FileDown, FileUp, CalendarIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  getAssetTypes, 
  createAssetType, 
  updateAssetType, 
  deleteAssetType, 
  getRoadwayAssets,
  getRoadwayAssetsByType,
  createRoadwayAsset,
  updateRoadwayAsset,
  deleteRoadwayAsset,
  importRoadwayAssets,
  exportRoadwayAssets
} from "@/lib/asset-inventory-service";
import { insertAssetTypeSchema, insertRoadwayAssetSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

const assetTypeFormSchema = insertAssetTypeSchema.extend({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  category: z.string().min(2, { message: "Category must be at least 2 characters." }),
  conditionRatingScale: z.string().min(1, { message: "Please specify a rating scale." }),
  conditionRatingType: z.string().min(1, { message: "Please specify a rating type." }),
  inspectionFrequencyMonths: z.number().min(1, { message: "Frequency must be at least 1 month." }),
  active: z.boolean().default(true),
});

const assetFormSchema = insertRoadwayAssetSchema.extend({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  assetId: z.string().min(2, { message: "Asset ID must be at least 2 characters." }),
  description: z.string().optional(),
  location: z.string().min(2, { message: "Location must be at least 2 characters." }),
  assetTypeId: z.number({ required_error: "Please select an asset type." }),
  condition: z.number().min(0).max(100).default(100),
  geometry: z.any().optional(),
  active: z.boolean().default(true),
  installationDate: z.date().optional(),
  lastInspection: z.date().optional(),
});

export default function AssetInventory() {
  const [activeTab, setActiveTab] = useState("types");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateAssetDialogOpen, setIsCreateAssetDialogOpen] = useState(false);
  const [isEditAssetDialogOpen, setIsEditAssetDialogOpen] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<any>(null);
  const [selectedRoadwayAsset, setSelectedRoadwayAsset] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAssetTypeFilter, setSelectedAssetTypeFilter] = useState<string>("all");
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>("");
  const [coordinates, setCoordinates] = useState<{lat?: number, lng?: number}>({});
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const { toast } = useToast();
  
  // Queries
  const assetTypesQuery = useQuery({
    queryKey: ["/api/asset-types"],
    queryFn: () => getAssetTypes(),
  });
  
  const roadwayAssetsQuery = useQuery({
    queryKey: ["/api/roadway-assets"],
    queryFn: () => getRoadwayAssets(),
  });
  
  const roadAssetsQuery = useQuery({
    queryKey: ["/api/road-assets"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/road-assets');
        return await response.json();
      } catch (error) {
        console.error("Error fetching road assets:", error);
        return [];
      }
    },
  });
  
  // Mutations
  const createAssetTypeMutation = useMutation({
    mutationFn: createAssetType,
    onSuccess: () => {
      toast({
        title: "Asset type created",
        description: "The asset type has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-types"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating asset type",
        description: error.message || "An error occurred while creating the asset type.",
        variant: "destructive",
      });
    },
  });
  
  const updateAssetTypeMutation = useMutation({
    mutationFn: updateAssetType,
    onSuccess: () => {
      toast({
        title: "Asset type updated",
        description: "The asset type has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-types"] });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating asset type",
        description: error.message || "An error occurred while updating the asset type.",
        variant: "destructive",
      });
    },
  });
  
  const deleteAssetTypeMutation = useMutation({
    mutationFn: deleteAssetType,
    onSuccess: () => {
      toast({
        title: "Asset type deleted",
        description: "The asset type has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-types"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting asset type",
        description: error.message || "An error occurred while deleting the asset type.",
        variant: "destructive",
      });
    },
  });
  
  const createRoadwayAssetMutation = useMutation({
    mutationFn: createRoadwayAsset,
    onSuccess: async () => {
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/roadway-assets"] });
      await queryClient.refetchQueries({ queryKey: ["/api/roadway-assets"] });
      setIsCreateAssetDialogOpen(false);
      createAssetForm.reset();
      setCoordinates({});
    },
    onError: (error: any) => {
      toast({
        title: "Error creating asset",
        description: error.message || "An error occurred while creating the asset.",
        variant: "destructive",
      });
    },
  });
  
  const updateRoadwayAssetMutation = useMutation({
    mutationFn: updateRoadwayAsset,
    onSuccess: async () => {
      toast({
        title: "Asset updated",
        description: "The asset has been updated successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/roadway-assets"] });
      await queryClient.refetchQueries({ queryKey: ["/api/roadway-assets"] });
      setIsEditAssetDialogOpen(false);
      editAssetForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating asset",
        description: error.message || "An error occurred while updating the asset.",
        variant: "destructive",
      });
    },
  });
  
  const deleteRoadwayAssetMutation = useMutation({
    mutationFn: deleteRoadwayAsset,
    onSuccess: async () => {
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/roadway-assets"] });
      await queryClient.refetchQueries({ queryKey: ["/api/roadway-assets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting asset",
        description: error.message || "An error occurred while deleting the asset.",
        variant: "destructive",
      });
    },
  });
  
  const importRoadwayAssetsMutation = useMutation({
    mutationFn: (file: File) => importRoadwayAssets(file),
    onSuccess: async (data) => {
      toast({
        title: "Assets imported",
        description: `Successfully imported ${data.count} assets.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/roadway-assets"] });
      await queryClient.refetchQueries({ queryKey: ["/api/roadway-assets"] });
      setIsImportDialogOpen(false);
      setImportFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error importing assets",
        description: error.message || "An error occurred while importing assets.",
        variant: "destructive",
      });
    },
  });
  
  // Forms
  const createForm = useForm<z.infer<typeof assetTypeFormSchema>>({
    resolver: zodResolver(assetTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      conditionRatingScale: "0-100",
      conditionRatingType: "Numeric",
      inspectionFrequencyMonths: 12,
      active: true,
    },
  });
  
  const editForm = useForm<z.infer<typeof assetTypeFormSchema>>({
    resolver: zodResolver(assetTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      conditionRatingScale: "0-100",
      conditionRatingType: "Numeric",
      inspectionFrequencyMonths: 12,
      active: true,
    },
  });
  
  const createAssetForm = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      assetId: "",
      description: "",
      location: "",
      condition: 100,
      active: true,
    },
  });
  
  const editAssetForm = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      assetId: "",
      description: "",
      location: "",
      condition: 100,
      active: true,
    },
  });
  
  // Form Submit Handlers
  const onCreateSubmit = (values: z.infer<typeof assetTypeFormSchema>) => {
    createAssetTypeMutation.mutate(values);
  };
  
  const onEditSubmit = (values: z.infer<typeof assetTypeFormSchema>) => {
    if (selectedAssetType) {
      // Convert to proper format for mutation
      updateAssetTypeMutation.mutate({
        id: selectedAssetType.id,
        data: values,
      });
    }
  };
  
  const onCreateAssetSubmit = (values: z.infer<typeof assetFormSchema>) => {
    // Add coordinates to geometry if provided
    const assetData = { ...values };
    if (coordinates.lat && coordinates.lng) {
      assetData.geometry = { 
        type: "Point", 
        coordinates: [coordinates.lng, coordinates.lat] 
      };
    }
    createRoadwayAssetMutation.mutate(assetData);
  };
  
  const onEditAssetSubmit = (values: z.infer<typeof assetFormSchema>) => {
    if (selectedRoadwayAsset) {
      // Add coordinates to geometry if they were updated
      const assetData = { ...values };
      if (coordinates.lat && coordinates.lng) {
        assetData.geometry = { 
          type: "Point", 
          coordinates: [coordinates.lng, coordinates.lat] 
        };
      }
      // Convert to proper format for mutation
      updateRoadwayAssetMutation.mutate({
        id: selectedRoadwayAsset.id,
        data: assetData,
      });
    }
  };
  
  const onImportSubmit = () => {
    if (importFile) {
      importRoadwayAssetsMutation.mutate(importFile);
    } else {
      toast({
        title: "No file selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
    }
  };
  
  // Handlers
  const handleEdit = (assetType: any) => {
    setSelectedAssetType(assetType);
    editForm.reset({
      name: assetType.name,
      description: assetType.description,
      category: assetType.category,
      conditionRatingScale: assetType.conditionRatingScale,
      conditionRatingType: assetType.conditionRatingType,
      inspectionFrequencyMonths: assetType.inspectionFrequencyMonths,
      active: assetType.active,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleEditAsset = (asset: any) => {
    setSelectedRoadwayAsset(asset);
    
    // Extract coordinates from geometry if available
    if (asset.geometry && asset.geometry.coordinates) {
      setCoordinates({
        lng: asset.geometry.coordinates[0], 
        lat: asset.geometry.coordinates[1]
      });
    } else {
      setCoordinates({});
    }
    
    editAssetForm.reset({
      name: asset.name,
      assetId: asset.assetId,
      description: asset.description || "",
      location: asset.location,
      assetTypeId: asset.assetTypeId,
      condition: asset.condition,
      active: asset.active,
      installationDate: asset.installationDate ? new Date(asset.installationDate) : undefined,
      lastInspection: asset.lastInspection ? new Date(asset.lastInspection) : undefined,
    });
    setIsEditAssetDialogOpen(true);
  };
  
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this asset type?")) {
      deleteAssetTypeMutation.mutate(id);
    }
  };
  
  const handleDeleteAsset = (id: number) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteRoadwayAssetMutation.mutate(id);
    }
  };
  
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };
  
  const handleExport = async () => {
    try {
      const data = await exportRoadwayAssets();
      // Create a download link
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', 'roadway-assets.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Error exporting assets",
        description: error.message || "An error occurred while exporting assets.",
        variant: "destructive",
      });
    }
  };
  
  // Computed properties
  const categories = assetTypesQuery.data 
    ? Array.from(new Set(assetTypesQuery.data.map(type => type.category))).sort()
    : [];
    
  const filteredAssetTypes = assetTypesQuery.data
    ? assetTypesQuery.data.filter(type => 
        selectedCategory === "all" || type.category === selectedCategory
      )
    : [];
  
  const filteredAssets = roadwayAssetsQuery.data
    ? roadwayAssetsQuery.data.filter(asset => {
        // Filter by asset type
        const typeMatch = selectedAssetTypeFilter === "all" || 
                         asset.assetTypeId === parseInt(selectedAssetTypeFilter);
        
        // Filter by search query
        const searchMatch = !assetSearchQuery || 
                           asset.name.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                           asset.assetId.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                           asset.location.toLowerCase().includes(assetSearchQuery.toLowerCase());
        
        return typeMatch && searchMatch;
      })
    : [];
  
  // Column definitions
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }: { row: any }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
  
  const assetColumns = [
    {
      accessorKey: "assetId",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "roadAssetId",
      header: "Road",
      cell: ({ row }: { row: any }) => {
        const roadAssetId = row.original.roadAssetId;
        
        if (!roadAssetId) {
          return <span className="text-gray-400">None</span>;
        }
        
        // Get the road asset details from the road assets query
        const roads = roadAssetsQuery.data || [];
        const road = roads.find((r: any) => r.id === roadAssetId);
        
        return road ? (
          <span className="text-blue-600 hover:underline">{road.name}</span>
        ) : (
          <span>Road ID: {roadAssetId}</span>
        );
      },
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center">
          <span className={cn(
            "font-medium",
            row.original.condition > 70 ? "text-green-600" :
            row.original.condition > 40 ? "text-yellow-600" : 
            "text-red-600"
          )}>
            {row.original.condition}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "assetType",
      header: "Type",
      cell: ({ row }: { row: any }) => {
        const assetType = assetTypesQuery.data?.find(
          type => type.id === row.original.assetTypeId
        );
        return assetType ? assetType.name : 'Unknown';
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleEditAsset(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleDeleteAsset(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Asset Inventory</h1>
      
      <Tabs defaultValue="types" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="types">Asset Types</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="types" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Asset Types</CardTitle>
                  <CardDescription>
                    View and manage your asset types
                  </CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Asset Type</DialogTitle>
                      <DialogDescription>
                        Define a new type of asset for your inventory
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                      <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                        <FormField
                          control={createForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Traffic Sign" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <FormControl>
                                <Input placeholder="Road Furniture" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Regulatory or informational road signage" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={createForm.control}
                            name="conditionRatingScale"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Condition Rating Scale</FormLabel>
                                <FormControl>
                                  <Input placeholder="0-100" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="conditionRatingType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rating Type</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select rating type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Numeric">Numeric</SelectItem>
                                    <SelectItem value="Categorical">Categorical</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={createForm.control}
                          name="inspectionFrequencyMonths"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inspection Frequency (months)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="60" 
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value) || 12)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={createForm.control}
                          name="active"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Active</FormLabel>
                                <FormDescription>
                                  Asset type is currently in use
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button type="submit" disabled={createAssetTypeMutation.isPending}>
                            {createAssetTypeMutation.isPending ? "Creating..." : "Create Type"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {assetTypesQuery.isLoading ? (
                <p>Loading asset types...</p>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredAssetTypes}
                  searchField="name"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Assets</CardTitle>
                  <CardDescription>
                    View and manage your assets
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <FileUp className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import Assets</DialogTitle>
                        <DialogDescription>
                          Upload a CSV file containing asset data
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="rounded-md border border-dashed p-8 text-center">
                          <Input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleImportFile}
                            className="mx-auto"
                          />
                          <p className="mt-2 text-sm text-gray-500">CSV file should include headers and all required fields</p>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            onClick={onImportSubmit} 
                            disabled={!importFile || importRoadwayAssetsMutation.isPending}
                          >
                            {importRoadwayAssetsMutation.isPending ? "Importing..." : "Import Assets"}
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" onClick={handleExport}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  
                  <Dialog open={isCreateAssetDialogOpen} onOpenChange={setIsCreateAssetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Asset
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Add New Asset</DialogTitle>
                        <DialogDescription>
                          Add a new asset to your inventory
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...createAssetForm}>
                        <form onSubmit={createAssetForm.handleSubmit(onCreateAssetSubmit)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={createAssetForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Main St. Sign #4" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createAssetForm.control}
                              name="assetId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Asset ID</FormLabel>
                                  <FormControl>
                                    <Input placeholder="SIGN-0042" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={createAssetForm.control}
                            name="assetTypeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Asset Type</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  defaultValue={field.value ? String(field.value) : undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select asset type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {assetTypesQuery.data?.filter(type => type.active).map((type) => (
                                      <SelectItem key={type.id} value={String(type.id)}>
                                        {type.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={createAssetForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Description of the asset" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={createAssetForm.control}
                              name="location"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Location</FormLabel>
                                  <FormControl>
                                    <Input placeholder="123 Main St" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createAssetForm.control}
                              name="condition"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Condition</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      {...field}
                                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormItem>
                              <FormLabel>Coordinates (Latitude, Longitude)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input 
                                    placeholder="Latitude" 
                                    type="number"
                                    value={coordinates.lat || ''}
                                    onChange={(e) => setCoordinates({...coordinates, lat: parseFloat(e.target.value)})}
                                    step="0.000001"
                                  />
                                </FormControl>
                                <FormControl>
                                  <Input 
                                    placeholder="Longitude" 
                                    type="number"
                                    value={coordinates.lng || ''}
                                    onChange={(e) => setCoordinates({...coordinates, lng: parseFloat(e.target.value)})}
                                    step="0.000001"
                                  />
                                </FormControl>
                              </div>
                              <FormDescription>
                                Used to display asset location on maps
                              </FormDescription>
                            </FormItem>

                            <FormField
                              control={createAssetForm.control}
                              name="active"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Active</FormLabel>
                                    <FormDescription>
                                      Asset is currently in service
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <DialogFooter>
                            <Button type="submit" disabled={createRoadwayAssetMutation.isPending}>
                              {createRoadwayAssetMutation.isPending ? "Creating..." : "Create Asset"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4">
                <Select value={selectedAssetTypeFilter} onValueChange={setSelectedAssetTypeFilter}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Filter by Asset Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Asset Types</SelectItem>
                    {assetTypesQuery.data?.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input 
                  placeholder="Search assets..." 
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  className="w-[280px]"
                />
              </div>
              
              {roadwayAssetsQuery.isLoading ? (
                <p>Loading assets...</p>
              ) : (
                <DataTable
                  columns={assetColumns}
                  data={filteredAssets}
                  searchField="name"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Asset Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset Type</DialogTitle>
            <DialogDescription>
              Update the details of this asset type
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              {/* Form fields similar to create dialog */}
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="conditionRatingScale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition Rating Scale</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="conditionRatingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Numeric">Numeric</SelectItem>
                          <SelectItem value="Categorical">Categorical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="inspectionFrequencyMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspection Frequency (months)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="60" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 12)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Asset type is currently in use
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={updateAssetTypeMutation.isPending}>
                  {updateAssetTypeMutation.isPending ? "Updating..." : "Update Type"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Asset Dialog */}
      <Dialog open={isEditAssetDialogOpen} onOpenChange={setIsEditAssetDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the details of this asset
            </DialogDescription>
          </DialogHeader>
          <Form {...editAssetForm}>
            <form onSubmit={editAssetForm.handleSubmit(onEditAssetSubmit)} className="space-y-4">
              {/* Form fields similar to create dialog */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editAssetForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editAssetForm.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editAssetForm.control}
                name="assetTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? String(field.value) : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetTypesQuery.data?.filter(type => type.active).map((type) => (
                          <SelectItem key={type.id} value={String(type.id)}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editAssetForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editAssetForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editAssetForm.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Coordinates (Latitude, Longitude)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input 
                        placeholder="Latitude" 
                        type="number"
                        value={coordinates.lat || ''}
                        onChange={(e) => setCoordinates({...coordinates, lat: parseFloat(e.target.value)})}
                        step="0.000001"
                      />
                    </FormControl>
                    <FormControl>
                      <Input 
                        placeholder="Longitude" 
                        type="number"
                        value={coordinates.lng || ''}
                        onChange={(e) => setCoordinates({...coordinates, lng: parseFloat(e.target.value)})}
                        step="0.000001"
                      />
                    </FormControl>
                  </div>
                  <FormDescription>
                    Used to display asset location on maps
                  </FormDescription>
                </FormItem>

                <FormField
                  control={editAssetForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Asset is currently in service
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={updateRoadwayAssetMutation.isPending}>
                  {updateRoadwayAssetMutation.isPending ? "Updating..." : "Update Asset"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}