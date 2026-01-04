/**
 * Time-Step Module
 * 
 * Core orchestration logic for advancing the simulation by one year.
 * Combines demographics, immigration, fiscal, and economy modules.
 */

import {
  SimulationState,
  PopulationState,
  EconomicState,
  YearResult,
  DemographicScenario,
  getPopulationByAgeGroup,
  getTotalPopulation,
  getNativePopulation,
  getImmigrantPopulation,
} from './SimulationState';

import {
  executeDemographicsStep,
  DemographicsStepResult,
} from './demographics';

import {
  executeImmigrationStep,
  getImmigrantPopulationByType,
  ImmigrationStepResult,
} from './immigration';

import {
  calculateAggregeFiscalFlows,
  applyGDPAdjustments,
} from './fiscal';

import type { AnnualFiscalFlows, GDPAdjustedFlows } from './SimulationState';

import {
  executeEconomyStep,
  isHistoricalYear,
  getHistoricalEconomicState,
  EconomyStepResult,
} from './economy';

import { GDP_SCENARIOS } from '../constants/demographicScenarios';

// ===========================================
// Constants
// ===========================================

const BASE_YEAR = 2024;  // Last year with complete historical data

// ===========================================
// Time Step Execution
// ===========================================

export interface TimeStepInput {
  /** Current state at the START of the year */
  currentState: SimulationState;
  
  /** Scenario configuration */
  scenario: DemographicScenario;
  
  /** Start year of simulation (for immigration cohort tracking) */
  simulationStartYear: number;
  
  /** Previous year's working-age population (for GDP calculation) */
  previousWorkingAge: number;
}

export interface TimeStepOutput {
  /** New state at the END of the year */
  newState: SimulationState;
  
  /** Detailed result for this year */
  yearResult: YearResult;
}

/**
 * Advance the simulation by one year.
 * This is the core function that orchestrates all modules.
 */
