import { RoadAsset, MaintenanceType } from "@shared/schema";
import { predictCondition } from "./deterioration-model";

/**
 * Budget scenario object
 */
export interface BudgetScenario {
  name: string;
  totalBudget: number;
  preventiveMaintenance: number;
  minorRehabilitation: number;
  majorRehabilitation: number;
  reconstruction: number;
  projectedPCI: number;
}

/**
 * Optimization method options
 */
export type OptimizationMethod = 'impact' | 'cost' | 'benefit';

/**
 * Project data needed for prioritization
 */
interface ProjectData {
  roadAssetId: number;
  assetCondition: number;
  assetLength: number;
  maintenanceTypeId: number;
  conditionImprovement: number;
  costPerMile: number;
  cost: number;
  impactPerDollar: number;
}

/**
 * Calculate the impact of a budget allocation
 */
export function calculateBudgetImpact(
  roadAssets: RoadAsset[],
  maintenanceTypes: MaintenanceType[],
  allocation: {
    preventiveMaintenance: number;
    minorRehabilitation: number;
    majorRehabilitation: number;
    reconstruction: number;
  },
  optimizationMethod: OptimizationMethod = 'benefit'
): {
  projectedPCI: number;
  improvedAssets: number;
  totalCost: number;
  unaddressedAssets: number;
} {
  // Create a copy of the road assets to work with
  const assets = [...roadAssets];
  
  // Group maintenance types by category
  const maintenanceByCategory = {
    preventiveMaintenance: maintenanceTypes.filter(m => m.conditionImprovement <= 10),
    minorRehabilitation: maintenanceTypes.filter(m => m.conditionImprovement > 10 && m.conditionImprovement <= 20),
    majorRehabilitation: maintenanceTypes.filter(m => m.conditionImprovement > 20 && m.conditionImprovement < 90),
    reconstruction: maintenanceTypes.filter(m => m.conditionImprovement >= 90)
  };
  
  let improvedAssets = 0;
  let totalCost = 0;
  
  // For each category, prioritize assets and apply maintenance until budget is exhausted
  for (const [category, budget] of Object.entries(allocation)) {
    if (budget <= 0) continue;
    
    const availableMaintenanceTypes = maintenanceByCategory[category as keyof typeof maintenanceByCategory];
    if (!availableMaintenanceTypes.length) continue;
    
    // Calculate potential projects
    const potentialProjects: ProjectData[] = [];
    
    for (const asset of assets) {
      // Skip assets that are already in good condition if we're looking at major work
      if (category === 'reconstruction' && asset.condition > 40) continue;
      if (category === 'majorRehabilitation' && asset.condition > 60) continue;
      
      // Find the most appropriate maintenance type for this asset in this category
      for (const maintenanceType of availableMaintenanceTypes) {
        // Skip if maintenance type is not applicable for this condition
        if (maintenanceType.applicableMinCondition !== null && 
            asset.condition < maintenanceType.applicableMinCondition) continue;
        if (maintenanceType.applicableMaxCondition !== null && 
            asset.condition > maintenanceType.applicableMaxCondition) continue;
        
        const cost = maintenanceType.costPerMile * asset.length;
        const impactPerDollar = maintenanceType.conditionImprovement / cost;
        
        potentialProjects.push({
          roadAssetId: asset.id,
          assetCondition: asset.condition,
          assetLength: asset.length,
          maintenanceTypeId: maintenanceType.id,
          conditionImprovement: maintenanceType.conditionImprovement,
          costPerMile: maintenanceType.costPerMile,
          cost,
          impactPerDollar
        });
      }
    }
    
    // Sort projects by the selected method
    switch (optimizationMethod) {
      case 'impact':
        // Prioritize by highest condition improvement
        potentialProjects.sort((a, b) => b.conditionImprovement - a.conditionImprovement);
        break;
      case 'cost':
        // Prioritize by lowest cost
        potentialProjects.sort((a, b) => a.cost - b.cost);
        break;
      case 'benefit':
      default:
        // Prioritize by best impact per dollar
        potentialProjects.sort((a, b) => b.impactPerDollar - a.impactPerDollar);
        break;
    }
    
    // Allocate budget to projects
    let remainingBudget = budget;
    const selectedProjectIds = new Set<number>();
    
    for (const project of potentialProjects) {
      if (remainingBudget >= project.cost && !selectedProjectIds.has(project.roadAssetId)) {
        // Apply maintenance to the asset
        const assetIndex = assets.findIndex(a => a.id === project.roadAssetId);
        if (assetIndex !== -1) {
          // Update asset condition, but don't exceed 100
          assets[assetIndex] = {
            ...assets[assetIndex],
            condition: Math.min(100, assets[assetIndex].condition + project.conditionImprovement)
          };
          
          remainingBudget -= project.cost;
          totalCost += project.cost;
          improvedAssets++;
          selectedProjectIds.add(project.roadAssetId);
        }
      }
    }
  }
  
  // Calculate the new average PCI
  const projectedPCI = assets.reduce((sum, asset) => sum + asset.condition, 0) / assets.length;
  
  return {
    projectedPCI: Math.round(projectedPCI),
    improvedAssets,
    totalCost,
    unaddressedAssets: roadAssets.length - improvedAssets
  };
}

