import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  iconBgClass: string;
  trend?: {
    value: string;
    positive?: boolean;
    neutral?: boolean;
  };
  progress?: {
    value: number;
    color: string;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  iconBgClass,
  trend,
  progress,
  className
}: StatCardProps) {
  return (
    <Card className={cn("bg-white", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-neutral-textSecondary text-sm font-medium">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
          </div>
          <div className={cn("rounded-full p-2", iconBgClass)}>
            {icon}
          </div>
        </div>
        
        {progress && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`${progress.color} rounded-full h-2`} 
                style={{ width: `${progress.value}%` }}
              />
            </div>
          </div>
        )}
        
        {trend && (
          <div className="mt-4">
            <p 
              className={cn(
                "text-xs flex items-center",
                trend.positive && "text-status-success",
                trend.neutral && "text-neutral-textSecondary",
                !trend.positive && !trend.neutral && "text-status-error"
              )}
            >
              {trend.positive && (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
              {!trend.positive && !trend.neutral && (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
              {trend.value}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
