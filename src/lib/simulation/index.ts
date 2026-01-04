/**
 * Population Fiscal Simulation Engine v2
 * 
 * Time-step based simulation with explicit state management.
 * This module provides the public API matching the original populationSimulator.
 */

import {
  SimulationState,
  YearResult,
  SimulationResult,
  SimulationSummary,
  DemographicScenario,
  getPopulationByAgeGroup,
} from './SimulationState';

import { advanceYear, validateYearResult, validateState } from './timestep';
import { initializeState, DEFAULT_SCENARIO, getStateSnapshot } from './initialization';

// Re-export types
export * from './SimulationState';
export { DEFAULT_SCENARIO } from './initialization';
export { validateState, validateYearResult } from './timestep';

// Re-export spending engine
export {
  loadHistoricalSpendingData,
  getHistoricalSpending,
  getHistoricalYears,
  projectSpending,
  convertToLegacyBreakdown,
  generateSpendingTimeline,
  calculateSpendingChange,
  type COFOGSpending,
  type YearlySpending,
  type DemographicContext,
  type EconomicContext,
  type ProjectionContext,
  type LegacySpendingBreakdown,
} from './spending';

// ===========================================
// Main Simulation Function
// ===========================================

export interface SimulateRangeOptions {
  /** Start year of simulation */
  startYear?: number;
  
  /** End year of simulation */
  endYear?: number;
  
  /** Demographic scenario configuration */
  scenario?: DemographicScenario;
  
  /** Whether to validate each step (slower but catches errors) */
  validateSteps?: boolean;
  
  /** Callback for progress updates */
  onProgress?: (year: number, total: number) => void;
}

/**
 * Run the full simulation from startYear to endYear.
 * This is the main entry point for the simulation engine.
 */
export function simulateRange(options: SimulateRangeOptions = {}): SimulationResult {
  const {
    startYear = 1990,
    endYear = 2060,
    scenario = DEFAULT_SCENARIO,
    validateSteps = false,
    onProgress,
  } = options;
  
  // Initialize state for year before startYear
  // (so first step advances to startYear)
  let currentState = initializeState({
    year: startYear - 1,
    includeHistoricalImmigrants: true,
    immigrantHistoryYears: 35,
    scenario,
  });
  
  const annualResults: YearResult[] = [];
  let previousWorkingAge = getPopulationByAgeGroup(currentState.population).workingAge;
  
  // Run simulation
  for (let year = startYear; year <= endYear; year++) {
    // Advance one year
    const { newState, yearResult } = advanceYear({
      currentState,
      scenario,
      simulationStartYear: startYear,
      previousWorkingAge,
    });
    
    // Validate if requested
    if (validateSteps) {
      const stateValidation = validateState(newState);
      if (!stateValidation.valid) {
        console.error(`State validation failed for year ${year}:`, stateValidation.errors);
      }
      
      const resultValidation = validateYearResult(yearResult);
      if (!resultValidation.valid) {
        console.error(`Result validation failed for year ${year}:`, resultValidation.errors);
      }
    }
    
    annualResults.push(yearResult);
    
    // Update for next iteration
    previousWorkingAge = yearResult.workingAge;
    currentState = newState;
    
    // Progress callback
    if (onProgress) {
      onProgress(year - startYear + 1, endYear - startYear + 1);
    }
  }
  
  // Calculate summary statistics
  const summary = calculateSummary(annualResults, startYear, endYear);
  
  return {
    annualResults,
    summary,
    finalState: currentState,
  };
}

// ===========================================
// Summary Calculation
// ===========================================

