import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MonthlyRainfall {
  month: string; // "YYYY-MM" format
  rainfallInches: number;
}

interface RainfallData {
  roadAssetId: number;
  roadName: string;
  weatherStationId: string | null;
  weatherStationName: string | null;
  lastRainfallUpdate: string | null;
  rainfallData: MonthlyRainfall[];
}

interface RainfallChartProps {
  roadAssetId: number;
}

export default function RainfallChart({ roadAssetId }: RainfallChartProps) {
  const [rainfallData, setRainfallData] = useState<RainfallData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const { toast } = useToast();

  // Format month names for chart display
  const formatMonthLabel = (month: string) => {
    try {
      const [year, monthNum] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      return date.toLocaleString('default', { month: 'short' });
    } catch (e) {
      return month;
    }
  };

  // Prepare data for chart
  const prepareChartData = (data: MonthlyRainfall[]) => {
    return data.map(item => ({
      ...item,
      month: formatMonthLabel(item.month),
      rainfallInches: Number(item.rainfallInches.toFixed(2))
    }));
  };

  // Fetch rainfall data
  const fetchRainfallData = async () => {
    if (!roadAssetId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/road-assets/${roadAssetId}/rainfall`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rainfall data');
      }
      
      const data = await response.json();
      setRainfallData(data);
    } catch (error) {
      console.error('Error fetching rainfall data:', error);
      toast({
        title: "Error",
        description: "Failed to load rainfall data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update rainfall data
  const updateRainfallData = async () => {
    if (!roadAssetId) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/road-assets/${roadAssetId}/update-rainfall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to update rainfall data');
      }
      
      // Refetch the data after update
      await fetchRainfallData();
      
      toast({
        title: "Success",
        description: "Rainfall data updated successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating rainfall data:', error);
      toast({
        title: "Error",
        description: "Failed to update rainfall data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchRainfallData();
  }, [roadAssetId]);

  if (isLoading) {
    return (
      <Card className="w-full h-80 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading rainfall data...</p>
      </Card>
    );
  }

  if (!rainfallData) {
    return (
      <Card className="w-full h-80">
        <CardHeader>
          <CardTitle>Rainfall Data</CardTitle>
          <CardDescription>No rainfall data available</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">No rainfall data available for this road asset.</p>
          <Button onClick={updateRainfallData} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Fetch Rainfall Data'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Monthly Rainfall History</CardTitle>
            <CardDescription>
              {rainfallData.weatherStationName ? 
                `Data from ${rainfallData.weatherStationName} weather station` : 
                'Weather data for past 12 months'}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={updateRainfallData} 
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Data'
            )}
          </Button>
        </div>
        {rainfallData.lastRainfallUpdate && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {new Date(rainfallData.lastRainfallUpdate).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={prepareChartData(rainfallData.rainfallData)}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis 
                label={{ 
                  value: 'Rainfall (inches)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' } 
                }} 
              />
              <Tooltip formatter={(value) => [`${value} inches`, 'Rainfall']} />
              <Legend />
              <Bar 
                dataKey="rainfallInches" 
                name="Rainfall" 
                fill="#4681f4" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}