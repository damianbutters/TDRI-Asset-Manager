import * as tf from '@tensorflow/tfjs';
import OpenAI from 'openai';
import { DeteriorationParameters, MaintenanceImpact } from './deterioration-model';

// Initialize OpenAI client
let openai: OpenAI | null = null;

// Check if OpenAI API key is available
const initOpenAI = () => {
  if (!openai && typeof window !== 'undefined') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    }
  }
  return !!openai;
};

// TensorFlow model for deterioration prediction
let tfModel: tf.LayersModel | null = null;

/**
 * Interface for ML model training data
 */
export interface MLTrainingData {
  initialCondition: number;
  surfaceType: string;
  ageInYears: number;
  trafficLevel: string;
  climateImpact: string;
  moistureLevel: number | null;
  resultingCondition: number;
}

/**
 * Interface for ML model prediction parameters
 */
export interface MLPredictionParams extends DeteriorationParameters {
  moistureLevel: number | null;
}

/**
 * Create and train a TensorFlow model for deterioration prediction
 */
export async function trainTensorFlowModel(trainingData: MLTrainingData[]): Promise<boolean> {
  try {
    // Convert categorical features to numerical
    const surfaceTypes = [...new Set(trainingData.map(d => d.surfaceType))];
    const trafficLevels = ['low', 'medium', 'high'];
    const climateImpacts = ['low', 'medium', 'high'];
    
    // Prepare training data
    const xs = trainingData.map(d => {
      // One-hot encode surface type
      const surfaceTypeEncoded = surfaceTypes.map(st => st === d.surfaceType ? 1 : 0);
      
      // One-hot encode traffic level
      const trafficLevelEncoded = trafficLevels.map(tl => tl === d.trafficLevel ? 1 : 0);
      
      // One-hot encode climate impact
      const climateImpactEncoded = climateImpacts.map(ci => ci === d.climateImpact ? 1 : 0);
      
      // Return features array
      return [
        d.initialCondition / 100, // Normalize condition to [0,1]
        d.ageInYears / 30, // Normalize age (assuming max age of 30 years)
        ...surfaceTypeEncoded,
        ...trafficLevelEncoded,
        ...climateImpactEncoded,
        d.moistureLevel ? d.moistureLevel / 100 : 0 // Normalize moisture or use 0 if null
      ];
    });
    
    // Prepare labels (resultingCondition)
    const ys = trainingData.map(d => d.resultingCondition / 100); // Normalize to [0,1]
    
    // Create model
    const model = tf.sequential();
    
    // Input shape: initial condition, age, surface types, traffic levels, climate impacts, moisture
    const inputShape = [1 + 1 + surfaceTypes.length + trafficLevels.length + climateImpacts.length + 1];
    
    // Add layers
    model.add(tf.layers.dense({
      inputShape,
      units: 16,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid' // Output in range [0,1]
    }));
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });
    
    // Train model
    await model.fit(
      tf.tensor2d(xs),
      tf.tensor1d(ys),
      {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
          }
        }
      }
    );
    
    // Save the model
    tfModel = model;
    return true;
  } catch (error) {
    console.error("Failed to train TensorFlow model:", error);
    return false;
  }
}

/**
 * Predict road condition using TensorFlow model
 */
export async function predictWithTensorFlow(params: MLPredictionParams): Promise<number> {
  if (!tfModel) {
    console.error("TensorFlow model not trained yet");
    return -1;
  }
  
  try {
    // Convert categorical features to numerical (same as in training)
    const surfaceTypes = ['Asphalt', 'Concrete', 'Chip Seal', 'Gravel'];
    const trafficLevels = ['low', 'medium', 'high'];
    const climateImpacts = ['low', 'medium', 'high'];
    
    // One-hot encode surface type
    const surfaceTypeEncoded = surfaceTypes.map(st => st === params.surfaceType ? 1 : 0);
    
    // One-hot encode traffic level
    const trafficLevelEncoded = trafficLevels.map(tl => tl === params.trafficLevel ? 1 : 0);
    
    // One-hot encode climate impact
    const climateImpactEncoded = climateImpacts.map(ci => ci === params.climateImpact ? 1 : 0);
    
    // Create input tensor
    const input = tf.tensor2d([
      [
        params.initialCondition / 100,
        params.ageInYears / 30,
        ...surfaceTypeEncoded,
        ...trafficLevelEncoded,
        ...climateImpactEncoded,
        params.moistureLevel ? params.moistureLevel / 100 : 0
      ]
    ]);
    
    // Make prediction
    const prediction = tfModel.predict(input) as tf.Tensor;
    const value = prediction.dataSync()[0] * 100; // Denormalize to condition scale
    
    // Clean up
    input.dispose();
    prediction.dispose();
    
    return Math.max(0, Math.min(100, value)); // Clamp to [0,100]
  } catch (error) {
    console.error("Failed to predict with TensorFlow model:", error);
    return -1;
  }
}

/**
 * Generate synthetic training data for the model
 */
