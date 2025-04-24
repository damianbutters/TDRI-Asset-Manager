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
import { Switch } from "@/components/ui/switch";
import DeteriorationChart from "@/components/DeteriorationChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  projectCondition, 
  DeteriorationParameters, 
  MaintenanceImpact,
  forecastConditionDistribution
} from "@/lib/utils/deterioration-model";
import {
  projectConditionWithAI,
  forecastConditionDistributionWithAI,
  MLPredictionParams
} from "@/lib/utils/ml-deterioration-model";
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
import { AlertTriangle } from "lucide-react";

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
  const [useAI, setUseAI] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [needsApiKey, setNeedsApiKey] = useState<boolean>(false);
  
  // Results of projections
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [maintenanceScenarios, setMaintenanceScenarios] = useState<any[]>([]);
  const [mlProjectionData, setMlProjectionData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  
  // Multiple asset selection for comparison
  const [selectedAssetsForComparison, setSelectedAssetsForComparison] = useState<string[]>([]);
  const [assetComparisonData, setAssetComparisonData] = useState<any[]>([]);
  
  // Global deterioration forecast data (for all assets)
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [mlForecastData, setMlForecastData] = useState<any[]>([]);

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

  // Generate ML forecast for network
  const generateMlForecast = async () => {
    if (roadAssets.length === 0) return;
    
    setIsLoading(true);
    try {
      const mlForecast = await forecastConditionDistributionWithAI(
        roadAssets.map(asset => ({
          condition: asset.condition,
          surfaceType: asset.surfaceType,
          moistureLevel: asset.moistureLevel
        })),
        10
      );
      setMlForecastData(mlForecast);
    } catch (error) {
      console.error("Failed to generate ML forecast:", error);
      setNeedsApiKey(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate ML projections for individual asset
  // Generate predictions for multiple assets
  const generateMultiAssetComparison = async () => {
    if (selectedAssetsForComparison.length === 0) return;
    
    setIsLoading(true);
    try {
      const selectedRoadAssets = roadAssets.filter(asset => 
        selectedAssetsForComparison.includes(asset.id.toString())
      );
      
      // Create comparison data for each asset
      const comparisonResults = await Promise.all(
        selectedRoadAssets.map(async (asset) => {
          // ML params include moisture data
          const mlParams: MLPredictionParams = {
            initialCondition: asset.condition,
            ageInYears: 0,
            surfaceType: asset.surfaceType,
            trafficLevel: 'medium', // Default to medium for comparison
            climateImpact: 'medium', // Default to medium for comparison
            moistureLevel: asset.moistureLevel
          };
          
          // Traditional params
          const traditionalParams: DeteriorationParameters = {
            initialCondition: asset.condition,
            ageInYears: 0,
            surfaceType: asset.surfaceType,
            trafficLevel: 'medium',
            climateImpact: 'medium'
          };
          
          // Get predictions
          const mlProjection = await projectConditionWithAI(mlParams, 10);
          const traditionalProjection = projectCondition(traditionalParams, 10);
          
          // Return the asset with both predictions at year 5 and year 10
          return {
            id: asset.id,
            name: asset.name,
            assetId: asset.assetId,
            initialCondition: asset.condition,
            surfaceType: asset.surfaceType,
            moistureLevel: asset.moistureLevel,
            traditionalYear5: traditionalProjection[5].condition,
            mlYear5: mlProjection[5].condition,
            traditionalYear10: traditionalProjection[10].condition,
            mlYear10: mlProjection[10].condition,
            mlImprovement: (
              ((mlProjection[10].condition - traditionalProjection[10].condition) / 
                traditionalProjection[10].condition) * 100
            ).toFixed(1)
          };
        })
      );
      
      setAssetComparisonData(comparisonResults);
    } catch (error) {
      console.error("Failed to generate multi-asset comparison:", error);
      setNeedsApiKey(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to run comparison when selected assets change
  useEffect(() => {
    if (useAI && selectedAssetsForComparison.length > 0) {
      generateMultiAssetComparison();
    }
  }, [selectedAssetsForComparison, useAI]);

  const generateMlProjection = async () => {
    if (!selectedAsset) return;
    
    setIsLoading(true);
    try {
      // ML params include moisture data
      const mlParams: MLPredictionParams = {
        initialCondition: selectedAsset.condition,
        ageInYears: 0,
        surfaceType: selectedAsset.surfaceType,
        trafficLevel,
        climateImpact,
        moistureLevel: selectedAsset.moistureLevel
      };
      
      // Project without maintenance using ML
      const mlProjection = await projectConditionWithAI(mlParams, projectionYears);
      setMlProjectionData(mlProjection);
      
      // Generate comparison data between traditional and ML models
      const traditionalParams: DeteriorationParameters = {
        initialCondition: selectedAsset.condition,
        ageInYears: 0,
        surfaceType: selectedAsset.surfaceType,
        trafficLevel,
        climateImpact
      };
      
      const traditionalProjection = projectCondition(traditionalParams, projectionYears);
      
      // Prepare comparison data
      const comparison = [];
      for (let i = 0; i <= projectionYears; i++) {
        comparison.push({
          year: i,
          traditional: traditionalProjection[i].condition,
          ml: mlProjection[i].condition
        });
      }
      
      setComparisonData(comparison);
      
      // Generate maintenance scenarios if maintenance type selected
      if (selectedMaintenance) {
        // Base scenario with no maintenance (ML)
        const noMaintenance = await projectConditionWithAI(mlParams, projectionYears);
        
        // Scenario with maintenance at specified year
        const maintenanceImpact: MaintenanceImpact = {
          conditionImprovement: selectedMaintenance.conditionImprovement,
          lifeExtension: selectedMaintenance.lifespanExtension
        };
        
        const singleMaintenance = await projectConditionWithAI(
          mlParams, 
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
        
        const regularMaintenance = await projectConditionWithAI(
          mlParams, 
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
    } catch (error) {
      console.error("Failed to generate ML projection:", error);
      setNeedsApiKey(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate data for deterioration model chart
  useEffect(() => {
    // Generate global forecast for all assets with traditional model
    if (roadAssets.length > 0) {
      const forecast = forecastConditionDistribution(
        roadAssets.map(asset => ({ 
          condition: asset.condition, 
          surfaceType: asset.surfaceType 
        })),
        10
      );
      setForecastData(forecast);
      
      // If AI is enabled, also generate ML forecast
      if (useAI) {
        generateMlForecast();
      }
    }
    
    // Generate individual asset projection if selected
    if (selectedAsset) {
      if (useAI) {
        // Use ML-based prediction if AI is enabled
        generateMlProjection();
      } else {
        // Use traditional prediction model
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
    }
  }, [selectedAssetId, selectedMaintenanceId, trafficLevel, climateImpact, projectionYears, maintenanceYear, roadAssets, maintenanceTypes, useAI]);

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
      {needsApiKey && (
        <Alert className="mb-6 border-yellow-500 bg-yellow-50">
          <AlertTitle className="text-yellow-800">OpenAI API Key Required</AlertTitle>
          <AlertDescription className="text-yellow-700">
            To use machine learning-based prediction models, an OpenAI API key is required. Please contact your administrator to set up the API key.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-end space-x-2">
        <div className="flex items-center space-x-2">
          <Switch 
            id="ai-mode" 
            checked={useAI} 
            onCheckedChange={setUseAI} 
          />
          <Label htmlFor="ai-mode" className="cursor-pointer">
            Use Machine Learning Models
          </Label>
        </div>
      </div>

      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forecast">Network Forecast</TabsTrigger>
          <TabsTrigger value="asset">Asset Modeling</TabsTrigger>
          <TabsTrigger value="comparison">Model Comparison</TabsTrigger>
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

        {/* Model Comparison Tab */}
        <TabsContent value="comparison">
          <div className="grid grid-cols-1 gap-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="h-[400px] flex items-center justify-center flex-col gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    <p className="text-neutral-textSecondary">Training and loading machine learning models...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Road Asset Selection Card */}
                <Card>
                  <CardHeader className="p-4 border-b border-gray-200">
                    <CardTitle>Road Asset Selection</CardTitle>
                    <CardDescription>Select roads to compare traditional vs. ML-based deterioration predictions</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Select by Road Name</h3>
                        <div className="border rounded-md p-3 bg-white max-h-[200px] overflow-y-auto">
                          {roadAssets.map(asset => (
                            <div key={asset.id} className="flex items-center mb-2">
                              <input
                                type="checkbox"
                                id={`asset-${asset.id}`}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={selectedAssetsForComparison.includes(asset.id.toString())}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAssetsForComparison([...selectedAssetsForComparison, asset.id.toString()]);
                                  } else {
                                    setSelectedAssetsForComparison(
                                      selectedAssetsForComparison.filter(id => id !== asset.id.toString())
                                    );
                                  }
                                }}
                              />
                              <label htmlFor={`asset-${asset.id}`} className="ml-2 block text-sm">
                                {asset.name} ({asset.assetId})
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Quick Actions</h3>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedAssetsForComparison(
                                roadAssets
                                  .filter(a => a.surfaceType === 'Asphalt')
                                  .map(a => a.id.toString())
                              )}
                            >
                              Select Asphalt Roads
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedAssetsForComparison(
                                roadAssets
                                  .filter(a => a.surfaceType === 'Concrete')
                                  .map(a => a.id.toString())
                              )}
                            >
                              Select Concrete Roads
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedAssetsForComparison(
                                roadAssets
                                  .filter(a => a.condition < 60)
                                  .map(a => a.id.toString())
                              )}
                            >
                              Select Poor Condition
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedAssetsForComparison([])}
                            >
                              Clear Selection
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {selectedAssetsForComparison.length} road{selectedAssetsForComparison.length !== 1 ? 's' : ''} selected
                        </span>
                        {!useAI && selectedAssetsForComparison.length > 0 && (
                          <div className="text-sm text-amber-600">
                            <span className="flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Enable AI mode to generate comparisons
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Model Comparison Results */}
                {selectedAssetsForComparison.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 border-b border-gray-200">
                      <CardTitle>Multi-Asset Deterioration Analysis</CardTitle>
                      <CardDescription>Comparison of deterioration predictions across selected roads</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      {assetComparisonData.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left font-medium py-2">Road Name</th>
                                <th className="text-left font-medium py-2">Current PCI</th>
                                <th className="text-left font-medium py-2">Surface Type</th>
                                <th className="text-left font-medium py-2">Moisture Level</th>
                                <th className="text-center font-medium py-2 bg-blue-50" colSpan={2}>5-Year Prediction</th>
                                <th className="text-center font-medium py-2 bg-purple-50" colSpan={2}>10-Year Prediction</th>
                                <th className="text-center font-medium py-2">ML Improvement</th>
                              </tr>
                              <tr className="border-b">
                                <th className="text-left font-medium py-2"></th>
                                <th className="text-left font-medium py-2"></th>
                                <th className="text-left font-medium py-2"></th>
                                <th className="text-left font-medium py-2"></th>
                                <th className="text-center font-medium py-2 bg-blue-50">Traditional</th>
                                <th className="text-center font-medium py-2 bg-blue-50">ML Model</th>
                                <th className="text-center font-medium py-2 bg-purple-50">Traditional</th>
                                <th className="text-center font-medium py-2 bg-purple-50">ML Model</th>
                                <th className="text-center font-medium py-2">%</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {assetComparisonData.map((asset) => (
                                <tr key={asset.id}>
                                  <td className="py-2">{asset.name}</td>
                                  <td className="py-2">{asset.initialCondition.toFixed(1)}</td>
                                  <td className="py-2">{asset.surfaceType}</td>
                                  <td className="py-2">{asset.moistureLevel !== null ? `${asset.moistureLevel}%` : 'N/A'}</td>
                                  <td className="py-2 text-center bg-blue-50">{asset.traditionalYear5.toFixed(1)}</td>
                                  <td className="py-2 text-center bg-blue-50 font-medium">{asset.mlYear5.toFixed(1)}</td>
                                  <td className="py-2 text-center bg-purple-50">{asset.traditionalYear10.toFixed(1)}</td>
                                  <td className="py-2 text-center bg-purple-50 font-medium">{asset.mlYear10.toFixed(1)}</td>
                                  <td className={`py-2 text-center font-medium ${parseFloat(asset.mlImprovement) > 0 ? 'text-green-600' : parseFloat(asset.mlImprovement) < 0 ? 'text-red-600' : ''}`}>
                                    {asset.mlImprovement}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center">
                          <p className="text-neutral-textSecondary">
                            {!useAI
                              ? "Enable AI mode to generate model comparisons"
                              : "Select one or more roads to see prediction results"}
                          </p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-gray-50 p-4 border-t border-gray-200">
                      <div className="text-sm text-neutral-textSecondary">
                        <p>This analysis compares the traditional and machine learning deterioration models for the selected roads, showing how moisture data influences predictions.</p>
                      </div>
                    </CardFooter>
                  </Card>
                )}

                {/* Model Comparison Chart */}
                <Card>
                  <CardHeader className="p-4 border-b border-gray-200">
                    <CardTitle>Single Asset Model Comparison</CardTitle>
                    <CardDescription>Compare traditional vs. machine learning deterioration models</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <Label htmlFor="singleAssetCompare">Select a single road for detailed comparison</Label>
                      <Select
                        value={selectedAssetId}
                        onValueChange={setSelectedAssetId}
                      >
                        <SelectTrigger id="singleAssetCompare" className="w-full mt-1">
                          <SelectValue placeholder="Select a road asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {roadAssets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id.toString()}>
                              {asset.name} ({asset.assetId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  
                    {selectedAsset && comparisonData.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={comparisonData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 10,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="year" 
                              label={{ value: 'Years', position: 'insideBottomRight', offset: -10 }} 
                            />
                            <YAxis 
                              label={{ value: 'PCI', angle: -90, position: 'insideLeft' }}
                              domain={[0, 100]} 
                            />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="traditional"
                              name="Traditional Model"
                              stroke="#2563eb"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="ml"
                              name="ML Model"
                              stroke="#7c3aed"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center">
                        <p className="text-neutral-textSecondary">
                          {selectedAsset 
                            ? "Enable AI mode and select an asset to see model comparison" 
                            : "Select a road asset to compare deterioration models"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-gray-50 p-4 border-t border-gray-200">
                    <div className="text-sm text-neutral-textSecondary">
                      <p>This chart compares traditional deterioration modeling with machine learning predictions that incorporate moisture data for more accurate forecasting.</p>
                    </div>
                  </CardFooter>
                </Card>

                {/* ML Model Features */}
                <Card>
                  <CardHeader className="p-4 border-b border-gray-200">
                    <CardTitle>Machine Learning Model Features</CardTitle>
                    <CardDescription>Enhanced prediction capabilities</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="font-medium text-base mb-2">Traditional Model</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Fixed deterioration curves based on surface type</li>
                          <li>Simple traffic and climate impact factors</li>
                          <li>Linear and exponential decay patterns</li>
                          <li>No moisture data integration</li>
                          <li>Deterministic outcomes</li>
                        </ul>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-purple-50">
                        <h3 className="font-medium text-base mb-2">Machine Learning Model</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Dynamic deterioration prediction</li>
                          <li>Incorporates moisture level data</li>
                          <li>Learns from historical performance patterns</li>
                          <li>Considers multiple environmental factors</li>
                          <li>Adaptive to changing conditions</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
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
