/**
 * Immigration Module
 * 
 * Handles immigrant arrivals, age distribution, retention/emigration,
 * and fiscal calculations specific to immigrants.
 */

import {
  PopulationState,
  ImmigrantType,
  ImmigrantKey,
  immigrantKeyToString,
  stringToImmigrantKey,
  clonePopulationState,
} from './SimulationState';

import {
  IMMIGRATION_PROFILES,
  ImmigrationProfile,
  HISTORICAL_IMMIGRATION_BY_TYPE,
} from '../constants/demographicScenarios';

// ===========================================
// Age Distribution
// ===========================================

/**
 * Sample from a truncated normal distribution.
 * Uses Box-Muller transform with rejection sampling.
 */
function sampleTruncatedNormal(
  mean: number,
  std: number,
  min: number,
  max: number,
  random: () => number = Math.random
): number {
  // Use rejection sampling
  for (let i = 0; i < 100; i++) {  // Max 100 attempts
    // Box-Muller transform
    const u1 = random();
    const u2 = random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const sample = mean + std * z;
    
    if (sample >= min && sample <= max) {
      return Math.round(sample);
    }
  }
  
  // Fallback: clamp to range
  return Math.round(Math.max(min, Math.min(max, mean)));
}

/**
 * Generate age distribution for a group of immigrants.
 * Uses the profile's age distribution parameters.
 */