export function advanceYear(input: TimeStepInput): TimeStepOutput {
  const { currentState, scenario, simulationStartYear, previousWorkingAge } = input;
  const year = currentState.year + 1;  // We're computing for the NEXT year
  
  // ========================================
  // Step 1: Demographics (Age, Mortality, Births)
  // ========================================
  
  const demographicsResult = executeDemographicsStep(
    currentState.population,
    year,
    scenario.birthRate.customTFR,
    scenario.birthRate.transitionYear
  );
  
  let populationState = demographicsResult.newState;
  
  // ========================================
  // Step 2: Immigration
  // ========================================
  
  const immigrationResult = executeImmigrationStep(
    populationState,
    year,
    scenario.immigration.workBased,
    scenario.immigration.family,
    scenario.immigration.humanitarian
  );
  
  populationState = immigrationResult.newState;
  
  // ========================================
  // Step 3: Fiscal Calculations
  // ========================================
  
  // Get GDP scenario for cost/revenue adjustments
  const gdpScenarioId = scenario.gdp.scenarioId || 'slow_growth';
  const gdpScenario = GDP_SCENARIOS[gdpScenarioId] || GDP_SCENARIOS['slow_growth'];
  
  // Calculate base fiscal flows (without interest, to be added later)
  const baseFiscalFlows = calculateAggregeFiscalFlows(
    populationState,
    year,
    currentState.economy.cumulativeGdpMultiplier,
    0  // Interest will be calculated and added in economy step
  );
  
  // ========================================
  // Step 4: Economy (GDP, Debt)
  // ========================================
  
  // Get current working-age population for workforce adjustment
  const ageGroups = getPopulationByAgeGroup(populationState);
  const currentWorkingAge = ageGroups.workingAge;
  
  // Execute economy step
  const economyResult = executeEconomyStep(
    currentState.economy,
    year,
    BASE_YEAR,
    previousWorkingAge,
    currentWorkingAge,
    baseFiscalFlows.netFiscalBalance,  // Use base balance for debt calculation
    baseFiscalFlows.primaryBalance,
    baseFiscalFlows.totalStateCosts,
    scenario.gdp.scenarioId,
    scenario.gdp.customGrowthRate,
    scenario.interestRate.scenarioId,
    scenario.interestRate.customRate
  );
  
  // Update fiscal flows with interest expense
  const fiscalFlowsWithInterest: AnnualFiscalFlows = {
    ...baseFiscalFlows,
    interestExpense: economyResult.debtResult.interestExpense,
    totalStateCosts: baseFiscalFlows.totalStateCosts + economyResult.debtResult.interestExpense,
    netFiscalBalance: baseFiscalFlows.netFiscalBalance - economyResult.debtResult.interestExpense,
  };
  
  // Apply GDP adjustments for cost growth premiums
  const gdpAdjustedFlows = applyGDPAdjustments(
    fiscalFlowsWithInterest,
    year,
    BASE_YEAR,
    gdpScenario.revenueElasticity,
    gdpScenario.healthcareCostGrowthPremium,
    gdpScenario.pensionCostGrowthPremium,
    economyResult.newState.cumulativeGdpMultiplier
  );
  
  // ========================================
  // Step 5: Build Year Result
  // ========================================
  
  const immigrantByType = getImmigrantPopulationByType(populationState);
  const totalPopulation = getTotalPopulation(populationState);
  const nativePopulation = getNativePopulation(populationState);
  const immigrantPopulation = getImmigrantPopulation(populationState);
  
  const yearResult: YearResult = {
    year,
    
    // Demographics
    tfr: demographicsResult.tfr,
    annualBirths: demographicsResult.births,
    annualDeaths: demographicsResult.deaths,
    annualImmigration: immigrationResult.arrivals.total,
    annualEmigration: immigrationResult.emigration,
    netMigration: immigrationResult.netMigration,
    
    // Population
    totalPopulation,
    nativePopulation,
    immigrantPopulation,
    foreignBornShare: totalPopulation > 0 ? (immigrantPopulation / totalPopulation) * 100 : 0,
    
    // Age groups
    children: ageGroups.children,
    workingAge: ageGroups.workingAge,
    elderly: ageGroups.elderly,
    dependencyRatio: fiscalFlowsWithInterest.dependencyRatio,
    oldAgeDependencyRatio: fiscalFlowsWithInterest.oldAgeDependencyRatio,
    
    // Fiscal
    fiscal: fiscalFlowsWithInterest,
    gdpAdjusted: gdpAdjustedFlows,
    
    // Economy
    gdp: economyResult.newState.gdpBillions,
    gdpGrowthRate: economyResult.gdpResult.growthRate,
    productivityGrowthRate: economyResult.gdpResult.productivityGrowthRate,
    workforceChangeRate: economyResult.gdpResult.workforceChangeRate,
    effectiveGdpGrowthRate: economyResult.gdpResult.effectiveGrowthRate,
    isWorkforceAdjusted: economyResult.gdpResult.isWorkforceAdjusted,
    
    // Debt
    debtStock: economyResult.debtResult.debtStock,
    debtToGDP: economyResult.debtResult.debtToGDP,
    interestExpense: economyResult.debtResult.interestExpense,
    interestRate: economyResult.debtResult.interestRate,
    
    // Government metrics - recalculate with interest included
    // economyResult.govtMetrics uses base balance (no interest), so we recalculate here
    govtSpendingPctGDP: economyResult.newState.gdpBillions > 0 
      ? (fiscalFlowsWithInterest.totalStateCosts / (economyResult.newState.gdpBillions * 1000)) * 100 
      : 0,
    deficitPctGDP: economyResult.newState.gdpBillions > 0 
      ? (fiscalFlowsWithInterest.netFiscalBalance / (economyResult.newState.gdpBillions * 1000)) * 100 
      : 0,
    
    // Immigration breakdown
    immigrationByType: {
      workBased: {
        arrivals: immigrationResult.arrivals.workBased,
        stock: immigrantByType.workBased,
        fiscalImpact: fiscalFlowsWithInterest.immigrantFiscal.byType.workBased.balance,
      },
      family: {
        arrivals: immigrationResult.arrivals.family,
        stock: immigrantByType.family,
        fiscalImpact: fiscalFlowsWithInterest.immigrantFiscal.byType.family.balance,
      },
      humanitarian: {
        arrivals: immigrationResult.arrivals.humanitarian,
        stock: immigrantByType.humanitarian,
        fiscalImpact: fiscalFlowsWithInterest.immigrantFiscal.byType.humanitarian.balance,
      },
    },
  };
  
  // ========================================
  // Step 6: Build New State
  // ========================================
  
  const newState: SimulationState = {
    year,
    population: populationState,
    economy: economyResult.newState,
    isHistorical: isHistoricalYear(year),
  };
  
  return { newState, yearResult };
}

