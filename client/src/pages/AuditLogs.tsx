import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuditLog } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Fetch audit logs
  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit-logs'],
  });

  // Get unique users from logs
  const uniqueUsers = Array.from(new Set(auditLogs.map(log => log.username)));
  
  // Get unique action types from logs
  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));

  // Filter logs based on current filters
  const filteredLogs = auditLogs.filter(log => {
    // Filter by action type
    if (actionFilter !== "all" && log.action !== actionFilter) {
      return false;
    }
    
    // Filter by user
    if (userFilter !== "all" && log.username !== userFilter) {
      return false;
    }
    
    // Filter by date range
    if (dateRange !== "all") {
      const logDate = new Date(log.timestamp);
      const now = new Date();
      
      switch (dateRange) {
        case "today":
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (logDate < today) return false;
          break;
        case "yesterday":
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          
          const dayBefore = new Date();
          dayBefore.setDate(dayBefore.getDate() - 2);
          dayBefore.setHours(0, 0, 0, 0);
          
          if (logDate < dayBefore || logDate >= yesterday) return false;
          break;
        case "week":
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (logDate < weekAgo) return false;
          break;
        case "month":
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (logDate < monthAgo) return false;
          break;
      }
    }
    
    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.username.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(term))
      );
    }
    
    return true;
  });

  // Handle export audit logs to CSV
  const handleExportLogs = () => {
    try {
      // Prepare data for export
      const exportData = filteredLogs.map(log => ({
        timestamp: format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
        username: log.username,
        action: log.action,
        details: log.details,
        ipAddress: log.ipAddress || '',
        resourceType: log.resourceType || '',
        resourceId: log.resourceId || ''
      }));
      
      // Convert to CSV
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(obj => 
        Object.values(obj).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      );
      
      const csv = [headers, ...rows].join('\n');
      
      // Create and trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'audit_logs.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  // Table columns
  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        return format(new Date(row.getValue("timestamp")), "MM/dd/yyyy hh:mm a");
      }
    },
    {
      accessorKey: "username",
      header: "User"
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action") as string;
        let bgColor = "bg-gray-100";
        
        if (action.includes("create") || action.includes("Create")) {
          bgColor = "bg-green-100";
        } else if (action.includes("update") || action.includes("Update")) {
          bgColor = "bg-blue-100";
        } else if (action.includes("delete") || action.includes("Delete")) {
          bgColor = "bg-red-100";
        } else if (action.includes("import") || action.includes("Import")) {
          bgColor = "bg-purple-100";
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${bgColor}`}>
            {action}
          </span>
        );
      }
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => {
        const details = row.getValue("details") as string;
        return (
          <div className="max-w-[300px] truncate" title={details}>
            {details}
          </div>
        );
      }
    },
    {
      accessorKey: "ipAddress",
      header: "IP Address"
    },
    {
      accessorKey: "resourceType",
      header: "Resource Type",
      cell: ({ row }) => {
        const resourceType = row.original.resourceType;
        if (!resourceType) return null;
        
        return (
          <span className="text-xs text-neutral-textSecondary">
            {resourceType.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      accessorKey: "relativeTime",
      header: "Relative Time",
      cell: ({ row }) => {
        return formatDistanceToNow(new Date(row.original.timestamp), { addSuffix: true });
      }
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Audit Logs</h2>
          <p className="text-neutral-textSecondary">Track and review system activity for compliance</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={handleExportLogs} disabled={filteredLogs.length === 0}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Logs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle>Log Filters</CardTitle>
          <CardDescription>
            Filter logs by user, action type, and date range
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="userFilter" className="block text-sm font-medium text-neutral-textSecondary mb-1">
                User
              </label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger id="userFilter" className="w-full">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>{user}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="actionFilter" className="block text-sm font-medium text-neutral-textSecondary mb-1">
                Action Type
              </label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="actionFilter" className="w-full">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-neutral-textSecondary mb-1">
                Date Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="dateRange" className="w-full">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="searchLogs" className="block text-sm font-medium text-neutral-textSecondary mb-1">
                Search
              </label>
              <div className="relative">
                <Input
                  id="searchLogs"
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-neutral-textSecondary">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'log entry' : 'log entries'} found
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle>System Activity Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredLogs}
              searchKey="details"
              searchPlaceholder="Search in details..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
