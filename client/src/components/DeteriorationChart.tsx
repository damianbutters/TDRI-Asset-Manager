import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { getConditionColor } from "@/lib/utils/color-utils";

interface YearlyProjection {
  year: number;
  good: number;
  fair: number;
  poor: number;
  critical: number;
}

interface TreatmentImpact {
  name: string;
  lifeExtension: string;
  conditionImprovement: string;
  costPerMile: string;
}

interface DeteriorationChartProps {
  title: string;
  subtitle?: string;
  data: YearlyProjection[];
  treatmentImpacts?: TreatmentImpact[];
}

export default function DeteriorationChart({
  title,
  subtitle,
  data,
  treatmentImpacts
}: DeteriorationChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const goodColor = getConditionColor(85);
  const fairColor = getConditionColor(65);
  const poorColor = getConditionColor(45);
  const criticalColor = getConditionColor(25);

  return (
    <Card>
      <CardHeader className="p-4 border-b border-gray-200">
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-48 flex items-end space-x-1 mb-1">
          {data.map((yearData, index) => (
            <div key={index} className="flex-1 flex flex-col items-stretch h-full">
              <div 
                className="flex-grow" 
                style={{ 
                  height: `${yearData.good}%`,
                  backgroundColor: goodColor
                }} 
              />
              <div 
                className="flex-grow" 
                style={{ 
                  height: `${yearData.fair}%`,
                  backgroundColor: fairColor
                }} 
              />
              <div 
                className="flex-grow" 
                style={{ 
                  height: `${yearData.poor}%`,
                  backgroundColor: poorColor
                }} 
              />
              <div 
                className="flex-grow" 
                style={{ 
                  height: `${yearData.critical}%`,
                  backgroundColor: criticalColor
                }} 
              />
            </div>
          ))}
        </div>
        
        <div className="flex justify-between text-xs text-neutral-textSecondary mt-1">
          {data.length > 0 && <span>{data[0].year}</span>}
          {data.length > 0 && data.length > 4 && <span>{data[4].year}</span>}
          {data.length > 0 && <span>{data[data.length - 1].year}</span>}
        </div>
        
        <div className="flex space-x-3 mt-2">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: goodColor }}></span>
            <span className="text-xs">Good</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: fairColor }}></span>
            <span className="text-xs">Fair</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: poorColor }}></span>
            <span className="text-xs">Poor</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: criticalColor }}></span>
            <span className="text-xs">Critical</span>
          </div>
        </div>

        {treatmentImpacts && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Treatment Impact Analysis</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-medium py-2">Treatment Type</th>
                    <th className="text-left font-medium py-2">Life Extension</th>
                    <th className="text-left font-medium py-2">Condition Improvement</th>
                    <th className="text-left font-medium py-2">Cost/Mile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {treatmentImpacts.map((treatment, index) => (
                    <tr key={index}>
                      <td className="py-2">{treatment.name}</td>
                      <td className="py-2">{treatment.lifeExtension}</td>
                      <td className="py-2">{treatment.conditionImprovement}</td>
                      <td className="py-2">{treatment.costPerMile}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
