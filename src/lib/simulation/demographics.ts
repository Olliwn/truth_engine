/**
 * Demographics Module
 * 
 * Handles population aging, mortality, and births.
 * All functions are pure - they take state and return new state.
 */

import {
  PopulationState,
  clonePopulationState,
  stringToImmigrantKey,
  immigrantKeyToString,
} from './SimulationState';

import {
  FINNISH_BIRTHS_BY_YEAR,
  SURVIVAL_PROBABILITY_BY_AGE,
  getSurvivalProbability,
} from '../constants/finnishDemographics';

import {
  calculateTFR,
  getHistoricalTFR,
  WOMEN_CHILDBEARING_AGE_RATIO,
} from '../constants/demographicScenarios';

// ===========================================
// Mortality
// ===========================================

/**
 * Get mortality rate for a given age.
 * Calculates from survival probabilities using year-over-year survival change.
 */
export function getMortalityRate(age: number): number {
  // Cap at 100
  if (age >= 100) return 0.35;  // High mortality at extreme age
  
  // Calculate mortality from survival probability change
  // mortality(age) = 1 - survival(age+1) / survival(age)
  const survivalAtAge = getSurvivalProbability(age);
  const survivalAtNextAge = getSurvivalProbability(age + 1);
  
  if (survivalAtAge <= 0) return 0.35;
  
  // Mortality = probability of dying this year
  const mortality = 1 - (survivalAtNextAge / survivalAtAge);
  
  return Math.max(0, Math.min(0.35, mortality));
}

/**
 * Apply mortality to a population state.
 * Returns new state with reduced population counts.
 */
export function applyMortality(state: PopulationState): {
  newState: PopulationState;
  deaths: number;
} {
  const newState = clonePopulationState(state);
  let totalDeaths = 0;
  
  // Apply to native population
  for (const [age, count] of state.native) {
    const mortalityRate = getMortalityRate(age);
    const deaths = Math.round(count * mortalityRate);
    const survivors = count - deaths;
    
    if (survivors > 0) {
      newState.native.set(age, survivors);
    } else {
      newState.native.delete(age);
    }
    totalDeaths += deaths;
  }
  
  // Apply to immigrant population
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    const mortalityRate = getMortalityRate(key.age);
    const deaths = Math.round(count * mortalityRate);
    const survivors = count - deaths;
    
    if (survivors > 0) {
      newState.immigrants.set(keyStr, survivors);
    } else {
      newState.immigrants.delete(keyStr);
    }
    totalDeaths += deaths;
  }
  
  return { newState, deaths: totalDeaths };
}

// ===========================================
// Aging
// ===========================================

/**
 * Age the entire population by 1 year.
 * Each person moves from age N to age N+1.
 * People at age 100+ stay at 100 (tracked as 100).
 */
export function agePopulation(state: PopulationState): PopulationState {
  const newState: PopulationState = {
    native: new Map(),
    immigrants: new Map(),
  };
  
  // Age native population
  for (const [age, count] of state.native) {
    const newAge = Math.min(age + 1, 100);  // Cap at 100
    const existingCount = newState.native.get(newAge) || 0;
    newState.native.set(newAge, existingCount + count);
  }
  
  // Age immigrant population
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    const newKey = {
      ...key,
      age: Math.min(key.age + 1, 100),  // Cap at 100
    };
    const newKeyStr = immigrantKeyToString(newKey);
    const existingCount = newState.immigrants.get(newKeyStr) || 0;
    newState.immigrants.set(newKeyStr, existingCount + count);
  }
  
  return newState;
}

// ===========================================
// Births
// ===========================================

/**
 * Calculate number of births for a year based on TFR and population.
 */
export function calculateBirths(
  womenOfChildbearingAge: number,
  tfr: number
): number {
  // TFR = births per woman over lifetime (~35 years of childbearing)
  const avgChildbearingYears = 35;
  return Math.round((tfr * womenOfChildbearingAge) / avgChildbearingYears);
}

/**
 * Get births for a specific year.
 * Uses historical data when available, otherwise calculates from TFR.
 */
