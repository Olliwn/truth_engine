/**
 * Simulation State Types
 * 
 * Core types for the time-step based population fiscal simulation.
 * The simulation tracks population by age explicitly, allowing proper
 * aging of both native and immigrant populations.
 */

// ===========================================
// Immigration Types
// ===========================================

export type ImmigrantType = 'work_based' | 'family' | 'humanitarian';

/**
 * Unique key for tracking immigrant cohorts.
 * Immigrants are tracked by their current age, type, and arrival year.
 */
export interface ImmigrantKey {
  age: number;
  type: ImmigrantType;
  arrivalYear: number;
}

/**
 * Convert ImmigrantKey to a string for Map keys
 */
export function immigrantKeyToString(key: ImmigrantKey): string {
  return `${key.age}:${key.type}:${key.arrivalYear}`;
}

/**
 * Parse string back to ImmigrantKey
 */
export function stringToImmigrantKey(str: string): ImmigrantKey {
  const [age, type, arrivalYear] = str.split(':');
  return {
    age: parseInt(age, 10),
    type: type as ImmigrantType,
    arrivalYear: parseInt(arrivalYear, 10),
  };
}

// ===========================================
// Population State
// ===========================================

/**
 * Population state at a given point in time.
 * Uses Maps indexed by age for O(1) lookups.
 */
export interface PopulationState {
  /** Native population by age (0-100+) */
  native: Map<number, number>;
  
  /** Immigrant population by (age, type, arrivalYear) */
  immigrants: Map<string, number>;  // Key is ImmigrantKey serialized
}

/**
 * Create an empty population state
 */
export function createEmptyPopulationState(): PopulationState {
  return {
    native: new Map(),
    immigrants: new Map(),
  };
}

/**
 * Deep clone a population state
 */
export function clonePopulationState(state: PopulationState): PopulationState {
  return {
    native: new Map(state.native),
    immigrants: new Map(state.immigrants),
  };
}

// ===========================================
// Economic State
// ===========================================

export interface EconomicState {
  /** GDP in billions EUR */
  gdpBillions: number;
  
  /** Cumulative GDP multiplier (for wage growth) */
  cumulativeGdpMultiplier: number;
  
  /** Government debt stock in billions EUR */
  debtStockBillions: number;
  
  /** Current interest rate on debt */
  interestRate: number;
}

// ===========================================
// Full Simulation State
// ===========================================

/**
 * Complete simulation state at the END of a given year.
 * This is the state after all births, deaths, immigration, etc. have been applied.
 */
export interface SimulationState {
  /** The year this state represents (end of year) */
  year: number;
  
  /** Population state */
  population: PopulationState;
  
  /** Economic state */
  economy: EconomicState;
  
  /** Whether this state is based on historical data or projections */
  isHistorical: boolean;
}

// ===========================================
// Annual Fiscal Flows
// ===========================================

/**
 * Breakdown of fiscal flows for a single person-year
 */
export interface PersonYearFiscal {
  // Contributions (money flowing TO state)
  incomeTax: number;
  socialInsurance: number;
  vat: number;
  
  // Costs (money flowing FROM state)
  education: number;
  healthcare: number;
  pension: number;
  benefits: number;
  
  // Totals
  totalContributions: number;
  totalCosts: number;
  netFlow: number;  // contributions - costs (positive = net contributor)
}

/**
 * Aggregate fiscal flows for an entire year
 */
export interface AnnualFiscalFlows {
  // Population counts
  totalPopulation: number;
  nativePopulation: number;
  immigrantPopulation: number;
  
  // Age group breakdown
  children: number;       // 0-14
  workingAge: number;     // 15-64
  elderly: number;        // 65+
  
  // Dependency ratios
  dependencyRatio: number;        // (children + elderly) / workingAge * 100
  oldAgeDependencyRatio: number;  // elderly / workingAge * 100
  
  // Contribution totals (millions EUR)
  incomeTaxRevenue: number;
  socialInsuranceRevenue: number;
  vatRevenue: number;
  totalContributions: number;
  
  // Cost totals (millions EUR)
  educationCosts: number;
  healthcareCosts: number;
  pensionCosts: number;
  benefitCosts: number;
  interestExpense: number;
  totalStateCosts: number;
  
  // Balances (millions EUR)
  primaryBalance: number;      // Before interest
  netFiscalBalance: number;    // After interest
  
  // Breakdown by population type
  nativeFiscal: {
    contributions: number;
    costs: number;
    balance: number;
  };
  immigrantFiscal: {
    contributions: number;
    costs: number;
    balance: number;
    byType: {
      workBased: { count: number; contributions: number; costs: number; balance: number };
      family: { count: number; contributions: number; costs: number; balance: number };
      humanitarian: { count: number; contributions: number; costs: number; balance: number };
    };
  };
}

/**
 * GDP-adjusted fiscal flows (accounts for wage/cost growth)
 */
export interface GDPAdjustedFlows {
  // Revenue side grows with GDP * elasticity
  adjustedContributions: number;
  
  // Cost side has sector-specific premiums
  adjustedEducation: number;
  adjustedHealthcare: number;
  adjustedPensions: number;
  adjustedBenefits: number;
  adjustedTotalCosts: number;
  
  // Adjusted balance
  adjustedBalance: number;
}

// ===========================================
// Full Year Result
// ===========================================

/**
 * Complete result for a single simulation year.
 * Combines demographic data, fiscal flows, and economic metrics.
 */
export interface YearResult {
  year: number;
  
  // Demographics
  tfr: number;
  annualBirths: number;
  annualDeaths: number;
  annualImmigration: number;
  annualEmigration: number;
  netMigration: number;
  
