import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import CSVImport from "@/components/CSVImport";
import { useToast } from "@/hooks/use-toast";
import { RoadAsset } from "@shared/schema";

export default function ImportExport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch road assets and other data for export
  const { data: roadAssets = [] } = useQuery<RoadAsset[]>({
    queryKey: ['/api/road-assets'],
  });

  // Handle successful CSV import
  const handleImportComplete = (data: any) => {
    // Invalidate queries to refresh data after import
    queryClient.invalidateQueries({ queryKey: ['/api/road-assets'] });
    
    toast({
      title: "Import Successful",
      description: data.message || `Successfully imported data.`,
    });
  };

  // Handle CSV export
  const handleExportRoadAssets = () => {
    setExportLoading(true);
    
    try {
      // Prepare data for export
      const exportData = roadAssets.map(asset => ({
        assetId: asset.assetId,
        name: asset.name,
        location: asset.location,
        length: asset.length,
        width: asset.width,
        surfaceType: asset.surfaceType,
        condition: asset.condition,
        lastInspection: new Date(asset.lastInspection).toISOString().split('T')[0],
        nextInspection: asset.nextInspection ? new Date(asset.nextInspection).toISOString().split('T')[0] : ''
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
      link.setAttribute('download', 'road_assets.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Successfully exported ${exportData.length} road assets.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Template fields for different import types
  const roadAssetFields = [
    "assetId", "name", "location", "length", "width", 
    "surfaceType", "condition", "lastInspection", "nextInspection"
  ];
  
  const inspectionFields = [
    "assetId", "inspectionDate", "condition", "notes", "inspector"
  ];
  
  const maintenanceFields = [
    "assetId", "maintenanceType", "scheduledDate", "status", "cost", "notes"
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Import & Export</h2>
          <p className="text-neutral-textSecondary">Import and export road asset data</p>
        </div>
      </div>

      {/* Import/Export Tabs */}
      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader className="p-4 border-b border-gray-200">
                <CardTitle>Import Options</CardTitle>
                <CardDescription>
                  Select the type of data you want to import
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="roadAssets">
                  <TabsList className="mb-4">
                    <TabsTrigger value="roadAssets">Road Assets</TabsTrigger>
                    <TabsTrigger value="inspections">Inspections</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="roadAssets">
                    <CSVImport 
                      endpoint="/api/import/road-assets" 
                      templateFields={roadAssetFields}
                      onImportComplete={handleImportComplete}
                    />
                  </TabsContent>
                  
                  <TabsContent value="inspections">
                    <CSVImport 
                      endpoint="/api/import/inspections" 
                      templateFields={inspectionFields}
                      onImportComplete={handleImportComplete}
                    />
                  </TabsContent>
                  
                  <TabsContent value="maintenance">
                    <CSVImport 
                      endpoint="/api/import/maintenance" 
                      templateFields={maintenanceFields}
                      onImportComplete={handleImportComplete}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4 border-b border-gray-200">
                <CardTitle>Import Guidelines</CardTitle>
                <CardDescription>
                  Best practices for importing data
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Preparing Your CSV Files</h3>
                  <ul className="list-disc pl-5 text-sm space-y-1 text-neutral-textSecondary">
                    <li>Download the template for the type of data you want to import</li>
                    <li>Ensure that the CSV headers match exactly with the template</li>
                    <li>Asset IDs must be unique for road asset imports</li>
                    <li>When importing inspections or maintenance, the asset ID must match an existing road asset</li>
                    <li>Dates should be in YYYY-MM-DD format</li>
                    <li>Condition scores should be integers between 0 and 100</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Data Validation</h3>
                  <p className="text-sm text-neutral-textSecondary">
                    The system performs validation on all imported data. If an error is found,
                    the import will continue but will skip the problematic rows. A summary will
                    be shown after import is complete with the number of successful imports and errors.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">For Large Datasets</h3>
                  <p className="text-sm text-neutral-textSecondary">
                    For large datasets (over 500 rows), it's recommended to split the file into
                    smaller batches to ensure optimal performance and easier troubleshooting
                    if errors occur.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader className="p-4 border-b border-gray-200">
              <CardTitle>Export Options</CardTitle>
              <CardDescription>
                Export your data in CSV format
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border">
                  <h3 className="text-sm font-medium">Road Assets</h3>
                  <p className="text-xs text-neutral-textSecondary mt-1 mb-3">
                    Export all road asset data including location, condition, and inspection dates
                  </p>
                  <div className="text-sm font-medium">{roadAssets.length} assets available</div>
                  <Button 
                    className="mt-3 w-full" 
                    onClick={handleExportRoadAssets}
                    disabled={roadAssets.length === 0 || exportLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Road Assets
                  </Button>
                </Card>
                
                <Card className="p-4 border">
                  <h3 className="text-sm font-medium">Inspection History</h3>
                  <p className="text-xs text-neutral-textSecondary mt-1 mb-3">
                    Export inspection records with condition history and inspection dates
                  </p>
                  <div className="text-sm font-medium">Inspection history data</div>
                  <Button 
                    className="mt-3 w-full" 
                    variant="outline"
                    disabled={true}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Inspections
                  </Button>
                </Card>
                
                <Card className="p-4 border">
                  <h3 className="text-sm font-medium">Maintenance Projects</h3>
                  <p className="text-xs text-neutral-textSecondary mt-1 mb-3">
                    Export maintenance projects with status, costs, and schedules
                  </p>
                  <div className="text-sm font-medium">Maintenance project data</div>
                  <Button 
                    className="mt-3 w-full" 
                    variant="outline"
                    disabled={true}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Maintenance
                  </Button>
                </Card>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Data Export Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 border">
                    <h4 className="text-sm font-medium">GIS Export</h4>
                    <p className="text-xs text-neutral-textSecondary mt-1">
                      Export road network in GIS-compatible formats for use in GIS software
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" className="flex-1" disabled>KML</Button>
                      <Button variant="outline" className="flex-1" disabled>Shapefile</Button>
                      <Button variant="outline" className="flex-1" disabled>GeoJSON</Button>
                    </div>
                  </Card>
                  
                  <Card className="p-4 border">
                    <h4 className="text-sm font-medium">Report Generation</h4>
                    <p className="text-xs text-neutral-textSecondary mt-1">
                      Generate formatted reports for presentations and meetings
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" className="flex-1" disabled>PDF Report</Button>
                      <Button variant="outline" className="flex-1" disabled>Excel</Button>
                    </div>
                  </Card>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 p-4 border-t border-gray-200">
              <p className="text-sm text-neutral-textSecondary">
                All exports are in CSV format unless otherwise specified. Data is exported as-is with no transformations.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
