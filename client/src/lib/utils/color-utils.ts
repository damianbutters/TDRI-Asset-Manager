import { ConditionState } from "@shared/schema";

// Get color based on condition value (0-100)
export function getConditionColor(condition: number): string {
  if (condition >= 80) return "#107C10"; // Good - green
  if (condition >= 60) return "#FFB900"; // Fair - yellow
  if (condition >= 40) return "#D83B01"; // Poor - orange
  return "#A80000"; // Critical - red
}

// Default global thresholds - these can be overridden by user settings
export const defaultMoistureThresholds = {
  low: 8,    // Below this: green
  medium: 15, // Below this: yellow, above: orange
  high: 25    // Above this: red
};

// Get color based on moisture level with global thresholds
export function getMoistureColor(
  moisture: number | null, 
  thresholds = defaultMoistureThresholds
): string {
  if (moisture === null) return "#CCCCCC"; // Gray for no data
  if (moisture > thresholds.high) return "#E60000"; // Very wet - red
  if (moisture > thresholds.medium) return "#FF8C00"; // Wet - orange
  if (moisture > thresholds.low) return "#FFCC00";  // Moderate - yellow
  return "#00CC00";                    // Dry - green
}

// Get color based on moisture level relative to road's min/max moisture (local)
export function getRelativeMoistureColor(
  moisture: number | null,
  minMoisture: number,
  maxMoisture: number
): string {
  if (moisture === null) return "#CCCCCC"; // Gray for no data
  
  // Normalize moisture value to 0-1 range based on road's min/max
  const range = maxMoisture - minMoisture;
  if (range === 0) return "#00CC00"; // If all readings are the same, return green
  
  const normalizedValue = (moisture - minMoisture) / range;
  
  // Traffic light scale: Green (low moisture) to Red (high moisture)
  if (normalizedValue > 0.75) return "#E60000"; // Red (highest quarter)
  if (normalizedValue > 0.5) return "#FF8C00";  // Orange (third quarter)
  if (normalizedValue > 0.25) return "#FFCC00"; // Yellow (second quarter)
  return "#00CC00"; // Green (lowest quarter)
}

// Get moisture badge color class based on moisture level
export function getMoistureBadgeColor(moisture: number | null): string {
  if (moisture === null) return "bg-gray-100 text-gray-800";
  if (moisture > 25) return "bg-red-600 text-white";
  if (moisture > 15) return "bg-orange-500 text-white";
  if (moisture > 8) return "bg-yellow-400 text-yellow-900";
  return "bg-green-500 text-white";
}

// Get badge color class based on condition state
export function getConditionBadgeColor(conditionState: ConditionState): string {
  switch (conditionState) {
    case "good":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "fair":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    case "poor":
      return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    case "critical":
      return "bg-red-100 text-red-800 hover:bg-red-200";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  }
}

// Get text color class based on condition state
export function getConditionTextColor(conditionState: ConditionState): string {
  switch (conditionState) {
    case "good":
      return "text-green-600";
    case "fair":
      return "text-yellow-600";
    case "poor":
      return "text-orange-600";
    case "critical":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

// Get background color class based on condition state
export function getConditionBgColor(conditionState: ConditionState): string {
  switch (conditionState) {
    case "good":
      return "bg-green-500";
    case "fair":
      return "bg-yellow-500";
    case "poor":
      return "bg-orange-500";
    case "critical":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

// Budget category colors for charts and visualizations
export const budgetColors = {
  preventiveMaintenance: "#4CAF50", // Green
  minorRehabilitation: "#2196F3",   // Blue
  majorRehabilitation: "#FF9800",   // Orange
  reconstruction: "#F44336",        // Red
  other: "#9E9E9E"                  // Gray
};