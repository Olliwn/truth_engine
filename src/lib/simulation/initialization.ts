/**
 * Initialization Module
 * 
 * Builds initial simulation state from historical data.
 * Handles the reconstruction of population state for the simulation start year.
 */

import {
  SimulationState,
  PopulationState,
  EconomicState,
  ImmigrantKey,
  immigrantKeyToString,
  createEmptyPopulationState,
  DemographicScenario,
} from './SimulationState';

import {
  buildNativePopulationForYear,
  validatePopulationTotal,
} from './demographics';

import {
  getExpectedAgeDistribution,
  getImmigrationForYear,
} from './immigration';

import {
  getHistoricalEconomicState,
} from './economy';

import {
  IMMIGRATION_PROFILES,
  HISTORICAL_IMMIGRATION_BY_TYPE,
} from '../constants/demographicScenarios';

// ===========================================
// Initial State Construction
// ===========================================

export interface InitializationOptions {
  /** Year to initialize state for */
  year: number;
  
  /** Whether to include immigrant population from historical arrivals */
  includeHistoricalImmigrants?: boolean;
  
  /** How many years back to track immigrants (default: 35 - working lifetime) */
  immigrantHistoryYears?: number;
  
  /** Scenario for immigration numbers (used for years without historical data) */
  scenario?: DemographicScenario;
}

/**
 * Build initial simulation state for a given year.
 * Reconstructs both native and immigrant populations from historical data.
 */
export function initializeState(options: InitializationOptions): SimulationState {
  const {
    year,
    includeHistoricalImmigrants = true,
    immigrantHistoryYears = 35,
    scenario,
  } = options;
  
  // Build native population
  const nativePopulation = buildNativePopulationForYear(year);
  
  // Validate against known data
  const validation = validatePopulationTotal(nativePopulation, year, 10);
  if (!validation.valid) {
    console.warn(
      `Native population for ${year} differs from Statistics Finland by ${validation.errorPercent.toFixed(1)}%: ` +
      `got ${validation.actual}, expected ${validation.expected}`
    );
  }
  
  // Build immigrant population
  const immigrants = new Map<string, number>();
  
  if (includeHistoricalImmigrants) {
    // Track immigrants arriving in the past N years
    const startArrivalYear = year - immigrantHistoryYears;
    
    for (let arrivalYear = startArrivalYear; arrivalYear <= year; arrivalYear++) {
      // Get immigration for that year
      const immigration = getImmigrationForYear(
        arrivalYear,
        scenario?.immigration.workBased ?? 12000,
        scenario?.immigration.family ?? 8000,
        scenario?.immigration.humanitarian ?? 5000
      );
      
      // Years since arrival
      const yearsInCountry = year - arrivalYear;
      
      // Apply retention (emigration) over years
      const retentionRate = Math.pow(0.98, yearsInCountry);  // 2% emigration per year
      
      // Distribute by age (at current year)
      // Note: We need to account for aging since arrival
      addImmigrantCohort(
        immigrants,
        'work_based',
        Math.round(immigration.workBased * retentionRate),
        arrivalYear,
        yearsInCountry
      );
      
      addImmigrantCohort(
        immigrants,
        'family',
        Math.round(immigration.family * retentionRate),
        arrivalYear,
        yearsInCountry
      );
      
      addImmigrantCohort(
        immigrants,
        'humanitarian',
        Math.round(immigration.humanitarian * retentionRate),
        arrivalYear,
        yearsInCountry
      );
    }
  }
  
  const population: PopulationState = {
    native: nativePopulation,
    immigrants,
  };
  
  // Get economic state
  const economy = getHistoricalEconomicState(year);
  
  return {
    year,
    population,
    economy,
    isHistorical: year <= 2024,
  };
}

/**
 * Add an immigrant cohort to the immigrant map.
 * Distributes by age based on profile, adjusted for years since arrival (aging).
 */
