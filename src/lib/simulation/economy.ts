/**
 * Economy Module
 * 
 * Handles GDP projection, debt tracking, and interest calculations.
 */

import { EconomicState, PopulationState, getPopulationByAgeGroup } from './SimulationState';

import {
  GDP_SCENARIOS,
  GDPScenario,
  INTEREST_RATE_SCENARIOS,
  InterestRateScenario,
  getHistoricalGDP,
  getHistoricalDebt,
  calculateEffectiveGDPGrowth,
} from '../constants/demographicScenarios';

// ===========================================
// Historical Data
// ===========================================

/**
 * Check if a year has historical economic data.
 */
export function isHistoricalYear(year: number): boolean {
  return year <= 2024;
}

/**
 * Get historical economic state for a year.
 */
export function getHistoricalEconomicState(year: number): EconomicState {
  return {
    gdpBillions: getHistoricalGDP(year),
    cumulativeGdpMultiplier: 1.0,  // Historical years use actual GDP
    debtStockBillions: getHistoricalDebt(year),
    interestRate: 0.025,  // Historical average ~2.5%
  };
}

// ===========================================
// GDP Projection
// ===========================================

export interface GDPProjectionResult {
  gdpBillions: number;
  growthRate: number;
  productivityGrowthRate: number;
  workforceChangeRate: number;
  effectiveGrowthRate: number;
  isWorkforceAdjusted: boolean;
  cumulativeGdpMultiplier: number;
}

/**
 * Project GDP for a future year.
 */
export function projectGDP(
  previousGdp: number,
  previousMultiplier: number,
  gdpScenario: GDPScenario,
  workforceChangeRate: number,
  customGrowthRate: number | null
): GDPProjectionResult {
  // Get base growth rate
  let productivityGrowthRate = gdpScenario.productivityGrowthRate;
  let effectiveGrowthRate: number;
  let isWorkforceAdjusted = false;
  
  // Use custom rate if provided, otherwise calculate from scenario
  if (customGrowthRate !== null) {
    effectiveGrowthRate = customGrowthRate;
  } else if (gdpScenario.adjustForWorkforce) {
    effectiveGrowthRate = calculateEffectiveGDPGrowth(gdpScenario, workforceChangeRate);
    isWorkforceAdjusted = true;
  } else {
    effectiveGrowthRate = gdpScenario.realGrowthRate;
  }
  
  // Apply growth
  const newGdp = previousGdp * (1 + effectiveGrowthRate);
  const newMultiplier = previousMultiplier * (1 + effectiveGrowthRate);
  
  return {
    gdpBillions: newGdp,
    growthRate: effectiveGrowthRate,
    productivityGrowthRate,
    workforceChangeRate,
    effectiveGrowthRate,
    isWorkforceAdjusted,
    cumulativeGdpMultiplier: newMultiplier,
  };
}

/**
 * Calculate workforce change rate between two years.
 * Returns the percentage change in working-age population.
 */
export function calculateWorkforceChangeRate(
  previousWorkingAge: number,
  currentWorkingAge: number
): number {
  if (previousWorkingAge <= 0) return 0;
  return (currentWorkingAge - previousWorkingAge) / previousWorkingAge;
}

// ===========================================
// Debt Calculations
// ===========================================

export interface DebtCalculationResult {
  debtStock: number;          // Billions EUR
  debtToGDP: number;          // Percentage
  interestExpense: number;    // Millions EUR (annual)
  interestRate: number;       // Rate applied
}

/**
 * Calculate debt metrics for a year.
 */
export function calculateDebt(
  previousDebt: number,
  fiscalBalance: number,  // In millions EUR (positive = surplus, negative = deficit)
  gdpBillions: number,
  interestRate: number
): DebtCalculationResult {
  // Convert fiscal balance from millions to billions
  const fiscalBalanceBillions = fiscalBalance / 1000;
  
  // New debt = previous debt - fiscal balance (surplus reduces debt, deficit increases it)
  const newDebt = Math.max(0, previousDebt - fiscalBalanceBillions);
  
  // Interest expense (on average debt during year)
  const avgDebt = (previousDebt + newDebt) / 2;
  const interestExpense = avgDebt * interestRate * 1000;  // Convert to millions
  
  // Debt to GDP ratio
  const debtToGDP = gdpBillions > 0 ? (newDebt / gdpBillions) * 100 : 0;
  
  return {
    debtStock: newDebt,
    debtToGDP,
    interestExpense,
    interestRate,
  };
}

/**
 * Get interest rate for a scenario.
 */
export function getInterestRate(
  scenarioId: string,
  customRate: number | null
): number {
  if (customRate !== null) return customRate;
  
  const scenario = INTEREST_RATE_SCENARIOS[scenarioId] || INTEREST_RATE_SCENARIOS['low'];
  return scenario.rate;
}

// ===========================================
// Government Spending Metrics
// ===========================================

export interface GovernmentMetrics {
  govtSpendingPctGDP: number;  // Total state costs as % of GDP
  deficitPctGDP: number;        // Deficit as % of GDP (negative = deficit)
  primaryBalancePctGDP: number; // Balance before interest as % of GDP
}

/**
 * Calculate government spending metrics.
 */
