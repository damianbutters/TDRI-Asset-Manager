import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoadAsset, MaintenanceType } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import DeteriorationChart from "@/components/DeteriorationChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  projectCondition, 
  DeteriorationParameters, 
  MaintenanceImpact,
  forecastConditionDistribution
} from "@/lib/utils/deterioration-model";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function DeteriorationModels() {
  // Fetch road assets and maintenance types for projections
  const { data: roadAssets = [] } = useQuery<RoadAsset[]>({
    queryKey: ['/api/road-assets'],
  });

  const { data: maintenanceTypes = [] } = useQuery<MaintenanceType[]>({
    queryKey: ['/api/maintenance-types'],
  });

  // States for model parameters
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string>("");
  const [trafficLevel, setTrafficLevel] = useState<"low" | "medium" | "high">("medium");
  const [climateImpact, setClimateImpact] = useState<"low" | "medium" | "high">("medium");
  const [projectionYears, setProjectionYears] = useState<number>(20);
  const [maintenanceYear, setMaintenanceYear] = useState<number>(5);
  
  // Results of projections
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [maintenanceScenarios, setMaintenanceScenarios] = useState<any[]>([]);
  
  // Global deterioration forecast data (for all assets)
  const [forecastData, setForecastData] = useState<any[]>([]);

  // Selected asset and maintenance type
  const selectedAsset = roadAssets.find(a => a.id.toString() === selectedAssetId);
  const selectedMaintenance = maintenanceTypes.find(m => m.id.toString() === selectedMaintenanceId);

  // Treatment impacts data for display
  const treatmentImpacts = maintenanceTypes.map(type => ({
    name: type.name,
    lifeExtension: `${type.lifespanExtension} years`,
    conditionImprovement: `+${type.conditionImprovement} points`,
    costPerMile: `$${type.costPerMile.toLocaleString()}`
  }));

  // Calculate data for deterioration model chart
  useEffect(() => {
    // Generate global forecast for all assets
    if (roadAssets.length > 0) {
      const forecast = forecastConditionDistribution(
        roadAssets.map(asset => ({ 
          condition: asset.condition, 
          surfaceType: asset.surfaceType 
        })),
        10
      );
      setForecastData(forecast);
    }
    
    // Generate individual asset projection if selected
    if (selectedAsset) {
      const params: DeteriorationParameters = {
        initialCondition: selectedAsset.condition,
        ageInYears: 0,
        surfaceType: selectedAsset.surfaceType,
        trafficLevel,
        climateImpact
      };
      
      // Project without maintenance
      const projection = projectCondition(params, projectionYears);
      setProjectionData(projection);
      
      // Generate maintenance scenarios if maintenance type selected
      if (selectedMaintenance) {
        // Base scenario with no maintenance
        const noMaintenance = projectCondition(params, projectionYears);
        
        // Scenario with maintenance at specified year
        const maintenanceImpact: MaintenanceImpact = {
          conditionImprovement: selectedMaintenance.conditionImprovement,
          lifeExtension: selectedMaintenance.lifespanExtension
        };
        
        const singleMaintenance = projectCondition(
          params, 
          projectionYears,
          [{ year: maintenanceYear, impact: maintenanceImpact }]
        );
        
        // Scenario with regular maintenance every X years
        const regularMaintenancePeriod = Math.min(selectedMaintenance.lifespanExtension, 5);
        const regularMaintenanceSchedule = [];
        
        for (let year = regularMaintenancePeriod; year <= projectionYears; year += regularMaintenancePeriod) {
          regularMaintenanceSchedule.push({
            year, 
            impact: maintenanceImpact
          });
        }
        
        const regularMaintenance = projectCondition(
          params, 
          projectionYears,
          regularMaintenanceSchedule
        );
        
        // Prepare the data for charts
        const scenarioData = [];
        
        for (let i = 0; i <= projectionYears; i++) {
          scenarioData.push({
            year: i,
            noMaintenance: noMaintenance[i].condition,
            singleMaintenance: singleMaintenance[i].condition,
            regularMaintenance: regularMaintenance[i].condition
          });
        }
        
        setMaintenanceScenarios(scenarioData);
      }
    }
  }, [selectedAssetId, selectedMaintenanceId, trafficLevel, climateImpact, projectionYears, maintenanceYear, roadAssets, maintenanceTypes]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Deterioration Models</h2>
          <p className="text-neutral-textSecondary">Predict how road conditions change over time</p>
        </div>
      </div>

      {/* Deterioration Modeling Tabs */}
      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="forecast">Network Forecast</TabsTrigger>
          <TabsTrigger value="asset">Asset Modeling</TabsTrigger>
        </TabsList>

        {/* Network Forecast Tab */}
        <TabsContent value="forecast">
          <div className="grid grid-cols-1 gap-6">
            {/* Network deterioration forecast chart */}
            <Card>
              <CardHeader className="p-4 border-b border-gray-200">
                <CardTitle>Network Deterioration Forecast</CardTitle>
                <CardDescription>10-year projection of condition distribution for all road assets</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  {forecastData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={forecastData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="good" stackId="1" fill="#107C10" stroke="#107C10" name="Good (80-100)" />
                        <Area type="monotone" dataKey="fair" stackId="1" fill="#FFB900" stroke="#FFB900" name="Fair (60-79)" />
                        <Area type="monotone" dataKey="poor" stackId="1" fill="#D83B01" stroke="#D83B01" name="Poor (40-59)" />
                        <Area type="monotone" dataKey="critical" stackId="1" fill="#A80000" stroke="#A80000" name="Critical (0-39)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-neutral-textSecondary">Loading forecast data...</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 p-4 border-t border-gray-200">
                <div className="text-sm text-neutral-textSecondary">
                  <p>This chart shows the projected distribution of road conditions over the next 10 years if current maintenance patterns continue.</p>
                </div>
              </CardFooter>
            </Card>

            {/* Treatment Impact Analysis */}
            <Card>
              <CardHeader className="p-4 border-b border-gray-200">
                <CardTitle>Treatment Impact Analysis</CardTitle>
                <CardDescription>Effect of different maintenance treatments on road lifespan</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium py-2">Treatment Type</th>
                        <th className="text-left font-medium py-2">Life Extension</th>
                        <th className="text-left font-medium py-2">Condition Improvement</th>
                        <th className="text-left font-medium py-2">Cost/Mile</th>
                        <th className="text-left font-medium py-2">Applicable Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {maintenanceTypes.map((type) => (
                        <tr key={type.id}>
                          <td className="py-2">{type.name}</td>
                          <td className="py-2">{type.lifespanExtension} years</td>
                          <td className="py-2">+{type.conditionImprovement} points</td>
                          <td className="py-2">${type.costPerMile.toLocaleString()}</td>
                          <td className="py-2">
                            {type.applicableMinCondition !== null && type.applicableMaxCondition !== null
                              ? `${type.applicableMinCondition} - ${type.applicableMaxCondition}`
                              : type.applicableMinCondition !== null
                              ? `Min: ${type.applicableMinCondition}`
                              : type.applicableMaxCondition !== null
                              ? `Max: ${type.applicableMaxCondition}`
                              : "Any"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Asset Modeling Tab */}
        <TabsContent value="asset">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Parameters Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="p-4 border-b border-gray-200">
                <CardTitle>Model Parameters</CardTitle>
                <CardDescription>Configure deterioration model inputs</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label htmlFor="assetSelect">Select Road Asset</Label>
                  <Select
                    value={selectedAssetId}
                    onValueChange={setSelectedAssetId}
                  >
                    <SelectTrigger id="assetSelect" className="w-full mt-1">
                      <SelectValue placeholder="Select a road asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {roadAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id.toString()}>
                          {asset.assetId}: {asset.name} (PCI: {asset.condition})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="trafficSelect">Traffic Level</Label>
                  <Select
                    value={trafficLevel}
                    onValueChange={(value) => setTrafficLevel(value as "low" | "medium" | "high")}
                  >
                    <SelectTrigger id="trafficSelect" className="w-full mt-1">
                      <SelectValue placeholder="Select traffic level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Traffic</SelectItem>
                      <SelectItem value="medium">Medium Traffic</SelectItem>
                      <SelectItem value="high">High Traffic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="climateSelect">Climate Impact</Label>
                  <Select
                    value={climateImpact}
                    onValueChange={(value) => setClimateImpact(value as "low" | "medium" | "high")}
                  >
                    <SelectTrigger id="climateSelect" className="w-full mt-1">
                      <SelectValue placeholder="Select climate impact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Impact</SelectItem>
                      <SelectItem value="medium">Medium Impact</SelectItem>
                      <SelectItem value="high">High Impact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Projection Years: {projectionYears}</Label>
                  <Slider
                    value={[projectionYears]}
                    min={5}
                    max={30}
                    step={1}
                    onValueChange={(values) => setProjectionYears(values[0])}
                    className="mt-2"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium mb-2">Maintenance Scenario</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="maintenanceSelect">Maintenance Type</Label>
                      <Select
                        value={selectedMaintenanceId}
                        onValueChange={setSelectedMaintenanceId}
                      >
                        <SelectTrigger id="maintenanceSelect" className="w-full mt-1">
                          <SelectValue placeholder="Select maintenance type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {maintenanceTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name} (+{type.conditionImprovement} points)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedMaintenanceId && (
                      <div>
                        <Label>Apply in Year: {maintenanceYear}</Label>
                        <Slider
                          value={[maintenanceYear]}
                          min={1}
                          max={Math.min(20, projectionYears - 1)}
                          step={1}
                          onValueChange={(values) => setMaintenanceYear(values[0])}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="p-4 border-b border-gray-200">
                <CardTitle>Deterioration Projection</CardTitle>
                <CardDescription>
                  {selectedAsset 
                    ? `Projected condition for ${selectedAsset.name} (Starting PCI: ${selectedAsset.condition})` 
                    : "Select a road asset to see projection"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {selectedAsset && projectionData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={projectionData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="year" 
                            label={{ value: 'Years', position: 'insideBottomRight', offset: -10 }} 
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            label={{ value: 'Condition (PCI)', angle: -90, position: 'insideLeft' }} 
                          />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="condition" 
                            name="Condition" 
                            stroke="#0078D4" 
                            strokeWidth={2} 
                            dot={{ r: 3 }} 
                            activeDot={{ r: 8 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {selectedMaintenanceId && maintenanceScenarios.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Maintenance Impact Comparison</h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={maintenanceScenarios}
                              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="year" 
                                label={{ value: 'Years', position: 'insideBottomRight', offset: -10 }} 
                              />
                              <YAxis 
                                domain={[0, 100]} 
                                label={{ value: 'Condition (PCI)', angle: -90, position: 'insideLeft' }} 
                              />
                              <Tooltip />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="noMaintenance" 
                                name="No Maintenance" 
                                stroke="#A80000" 
                                strokeWidth={2} 
                                dot={{ r: 2 }} 
                              />
                              <Line 
                                type="monotone" 
                                dataKey="singleMaintenance" 
                                name={`Single Maintenance (Year ${maintenanceYear})`} 
                                stroke="#FFB900" 
                                strokeWidth={2} 
                                dot={{ r: 2 }} 
                              />
                              <Line 
                                type="monotone" 
                                dataKey="regularMaintenance" 
                                name="Regular Maintenance" 
                                stroke="#107C10" 
                                strokeWidth={2} 
                                dot={{ r: 2 }} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-60 flex items-center justify-center">
                    <p className="text-neutral-textSecondary">Select a road asset to view deterioration projection</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-gray-50 p-4 border-t border-gray-200">
                <div className="text-sm text-neutral-textSecondary">
                  <p>This model uses traffic level, climate impact, and surface type to predict deterioration over time.</p>
                  <p className="mt-1">The maintenance scenarios show the effect of different maintenance strategies on the road's condition.</p>
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