function addImmigrantCohort(
  immigrants: Map<string, number>,
  type: 'work_based' | 'family' | 'humanitarian',
  count: number,
  arrivalYear: number,
  yearsInCountry: number
): void {
  if (count <= 0) return;
  
  const profile = IMMIGRATION_PROFILES[type];
  
  // Get age distribution at arrival
  const ageAtArrival = getExpectedAgeDistribution(count, profile);
  
  // Age the cohort by yearsInCountry
  for (const [arrivalAge, ageCount] of ageAtArrival) {
    const currentAge = Math.min(arrivalAge + yearsInCountry, 100);  // Cap at 100
    
    // Apply additional mortality over years in country
    // (This is approximate - ideally would apply year-by-year)
    const survivalFactor = Math.pow(0.995, yearsInCountry);  // ~0.5% mortality per year
    const survivingCount = Math.round(ageCount * survivalFactor);
    
    if (survivingCount > 0) {
      const key: ImmigrantKey = {
        age: currentAge,
        type,
        arrivalYear,
      };
      const keyStr = immigrantKeyToString(key);
      const existing = immigrants.get(keyStr) || 0;
      immigrants.set(keyStr, existing + survivingCount);
    }
  }
}

// ===========================================
// Quick State Builders
// ===========================================

/**
 * Create a minimal state for testing.
 */
export function createTestState(year: number): SimulationState {
  return {
    year,
    population: createEmptyPopulationState(),
    economy: {
      gdpBillions: 282,
      cumulativeGdpMultiplier: 1.0,
      debtStockBillions: 160,
      interestRate: 0.025,
    },
    isHistorical: true,
  };
}

/**
 * Create state with just native population (no immigrants).
 * Useful for testing native-only scenarios.
 */
export function createNativeOnlyState(year: number): SimulationState {
  return initializeState({
    year,
    includeHistoricalImmigrants: false,
  });
}

// ===========================================
// State Snapshot for Debugging
// ===========================================

export interface StateSnapshot {
  year: number;
  totalPopulation: number;
  nativePopulation: number;
  immigrantPopulation: number;
  children: number;
  workingAge: number;
  elderly: number;
  gdp: number;
  debt: number;
  immigrantsByType: {
    workBased: number;
    family: number;
    humanitarian: number;
  };
}

/**
 * Get a snapshot of state for debugging/logging.
 */
export function getStateSnapshot(state: SimulationState): StateSnapshot {
  let nativePop = 0;
  let children = 0;
  let workingAge = 0;
  let elderly = 0;
  
  for (const [age, count] of state.population.native) {
    nativePop += count;
    if (age < 15) children += count;
    else if (age < 65) workingAge += count;
    else elderly += count;
  }
  
  let immigrantPop = 0;
  const immigrantsByType = { workBased: 0, family: 0, humanitarian: 0 };
  
  for (const [keyStr, count] of state.population.immigrants) {
    const [ageStr, type] = keyStr.split(':');
    const age = parseInt(ageStr, 10);
    
    immigrantPop += count;
    if (age < 15) children += count;
    else if (age < 65) workingAge += count;
    else elderly += count;
    
    if (type === 'work_based') immigrantsByType.workBased += count;
    else if (type === 'family') immigrantsByType.family += count;
    else if (type === 'humanitarian') immigrantsByType.humanitarian += count;
  }
  
  return {
    year: state.year,
    totalPopulation: nativePop + immigrantPop,
    nativePopulation: nativePop,
    immigrantPopulation: immigrantPop,
    children,
    workingAge,
    elderly,
    gdp: state.economy.gdpBillions,
    debt: state.economy.debtStockBillions,
    immigrantsByType,
  };
}

// ===========================================
// Default Scenario
// ===========================================

export const DEFAULT_SCENARIO: DemographicScenario = {
  birthRate: {
    presetId: 'current_trend',
    customTFR: 1.3,
    transitionYear: 2060,
  },
  immigration: {
    workBased: 12000,
    family: 8000,
    humanitarian: 5000,
  },
  gdp: {
    scenarioId: 'slow_growth',
    customGrowthRate: null,
  },
  interestRate: {
    scenarioId: 'low',
    customRate: null,
  },
  unemployment: {
    scenarioId: 'status_quo',
    customRate: null,
  },
};