export function generateTrainingData(count: number = 1000): MLTrainingData[] {
  const surfaceTypes = ['Asphalt', 'Concrete', 'Chip Seal', 'Gravel'];
  const trafficLevels = ['low', 'medium', 'high'];
  const climateImpacts = ['low', 'medium', 'high'];
  
  // Traffic and climate factors (same as in basic model)
  const trafficFactors = { low: 0.85, medium: 1.0, high: 1.2 };
  const climateFactors = { low: 0.9, medium: 1.0, high: 1.15 };
  
  // Deterioration rates per surface type
  const deteriorationRates = {
    'Asphalt': 3,
    'Concrete': 2,
    'Chip Seal': 4.5,
    'Gravel': 6
  };
  
  // Generate data points
  const data: MLTrainingData[] = [];
  
  for (let i = 0; i < count; i++) {
    // Random initial condition (50-100)
    const initialCondition = Math.round(Math.random() * 50 + 50);
    
    // Random surface type
    const surfaceTypeIndex = Math.floor(Math.random() * surfaceTypes.length);
    const surfaceType = surfaceTypes[surfaceTypeIndex];
    
    // Random age (0-20 years)
    const ageInYears = Math.floor(Math.random() * 20);
    
    // Random traffic level
    const trafficIndex = Math.floor(Math.random() * trafficLevels.length);
    const trafficLevel = trafficLevels[trafficIndex];
    
    // Random climate impact
    const climateIndex = Math.floor(Math.random() * climateImpacts.length);
    const climateImpact = climateImpacts[climateIndex] as 'low' | 'medium' | 'high';
    
    // Random moisture level (0-100 or null)
    const hasMoisture = Math.random() > 0.1; // 90% chance of having moisture data
    const moistureLevel = hasMoisture ? Math.round(Math.random() * 100) : null;
    
    // Calculate resulting condition
    const baseRate = deteriorationRates[surfaceType] || 3;
    let modifiedRate = baseRate * trafficFactors[trafficLevel] * climateFactors[climateImpact];
    
    // Moisture impact: higher moisture accelerates deterioration
    if (moistureLevel !== null) {
      // Moisture impact factor (1.0 to 1.5 for moisture 0-100%)
      const moistureFactor = 1 + (moistureLevel / 200); // 0.5 impact at 100% moisture
      modifiedRate *= moistureFactor;
    }
    
    // Apply deterioration
    let deterioration = 0;
    if (ageInYears <= 5) {
      deterioration = modifiedRate * ageInYears;
    } else {
      deterioration = modifiedRate * 5; // First 5 years
      const remainingYears = ageInYears - 5;
      const laterRate = modifiedRate * 0.8; // 80% of initial rate
      deterioration += laterRate * remainingYears;
    }
    
    // Calculate resulting condition
    const resultingCondition = Math.max(0, initialCondition - deterioration);
    
    // Add some noise to make it more realistic (+/- 5%)
    const noise = (Math.random() - 0.5) * 10;
    const finalCondition = Math.max(0, Math.min(100, resultingCondition + noise));
    
    // Add to dataset
    data.push({
      initialCondition,
      surfaceType,
      ageInYears,
      trafficLevel,
      climateImpact,
      moistureLevel,
      resultingCondition: Math.round(finalCondition)
    });
  }
  
  return data;
}

/**
 * Predict road deterioration using AI
 * If OpenAI is available, it will use that, otherwise falls back to TensorFlow
 */