  // Population at end of year
  totalPopulation: number;
  nativePopulation: number;
  immigrantPopulation: number;
  foreignBornShare: number;  // immigrantPopulation / totalPopulation * 100
  
  // Age groups
  children: number;
  workingAge: number;
  elderly: number;
  dependencyRatio: number;
  oldAgeDependencyRatio: number;
  
  // Fiscal flows (millions EUR)
  fiscal: AnnualFiscalFlows;
  
  // GDP-adjusted fiscal (millions EUR)  
  gdpAdjusted: GDPAdjustedFlows;
  
  // Economic metrics
  gdp: number;                    // GDP in billions EUR
  gdpGrowthRate: number;          // Applied growth rate
  productivityGrowthRate: number; // Productivity component
  workforceChangeRate: number;    // Workforce change component
  effectiveGdpGrowthRate: number; // Actual combined rate
  isWorkforceAdjusted: boolean;
  
  // Debt metrics
  debtStock: number;              // Billions EUR
  debtToGDP: number;              // Percentage
  interestExpense: number;        // Millions EUR
  interestRate: number;           // Rate applied
  
  // Government spending metrics
  govtSpendingPctGDP: number;
  deficitPctGDP: number;
  
  // Immigration breakdown
  immigrationByType: {
    workBased: { arrivals: number; stock: number; fiscalImpact: number };
    family: { arrivals: number; stock: number; fiscalImpact: number };
    humanitarian: { arrivals: number; stock: number; fiscalImpact: number };
  };
}

// ===========================================
// Simulation Result (Full Run)
// ===========================================

export interface SimulationSummary {
  // Time range
  startYear: number;
  endYear: number;
  
  // Cumulative fiscal
  cumulativeBalance: number;
  gdpAdjustedCumulativeBalance: number;
  
  // Peak/trough years
  peakSurplusYear: number;
  peakSurplusAmount: number;
  firstDeficitYear: number | null;
  
  // Population change
  startPopulation: number;
  endPopulation: number;
  populationChange: number;
  
  // Debt metrics
  peakDebtToGDP: number;
  peakDebtYear: number;
  totalInterestPaid: number;
  
  // Averages
  avgDependencyRatio: number;
  avgGdpGrowthRate: number;
}

export interface SimulationResult {
  /** Annual results for each year */
  annualResults: YearResult[];
  
  /** Summary statistics */
  summary: SimulationSummary;
  
  /** Final state at end of simulation */
  finalState: SimulationState;
}

// ===========================================
// Scenario Configuration
// ===========================================

export interface BirthRateScenario {
  presetId: string | null;
  customTFR: number;
  transitionYear: number;
}

export interface ImmigrationScenario {
  workBased: number;
  family: number;
  humanitarian: number;
}

export interface GDPScenarioConfig {
  scenarioId: string;
  customGrowthRate: number | null;
}

export interface InterestRateScenarioConfig {
  scenarioId: string;
  customRate: number | null;
}

export interface DemographicScenario {
  birthRate: BirthRateScenario;
  immigration: ImmigrationScenario;
  gdp: GDPScenarioConfig;
  interestRate: InterestRateScenarioConfig;
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get total population from state
 */
export function getTotalPopulation(state: PopulationState): number {
  let total = 0;
  for (const count of state.native.values()) {
    total += count;
  }
  for (const count of state.immigrants.values()) {
    total += count;
  }
  return total;
}

/**
 * Get native population total
 */
export function getNativePopulation(state: PopulationState): number {
  let total = 0;
  for (const count of state.native.values()) {
    total += count;
  }
  return total;
}

/**
 * Get immigrant population total
 */
export function getImmigrantPopulation(state: PopulationState): number {
  let total = 0;
  for (const count of state.immigrants.values()) {
    total += count;
  }
  return total;
}

/**
 * Get population by age group
 */
export function getPopulationByAgeGroup(state: PopulationState): {
  children: number;
  workingAge: number;
  elderly: number;
} {
  let children = 0;
  let workingAge = 0;
  let elderly = 0;
  
  // Count natives
  for (const [age, count] of state.native) {
    if (age < 15) children += count;
    else if (age < 65) workingAge += count;
    else elderly += count;
  }
  
  // Count immigrants
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    if (key.age < 15) children += count;
    else if (key.age < 65) workingAge += count;
    else elderly += count;
  }
  
  return { children, workingAge, elderly };
}

/**
 * Get population at a specific age (native + immigrant)
 */
export function getPopulationAtAge(state: PopulationState, age: number): number {
  let total = state.native.get(age) || 0;
  
  // Add immigrants at this age (all types and arrival years)
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    if (key.age === age) {
      total += count;
    }
  }
  
  return total;
}

/**
 * Get immigrant count by type
 */
export function getImmigrantsByType(state: PopulationState): {
  workBased: number;
  family: number;
  humanitarian: number;
} {
  const result = { workBased: 0, family: 0, humanitarian: 0 };
  
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    if (key.type === 'work_based') result.workBased += count;
    else if (key.type === 'family') result.family += count;
    else if (key.type === 'humanitarian') result.humanitarian += count;
  }
  
  return result;
}

/**
 * Get women of childbearing age (15-49) for birth calculations
 */
export function getWomenOfChildbearingAge(
  state: PopulationState,
  femaleRatio: number = 0.51
): number {
  let total = 0;
  
  // Count natives aged 15-49
  for (const [age, count] of state.native) {
    if (age >= 15 && age <= 49) {
      total += count;
    }
  }
  
  // Count immigrants aged 15-49
  for (const [keyStr, count] of state.immigrants) {
    const key = stringToImmigrantKey(keyStr);
    if (key.age >= 15 && key.age <= 49) {
      total += count;
    }
  }
  
  return Math.round(total * femaleRatio);
}

