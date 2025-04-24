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
  
  // Mutations
  const createAssetTypeMutation = useMutation({
    mutationFn: createAssetType,
    onSuccess: () => {
      toast({
        title: "Asset type created",
        description: "The asset type has been created successfully.",
      });
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create asset type: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateAssetTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateAssetType(id, data),
    onSuccess: () => {
      toast({
        title: "Asset type updated",
        description: "The asset type has been updated successfully.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update asset type: ${error.message}`,
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
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete asset type: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Asset mutations
  const createRoadwayAssetMutation = useMutation({
    mutationFn: (data: any) => {
      // Format the geometry data
      if (coordinates.lat && coordinates.lng) {
        data.geometry = {
          type: "Point",
          coordinates: [coordinates.lng, coordinates.lat]
        };
      }
      return createRoadwayAsset(data);
    },
    onSuccess: () => {
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
      setIsCreateAssetDialogOpen(false);
      setCoordinates({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create asset: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateRoadwayAssetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      // Update geometry if coordinates changed
      if (coordinates.lat && coordinates.lng) {
        data.geometry = {
          type: "Point",
          coordinates: [coordinates.lng, coordinates.lat]
        };
      }
      return updateRoadwayAsset(id, data);
    },
    onSuccess: () => {
      toast({
        title: "Asset updated",
        description: "The asset has been updated successfully.",
      });
      setIsEditAssetDialogOpen(false);
      setCoordinates({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update asset: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const deleteRoadwayAssetMutation = useMutation({
    mutationFn: deleteRoadwayAsset,
    onSuccess: () => {
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete asset: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const importAssetsMutation = useMutation({
    mutationFn: (file: File) => importRoadwayAssets(file),
    onSuccess: (data) => {
      toast({
        title: "Import successful",
        description: `Successfully imported ${data.count} assets.`,
      });
      setIsImportDialogOpen(false);
      setImportFile(null);
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: `Failed to import assets: ${error.message}`,
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
      conditionRatingScale: "1-10",
      conditionRatingType: "numeric",
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
      conditionRatingScale: "1-10",
      conditionRatingType: "numeric",
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
      assetTypeId: undefined,
      condition: 100,
      active: true,
      installationDate: undefined,
      lastInspection: undefined,
    },
  });
  
  const editAssetForm = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      assetId: "",
      description: "",
      location: "",
      assetTypeId: undefined,
      condition: 100,
      active: true,
      installationDate: undefined,
      lastInspection: undefined,
    },
  });
  
  // Submit handlers
  const onCreateSubmit = (data: z.infer<typeof assetTypeFormSchema>) => {
    createAssetTypeMutation.mutate(data);
  };
  
  const onEditSubmit = (data: z.infer<typeof assetTypeFormSchema>) => {
    if (selectedAssetType) {
      updateAssetTypeMutation.mutate({ id: selectedAssetType.id, data });
    }
  };
  
  // Delete handler
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this asset type?")) {
      deleteAssetTypeMutation.mutate(id);
    }
  };
  
  // Edit handler
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
  
  // Compute categories for filter
  const categories = assetTypesQuery.data ? 
    [...new Set(assetTypesQuery.data.map((type) => type.category))] : 
    [];
  
  // Filter asset types by category
  const filteredAssetTypes = assetTypesQuery.data ? 
    (selectedCategory && selectedCategory !== "all" ? 
      assetTypesQuery.data.filter((type) => type.category === selectedCategory) : 
      assetTypesQuery.data) : 
    [];
  
  // Define asset type columns
  const assetTypeColumns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "conditionRatingScale",
      header: "Rating Scale",
    },
    {
      accessorKey: "inspectionFrequencyMonths",
      header: "Inspection Frequency (Months)",
    },
    {
      accessorKey: "active",
      header: "Active",
      cell: ({ row }: any) => (
        <div>{row.original.active ? "Yes" : "No"}</div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
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
  
  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Asset Inventory Management</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="types" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
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
                    Manage the different types of assets in your inventory
                  </CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Asset Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Asset Type</DialogTitle>
                      <DialogDescription>
                        Add a new asset type to the inventory system
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
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Description of the asset type" {...field} />
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
                                <Input placeholder="Signage" {...field} />
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
                                <FormLabel>Rating Scale</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select scale" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1-10">1-10</SelectItem>
                                    <SelectItem value="1-5">1-5</SelectItem>
                                    <SelectItem value="0-100">0-100</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="numeric">Numeric</SelectItem>
                                    <SelectItem value="descriptive">Descriptive</SelectItem>
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
                              <FormLabel>Inspection Frequency (Months)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
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
                                  If checked, this asset type will be available for selection
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createAssetTypeMutation.isPending}>
                            {createAssetTypeMutation.isPending ? "Creating..." : "Create"}
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
                <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value)}>
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
                <div className="flex justify-center py-8">Loading asset types...</div>
              ) : assetTypesQuery.isError ? (
                <div className="text-red-500 py-8">
                  Error loading asset types: {assetTypesQuery.error.message}
                </div>
              ) : (
                <DataTable
                  columns={assetTypeColumns}
                  data={filteredAssetTypes}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
              <CardDescription>
                View and manage your assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Select value={selectedAssetTypeFilter || "all"} onValueChange={(value) => setSelectedAssetTypeFilter(value)}>
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
                          <FormField
                            control={createAssetForm.control}
                            name="installationDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Installation Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createAssetForm.control}
                            name="lastInspection"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Last Inspection Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={createAssetForm.control}
                          name="geometry"
                          render={({ field }) => (
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
                                Enter the geographic coordinates or use the map to select a location
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
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
                                  If checked, this asset will be active in the system
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
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
              
              {roadwayAssetsQuery.isLoading ? (
                <div className="flex justify-center py-8">Loading assets...</div>
              ) : roadwayAssetsQuery.isError ? (
                <div className="text-red-500 py-8">
                  Error loading assets: {roadwayAssetsQuery.error.message}
                </div>
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
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset Type</DialogTitle>
            <DialogDescription>
              Modify the selected asset type
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
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
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description of the asset type" {...field} />
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
                      <Input placeholder="Signage" {...field} />
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
                      <FormLabel>Rating Scale</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select scale" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="1-5">1-5</SelectItem>
                          <SelectItem value="0-100">0-100</SelectItem>
                        </SelectContent>
                      </Select>
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
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="numeric">Numeric</SelectItem>
                          <SelectItem value="descriptive">Descriptive</SelectItem>
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
                    <FormLabel>Inspection Frequency (Months)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
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
                        If checked, this asset type will be available for selection
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateAssetTypeMutation.isPending}>
                  {updateAssetTypeMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}