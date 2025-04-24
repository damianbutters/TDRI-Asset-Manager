import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BudgetItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface ScenarioItem {
  name: string;
  amount: string;
  pci: string;
  isActive?: boolean;
}

interface BudgetChartProps {
  title: string;
  subtitle?: string;
  data: BudgetItem[];
  scenarios?: ScenarioItem[];
  onScenarioClick?: (scenario: ScenarioItem) => void;
}

export default function BudgetChart({
  title,
  subtitle,
  data,
  scenarios,
  onScenarioClick
}: BudgetChartProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  return (
    <Card>
      <CardHeader className="p-4 border-b border-gray-200">
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="p-4">
        {data.map((item, index) => (
          <div key={index} className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-xs text-neutral-textSecondary ml-2">
                  {formatCurrency(item.amount)}
                </span>
              </div>
              <span className="text-sm">{formatPercentage(item.percentage)}</span>
            </div>
            <Progress 
              value={item.percentage} 
              className="h-2 bg-gray-200"
              indicatorClassName={item.color}
            />
          </div>
        ))}

        {scenarios && scenarios.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Budget Scenario Comparison</h4>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {scenarios.map((scenario, index) => (
                <div 
                  key={index}
                  className={`min-w-[100px] p-3 border rounded-lg cursor-pointer
                    ${scenario.isActive 
                      ? 'border-primary bg-blue-50' 
                      : 'border-gray-300 hover:border-primary hover:bg-blue-50/50'}`}
                  onClick={() => onScenarioClick && onScenarioClick(scenario)}
                >
                  <div className={`text-xs font-medium ${scenario.isActive ? 'text-primary' : ''}`}>
                    {scenario.name}
                  </div>
                  <div className="text-lg font-semibold mt-1">{scenario.amount}</div>
                  <div className="text-xs mt-1">5yr PCI: {scenario.pci}</div>
                </div>
              ))}
              <div 
                className="min-w-[100px] p-3 border border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50"
                onClick={() => onScenarioClick && onScenarioClick({ name: 'New', amount: '', pci: '' })}
              >
                <div className="text-sm text-neutral-textSecondary">+ New</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