// ===========================================
// Validation
// ===========================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate simulation state for invariants.
 */
export function validateState(state: SimulationState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Population must be positive
  const totalPop = getTotalPopulation(state.population);
  if (totalPop <= 0) {
    errors.push(`Population must be positive, got ${totalPop}`);
  }
  
  // GDP must be positive
  if (state.economy.gdpBillions <= 0) {
    errors.push(`GDP must be positive, got ${state.economy.gdpBillions}`);
  }
  
  // Debt can be zero or positive (can't be negative unless historical surplus)
  if (state.economy.debtStockBillions < 0 && !state.isHistorical) {
    warnings.push(`Debt is negative (${state.economy.debtStockBillions}B), unusual for projected years`);
  }
  
  // Interest rate should be reasonable
  if (state.economy.interestRate < 0 || state.economy.interestRate > 0.20) {
    warnings.push(`Interest rate ${state.economy.interestRate} seems unusual`);
  }
  
  // Age groups should sum to total
  const ageGroups = getPopulationByAgeGroup(state.population);
  const ageGroupSum = ageGroups.children + ageGroups.workingAge + ageGroups.elderly;
  if (Math.abs(ageGroupSum - totalPop) > 10) {  // Allow small rounding errors
    errors.push(`Age groups (${ageGroupSum}) don't sum to total population (${totalPop})`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate year result for consistency.
 */
export function validateYearResult(result: YearResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Contributions should sum correctly
  const expectedContributions = 
    result.fiscal.incomeTaxRevenue + 
    result.fiscal.socialInsuranceRevenue + 
    result.fiscal.vatRevenue;
  if (Math.abs(result.fiscal.totalContributions - expectedContributions) > 1) {
    errors.push(`Contributions don't sum correctly: ${result.fiscal.totalContributions} vs ${expectedContributions}`);
  }
  
  // Costs should sum correctly (excluding interest which is separate)
  const expectedCosts = 
    result.fiscal.educationCosts + 
    result.fiscal.healthcareCosts + 
    result.fiscal.pensionCosts + 
    result.fiscal.benefitCosts +
    result.fiscal.interestExpense;
  if (Math.abs(result.fiscal.totalStateCosts - expectedCosts) > 1) {
    errors.push(`Costs don't sum correctly: ${result.fiscal.totalStateCosts} vs ${expectedCosts}`);
  }
  
  // Population consistency
  if (Math.abs(result.totalPopulation - result.nativePopulation - result.immigrantPopulation) > 10) {
    errors.push(`Population doesn't add up: ${result.totalPopulation} != ${result.nativePopulation} + ${result.immigrantPopulation}`);
  }
  
  // Age groups
  const ageSum = result.children + result.workingAge + result.elderly;
  if (Math.abs(ageSum - result.totalPopulation) > 10) {
    errors.push(`Age groups don't sum to total: ${ageSum} vs ${result.totalPopulation}`);
  }
  
  // Foreign-born share bounds
  if (result.foreignBornShare < 0 || result.foreignBornShare > 100) {
    errors.push(`Foreign-born share out of bounds: ${result.foreignBornShare}`);
  }
  
  // Dependency ratio sanity
  if (result.dependencyRatio < 0) {
    errors.push(`Dependency ratio negative: ${result.dependencyRatio}`);
  }
  if (result.dependencyRatio > 200) {
    warnings.push(`Dependency ratio very high: ${result.dependencyRatio}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