export async function predictWithAI(params: MLPredictionParams): Promise<number> {
  // Try to use OpenAI if available
  if (initOpenAI() && openai) {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert civil engineer specializing in pavement deterioration modeling. 
            Your task is to predict the condition of a road pavement based on its characteristics and age.
            Use your knowledge of how different factors affect pavement deterioration.
            Roads are rated on a PCI (Pavement Condition Index) scale from 0-100, where 100 is perfect condition and 0 is failed.
            Respond with ONLY a number representing the predicted condition (0-100).`
          },
          {
            role: "user",
            content: `Predict the road condition with these parameters:
            - Initial condition: ${params.initialCondition}/100
            - Surface type: ${params.surfaceType}
            - Age: ${params.ageInYears} years
            - Traffic level: ${params.trafficLevel}
            - Climate impact: ${params.climateImpact}
            - Moisture level: ${params.moistureLevel !== null ? `${params.moistureLevel}%` : 'Unknown'}
            
            Consider that:
            - Higher traffic accelerates deterioration
            - Harsh climate accelerates deterioration
            - Different surface types deteriorate at different rates (Concrete is most durable, then Asphalt, then Chip Seal, then Gravel)
            - Higher moisture levels accelerate deterioration
            - Deterioration is typically faster in early years, then slows down
            `
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent, deterministic results
        max_tokens: 10
      });

      // Parse the response to get the predicted condition
      const prediction = parseFloat(response.choices[0].message.content.trim());
      
      if (!isNaN(prediction) && prediction >= 0 && prediction <= 100) {
        return prediction;
      } else {
        console.error("OpenAI returned invalid prediction:", response.choices[0].message.content);
        // Fall back to TensorFlow
      }
    } catch (error) {
      console.error("OpenAI prediction failed:", error);
      // Fall back to TensorFlow
    }
  }
  
  // If OpenAI fails or is not available, use TensorFlow
  try {
    return await predictWithTensorFlow(params);
  } catch (error) {
    console.error("TensorFlow prediction failed:", error);
    // If both fail, return a negative value to indicate error
    return -1;
  }
}

/**
 * Project road condition with AI prediction, including maintenance
 */
export async function projectConditionWithAI(
  params: MLPredictionParams,
  years: number,
  maintenanceSchedule?: { year: number, impact: MaintenanceImpact }[]
): Promise<{ year: number; condition: number; isAfterMaintenance?: boolean }[]> {
  const result: { year: number; condition: number; isAfterMaintenance?: boolean }[] = [];
  let currentCondition = params.initialCondition;
  
  // Generate initial training data if needed
  if (!tfModel) {
    const trainingData = generateTrainingData();
    await trainTensorFlowModel(trainingData);
  }
  
  for (let year = 0; year <= years; year++) {
    // Apply maintenance if scheduled for this year
    let isAfterMaintenance = false;
    if (maintenanceSchedule) {
      const maintenance = maintenanceSchedule.find(m => m.year === year);
      if (maintenance) {
        currentCondition = Math.min(100, currentCondition + maintenance.impact.conditionImprovement);
        isAfterMaintenance = true;
      }
    }
    
    // Record the condition
    result.push({ year, condition: currentCondition, isAfterMaintenance });
    
    // Predict next year's condition
    if (year < years) {
      const predictionParams: MLPredictionParams = {
        ...params,
        initialCondition: currentCondition,
        ageInYears: year + 1
      };
      
      // Try to predict with AI
      const predictedCondition = await predictWithAI(predictionParams);
      
      // If AI prediction fails, use a fallback method
      if (predictedCondition < 0) {
        // Simple fallback: decrease by 2-5% depending on surface type
        const deteriorationRate = 
          predictionParams.surfaceType === 'Concrete' ? 2 :
          predictionParams.surfaceType === 'Asphalt' ? 3 :
          predictionParams.surfaceType === 'Chip Seal' ? 4 : 5;
        
        currentCondition = Math.max(0, currentCondition - deteriorationRate);
      } else {
        currentCondition = predictedCondition;
      }
    }
  }
  
  return result;
}

/**
 * Forecast condition distribution with ML predictions
 */
export async function forecastConditionDistributionWithAI(
  assets: Array<{ 
    condition: number; 
    surfaceType: string;
    moistureLevel: number | null;
  }>,
  years: number
): Promise<Array<{
  year: number;
  good: number;
  fair: number;
  poor: number;
  critical: number;
}>> {
  const result = [];
  
  // Generate initial training data if needed
  if (!tfModel) {
    const trainingData = generateTrainingData();
    await trainTensorFlowModel(trainingData);
  }
  
  for (let year = 0; year <= years; year++) {
    // Track assets in each condition category
    let good = 0, fair = 0, poor = 0, critical = 0;
    
    // Process each asset in parallel
    const assetPromises = assets.map(async (asset) => {
      const predictionParams: MLPredictionParams = {
        initialCondition: asset.condition,
        ageInYears: year,
        surfaceType: asset.surfaceType,
        trafficLevel: 'medium',
        climateImpact: 'medium',
        moistureLevel: asset.moistureLevel
      };
      
      // Predict with AI
      let predictedCondition = await predictWithAI(predictionParams);
      
      // If prediction fails, use a simple model
      if (predictedCondition < 0) {
        // Simple deterioration model
        const yearlyRate = 
          asset.surfaceType === 'Concrete' ? 2 :
          asset.surfaceType === 'Asphalt' ? 3 :
          asset.surfaceType === 'Chip Seal' ? 4 : 5;
          
        predictedCondition = Math.max(0, asset.condition - (yearlyRate * year));
      }
      
      // Categorize condition
      if (predictedCondition >= 80) return 'good';
      if (predictedCondition >= 60) return 'fair';
      if (predictedCondition >= 40) return 'poor';
      return 'critical';
    });
    
    // Wait for all predictions
    const categories = await Promise.all(assetPromises);
    
    // Count each category
    categories.forEach(category => {
      if (category === 'good') good++;
      else if (category === 'fair') fair++;
      else if (category === 'poor') poor++;
      else critical++;
    });
    
    // Calculate percentages
    const total = assets.length;
    result.push({
      year: new Date().getFullYear() + year,
      good: Math.round((good / total) * 100),
      fair: Math.round((fair / total) * 100),
      poor: Math.round((poor / total) * 100),
      critical: Math.round((critical / total) * 100)
    });
  }
  
  return result;
}