/**
 * Generate budget scenarios
 */
export function generateBudgetScenarios(
  currentBudget: number,
  roadAssets: RoadAsset[],
  maintenanceTypes: MaintenanceType[]
): BudgetScenario[] {
  // Current average PCI
  const currentPCI = roadAssets.reduce((sum, asset) => sum + asset.condition, 0) / roadAssets.length;
  
  // Default allocation percentages
  const defaultAllocation = {
    preventiveMaintenance: 0.33,
    minorRehabilitation: 0.26,
    majorRehabilitation: 0.21,
    reconstruction: 0.20
  };
  
  // Create the current scenario
  const current: BudgetScenario = {
    name: "Current",
    totalBudget: currentBudget,
    preventiveMaintenance: currentBudget * defaultAllocation.preventiveMaintenance,
    minorRehabilitation: currentBudget * defaultAllocation.minorRehabilitation,
    majorRehabilitation: currentBudget * defaultAllocation.majorRehabilitation,
    reconstruction: currentBudget * defaultAllocation.reconstruction,
    projectedPCI: Math.round(currentPCI)
  };
  
  // Create an optimized scenario (10% increase)
  const optimizedBudget = currentBudget * 1.10;
  
  // Adjust allocation to prioritize preventive maintenance
  const optimizedAllocation = {
    preventiveMaintenance: 0.40,
    minorRehabilitation: 0.30,
    majorRehabilitation: 0.20,
    reconstruction: 0.10
  };
  
  const optimizedImpact = calculateBudgetImpact(
    roadAssets,
    maintenanceTypes,
    {
      preventiveMaintenance: optimizedBudget * optimizedAllocation.preventiveMaintenance,
      minorRehabilitation: optimizedBudget * optimizedAllocation.minorRehabilitation,
      majorRehabilitation: optimizedBudget * optimizedAllocation.majorRehabilitation,
      reconstruction: optimizedBudget * optimizedAllocation.reconstruction
    },
    'benefit'
  );
  
  const optimized: BudgetScenario = {
    name: "Optimized",
    totalBudget: optimizedBudget,
    preventiveMaintenance: optimizedBudget * optimizedAllocation.preventiveMaintenance,
    minorRehabilitation: optimizedBudget * optimizedAllocation.minorRehabilitation,
    majorRehabilitation: optimizedBudget * optimizedAllocation.majorRehabilitation,
    reconstruction: optimizedBudget * optimizedAllocation.reconstruction,
    projectedPCI: optimizedImpact.projectedPCI
  };
  
  // Create a reduced scenario (25% decrease)
  const reducedBudget = currentBudget * 0.75;
  
  // Focus more on critical repairs in reduced budget
  const reducedAllocation = {
    preventiveMaintenance: 0.20,
    minorRehabilitation: 0.20,
    majorRehabilitation: 0.30,
    reconstruction: 0.30
  };
  
  const reducedImpact = calculateBudgetImpact(
    roadAssets,
    maintenanceTypes,
    {
      preventiveMaintenance: reducedBudget * reducedAllocation.preventiveMaintenance,
      minorRehabilitation: reducedBudget * reducedAllocation.minorRehabilitation,
      majorRehabilitation: reducedBudget * reducedAllocation.majorRehabilitation,
      reconstruction: reducedBudget * reducedAllocation.reconstruction
    },
    'impact' // Prioritize highest impact when budget is constrained
  );
  
  const reduced: BudgetScenario = {
    name: "Reduced",
    totalBudget: reducedBudget,
    preventiveMaintenance: reducedBudget * reducedAllocation.preventiveMaintenance,
    minorRehabilitation: reducedBudget * reducedAllocation.minorRehabilitation,
    majorRehabilitation: reducedBudget * reducedAllocation.majorRehabilitation,
    reconstruction: reducedBudget * reducedAllocation.reconstruction,
    projectedPCI: reducedImpact.projectedPCI
  };
  
  return [current, optimized, reduced];
}