export function calculateGovernmentMetrics(
  totalStateCosts: number,    // Millions EUR
  fiscalBalance: number,      // Millions EUR
  primaryBalance: number,     // Millions EUR  
  gdpBillions: number
): GovernmentMetrics {
  const gdpMillions = gdpBillions * 1000;
  
  return {
    govtSpendingPctGDP: gdpMillions > 0 ? (totalStateCosts / gdpMillions) * 100 : 0,
    deficitPctGDP: gdpMillions > 0 ? (fiscalBalance / gdpMillions) * 100 : 0,
    primaryBalancePctGDP: gdpMillions > 0 ? (primaryBalance / gdpMillions) * 100 : 0,
  };
}

// ===========================================
// Combined Economy Step
// ===========================================

export interface EconomyStepResult {
  newState: EconomicState;
  gdpResult: GDPProjectionResult;
  debtResult: DebtCalculationResult;
  /**
   * Government metrics calculated with BASE fiscal values (before interest).
   * Note: These should be recalculated in timestep.ts using post-interest
   * fiscal values for accurate deficitPctGDP reporting.
   */
  govtMetrics: GovernmentMetrics;
}

/**
 * Execute economy step for one year.
 */
export function executeEconomyStep(
  previousState: EconomicState,
  year: number,
  baseYear: number,
  previousWorkingAge: number,
  currentWorkingAge: number,
  fiscalBalance: number,       // Millions EUR
  primaryBalance: number,      // Millions EUR
  totalStateCosts: number,     // Millions EUR
  gdpScenarioId: string,
  customGrowthRate: number | null,
  interestRateScenarioId: string,
  customInterestRate: number | null
): EconomyStepResult {
  // Check if historical year
  if (year <= baseYear) {
    const historicalState = getHistoricalEconomicState(year);
    
    return {
      newState: historicalState,
      gdpResult: {
        gdpBillions: historicalState.gdpBillions,
        growthRate: 0,
        productivityGrowthRate: 0,
        workforceChangeRate: 0,
        effectiveGrowthRate: 0,
        isWorkforceAdjusted: false,
        cumulativeGdpMultiplier: 1.0,
      },
      debtResult: {
        debtStock: historicalState.debtStockBillions,
        debtToGDP: historicalState.debtStockBillions / historicalState.gdpBillions * 100,
        interestExpense: historicalState.debtStockBillions * historicalState.interestRate * 1000,
        interestRate: historicalState.interestRate,
      },
      govtMetrics: calculateGovernmentMetrics(
        totalStateCosts,
        fiscalBalance,
        primaryBalance,
        historicalState.gdpBillions
      ),
    };
  }
  
  // Future year - project forward
  const gdpScenario = GDP_SCENARIOS[gdpScenarioId] || GDP_SCENARIOS['slow_growth'];
  const interestRate = getInterestRate(interestRateScenarioId, customInterestRate);
  const workforceChangeRate = calculateWorkforceChangeRate(previousWorkingAge, currentWorkingAge);
  
  // Project GDP
  const gdpResult = projectGDP(
    previousState.gdpBillions,
    previousState.cumulativeGdpMultiplier,
    gdpScenario,
    workforceChangeRate,
    customGrowthRate
  );
  
  // Calculate debt (use GDP-adjusted fiscal balance for projections)
  const debtResult = calculateDebt(
    previousState.debtStockBillions,
    fiscalBalance,
    gdpResult.gdpBillions,
    interestRate
  );
  
  // Government metrics
  const govtMetrics = calculateGovernmentMetrics(
    totalStateCosts,
    fiscalBalance,
    primaryBalance,
    gdpResult.gdpBillions
  );
  
  const newState: EconomicState = {
    gdpBillions: gdpResult.gdpBillions,
    cumulativeGdpMultiplier: gdpResult.cumulativeGdpMultiplier,
    debtStockBillions: debtResult.debtStock,
    interestRate: debtResult.interestRate,
  };
  
  return {
    newState,
    gdpResult,
    debtResult,
    govtMetrics,
  };
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Calculate breakeven GDP growth rate to balance budget.
 */
export function calculateBreakevenGrowthRate(
  currentDeficit: number,      // Millions EUR (negative)
  totalContributions: number,  // Millions EUR
  revenueElasticity: number = 1.0
): number {
  if (currentDeficit >= 0) return 0;  // Already balanced
  if (totalContributions <= 0) return Infinity;  // Cannot balance
  
  // Simple approximation: what growth rate would increase revenues by deficit amount?
  // Revenue growth = GDP growth * elasticity
  // Need: additionalRevenue = -deficit
  // additionalRevenue = contributions * (growth * elasticity)
  
  const deficitPercent = Math.abs(currentDeficit) / totalContributions;
  return deficitPercent / revenueElasticity;
}

/**
 * Estimate GDP growth impact of fiscal contraction (fiscal multiplier effect).
 * If government spending is cut to balance budget, it reduces GDP.
 */
export function estimateFiscalMultiplierEffect(
  deficitReduction: number,  // Billions EUR of spending cuts or tax increases
  gdpBillions: number,
  fiscalMultiplier: number = 0.5  // Conservative estimate
): number {
  if (gdpBillions <= 0) return 0;
  
  // GDP reduction = deficit reduction * multiplier / GDP
  return (deficitReduction * fiscalMultiplier) / gdpBillions;
}

