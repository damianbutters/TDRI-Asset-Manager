import { ConditionState } from "@shared/schema";

// Get color based on condition value (0-100)
export function getConditionColor(condition: number): string {
  if (condition >= 80) return "#107C10"; // Good - green
  if (condition >= 60) return "#FFB900"; // Fair - yellow
  if (condition >= 40) return "#D83B01"; // Poor - orange
  return "#A80000"; // Critical - red
}

// Get color based on moisture level
export function getMoistureColor(moisture: number | null): string {
  if (moisture === null) return "#CCCCCC"; // Gray for no data
  if (moisture > 25) return "#0E6AC7"; // Very wet - dark blue
  if (moisture > 15) return "#2088EF"; // Wet - medium blue
  if (moisture > 8) return "#69B5FF";  // Moderate - light blue
  return "#C7E4FF";                    // Dry - very light blue
}

// Get moisture badge color class based on moisture level
export function getMoistureBadgeColor(moisture: number | null): string {
  if (moisture === null) return "bg-gray-100 text-gray-800";
  if (moisture > 25) return "bg-blue-700 text-white";
  if (moisture > 15) return "bg-blue-500 text-white";
  if (moisture > 8) return "bg-blue-300 text-blue-900";
  return "bg-blue-100 text-blue-800";
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