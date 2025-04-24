import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { RoadAsset, MaintenanceProject, BudgetAllocation, AuditLog, getConditionState } from "@shared/schema";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Map from "@/components/ui/map";
import ConditionChart from "@/components/ConditionChart";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import BudgetChart from "@/components/BudgetChart";
import DeteriorationChart from "@/components/DeteriorationChart";
import { getConditionColor, getConditionBadgeColor } from "@/lib/utils/color-utils";
import { forecastConditionDistribution } from "@/lib/utils/deterioration-model";
import { format } from "date-fns";

export default function Dashboard() {
  // Fetch data from API
  const { data: roadAssets = [] } = useQuery<RoadAsset[]>({
    queryKey: ['/api/road-assets'],
  });

  const { data: maintenanceProjects = [] } = useQuery<MaintenanceProject[]>({
    queryKey: ['/api/maintenance-projects'],
  });

  const { data: activeBudget } = useQuery<BudgetAllocation>({
    queryKey: ['/api/budget-allocations/active'],
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit-logs'],
  });

  // Calculate statistics
  const totalRoadMiles = roadAssets.reduce((total, asset) => total + asset.length, 0);
  const averageCondition = roadAssets.length 
    ? Math.round(roadAssets.reduce((sum, asset) => sum + asset.condition, 0) / roadAssets.length) 
    : 0;
  const conditionState = getConditionState(averageCondition);
  
  const pendingProjects = maintenanceProjects.filter(project => 
    project.status === "Planned" || project.status === "In Progress"
  ).length;
  
  const highPriorityProjects = maintenanceProjects.filter(project => {
    const asset = roadAssets.find(a => a.id === project.roadAssetId);
    return asset && asset.condition < 40 && project.status === "Planned";
  }).length;

  // Prepare condition distribution data
  const conditionData = [
    { 
      label: "Good", 
      range: "80-100", 
      percentage: roadAssets.filter(a => a.condition >= 80).length / roadAssets.length * 100 || 0,
      color: getConditionColor(85)
    },
    { 
      label: "Fair", 
      range: "60-79", 
      percentage: roadAssets.filter(a => a.condition >= 60 && a.condition < 80).length / roadAssets.length * 100 || 0,
      color: getConditionColor(70)
    },
    { 
      label: "Poor", 
      range: "40-59", 
      percentage: roadAssets.filter(a => a.condition >= 40 && a.condition < 60).length / roadAssets.length * 100 || 0,
      color: getConditionColor(50)
    },
    { 
      label: "Critical", 
      range: "0-39", 
      percentage: roadAssets.filter(a => a.condition < 40).length / roadAssets.length * 100 || 0,
      color: getConditionColor(30)
    }
  ];

  // Create trend data for the past 12 months
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - 11 + i);
    return {
      month: format(date, 'MMM'),
      value: 50 + Math.round(Math.sin(i / 3) * 10) + i  // Simulate a gradually improving trend
    };
  });

  // Budget data
  const budgetData = activeBudget ? [
    {
      name: "Preventive Maintenance",
      amount: activeBudget.preventiveMaintenance,
      percentage: Math.round((activeBudget.preventiveMaintenance / activeBudget.totalBudget) * 100),
      color: "bg-primary"
    },
    {
      name: "Minor Rehabilitation",
      amount: activeBudget.minorRehabilitation,
      percentage: Math.round((activeBudget.minorRehabilitation / activeBudget.totalBudget) * 100),
      color: "bg-secondary"
    },
    {
      name: "Major Rehabilitation",
      amount: activeBudget.majorRehabilitation,
      percentage: Math.round((activeBudget.majorRehabilitation / activeBudget.totalBudget) * 100),
      color: "bg-[#FFB900]"
    },
    {
      name: "Reconstruction",
      amount: activeBudget.reconstruction,
      percentage: Math.round((activeBudget.reconstruction / activeBudget.totalBudget) * 100),
      color: "bg-[#D83B01]"
    }
  ] : [];

  // Budget scenarios
  const budgetScenarios = [
    {
      name: "Current",
      amount: activeBudget ? formatCurrency(activeBudget.totalBudget) : "$24.8M",
      pci: "72",
      isActive: true
    },
    {
      name: "Optimized",
      amount: activeBudget ? formatCurrency(activeBudget.totalBudget * 1.1) : "$28.2M",
      pci: "78"
    },
    {
      name: "Reduced",
      amount: activeBudget ? formatCurrency(activeBudget.totalBudget * 0.75) : "$18.5M",
      pci: "62"
    }
  ];

  // Deterioration forecast
  const deteriorationForecast = forecastConditionDistribution(
    roadAssets.map(asset => ({ 
      condition: asset.condition, 
      surfaceType: asset.surfaceType 
    })),
    10
  );

  // Treatment impacts data
  const treatmentImpacts = [
    { name: "Crack Sealing", lifeExtension: "1-2 years", conditionImprovement: "+5 points", costPerMile: "$2,000-$4,000" },
    { name: "Surface Treatment", lifeExtension: "3-5 years", conditionImprovement: "+10 points", costPerMile: "$20,000-$40,000" },
    { name: "Mill & Overlay", lifeExtension: "7-10 years", conditionImprovement: "+25 points", costPerMile: "$120,000-$150,000" },
    { name: "Reconstruction", lifeExtension: "15-20 years", conditionImprovement: "Reset to 100", costPerMile: "$500,000+" }
  ];

  // Columns for inspection table
  const columns: ColumnDef<RoadAsset>[] = [
    {
      accessorKey: "assetId",
      header: "Road ID"
    },
    {
      accessorKey: "location",
      header: "Location"
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => {
        const condition = row.getValue("condition") as number;
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
      accessorKey: "lastInspection",
      header: "Last Inspection",
      cell: ({ row }) => {
        return format(new Date(row.getValue("lastInspection")), "MM/dd/yyyy");
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const condition = row.getValue("condition") as number;
        
        if (condition >= 80) {
          return "No action needed";
        } else if (condition >= 60) {
          return "Monitoring";
        } else if (condition >= 40) {
          return "Maintenance required";
        } else {
          return "Urgent repair needed";
        }
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <div className="text-right">
            <Link href={`/road-assets/${row.original.id}`}>
              <a className="text-primary hover:text-secondary">
                View
              </a>
            </Link>
          </div>
        );
      }
    }
  ];

  function formatCurrency(value: number): string {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    return `$${(value / 1_000).toFixed(0)}K`;
  }

  return (
    <div className="p-6">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-neutral-textSecondary">Overview of road assets and maintenance</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Link href="/road-assets">
            <Button>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Button>
          </Link>
          <Link href="/import-export">
            <Button variant="outline">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import CSV
            </Button>
          </Link>
          <Link href="/import-export">
            <Button variant="outline">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Road Assets"
          value={`${totalRoadMiles.toFixed(1)} mi`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          }
          iconBgClass="bg-blue-100"
          trend={{
            value: "3.5% increase from last year",
            positive: true
          }}
        />

        <StatCard
          title="Average Condition"
          value={`${conditionState.charAt(0).toUpperCase() + conditionState.slice(1)} (${averageCondition}/100)`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#FFB900]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          iconBgClass="bg-yellow-100"
          progress={{
            value: averageCondition,
            color: getConditionColor(averageCondition)
          }}
        />

        <StatCard
          title="Maintenance Budget"
          value={activeBudget ? formatCurrency(activeBudget.totalBudget) : "$24.8M"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#107C10]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgClass="bg-green-100"
          progress={{
            value: 64,
            color: "bg-[#107C10]"
          }}
          trend={{
            value: "64% of annual allocation used",
            neutral: true
          }}
        />

        <StatCard
          title="Pending Maintenance"
          value={`${pendingProjects} Projects`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#D83B01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
          iconBgClass="bg-red-100"
          trend={{
            value: `${highPriorityProjects} high priority projects`,
            positive: false
          }}
        />
      </div>

      {/* Road Condition Map */}
      <Card className="mb-6">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200">
          <CardTitle>Road Condition Map</CardTitle>
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
            <Button variant="secondary" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Map roadAssets={roadAssets} height="h-80" />
        </CardContent>
      </Card>

      {/* Road Assets Table and Asset Condition Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Condition Distribution Chart */}
        <div className="lg:col-span-1">
          <ConditionChart 
            title="Condition Distribution" 
            data={conditionData} 
            trendData={trendData} 
          />
        </div>

        {/* Road Assets Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200">
            <CardTitle>Recent Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={roadAssets.slice(0, 5)}
              searchKey="location"
              searchPlaceholder="Search assets..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Budget Planning & Deterioration Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Budget Allocation */}
        <BudgetChart
          title="Budget Allocation"
          subtitle="Current fiscal year"
          data={budgetData}
          scenarios={budgetScenarios}
        />

        {/* Deterioration Models */}
        <DeteriorationChart
          title="Deterioration Forecast"
          subtitle="10-year projection"
          data={deteriorationForecast}
          treatmentImpacts={treatmentImpacts}
        />
      </div>

      {/* Recent Activity & Audit Logs */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200">
          <CardTitle>Recent Activity & Audit Logs</CardTitle>
          <Link href="/audit-logs">
            <Button variant="outline" size="sm">
              Export Logs
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-textSecondary uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {auditLogs.slice(0, 5).map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-textSecondary">
                    {format(new Date(log.timestamp), "MM/dd/yyyy hh:mm a")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{log.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{log.action}</td>
                  <td className="px-6 py-4 text-sm">{log.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-textSecondary">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-200 px-4 py-3 text-right">
            <Link href="/audit-logs">
              <a className="text-primary hover:text-secondary text-sm">
                View all activity logs 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