export function getBirthsForYear(
  year: number,
  womenOfChildbearingAge: number,
  scenarioTFR: number,
  scenarioTransitionYear: number
): { births: number; tfr: number } {
  // Historical data (before 2025)
  if (year <= 2024 && FINNISH_BIRTHS_BY_YEAR[year]) {
    return {
      births: FINNISH_BIRTHS_BY_YEAR[year],
      tfr: getHistoricalTFR(year),
    };
  }
  
  // Calculate TFR based on scenario
  const tfr = calculateTFR(
    year,
    scenarioTFR,
    scenarioTransitionYear
  );
  
  // Convert TFR to births
  const births = calculateBirths(womenOfChildbearingAge, tfr);
  
  return { births, tfr };
}

/**
 * Add births to population state.
 * New births are added at age 0.
 */
export function addBirths(
  state: PopulationState,
  birthCount: number
): PopulationState {
  const newState = clonePopulationState(state);
  
  // Add births at age 0
  const existingAge0 = newState.native.get(0) || 0;
  newState.native.set(0, existingAge0 + birthCount);
  
  return newState;
}

// ===========================================
// Combined Demographics Step
// ===========================================

export interface DemographicsStepResult {
  newState: PopulationState;
  births: number;
  deaths: number;
  tfr: number;
}

/**
 * Execute a full demographics step for one year:
 * 1. Age population
 * 2. Apply mortality
 * 3. Add births
 * 
 * Note: Immigration is handled separately.
 */
export function executeDemographicsStep(
  state: PopulationState,
  year: number,
  scenarioTFR: number,
  scenarioTransitionYear: number,
  femaleRatio: number = 0.51
): DemographicsStepResult {
  // Step 1: Age everyone
  let currentState = agePopulation(state);
  
  // Step 2: Apply mortality
  const { newState: afterMortality, deaths } = applyMortality(currentState);
  currentState = afterMortality;
  
  // Step 3: Calculate and add births
  // Get women of childbearing age from the CURRENT state (after aging)
  let womenOfChildbearingAge = 0;
  for (const [age, count] of currentState.native) {
    if (age >= 15 && age <= 49) {
      womenOfChildbearingAge += count;
    }
  }
  for (const [keyStr, count] of currentState.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    if (key.age >= 15 && key.age <= 49) {
      womenOfChildbearingAge += count;
    }
  }
  womenOfChildbearingAge = Math.round(womenOfChildbearingAge * femaleRatio);
  
  const { births, tfr } = getBirthsForYear(
    year,
    womenOfChildbearingAge,
    scenarioTFR,
    scenarioTransitionYear
  );
  
  currentState = addBirths(currentState, births);
  
  return {
    newState: currentState,
    births,
    deaths,
    tfr,
  };
}

// ===========================================
// Historical Population Reconstruction
// ===========================================

/**
 * Build initial native population state for a given year
 * by using historical birth cohorts and applying survival.
 */
export function buildNativePopulationForYear(targetYear: number): Map<number, number> {
  const population = new Map<number, number>();
  
  // For each possible age (0-100)
  for (let age = 0; age <= 100; age++) {
    const birthYear = targetYear - age;
    
    // Get births for that year (if available)
    const births = FINNISH_BIRTHS_BY_YEAR[birthYear];
    if (!births) continue;
    
    // Apply cumulative survival probability to get current count
    const survivalProb = getSurvivalProbability(age);
    const survivors = Math.round(births * survivalProb);
    
    if (survivors > 0) {
      population.set(age, survivors);
    }
  }
  
  return population;
}

/**
 * Validate population total against known Statistics Finland data.
 * Returns true if within tolerance.
 */
export function validatePopulationTotal(
  population: Map<number, number>,
  year: number,
  tolerancePercent: number = 5
): { valid: boolean; actual: number; expected: number; errorPercent: number } {
  // Known Finnish population totals (Statistics Finland)
  const KNOWN_POPULATION: Record<number, number> = {
    1990: 4998478,
    2000: 5171302,
    2010: 5363352,
    2020: 5531917,
    2024: 5603851,
  };
  
  let total = 0;
  for (const count of population.values()) {
    total += count;
  }
  
  const expected = KNOWN_POPULATION[year];
  if (!expected) {
    return { valid: true, actual: total, expected: 0, errorPercent: 0 };
  }
  
  const errorPercent = Math.abs(total - expected) / expected * 100;
  
  return {
    valid: errorPercent <= tolerancePercent,
    actual: total,
    expected,
    errorPercent,
  };
}

