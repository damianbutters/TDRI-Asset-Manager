import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Policy, 
  MaintenanceType, 
  insertPolicySchema 
} from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";

export default function Policies() {
  const [isAddPolicyDialogOpen, setIsAddPolicyDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch policies
  const { data: policies = [] } = useQuery<Policy[]>({
    queryKey: ['/api/policies'],
  });

  // Fetch maintenance types for policy creation
  const { data: maintenanceTypes = [] } = useQuery<MaintenanceType[]>({
    queryKey: ['/api/maintenance-types'],
  });

  // Form schema
  const policyFormSchema = insertPolicySchema.extend({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    surfaceType: z.string().min(1, "Surface type is required"),
    conditionThreshold: z.coerce.number().min(0).max(100, "Condition threshold must be between 0 and 100"),
    maintenanceTypeId: z.coerce.number().min(1, "Maintenance type is required"),
    priority: z.coerce.number().min(1, "Priority is required"),
    active: z.boolean().default(true)
  });

  // Create form
  const form = useForm<z.infer<typeof policyFormSchema>>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      name: "",
      description: "",
      surfaceType: "",
      conditionThreshold: undefined,
      maintenanceTypeId: undefined,
      priority: 1,
      active: true
    },
  });

  // Create mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (values: z.infer<typeof policyFormSchema>) => {
      const res = await apiRequest('POST', '/api/policies', values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
      setIsAddPolicyDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Policy created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create policy",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof policyFormSchema>) => {
    createPolicyMutation.mutate(values);
  };

  // Table columns
  const columns: ColumnDef<Policy>[] = [
    {
      accessorKey: "name",
      header: "Policy Name"
    },
    {
      accessorKey: "description",
      header: "Description"
    },
    {
      accessorKey: "surfaceType",
      header: "Surface Type"
    },
    {
      accessorKey: "conditionThreshold",
      header: "Condition Threshold",
      cell: ({ row }) => {
        return `Below ${row.getValue<number>("conditionThreshold")}`;
      }
    },
    {
      accessorKey: "maintenanceTypeId",
      header: "Maintenance Type",
      cell: ({ row }) => {
        const typeId = row.getValue<number>("maintenanceTypeId");
        const type = maintenanceTypes.find(t => t.id === typeId);
        return type ? type.name : "Unknown";
      }
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue<number>("priority");
        return priority === 1 ? "High" : priority === 2 ? "Medium" : "Low";
      }
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue<boolean>("active");
        return active ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
        ) : (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
        );
      }
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => {
        return format(new Date(row.getValue("updatedAt")), "MM/dd/yyyy");
      }
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Maintenance Policies</h2>
          <p className="text-neutral-textSecondary">Define rules for triggering maintenance based on condition thresholds</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => setIsAddPolicyDialogOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Policy
          </Button>
        </div>
      </div>

      {/* Policy Information Card */}
      <Card className="mb-6">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle>About Maintenance Policies</CardTitle>
          <CardDescription>
            Maintenance policies automatically trigger maintenance actions when road conditions fall below defined thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">How Policies Work</h3>
            <p className="text-sm text-neutral-textSecondary">
              Policies define when specific maintenance types should be applied to road assets. This helps standardize 
              maintenance practices and ensures timely intervention as road conditions deteriorate.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border bg-gray-50">
              <h4 className="text-sm font-medium">1. Define Threshold</h4>
              <p className="text-xs text-neutral-textSecondary mt-1">
                Set a condition threshold (PCI) that triggers the maintenance action
              </p>
            </Card>
            <Card className="p-4 border bg-gray-50">
              <h4 className="text-sm font-medium">2. Assign Maintenance Type</h4>
              <p className="text-xs text-neutral-textSecondary mt-1">
                Select which maintenance treatment to apply when the threshold is reached
              </p>
            </Card>
            <Card className="p-4 border bg-gray-50">
              <h4 className="text-sm font-medium">3. Set Priority</h4>
              <p className="text-xs text-neutral-textSecondary mt-1">
                Determine the relative importance of the policy for budget optimization
              </p>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Policies Table */}
      <Card>
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle>Defined Policies</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={policies}
            searchKey="name"
            searchPlaceholder="Search policies..."
          />
        </CardContent>
      </Card>

      {/* Add Policy Dialog */}
      <Dialog open={isAddPolicyDialogOpen} onOpenChange={setIsAddPolicyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Maintenance Policy</DialogTitle>
            <DialogDescription>
              Create a new policy for triggering maintenance based on condition thresholds
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Preventive Maintenance for Asphalt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the policy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormDescription>
                      Policy applies to this surface type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conditionThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition Threshold (0-100)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} />
                    </FormControl>
                    <FormDescription>
                      Trigger when condition falls below this value
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maintenanceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
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
                    <FormDescription>
                      Treatment to apply when threshold is reached
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 - High</SelectItem>
                        <SelectItem value="2">2 - Medium</SelectItem>
                        <SelectItem value="3">3 - Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      1 is highest priority, used for budget allocation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Activate this policy immediately
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddPolicyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPolicyMutation.isPending}
                >
                  {createPolicyMutation.isPending ? "Creating..." : "Create Policy"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
