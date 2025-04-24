import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getConditionColor } from "@/lib/utils/color-utils";
import { useState, useEffect } from "react";

interface ConditionData {
  label: string;
  range: string;
  percentage: number;
  color: string;
}

interface TrendData {
  month: string;
  value: number;
}

interface ConditionChartProps {
  title?: string;
  data: ConditionData[];
  trendData?: TrendData[];
}

export default function ConditionChart({ 
  title = "Condition Distribution", 
  data, 
  trendData 
}: ConditionChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Card>
      <CardHeader className="p-4 border-b border-gray-200">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          {data.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="text-sm">{item.label} ({item.range})</span>
                <span className="text-sm">{item.percentage}%</span>
              </div>
              <Progress 
                value={item.percentage} 
                className="h-2.5 bg-gray-200"
                indicatorClassName={`${item.color}`}
              />
            </div>
          ))}
        </div>

        {trendData && (
          <div className="mt-6 text-center">
            <h4 className="text-sm font-medium mb-2">Condition Score Trend</h4>
            <p className="text-xs text-neutral-textSecondary mb-2">Last 12 months</p>
            <div className="h-16 flex items-end justify-between px-2">
              {trendData.map((item, index) => (
                <div 
                  key={index}
                  className="w-1 bg-primary rounded-t"
                  style={{ height: `${item.value}%` }}
                  title={`${item.month}: ${item.value}%`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-neutral-textSecondary mt-1">
              {trendData.length > 0 && <span>{trendData[0].month}</span>}
              {trendData.length > 0 && trendData.length > 6 && <span>{trendData[6].month}</span>}
              {trendData.length > 0 && <span>{trendData[trendData.length - 1].month}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