export function distributeImmigrantsByAge(
  count: number,
  profile: ImmigrationProfile,
  seed?: number
): Map<number, number> {
  const distribution = new Map<number, number>();
  
  if (count <= 0) return distribution;
  
  const { mean, std, minAge, maxAge } = profile.ageDistribution;
  
  // For reproducibility in tests, allow seeded random
  let random = Math.random;
  if (seed !== undefined) {
    // Simple seeded PRNG (mulberry32)
    let state = seed;
    random = () => {
      state |= 0;
      state = state + 0x6D2B79F5 | 0;
      let t = Math.imul(state ^ state >>> 15, 1 | state);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  
  // Sample each immigrant's age
  for (let i = 0; i < count; i++) {
    const age = sampleTruncatedNormal(mean, std, minAge, maxAge, random);
    distribution.set(age, (distribution.get(age) || 0) + 1);
  }
  
  return distribution;
}

/**
 * Get deterministic age distribution for large counts.
 * Uses the profile's distribution parameters to create expected counts.
 * More efficient than sampling for large populations.
 */
export function getExpectedAgeDistribution(
  count: number,
  profile: ImmigrationProfile
): Map<number, number> {
  const distribution = new Map<number, number>();
  
  if (count <= 0) return distribution;
  
  const { mean, std, minAge, maxAge } = profile.ageDistribution;
  
  // Calculate probability for each age using normal distribution
  const sqrt2pi = Math.sqrt(2 * Math.PI);
  let totalProb = 0;
  const probs: number[] = [];
  
  for (let age = minAge; age <= maxAge; age++) {
    const z = (age - mean) / std;
    const prob = Math.exp(-0.5 * z * z) / (std * sqrt2pi);
    probs[age] = prob;
    totalProb += prob;
  }
  
  // Normalize and assign counts
  let assigned = 0;
  for (let age = minAge; age <= maxAge; age++) {
    const expectedCount = Math.round((probs[age] / totalProb) * count);
    if (expectedCount > 0) {
      distribution.set(age, expectedCount);
      assigned += expectedCount;
    }
  }
  
  // Adjust for rounding errors (add/remove from mean age)
  const diff = count - assigned;
  if (diff !== 0) {
    const meanAge = Math.round(mean);
    distribution.set(meanAge, (distribution.get(meanAge) || 0) + diff);
  }
  
  return distribution;
}

// ===========================================
// Immigration Arrivals
// ===========================================

/**
 * Get immigration numbers for a specific year.
 * Uses historical data when available, scenario settings otherwise.
 */
export function getImmigrationForYear(
  year: number,
  scenarioWorkBased: number,
  scenarioFamily: number,
  scenarioHumanitarian: number
): { workBased: number; family: number; humanitarian: number } {
  // Use historical data for 2010-2024
  const historicalData = HISTORICAL_IMMIGRATION_BY_TYPE[year];
  if (historicalData) {
    return {
      workBased: historicalData.workBased,
      family: historicalData.family,
      humanitarian: historicalData.humanitarian,
    };
  }
  
  // For years before 2010, use scaled estimates
  if (year < 2010) {
    // Scale down from 2010 levels based on how far back
    const scale = Math.max(0.2, 0.5 + (year - 1990) * 0.025);
    return {
      workBased: Math.round(8000 * scale),
      family: Math.round(6000 * scale),
      humanitarian: Math.round(2000 * scale),
    };
  }
  
  // For years after 2024, use scenario settings
  return {
    workBased: scenarioWorkBased,
    family: scenarioFamily,
    humanitarian: scenarioHumanitarian,
  };
}

/**
 * Add new immigrants to population state.
 * Distributes by age and adds to immigrant population map.
 */
export function addImmigrants(
  state: PopulationState,
  year: number,
  workBasedCount: number,
  familyCount: number,
  humanitarianCount: number,
  useDeterministic: boolean = true
): {
  newState: PopulationState;
  arrivals: {
    workBased: number;
    family: number;
    humanitarian: number;
    total: number;
  };
} {
  const newState = clonePopulationState(state);
  
  // Helper to add immigrants of a specific type
  const addType = (count: number, type: ImmigrantType, profile: ImmigrationProfile) => {
    const ageDistribution = useDeterministic
      ? getExpectedAgeDistribution(count, profile)
      : distributeImmigrantsByAge(count, profile);
    
    for (const [age, ageCount] of ageDistribution) {
      const key: ImmigrantKey = { age, type, arrivalYear: year };
      const keyStr = immigrantKeyToString(key);
      const existing = newState.immigrants.get(keyStr) || 0;
      newState.immigrants.set(keyStr, existing + ageCount);
    }
  };
  
  // Add each type
  addType(workBasedCount, 'work_based', IMMIGRATION_PROFILES.work_based);
  addType(familyCount, 'family', IMMIGRATION_PROFILES.family);
  addType(humanitarianCount, 'humanitarian', IMMIGRATION_PROFILES.humanitarian);
  
  return {
    newState,
    arrivals: {
      workBased: workBasedCount,
      family: familyCount,
      humanitarian: humanitarianCount,
      total: workBasedCount + familyCount + humanitarianCount,
    },
  };
}

// ===========================================
// Emigration / Retention
// ===========================================

/**
 * Get emigration rate for an immigrant.
 * Can vary by type and years in country.
 */
export function getEmigrationRate(
  type: ImmigrantType,
  yearsInCountry: number
): number {
  // Base emigration rates per year
  const BASE_RATES: Record<ImmigrantType, number> = {
    work_based: 0.03,     // 3% - higher, often temporary assignments
    family: 0.015,        // 1.5% - lower, settled
    humanitarian: 0.01,   // 1% - lowest, limited return options
  };
  
  // Emigration typically decreases with years in country
  // (those who stay longer are more likely to stay permanently)
  const yearsFactor = Math.max(0.3, 1 - yearsInCountry * 0.05);
  
  return BASE_RATES[type] * yearsFactor;
}

/**
 * Apply emigration to immigrant population.
 * Returns new state with reduced immigrant counts.
 */
export function applyEmigration(
  state: PopulationState,
  currentYear: number
): {
  newState: PopulationState;
  emigration: number;
} {
  const newState = clonePopulationState(state);
  let totalEmigration = 0;
  
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    const yearsInCountry = currentYear - key.arrivalYear;
    
    if (yearsInCountry < 0) continue;  // Shouldn't happen, but safety check
    
    const emigrationRate = getEmigrationRate(key.type, yearsInCountry);
    const emigrants = Math.round(count * emigrationRate);
    const remaining = count - emigrants;
    
    if (remaining > 0) {
      newState.immigrants.set(keyStr, remaining);
    } else {
      newState.immigrants.delete(keyStr);
    }
    
    totalEmigration += emigrants;
  }
  
  return { newState, emigration: totalEmigration };
}

// ===========================================
// Immigrant Employment & Income
// ===========================================

/**
 * Get employment rate for an immigrant based on type and integration progress.
 */
export function getImmigrantEmploymentRate(
  type: ImmigrantType,
  yearsInCountry: number
): number {
  const profile = IMMIGRATION_PROFILES[type];
  
  const progress = Math.min(1, yearsInCountry / profile.employmentRate.integrationYears);
  
  return profile.employmentRate.initial + 
    (profile.employmentRate.target - profile.employmentRate.initial) * progress;
}

/**
 * Get effective income decile for an immigrant based on integration progress.
 */
export function getImmigrantIncomeDecile(
  type: ImmigrantType,
  yearsInCountry: number
): number {
  const profile = IMMIGRATION_PROFILES[type];
  
  const progress = Math.min(1, yearsInCountry / profile.incomeDecile.integrationYears);
  
  const decile = profile.incomeDecile.initial + 
    (profile.incomeDecile.target - profile.incomeDecile.initial) * progress;
  
  return Math.round(decile);
}

/**
 * Get welfare dependency rate for an immigrant.
 * Higher in initial years, decreases with integration.
 */
export function getImmigrantWelfareDependency(
  type: ImmigrantType,
  yearsInCountry: number
): number {
  const profile = IMMIGRATION_PROFILES[type];
  
  // Welfare dependency decreases over time
  const initialDependency = profile.initialWelfareDependency;
  const targetDependency = Math.max(0.05, initialDependency * 0.2);  // Minimum 5%
  
  const progress = Math.min(1, yearsInCountry / 10);  // 10 years to reach target
  
  return initialDependency + (targetDependency - initialDependency) * progress;
}

// ===========================================
// Combined Immigration Step
// ===========================================

export interface ImmigrationStepResult {
  newState: PopulationState;
  arrivals: {
    workBased: number;
    family: number;
    humanitarian: number;
    total: number;
  };
  emigration: number;
  netMigration: number;
}

/**
 * Execute a full immigration step for one year:
 * 1. Add new immigrants
 * 2. Apply emigration
 */
export function executeImmigrationStep(
  state: PopulationState,
  year: number,
  scenarioWorkBased: number,
  scenarioFamily: number,
  scenarioHumanitarian: number
): ImmigrationStepResult {
  // Get immigration numbers for this year
  const immigration = getImmigrationForYear(
    year,
    scenarioWorkBased,
    scenarioFamily,
    scenarioHumanitarian
  );
  
  // Add new immigrants
  const { newState: afterArrivals, arrivals } = addImmigrants(
    state,
    year,
    immigration.workBased,
    immigration.family,
    immigration.humanitarian
  );
  
  // Apply emigration
  const { newState: afterEmigration, emigration } = applyEmigration(
    afterArrivals,
    year
  );
  
  return {
    newState: afterEmigration,
    arrivals,
    emigration,
    netMigration: arrivals.total - emigration,
  };
}

// ===========================================
// Population Aggregates
// ===========================================

/**
 * Get total immigrant population by type.
 */
export function getImmigrantPopulationByType(
  state: PopulationState
): { workBased: number; family: number; humanitarian: number; total: number } {
  const result = { workBased: 0, family: 0, humanitarian: 0, total: 0 };
  
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    result.total += count;
    
    if (key.type === 'work_based') result.workBased += count;
    else if (key.type === 'family') result.family += count;
    else if (key.type === 'humanitarian') result.humanitarian += count;
  }
  
  return result;
}

/**
 * Get immigrant population by age group.
 */
export function getImmigrantPopulationByAgeGroup(
  state: PopulationState
): { children: number; workingAge: number; elderly: number } {
  const result = { children: 0, workingAge: 0, elderly: 0 };
  
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    
    if (key.age < 15) result.children += count;
    else if (key.age < 65) result.workingAge += count;
    else result.elderly += count;
  }
  
  return result;
}

/**
 * Get average years in country for all immigrants.
 */
export function getAverageYearsInCountry(
  state: PopulationState,
  currentYear: number
): number {
  let totalYears = 0;
  let totalCount = 0;
  
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    const years = currentYear - key.arrivalYear;
    totalYears += years * count;
    totalCount += count;
  }
  
  return totalCount > 0 ? totalYears / totalCount : 0;
}

