/**
 * Adapter Module
 * 
 * Provides a drop-in replacement API for the old populationSimulator.
 * This allows gradual migration to the new time-step simulation engine.
 */

import {
  simulateRange,
  convertResultToLegacyFormat,
  LegacyAnnualPopulationResult,
  DEFAULT_SCENARIO,
} from './index';

import { initializeState, getStateSnapshot } from './initialization';
import { getPopulationByAgeGroup, stringToImmigrantKey } from './SimulationState';

// Re-export types and constants for compatibility
export type { LegacyAnnualPopulationResult };
export { DEFAULT_SCENARIO };

// Re-export scenario constants from the original location
export {
  BIRTH_RATE_PRESETS,
  DEFAULT_IMMIGRATION,
  GDP_SCENARIOS,
  INTEREST_RATE_SCENARIOS,
} from '../constants/demographicScenarios';

// Default scenarios
export const DEFAULT_GDP_SCENARIO = 'slow_growth';
export const DEFAULT_INTEREST_RATE_SCENARIO = 'low';

/**
 * Type definition matching the old DemographicScenario
 */
export interface DemographicScenario {
  birthRate: {
    presetId: string | null;
    customTFR: number;
    transitionYear: number;
  };
  immigration: {
    workBased: number;
    family: number;
    humanitarian: number;
  };
  gdp: {
    scenarioId: string;
    customGrowthRate: number | null;
  };
  interestRate: {
    scenarioId: string;
    customRate: number | null;
  };
}

/**
 * Result type matching the old PopulationSimulationResult
 */
export interface PopulationSimulationResult {
  startYear: number;
  endYear: number;
  annualResults: LegacyAnnualPopulationResult[];
  summary: {
    peakSurplusYear: number;
    peakSurplusAmount: number;
    firstDeficitYear: number | null;
    cumulativeBalance: number;
    avgDependencyRatio: number;
    populationChange: number;
    gdpAdjustedCumulativeBalance: number;
    firstGdpAdjustedSurplusYear: number | null;
    effectiveGdpGrowthRate: number;
    peakDebtToGDP: number;
    peakDebtYear: number;
    totalInterestPaid: number;
    // Additional properties from old API
    breakevenGrowthRate: number;
    secondOrderEffects: {
      deficitAsPercentOfGDP: number;
      fiscalMultiplier: number;
      gdpReductionIfBalanced: number;
      effectiveGrowthNeeded: number;
    };
    finalDebtStock: number;
    finalDebtToGDP: number;
  };
}

/**
 * Main simulation function - drop-in replacement for simulatePopulationRange
 */
export function simulatePopulationRange(
  startYear: number = 1990,
  endYear: number = 2060,
  scenario: DemographicScenario = DEFAULT_SCENARIO
): PopulationSimulationResult {
  // Convert scenario format
  const newScenario = {
    birthRate: {
      presetId: scenario.birthRate.presetId,
      customTFR: scenario.birthRate.customTFR,
      transitionYear: scenario.birthRate.transitionYear,
    },
    immigration: {
      workBased: scenario.immigration.workBased,
      family: scenario.immigration.family,
      humanitarian: scenario.immigration.humanitarian,
    },
    gdp: {
      scenarioId: scenario.gdp.scenarioId,
      customGrowthRate: scenario.gdp.customGrowthRate,
    },
    interestRate: {
      scenarioId: scenario.interestRate.scenarioId,
      customRate: scenario.interestRate.customRate,
    },
  };

  // Run simulation with new engine
  const result = simulateRange({
    startYear,
    endYear,
    scenario: newScenario,
    validateSteps: false,  // Disable for performance
  });

  // Convert to legacy format
  const legacyResult = convertResultToLegacyFormat(result);
  
  // Get final year data for additional fields
  const finalYear = result.annualResults[result.annualResults.length - 1];
  
  // Calculate breakeven growth rate (what growth rate would balance the budget)
  const avgDeficit = result.summary.cumulativeBalance / result.annualResults.length;
  const avgContributions = result.annualResults.reduce((sum, r) => sum + r.fiscal.totalContributions, 0) / result.annualResults.length;
  const breakevenGrowthRate = avgContributions > 0 && avgDeficit < 0
    ? Math.abs(avgDeficit) / avgContributions
    : 0;
  
  // Second order effects (simplified calculation)
  const fiscalMultiplier = 0.8;  // Conservative estimate for Finland
  const avgGDP = result.annualResults.reduce((sum, r) => sum + r.gdp, 0) / result.annualResults.length;
  const deficitAsPercentOfGDP = avgDeficit < 0 && avgGDP > 0
    ? (Math.abs(avgDeficit) / 1000 / avgGDP) * 100
    : 0;
  const gdpReductionIfBalanced = deficitAsPercentOfGDP * fiscalMultiplier;
  const effectiveGrowthNeeded = breakevenGrowthRate + (gdpReductionIfBalanced / 100);
  
  return {
    ...legacyResult,
    summary: {
      ...legacyResult.summary,
      breakevenGrowthRate,
      secondOrderEffects: {
        deficitAsPercentOfGDP,
        fiscalMultiplier,
        gdpReductionIfBalanced,
        effectiveGrowthNeeded,
      },
      finalDebtStock: finalYear?.debtStock || 0,
      finalDebtToGDP: finalYear?.debtToGDP || 0,
    },
  };
}

/**
 * Population pyramid data for a given year.
 * Uses the new simulation engine to build accurate age distribution.
 */
export interface PyramidDataPoint {
  age: number;
  male: number;
  female: number;
}

export function getPopulationPyramidData(year: number): PyramidDataPoint[] {
  // Build state for the requested year
  const state = initializeState({
    year,
    includeHistoricalImmigrants: true,
    immigrantHistoryYears: 35,
  });

  const pyramidData: PyramidDataPoint[] = [];

  // Aggregate native population by age
  for (let age = 0; age <= 100; age++) {
    let total = state.population.native.get(age) || 0;

    // Add immigrants at this age
    for (const [keyStr, count] of state.population.immigrants) {
      const key = stringToImmigrantKey(keyStr);
      if (key.age === age) {
        total += count;
      }
    }

    if (total > 0) {
      // Assume roughly equal gender split with slightly more females
      const femaleRatio = age < 60 ? 0.49 : 0.54;  // More females at older ages
      const females = Math.round(total * femaleRatio);
      const males = total - females;

      pyramidData.push({
        age,
        male: males,
        female: females,
      });
    }
  }

  return pyramidData;
}

/**
 * Get population totals for a specific year
 */
export function getPopulationForYear(year: number): {
  total: number;
  children: number;
  workingAge: number;
  elderly: number;
  native: number;
  immigrant: number;
} {
  const state = initializeState({
    year,
    includeHistoricalImmigrants: true,
  });

  const snapshot = getStateSnapshot(state);
  const ageGroups = getPopulationByAgeGroup(state.population);

  return {
    total: snapshot.totalPopulation,
    children: ageGroups.children,
    workingAge: ageGroups.workingAge,
    elderly: ageGroups.elderly,
    native: snapshot.nativePopulation,
    immigrant: snapshot.immigrantPopulation,
  };
}

/**
 * Feature flag to enable/disable the new simulation engine.
 * Set to true to use the new engine, false to fall back to old.
 */
export const USE_NEW_SIMULATION_ENGINE = true;