function calculateSummary(
  annualResults: YearResult[],
  startYear: number,
  endYear: number
): SimulationSummary {
  let peakSurplusYear = startYear;
  let peakSurplusAmount = -Infinity;
  let firstDeficitYear: number | null = null;
  let cumulativeBalance = 0;
  let gdpAdjustedCumulativeBalance = 0;
  let totalDependencyRatio = 0;
  let peakDebtToGDP = 0;
  let peakDebtYear = startYear;
  let totalInterestPaid = 0;
  let totalGdpGrowth = 0;
  let growthYears = 0;
  
  for (const result of annualResults) {
    cumulativeBalance += result.fiscal.netFiscalBalance;
    gdpAdjustedCumulativeBalance += result.gdpAdjusted.adjustedBalance;
    totalDependencyRatio += result.dependencyRatio;
    totalInterestPaid += result.interestExpense;
    
    if (result.gdpGrowthRate !== 0) {
      totalGdpGrowth += result.gdpGrowthRate;
      growthYears++;
    }
    
    // Track peak surplus
    if (result.fiscal.netFiscalBalance > peakSurplusAmount) {
      peakSurplusAmount = result.fiscal.netFiscalBalance;
      peakSurplusYear = result.year;
    }
    
    // Track first deficit
    if (firstDeficitYear === null && result.fiscal.netFiscalBalance < 0) {
      firstDeficitYear = result.year;
    }
    
    // Track peak debt
    if (result.debtToGDP > peakDebtToGDP) {
      peakDebtToGDP = result.debtToGDP;
      peakDebtYear = result.year;
    }
  }
  
  const startResult = annualResults[0];
  const endResult = annualResults[annualResults.length - 1];
  
  return {
    startYear,
    endYear,
    cumulativeBalance,
    gdpAdjustedCumulativeBalance,
    peakSurplusYear,
    peakSurplusAmount,
    firstDeficitYear,
    startPopulation: startResult?.totalPopulation || 0,
    endPopulation: endResult?.totalPopulation || 0,
    populationChange: (endResult?.totalPopulation || 0) - (startResult?.totalPopulation || 0),
    peakDebtToGDP,
    peakDebtYear,
    totalInterestPaid,
    avgDependencyRatio: annualResults.length > 0 ? totalDependencyRatio / annualResults.length : 0,
    avgGdpGrowthRate: growthYears > 0 ? totalGdpGrowth / growthYears : 0,
  };
}

// ===========================================
// Conversion to Legacy Format
// ===========================================

/**
 * Convert new YearResult to the legacy AnnualPopulationResult format.
 * This allows the new engine to be used with existing UI components.
 */
export function convertToLegacyFormat(result: YearResult): LegacyAnnualPopulationResult {
  return {
    year: result.year,
    
    // Population
    totalPopulation: result.totalPopulation,
    children: result.children,
    workingAge: result.workingAge,
    elderly: result.elderly,
    
    // Dependency ratios
    dependencyRatio: result.dependencyRatio,
    oldAgeDependencyRatio: result.oldAgeDependencyRatio,
    
    // Fiscal aggregates (base)
    totalContributions: result.fiscal.totalContributions,
    totalStateCosts: result.fiscal.totalStateCosts,
    netFiscalBalance: result.fiscal.netFiscalBalance,
    
    // GDP-adjusted fiscal
    gdpAdjustedContributions: result.gdpAdjusted.adjustedContributions,
    gdpAdjustedCosts: result.gdpAdjusted.adjustedTotalCosts,
    gdpAdjustedBalance: result.gdpAdjusted.adjustedBalance,
    
    // Per capita
    avgContributionPerWorker: result.workingAge > 0 
      ? result.fiscal.totalContributions / result.workingAge * 1_000_000 
      : 0,
    avgCostPerPerson: result.totalPopulation > 0 
      ? result.fiscal.totalStateCosts / result.totalPopulation * 1_000_000 
      : 0,
    
    // Cost breakdown
    educationCosts: result.fiscal.educationCosts,
    healthcareCosts: result.fiscal.healthcareCosts,
    pensionCosts: result.fiscal.pensionCosts,
    benefitCosts: result.fiscal.benefitCosts,
    
    // Revenue breakdown
    incomeTaxRevenue: result.fiscal.incomeTaxRevenue,
    socialInsuranceRevenue: result.fiscal.socialInsuranceRevenue,
    vatRevenue: result.fiscal.vatRevenue,
    
    // Demographics
    tfr: result.tfr,
    annualBirths: result.annualBirths,
    
    // Immigration
    immigrationFiscalImpact: result.immigrationByType.workBased.fiscalImpact +
                             result.immigrationByType.family.fiscalImpact +
                             result.immigrationByType.humanitarian.fiscalImpact,
    immigrationByType: {
      workBased: {
        count: result.immigrationByType.workBased.stock,
        fiscalImpact: result.immigrationByType.workBased.fiscalImpact,
      },
      family: {
        count: result.immigrationByType.family.stock,
        fiscalImpact: result.immigrationByType.family.fiscalImpact,
      },
      humanitarian: {
        count: result.immigrationByType.humanitarian.stock,
        fiscalImpact: result.immigrationByType.humanitarian.fiscalImpact,
      },
    },
    
    // Cumulative immigration
    annualImmigration: result.annualImmigration,
    cumulativeImmigration: result.immigrantPopulation,  // Total immigrant stock
    foreignBornShare: result.foreignBornShare,
    
    // GDP
    gdp: result.gdp,
    gdpGrowthRate: result.gdpGrowthRate,
    govtSpendingPctGDP: result.govtSpendingPctGDP,
    deficitPctGDP: result.deficitPctGDP,
    
    // Debt
    debtStock: result.debtStock,
    debtToGDP: result.debtToGDP,
    interestExpense: result.interestExpense,
    interestRate: result.interestRate,
    primaryBalance: result.fiscal.primaryBalance,
    
    // Workforce-adjusted GDP
    workforceChangeRate: result.workforceChangeRate,
    productivityGrowthRate: result.productivityGrowthRate,
    effectiveGdpGrowthRate: result.effectiveGdpGrowthRate,
    isWorkforceAdjusted: result.isWorkforceAdjusted,
  };
}

