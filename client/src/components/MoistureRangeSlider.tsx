import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { defaultMoistureThresholds } from "@/lib/utils/color-utils";
import { AnimatePresence, motion } from "framer-motion";

interface MoistureThresholds {
  low: number;
  medium: number;
  high: number;
}

interface MoistureRangeSliderProps {
  thresholds: MoistureThresholds;
  onChange: (thresholds: MoistureThresholds) => void;
  maxValue?: number;
}

// Color function for various moisture levels
const getMoistureColorForValue = (value: number, thresholds: MoistureThresholds): string => {
  if (value > thresholds.high) return "#E60000"; // Very wet - red
  if (value > thresholds.medium) return "#FF8C00"; // Wet - orange
  if (value > thresholds.low) return "#FFCC00"; // Moderate - yellow
  return "#00CC00"; // Dry - green
};

export default function MoistureRangeSlider({
  thresholds = defaultMoistureThresholds,
  onChange,
  maxValue = 40
}: MoistureRangeSliderProps) {
  // Convert the thresholds to an array for the slider
  const [values, setValues] = useState<number[]>([
    thresholds.low,
    thresholds.medium,
    thresholds.high
  ]);
  
  // Threshold labels with colors
  const thresholdLabels = [
    { name: "Low", color: "#00CC00" },
    { name: "Medium", color: "#FFCC00" },
    { name: "High", color: "#FF8C00" },
    { name: "Very High", color: "#E60000" }
  ];
  
  // Handle slider value changes with animation
  const handleSliderChange = (newValues: number[]) => {
    setValues(newValues);
    
    // Ensure values are ordered correctly (low < medium < high)
    const sortedValues = [...newValues].sort((a, b) => a - b);
    
    onChange({
      low: sortedValues[0],
      medium: sortedValues[1],
      high: sortedValues[2]
    });
  };
  
  // Update values when thresholds prop changes
  useEffect(() => {
    setValues([thresholds.low, thresholds.medium, thresholds.high]);
  }, [thresholds]);
  
  // Calculate positions for labels based on slider values
  const getLabelPosition = (index: number) => {
    if (index === 0) return 0; // First label at start
    if (index === 3) return 100; // Last label at end
    
    // Middle labels based on threshold values
    return (values[index - 1] / maxValue) * 100;
  };
  
  return (
    <div className="w-full space-y-4">
      {/* Color gradient background behind slider to visualize thresholds */}
      <div className="relative h-2 w-full rounded-full overflow-hidden mb-6">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, 
              #00CC00 0%, 
              #00CC00 ${(values[0] / maxValue) * 100}%, 
              #FFCC00 ${(values[0] / maxValue) * 100}%, 
              #FFCC00 ${(values[1] / maxValue) * 100}%, 
              #FF8C00 ${(values[1] / maxValue) * 100}%, 
              #FF8C00 ${(values[2] / maxValue) * 100}%, 
              #E60000 ${(values[2] / maxValue) * 100}%, 
              #E60000 100%)`
          }}
        />
      </div>
      
      {/* Main slider with multiple thumbs */}
      <Slider
        className="mt-6"
        defaultValue={values}
        value={values}
        max={maxValue}
        step={0.1}
        onValueChange={handleSliderChange}
      />
      
      {/* Animated value displays */}
      <div className="relative h-8 w-full">
        {values.map((value, index) => (
          <motion.div
            key={`thumb-value-${index}`}
            className="absolute -translate-x-1/2 bg-white border border-gray-200 rounded px-2 py-0.5 text-xs font-medium shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              left: `${(value / maxValue) * 100}%`,
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25
            }}
          >
            {value.toFixed(1)}%
          </motion.div>
        ))}
      </div>
      
      {/* Threshold category labels */}
      <div className="flex justify-between mt-8 relative">
        {thresholdLabels.map((label, index) => (
          <motion.div
            key={`label-${index}`}
            className="text-xs font-medium absolute -translate-x-1/2"
            style={{ color: label.color }}
            animate={{
              left: `${getLabelPosition(index)}%`
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25
            }}
          >
            {label.name}
          </motion.div>
        ))}
      </div>
    </div>
  );
}