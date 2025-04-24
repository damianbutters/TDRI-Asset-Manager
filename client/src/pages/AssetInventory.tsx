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
import { PlusCircle, Pencil, Trash2, FileDown, FileUp } from "lucide-react";
import { 
  getAssetTypes, 
  createAssetType, 
  updateAssetType, 
  deleteAssetType, 
  getRoadwayAssets, 
  getRoadwayAssetsByType,
} from "@/lib/asset-inventory-service";
import { insertAssetTypeSchema } from "@shared/schema";

const assetTypeFormSchema = insertAssetTypeSchema.extend({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  category: z.string().min(2, { message: "Category must be at least 2 characters." }),
  conditionRatingScale: z.string().min(1, { message: "Please specify a rating scale." }),
  conditionRatingType: z.string().min(1, { message: "Please specify a rating type." }),
  inspectionFrequencyMonths: z.number().min(1, { message: "Frequency must be at least 1 month." }),
  active: z.boolean().default(true),
});

export default function AssetInventory() {
  const [activeTab, setActiveTab] = useState("types");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  // Queries
  const assetTypesQuery = useQuery({
    queryKey: ["/api/asset-types"],
    queryFn: () => getAssetTypes(),
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
    (selectedCategory ? 
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
                <Select value={selectedCategory || ""} onValueChange={(value) => setSelectedCategory(value || null)}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
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
              <div className="text-center py-8">
                <p>Asset management view will be implemented here</p>
                <Button className="mt-4" onClick={() => setActiveTab("types")}>
                  Manage Asset Types First
                </Button>
              </div>
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