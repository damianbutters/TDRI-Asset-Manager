import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MaintenanceType, 
  MaintenanceProject, 
  RoadAsset, 
  insertMaintenanceTypeSchema,
  insertMaintenanceProjectSchema
} from "@shared/schema";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";

export default function Maintenance() {
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch maintenance types
  const { data: maintenanceTypes = [] } = useQuery<MaintenanceType[]>({
    queryKey: ['/api/maintenance-types'],
  });

  // Fetch maintenance projects
  const { data: maintenanceProjects = [] } = useQuery<MaintenanceProject[]>({
    queryKey: ['/api/maintenance-projects'],
  });

  // Fetch road assets for project creation
  const { data: roadAssets = [] } = useQuery<RoadAsset[]>({
    queryKey: ['/api/road-assets'],
  });

  // Form schemas
  const typeFormSchema = insertMaintenanceTypeSchema.extend({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    lifespanExtension: z.coerce.number().min(0, "Lifespan extension must be positive"),
    conditionImprovement: z.coerce.number().min(0, "Condition improvement must be positive"),
    costPerMile: z.coerce.number().min(0, "Cost per mile must be positive"),
    applicableMinCondition: z.coerce.number().min(0).max(100).nullable().optional(),
    applicableMaxCondition: z.coerce.number().min(0).max(100).nullable().optional()
  });

  const projectFormSchema = insertMaintenanceProjectSchema.extend({
    projectId: z.string().min(1, "Project ID is required"),
    roadAssetId: z.coerce.number().min(1, "Road asset is required"),
    maintenanceTypeId: z.coerce.number().min(1, "Maintenance type is required"),
    status: z.string().min(1, "Status is required"),
    scheduledDate: z.string().optional(),
    completedDate: z.string().optional(),
    cost: z.coerce.number().min(0).optional(),
    notes: z.string().optional()
  });

  // Create forms
  const typeForm = useForm<z.infer<typeof typeFormSchema>>({
    resolver: zodResolver(typeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      lifespanExtension: undefined,
      conditionImprovement: undefined,
      costPerMile: undefined,
      applicableMinCondition: null,
      applicableMaxCondition: null
    },
  });

  const projectForm = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectId: "",
      roadAssetId: undefined,
      maintenanceTypeId: undefined,
      status: "Planned",
      scheduledDate: "",
      completedDate: "",
      cost: undefined,
      notes: "",
      updatedBy: 1 // Using default admin user
    },
  });

  // Create mutations
  const createTypeMutation = useMutation({
    mutationFn: async (values: z.infer<typeof typeFormSchema>) => {
      const res = await apiRequest('POST', '/api/maintenance-types', values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-types'] });
      setIsAddTypeDialogOpen(false);
      typeForm.reset();
      toast({
        title: "Success",
        description: "Maintenance type created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create maintenance type",
        variant: "destructive",
      });
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (values: z.infer<typeof projectFormSchema>) => {
      // Convert string dates to ISO strings
      let scheduledDate = undefined;
      if (values.scheduledDate) {
        scheduledDate = new Date(values.scheduledDate).toISOString();
      }
      
      let completedDate = undefined;
      if (values.completedDate) {
        completedDate = new Date(values.completedDate).toISOString();
      }

      const res = await apiRequest('POST', '/api/maintenance-projects', {
        ...values,
        scheduledDate,
        completedDate
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-projects'] });
      setIsAddProjectDialogOpen(false);
      projectForm.reset();
      toast({
        title: "Success",
        description: "Maintenance project created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create maintenance project",
        variant: "destructive",
      });
    }
  });

  // Handle form submissions
  const onSubmitType = (values: z.infer<typeof typeFormSchema>) => {
    createTypeMutation.mutate(values);
  };

  const onSubmitProject = (values: z.infer<typeof projectFormSchema>) => {
    createProjectMutation.mutate(values);
  };

  // Auto-populate project cost when road asset and maintenance type are selected
  const handleMaintenanceTypeChange = (typeId: string) => {
    const maintenanceType = maintenanceTypes.find(type => type.id === parseInt(typeId));
    const roadAssetId = projectForm.getValues("roadAssetId");
    
    if (maintenanceType && roadAssetId) {
      const roadAsset = roadAssets.find(asset => asset.id === roadAssetId);
      if (roadAsset) {
        const calculatedCost = maintenanceType.costPerMile * roadAsset.length;
        projectForm.setValue("cost", parseFloat(calculatedCost.toFixed(2)));
      }
    }
  };

  const handleRoadAssetChange = (assetId: string) => {
    const roadAsset = roadAssets.find(asset => asset.id === parseInt(assetId));
    const maintenanceTypeId = projectForm.getValues("maintenanceTypeId");
    
    if (roadAsset && maintenanceTypeId) {
      const maintenanceType = maintenanceTypes.find(type => type.id === maintenanceTypeId);
      if (maintenanceType) {
        const calculatedCost = maintenanceType.costPerMile * roadAsset.length;
        projectForm.setValue("cost", parseFloat(calculatedCost.toFixed(2)));
      }
    }
  };

  // Table columns for maintenance types
  const typeColumns: ColumnDef<MaintenanceType>[] = [
    {
      accessorKey: "name",
      header: "Name"
    },
    {
      accessorKey: "description",
      header: "Description"
    },
    {
      accessorKey: "lifespanExtension",
      header: "Lifespan Extension",
      cell: ({ row }) => {
        return `${row.getValue<number>("lifespanExtension")} years`;
      }
    },
    {
      accessorKey: "conditionImprovement",
      header: "Condition Improvement",
      cell: ({ row }) => {
        return `+${row.getValue<number>("conditionImprovement")} points`;
      }
    },
    {
      accessorKey: "costPerMile",
      header: "Cost Per Mile",
      cell: ({ row }) => {
        return `$${row.getValue<number>("costPerMile").toLocaleString()}`;
      }
    },
    {
      accessorKey: "applicableCondition",
      header: "Applicable Condition",
      cell: ({ row }) => {
        const min = row.original.applicableMinCondition;
        const max = row.original.applicableMaxCondition;
        
        if (min !== null && max !== null) {
          return `${min} - ${max}`;
        } else if (min !== null) {
          return `Min: ${min}`;
        } else if (max !== null) {
          return `Max: ${max}`;
        }
        return "Any";
      }
    }
  ];

  // Table columns for maintenance projects
  const projectColumns: ColumnDef<any>[] = [
    {
      accessorKey: "projectId",
      header: "Project ID"
    },
    {
      accessorKey: "roadAsset",
      header: "Road Asset",
      cell: ({ row }) => {
        const asset = roadAssets.find(a => a.id === row.original.roadAssetId);
        return asset ? `${asset.assetId}: ${asset.name}` : "Unknown";
      }
    },
    {
      accessorKey: "maintenanceType",
      header: "Maintenance Type",
      cell: ({ row }) => {
        const type = maintenanceTypes.find(t => t.id === row.original.maintenanceTypeId);
        return type ? type.name : "Unknown";
      }
    },
    {
      accessorKey: "status",
      header: "Status"
    },
    {
      accessorKey: "scheduledDate",
      header: "Scheduled Date",
      cell: ({ row }) => {
        return row.original.scheduledDate 
          ? format(new Date(row.original.scheduledDate), "MM/dd/yyyy") 
          : "Not scheduled";
      }
    },
    {
      accessorKey: "cost",
      header: "Estimated Cost",
      cell: ({ row }) => {
        return row.original.cost
          ? `$${row.original.cost.toLocaleString()}`
          : "Not estimated";
      }
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Maintenance Management</h2>
          <p className="text-neutral-textSecondary">Define maintenance types and schedule projects</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button onClick={() => setIsAddProjectDialogOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Button>
          <Button variant="outline" onClick={() => setIsAddTypeDialogOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Maintenance Type
          </Button>
        </div>
      </div>

      {/* Maintenance Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Maintenance Projects</TabsTrigger>
          <TabsTrigger value="types">Maintenance Types</TabsTrigger>
        </TabsList>

        {/* Maintenance Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader className="p-4 border-b border-gray-200">
              <CardTitle>Maintenance Projects</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <DataTable
                columns={projectColumns}
                data={maintenanceProjects}
                searchKey="projectId"
                searchPlaceholder="Search by project ID..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Types Tab */}
        <TabsContent value="types">
          <Card>
            <CardHeader className="p-4 border-b border-gray-200">
              <CardTitle>Maintenance Types</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <DataTable
                columns={typeColumns}
                data={maintenanceTypes}
                searchKey="name"
                searchPlaceholder="Search maintenance types..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Maintenance Type Dialog */}
      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Maintenance Type</DialogTitle>
            <DialogDescription>
              Define a new maintenance type with its parameters and impact
            </DialogDescription>
          </DialogHeader>
          <Form {...typeForm}>
            <form onSubmit={typeForm.handleSubmit(onSubmitType)} className="space-y-4">
              <FormField
                control={typeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Crack Sealing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={typeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of maintenance type" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={typeForm.control}
                  name="lifespanExtension"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lifespan Extension (years)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={typeForm.control}
                  name="conditionImprovement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition Improvement</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Points added to PCI
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={typeForm.control}
                name="costPerMile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Per Mile ($)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={typeForm.control}
                  name="applicableMinCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Applicable PCI</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={field.value !== null ? field.value : ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum condition
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={typeForm.control}
                  name="applicableMaxCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Applicable PCI</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={field.value !== null ? field.value : ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum condition
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddTypeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTypeMutation.isPending}
                >
                  {createTypeMutation.isPending ? "Creating..." : "Create Type"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Maintenance Project Dialog */}
      <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Maintenance Project</DialogTitle>
            <DialogDescription>
              Schedule a maintenance project for a road asset
            </DialogDescription>
          </DialogHeader>
          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(onSubmitProject)} className="space-y-4">
              <FormField
                control={projectForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project ID</FormLabel>
                    <FormControl>
                      <Input placeholder="PR-2023-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="roadAssetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Road Asset</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        handleRoadAssetChange(value);
                      }}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a road asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roadAssets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id.toString()}>
                            {asset.assetId}: {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="maintenanceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        handleMaintenanceTypeChange(value);
                      }}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select maintenance type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maintenanceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
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
                control={projectForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Planned">Planned</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={projectForm.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={projectForm.control}
                  name="completedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completed Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={projectForm.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost ($)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>
                      Auto-calculated based on road length and maintenance type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional project notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddProjectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