/**
 * Legacy format for backward compatibility with existing UI.
 */
export interface LegacyAnnualPopulationResult {
  year: number;
  totalPopulation: number;
  children: number;
  workingAge: number;
  elderly: number;
  dependencyRatio: number;
  oldAgeDependencyRatio: number;
  totalContributions: number;
  totalStateCosts: number;
  netFiscalBalance: number;
  gdpAdjustedContributions: number;
  gdpAdjustedCosts: number;
  gdpAdjustedBalance: number;
  avgContributionPerWorker: number;
  avgCostPerPerson: number;
  educationCosts: number;
  healthcareCosts: number;
  pensionCosts: number;
  benefitCosts: number;
  incomeTaxRevenue: number;
  socialInsuranceRevenue: number;
  vatRevenue: number;
  tfr: number;
  annualBirths: number;
  immigrationFiscalImpact: number;
  immigrationByType: {
    workBased: { count: number; fiscalImpact: number };
    family: { count: number; fiscalImpact: number };
    humanitarian: { count: number; fiscalImpact: number };
  };
  annualImmigration: number;
  cumulativeImmigration: number;
  foreignBornShare: number;
  gdp: number;
  gdpGrowthRate: number;
  govtSpendingPctGDP: number;
  deficitPctGDP: number;
  debtStock: number;
  debtToGDP: number;
  interestExpense: number;
  interestRate: number;
  primaryBalance: number;
  workforceChangeRate: number;
  productivityGrowthRate: number;
  effectiveGdpGrowthRate: number;
  isWorkforceAdjusted: boolean;
}

/**
 * Convert full simulation result to legacy format.
 */
export function convertResultToLegacyFormat(result: SimulationResult): {
  startYear: number;
  endYear: number;
  annualResults: LegacyAnnualPopulationResult[];
  summary: SimulationSummary & {
    peakDebtToGDP: number;
    peakDebtYear: number;
    totalInterestPaid: number;
    firstGdpAdjustedSurplusYear: number | null;
    effectiveGdpGrowthRate: number;
  };
} {
  return {
    startYear: result.summary.startYear,
    endYear: result.summary.endYear,
    annualResults: result.annualResults.map(convertToLegacyFormat),
    summary: {
      ...result.summary,
      firstGdpAdjustedSurplusYear: null,  // Not tracked in new engine
      effectiveGdpGrowthRate: result.summary.avgGdpGrowthRate,
    },
  };
}

// ===========================================
// Debugging Utilities
// ===========================================

/**
 * Run simulation with detailed logging for debugging.
 */
export function simulateWithDebug(
  options: SimulateRangeOptions = {}
): SimulationResult {
  const { validateSteps = true, onProgress, ...rest } = options;
  
  console.log('Starting simulation with options:', rest);
  
  return simulateRange({
    ...rest,
    validateSteps: true,
    onProgress: (current, total) => {
      if (current % 10 === 0 || current === 1 || current === total) {
        console.log(`Progress: ${current}/${total} years`);
      }
      if (onProgress) onProgress(current, total);
    },
  });
}

/**
 * Compare two year results for significant differences.
 */
export function compareYearResults(
  a: YearResult,
  b: YearResult,
  tolerancePercent: number = 1
): { differences: string[]; significant: boolean } {
  const differences: string[] = [];
  
  const compare = (name: string, va: number, vb: number) => {
    if (va === 0 && vb === 0) return;
    const diff = Math.abs(va - vb);
    const base = Math.max(Math.abs(va), Math.abs(vb));
    const pct = (diff / base) * 100;
    if (pct > tolerancePercent) {
      differences.push(`${name}: ${va.toFixed(2)} vs ${vb.toFixed(2)} (${pct.toFixed(1)}% diff)`);
    }
  };
  
  compare('totalPopulation', a.totalPopulation, b.totalPopulation);
  compare('children', a.children, b.children);
  compare('workingAge', a.workingAge, b.workingAge);
  compare('elderly', a.elderly, b.elderly);
  compare('totalContributions', a.fiscal.totalContributions, b.fiscal.totalContributions);
  compare('totalStateCosts', a.fiscal.totalStateCosts, b.fiscal.totalStateCosts);
  compare('netFiscalBalance', a.fiscal.netFiscalBalance, b.fiscal.netFiscalBalance);
  compare('gdp', a.gdp, b.gdp);
  compare('debtStock', a.debtStock, b.debtStock);
  
  return {
    differences,
    significant: differences.length > 0,
  };
}

