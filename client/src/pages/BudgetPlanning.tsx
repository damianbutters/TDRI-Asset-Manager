import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BudgetAllocation,
  RoadAsset,
  MaintenanceType,
  insertBudgetAllocationSchema
} from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import BudgetChart from "@/components/BudgetChart";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  generateBudgetScenarios, 
  calculateBudgetImpact, 
  type OptimizationMethod,
  type BudgetScenario
} from "@/lib/utils/budget-optimizer";
import { budgetColors } from "@/lib/utils/color-utils";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList
} from "recharts";

export default function BudgetPlanning() {
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState<BudgetScenario | null>(null);
  const [optimizationMethod, setOptimizationMethod] = useState<OptimizationMethod>("benefit");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch budget allocations
  const { data: budgetAllocations = [] } = useQuery<BudgetAllocation[]>({
    queryKey: ['/api/budget-allocations'],
  });

  // Fetch road assets for calculations
  const { data: roadAssets = [] } = useQuery<RoadAsset[]>({
    queryKey: ['/api/road-assets'],
  });

  // Fetch maintenance types for calculations
  const { data: maintenanceTypes = [] } = useQuery<MaintenanceType[]>({
    queryKey: ['/api/maintenance-types'],
  });

  // Get the active budget allocation
  const { data: activeBudget } = useQuery<BudgetAllocation>({
    queryKey: ['/api/budget-allocations/active'],
  });

  // Form schema
  const budgetFormSchema = insertBudgetAllocationSchema.extend({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    fiscalYear: z.coerce.number().min(2000, "Invalid fiscal year"),
    totalBudget: z.coerce.number().positive("Budget must be positive"),
    preventiveMaintenance: z.coerce.number().min(0, "Amount must be positive"),
    minorRehabilitation: z.coerce.number().min(0, "Amount must be positive"),
    majorRehabilitation: z.coerce.number().min(0, "Amount must be positive"),
    reconstruction: z.coerce.number().min(0, "Amount must be positive"),
    active: z.boolean().default(false),
    createdBy: z.number().default(1) // Default admin user
  });

  // Create form
  const form = useForm<z.infer<typeof budgetFormSchema>>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      fiscalYear: new Date().getFullYear(),
      totalBudget: 0,
      preventiveMaintenance: 0,
      minorRehabilitation: 0,
      majorRehabilitation: 0,
      reconstruction: 0,
      active: false,
      createdBy: 1
    },
  });

  // Calculate total and ensure it matches the total budget
  const watchAllFields = form.watch();
  const calculatedTotal = 
    (watchAllFields.preventiveMaintenance || 0) + 
    (watchAllFields.minorRehabilitation || 0) + 
    (watchAllFields.majorRehabilitation || 0) + 
    (watchAllFields.reconstruction || 0);
  
  const hasAllocationMismatch = 
    !!watchAllFields.totalBudget && 
    Math.abs(calculatedTotal - watchAllFields.totalBudget) > 0.01;

  // Create mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (values: z.infer<typeof budgetFormSchema>) => {
      const res = await apiRequest('POST', '/api/budget-allocations', values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget-allocations/active'] });
      setIsAddBudgetDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Budget allocation created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create budget allocation",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof budgetFormSchema>) => {
    // Check if allocations sum to total
    if (hasAllocationMismatch) {
      toast({
        title: "Allocation Error",
        description: "Category allocations must sum to the total budget",
        variant: "destructive",
      });
      return;
    }
    
    createBudgetMutation.mutate(values);
  };

  // Handle automatic allocation based on percentage
  const handleAllocateByPercentage = () => {
    const totalBudget = form.getValues("totalBudget");
    if (!totalBudget) return;
    
    // Default allocation percentages
    form.setValue("preventiveMaintenance", Math.round(totalBudget * 0.33 * 100) / 100);
    form.setValue("minorRehabilitation", Math.round(totalBudget * 0.26 * 100) / 100);
    form.setValue("majorRehabilitation", Math.round(totalBudget * 0.21 * 100) / 100);
    form.setValue("reconstruction", Math.round(totalBudget * 0.20 * 100) / 100);
  };

  // Generate budget data for charts
  const getBudgetChartData = () => {
    if (!activeBudget) return [];
    
    return [
      {
        name: "Preventive Maintenance",
        amount: activeBudget.preventiveMaintenance,
        percentage: Math.round((activeBudget.preventiveMaintenance / activeBudget.totalBudget) * 100),
        color: budgetColors.preventiveMaintenance
      },
      {
        name: "Minor Rehabilitation",
        amount: activeBudget.minorRehabilitation,
        percentage: Math.round((activeBudget.minorRehabilitation / activeBudget.totalBudget) * 100),
        color: budgetColors.minorRehabilitation
      },
      {
        name: "Major Rehabilitation",
        amount: activeBudget.majorRehabilitation,
        percentage: Math.round((activeBudget.majorRehabilitation / activeBudget.totalBudget) * 100),
        color: budgetColors.majorRehabilitation
      },
      {
        name: "Reconstruction",
        amount: activeBudget.reconstruction,
        percentage: Math.round((activeBudget.reconstruction / activeBudget.totalBudget) * 100),
        color: budgetColors.reconstruction
      }
    ];
  };

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    return `$${(value / 1_000).toFixed(0)}K`;
  };

  // Generate budget scenarios
  const getBudgetScenarios = () => {
    if (!activeBudget || !roadAssets.length || !maintenanceTypes.length) return [];
    
    const scenarios = generateBudgetScenarios(
      activeBudget.totalBudget,
      roadAssets,
      maintenanceTypes
    );
    
    // Set active scenario if not already set
    if (!activeScenario) {
      setActiveScenario(scenarios[0]);
    }
    
    return scenarios.map(scenario => ({
      name: scenario.name,
      amount: formatCurrency(scenario.totalBudget),
      pci: scenario.projectedPCI.toString(),
      isActive: activeScenario?.name === scenario.name
    }));
  };

  // Handle scenario click
  const handleScenarioClick = (scenario: any) => {
    if (scenario.name === "New") {
      setIsAddBudgetDialogOpen(true);
      return;
    }
    
    if (!activeBudget || !roadAssets.length || !maintenanceTypes.length) return;
    
    const scenarios = generateBudgetScenarios(
      activeBudget.totalBudget,
      roadAssets,
      maintenanceTypes
    );
    
    const selected = scenarios.find(s => s.name === scenario.name);
    if (selected) {
      setActiveScenario(selected);
    }
  };

  // Calculate budget impact for the selected scenario
  const getBudgetImpact = () => {
    if (!activeScenario || !roadAssets.length || !maintenanceTypes.length) return null;
    
    return calculateBudgetImpact(
      roadAssets,
      maintenanceTypes,
      {
        preventiveMaintenance: activeScenario.preventiveMaintenance,
        minorRehabilitation: activeScenario.minorRehabilitation,
        majorRehabilitation: activeScenario.majorRehabilitation,
        reconstruction: activeScenario.reconstruction
      },
      optimizationMethod
    );
  };

  // Get data for pie chart
  const getPieChartData = () => {
    if (!activeBudget) return [];
    
    return [
      { name: "Preventive", value: activeBudget.preventiveMaintenance, color: "#0078D4" },
      { name: "Minor Rehab", value: activeBudget.minorRehabilitation, color: "#2B88D8" },
      { name: "Major Rehab", value: activeBudget.majorRehabilitation, color: "#FFB900" },
      { name: "Reconstruction", value: activeBudget.reconstruction, color: "#D83B01" }
    ];
  };

  // Impact metrics for the current budget allocation
  const budgetImpact = getBudgetImpact();
  const pieChartData = getPieChartData();

  // Comparison data for the different optimization methods
  const getOptimizationComparisonData = () => {
    if (!activeBudget || !roadAssets.length || !maintenanceTypes.length) return [];
    
    const allocation = {
      preventiveMaintenance: activeBudget.preventiveMaintenance,
      minorRehabilitation: activeBudget.minorRehabilitation,
      majorRehabilitation: activeBudget.majorRehabilitation,
      reconstruction: activeBudget.reconstruction
    };
    
    const impactOptimized = calculateBudgetImpact(roadAssets, maintenanceTypes, allocation, "impact");
    const costOptimized = calculateBudgetImpact(roadAssets, maintenanceTypes, allocation, "cost");
    const benefitOptimized = calculateBudgetImpact(roadAssets, maintenanceTypes, allocation, "benefit");
    
    return [
      { name: "Impact", pci: impactOptimized.projectedPCI, assets: impactOptimized.improvedAssets },
      { name: "Cost", pci: costOptimized.projectedPCI, assets: costOptimized.improvedAssets },
      { name: "Benefit", pci: benefitOptimized.projectedPCI, assets: benefitOptimized.improvedAssets }
    ];
  };

  const optimizationComparisonData = getOptimizationComparisonData();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Budget Planning</h2>
          <p className="text-neutral-textSecondary">Allocate and optimize maintenance budget</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => setIsAddBudgetDialogOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Budget
          </Button>
        </div>
      </div>

      {/* Budget Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Current Budget Allocation */}
        <Card>
          <CardHeader className="p-4 border-b border-gray-200">
            <CardTitle>Current Budget Allocation</CardTitle>
            <CardDescription>
              {activeBudget 
                ? `FY ${activeBudget.fiscalYear}: ${activeBudget.name}`
                : "No active budget"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {activeBudget ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <BudgetChart
                    title="Allocation by Category"
                    data={getBudgetChartData()}
                    scenarios={getBudgetScenarios()}
                    onScenarioClick={handleScenarioClick}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-3">Budget Distribution</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-neutral-textSecondary mb-4">No active budget allocation found</p>
                  <Button onClick={() => setIsAddBudgetDialogOpen(true)}>
                    Create Budget
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          {activeBudget && (
            <CardFooter className="bg-gray-50 p-4 border-t border-gray-200">
              <div className="w-full text-sm text-neutral-textSecondary">
                <div className="flex justify-between">
                  <span>Total Budget:</span>
                  <span className="font-medium">{formatCurrency(activeBudget.totalBudget)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Fiscal Year:</span>
                  <span>{activeBudget.fiscalYear}</span>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Budget Impact */}
        <Card>
          <CardHeader className="p-4 border-b border-gray-200">
            <CardTitle>Budget Impact Analysis</CardTitle>
            <CardDescription>
              Projected outcomes based on current allocation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {budgetImpact ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 border">
                    <h4 className="text-sm font-medium">Projected PCI</h4>
                    <p className="text-2xl font-semibold mt-1">{budgetImpact.projectedPCI}</p>
                    <p className="text-xs text-neutral-textSecondary mt-1">Average condition score</p>
                  </Card>
                  <Card className="p-4 border">
                    <h4 className="text-sm font-medium">Improved Assets</h4>
                    <p className="text-2xl font-semibold mt-1">{budgetImpact.improvedAssets}</p>
                    <p className="text-xs text-neutral-textSecondary mt-1">Roads receiving maintenance</p>
                  </Card>
                  <Card className="p-4 border">
                    <h4 className="text-sm font-medium">Unaddressed</h4>
                    <p className="text-2xl font-semibold mt-1">{budgetImpact.unaddressedAssets}</p>
                    <p className="text-xs text-neutral-textSecondary mt-1">Assets not addressed</p>
                  </Card>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">Optimization Strategy Comparison</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={optimizationComparisonData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" label={{ value: 'PCI Score', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Assets Improved', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="pci" name="Projected PCI" fill="#0078D4" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="pci" position="top" />
                        </Bar>
                        <Bar yAxisId="right" dataKey="assets" name="Assets Improved" fill="#107C10" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="assets" position="top" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={`p-3 border cursor-pointer ${optimizationMethod === 'impact' ? 'border-primary bg-blue-50' : 'hover:border-primary hover:bg-blue-50/50'}`}
                    onClick={() => setOptimizationMethod('impact')}>
                    <div className="text-xs font-medium">Optimize for Impact</div>
                    <div className="text-sm mt-1">Prioritizes projects that improve condition the most</div>
                  </Card>
                  <Card className={`p-3 border cursor-pointer ${optimizationMethod === 'cost' ? 'border-primary bg-blue-50' : 'hover:border-primary hover:bg-blue-50/50'}`}
                    onClick={() => setOptimizationMethod('cost')}>
                    <div className="text-xs font-medium">Optimize for Cost</div>
                    <div className="text-sm mt-1">Prioritizes lowest cost projects to maximize reach</div>
                  </Card>
                  <Card className={`p-3 border cursor-pointer ${optimizationMethod === 'benefit' ? 'border-primary bg-blue-50' : 'hover:border-primary hover:bg-blue-50/50'}`}
                    onClick={() => setOptimizationMethod('benefit')}>
                    <div className="text-xs font-medium">Optimize for Benefit</div>
                    <div className="text-sm mt-1">Balances cost and impact for best overall improvement</div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center">
                <p className="text-neutral-textSecondary">Select a budget allocation to view impact analysis</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget History and Allocations */}
      <Card>
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle>Budget History</CardTitle>
          <CardDescription>Previous and planned budget allocations</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">
                    Fiscal Year
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">
                    Total Budget
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">
                    Preventive
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">
                    Minor Rehab
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">
                    Major Rehab
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">
                    Reconstruction
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgetAllocations.map((budget) => (
                  <tr key={budget.id} className={budget.active ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {budget.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {budget.fiscalYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatCurrency(budget.totalBudget)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatCurrency(budget.preventiveMaintenance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatCurrency(budget.minorRehabilitation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatCurrency(budget.majorRehabilitation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatCurrency(budget.reconstruction)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {budget.active ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {budgetAllocations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-neutral-textSecondary">
                      No budget allocations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Budget Dialog */}
      <Dialog open={isAddBudgetDialogOpen} onOpenChange={setIsAddBudgetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Budget Allocation</DialogTitle>
            <DialogDescription>
              Define budget allocation for a fiscal year
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. FY 2023 Road Maintenance Budget" {...field} />
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
                      <Input placeholder="Budget description (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Budget ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Category Allocations</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAllocateByPercentage}
                  disabled={!form.getValues("totalBudget")}
                >
                  Auto Allocate
                </Button>
              </div>
              
              <FormField
                control={form.control}
                name="preventiveMaintenance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preventive Maintenance ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minorRehabilitation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minor Rehabilitation ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="majorRehabilitation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Major Rehabilitation ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reconstruction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reconstruction ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {hasAllocationMismatch && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  Warning: Category allocations ({formatCurrency(calculatedTotal)}) do not match the total budget ({formatCurrency(watchAllFields.totalBudget)})
                </div>
              )}
              
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set as active budget</FormLabel>
                      <FormDescription>
                        This will deactivate any currently active budget
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddBudgetDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBudgetMutation.isPending}
                >
                  {createBudgetMutation.isPending ? "Creating..." : "Create Budget"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
