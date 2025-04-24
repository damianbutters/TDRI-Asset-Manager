/**
 * Standard deterioration curve model for road pavements
 */
export interface DeteriorationParameters {
  initialCondition: number;
  ageInYears: number;
  surfaceType: string;
  trafficLevel: 'low' | 'medium' | 'high';
  climateImpact: 'low' | 'medium' | 'high';
}

/**
 * Maintenance impact parameters
 */
export interface MaintenanceImpact {
  conditionImprovement: number;  // How much the condition score improves
  lifeExtension: number;         // How many years of life are added
}

/**
 * Traffic level impact factors
 */
const TRAFFIC_FACTORS = {
  low: 0.85,
  medium: 1.0,
  high: 1.2
};

/**
 * Climate impact factors
 */
const CLIMATE_FACTORS = {
  low: 0.9,
  medium: 1.0,
  high: 1.15
};

/**
 * Base deterioration rates per surface type (condition points per year)
 */
const BASE_DETERIORATION_RATES: Record<string, number> = {
  Asphalt: 3,
  Concrete: 2,
  "Chip Seal": 4.5,
  Gravel: 6
};

/**
 * Calculate predicted condition after a given number of years
 */
export function predictCondition(params: DeteriorationParameters): number {
  const {
    initialCondition,
    ageInYears,
    surfaceType,
    trafficLevel,
    climateImpact
  } = params;
  
  // Get base rate or use a default
  const baseRate = BASE_DETERIORATION_RATES[surfaceType] || 3;
  
  // Apply modifiers
  const modifiedRate = baseRate * TRAFFIC_FACTORS[trafficLevel] * CLIMATE_FACTORS[climateImpact];
  
  // Calculate deterioration (exponential model)
  // Initial rapid deterioration followed by slower deterioration
  let deterioration = 0;
  
  // For the first 5 years, linear deterioration
  if (ageInYears <= 5) {
    deterioration = modifiedRate * ageInYears;
  } else {
    // Initial 5 year deterioration
    deterioration = modifiedRate * 5;
    
    // Remaining years use a slower rate
    const remainingYears = ageInYears - 5;
    const laterRate = modifiedRate * 0.8; // 80% of initial rate
    deterioration += laterRate * remainingYears;
  }
  
  // Ensure the condition doesn't go below 0
  return Math.max(0, initialCondition - deterioration);
}

/**
 * Apply maintenance impact to a road's condition
 */
export function applyMaintenance(
  currentCondition: number,
  impact: MaintenanceImpact
): number {
  // Apply the condition improvement, but cap at 100
  return Math.min(100, currentCondition + impact.conditionImprovement);
}

/**
 * Project condition for multiple years with optional maintenance
 */
export function projectCondition(
  params: DeteriorationParameters,
  years: number,
  maintenanceSchedule?: { year: number, impact: MaintenanceImpact }[]
): { year: number; condition: number }[] {
  const result: { year: number; condition: number }[] = [];
  let currentCondition = params.initialCondition;
  
  for (let year = 0; year <= years; year++) {
    // Apply maintenance if scheduled for this year
    if (maintenanceSchedule) {
      const maintenance = maintenanceSchedule.find(m => m.year === year);
      if (maintenance) {
        currentCondition = applyMaintenance(currentCondition, maintenance.impact);
      }
    }
    
    // Record the condition
    result.push({ year, condition: currentCondition });
    
    // Calculate deterioration for next year
    if (year < years) {
      currentCondition = predictCondition({
        ...params,
        initialCondition: currentCondition,
        ageInYears: 1 // Just for one year
      });
    }
  }
  
  return result;
}

/**
 * Get color-coded distribution by condition category
 */
export function getConditionDistribution(assets: { condition: number }[]): {
  good: number;
  fair: number;
  poor: number;
  critical: number;
} {
  if (!assets.length) {
    return { good: 0, fair: 0, poor: 0, critical: 0 };
  }
  
  const good = assets.filter(a => a.condition >= 80).length;
  const fair = assets.filter(a => a.condition >= 60 && a.condition < 80).length;
  const poor = assets.filter(a => a.condition >= 40 && a.condition < 60).length;
  const critical = assets.filter(a => a.condition < 40).length;
  
  const total = assets.length;
  
  return {
    good: Math.round((good / total) * 100),
    fair: Math.round((fair / total) * 100),
    poor: Math.round((poor / total) * 100),
    critical: Math.round((critical / total) * 100)
  };
}

/**
 * Forecast condition distribution over time
 */
export function forecastConditionDistribution(
  assets: Array<{ condition: number; surfaceType: string }>,
  years: number
): Array<{
  year: number;
  good: number;
  fair: number;
  poor: number;
  critical: number;
}> {
  const result = [];
  
  for (let year = 0; year <= years; year++) {
    // Project each asset's condition
    const projectedAssets = assets.map(asset => {
      const projected = predictCondition({
        initialCondition: asset.condition,
        ageInYears: year,
        surfaceType: asset.surfaceType,
        trafficLevel: 'medium',
        climateImpact: 'medium'
      });
      
      return { condition: projected };
    });
    
    // Get distribution
    const distribution = getConditionDistribution(projectedAssets);
    
    result.push({
      year: new Date().getFullYear() + year,
      ...distribution
    });
  }
  
  return result;
}
