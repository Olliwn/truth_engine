/**
 * Finnish Wage Calculator - Main Orchestrator
 * 
 * Combines tax calculations and benefit calculations to show
 * the complete picture of net disposable income at different
 * gross income levels.
 */

import { calculateTaxes, TaxBreakdown } from './finnishTaxCalculator';
import { calculateBenefits, BenefitsBreakdown } from './finnishBenefitsCalculator';
import type { 
  HouseholdProfile, 
  Municipality, 
  EmploymentStatus,
} from './constants/benefitTypes';
import { HOUSEHOLD_PROFILES } from './constants/benefits2024';

export interface WageCalculationInput {
  grossMonthlyIncome: number; // Total household gross income
  monthlyRent: number;
  municipality: Municipality;
  householdProfile: HouseholdProfile;
  employmentStatus: EmploymentStatus;
  hasDaycare?: boolean; // Whether household uses municipal daycare (default: true for families with children)
  dualEarner?: boolean; // If true, income is split between two earners for tax purposes
  incomeDistribution?: number; // 0-1, proportion of income for first earner (default: 0.5 = equal split)
}

export interface WageCalculationResult {
  // Input
  grossMonthlyIncome: number;
  monthlyRent: number;
  hasDaycare: boolean;
  
  // Tax breakdown
  taxes: TaxBreakdown;
  taxes2?: TaxBreakdown; // Second earner's taxes (dual earner mode)
  
  // Benefits breakdown
  benefits: BenefitsBreakdown;
  
  // Final numbers
  netIncomeAfterTax: number;
  totalBenefits: number; // Benefits before daycare costs
  daycareCost: number; // Monthly daycare cost
  netBenefits: number; // Benefits minus daycare
  netDisposableIncome: number; // After tax + net benefits
  
  // Effective rates
  effectiveTaxRate: number;
  effectiveMarginalTaxRate: number; // Including benefit clawbacks AND daycare increase
  benefitClawbackRate: number;
  daycareClawbackRate: number; // How much daycare increases per €1 income
  
  // Key insight
  keepPerEuro: number; // How much of each additional €1 you keep
  
  // Dual earner mode
  isDualEarner: boolean;
  earner1Income: number;
  earner2Income: number;
  taxSavingsFromSplit: number; // How much tax saved by splitting vs single earner
}

/**
 * Internal calculation without EMTR (to avoid recursion)
 */
function calculateWageInternal(input: WageCalculationInput): {
  taxes: TaxBreakdown;
  taxes2?: TaxBreakdown; // Second earner's taxes (dual earner mode)
  benefits: BenefitsBreakdown;
  netDisposableIncome: number;
  totalBenefits: number;
  netBenefits: number;
  daycareCost: number;
  netIncomeAfterTax: number;
  hasDaycare: boolean;
  isDualEarner: boolean;
  earner1Income: number;
  earner2Income: number;
} {
  const {
    grossMonthlyIncome,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
    dualEarner = false,
    incomeDistribution = 0.5, // Default 50/50 split
  } = input;
  
  const householdConfig = HOUSEHOLD_PROFILES[householdProfile];
  const isCouple = householdConfig.adults === 2;
  const isDualEarner = dualEarner && isCouple;
  
  let taxes: TaxBreakdown;
  let taxes2: TaxBreakdown | undefined;
  let netIncomeAfterTax: number;
  let earner1Income = grossMonthlyIncome;
  let earner2Income = 0;
  
  if (isDualEarner) {
    // Split income between two earners
    earner1Income = grossMonthlyIncome * incomeDistribution;
    earner2Income = grossMonthlyIncome * (1 - incomeDistribution);
    
    // Calculate taxes for each earner separately
    taxes = calculateTaxes({
      grossMonthlyIncome: earner1Income,
      municipality,
    });
    
    taxes2 = calculateTaxes({
      grossMonthlyIncome: earner2Income,
      municipality,
    });
    
    // Combined net income after tax
    netIncomeAfterTax = taxes.netMonthlyIncome + taxes2.netMonthlyIncome;
  } else {
    // Single earner - all income to one person
    taxes = calculateTaxes({
      grossMonthlyIncome,
      municipality,
    });
    netIncomeAfterTax = taxes.netMonthlyIncome;
  }
  
  // Calculate benefits using COMBINED household income (this is how Finnish benefits work)
  const benefits = calculateBenefits({
    grossMonthlyIncome, // Always use combined income for benefits
    netMonthlyIncomeAfterTax: netIncomeAfterTax,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare, // Pass through - defaults to true for families with children
  });
  
  // Final disposable income = net income after tax + benefits - daycare costs
  // benefits.netBenefits already accounts for daycare
  const netDisposableIncome = netIncomeAfterTax + benefits.netBenefits;
  
  return {
    taxes,
    taxes2,
    benefits,
    netDisposableIncome,
    totalBenefits: benefits.totalBenefits,
    netBenefits: benefits.netBenefits,
    daycareCost: benefits.daycareFee,
    netIncomeAfterTax,
    hasDaycare: hasDaycare !== false && householdConfig.children > 0,
    isDualEarner,
    earner1Income,
    earner2Income,
  };
}

/**
 * Main wage calculation function
 * Calculates net disposable income = gross - taxes + benefits - daycare
 */
export function calculateWage(input: WageCalculationInput): WageCalculationResult {
  const internal = calculateWageInternal(input);
  
  // Calculate effective marginal tax rate including benefit clawbacks AND daycare increase
  const { emtr, benefitClawback, daycareClawback } = calculateEMTR(input);
  
  // Calculate tax savings from income splitting (if applicable)
  let taxSavingsFromSplit = 0;
  if (internal.isDualEarner) {
    // Compare with single earner scenario
    const singleEarnerTaxes = calculateTaxes({
      grossMonthlyIncome: input.grossMonthlyIncome,
      municipality: input.municipality,
    });
    const dualEarnerTotalTax = internal.taxes.totalTax + (internal.taxes2?.totalTax || 0);
    taxSavingsFromSplit = singleEarnerTaxes.totalTax - dualEarnerTotalTax;
  }
  
  // Calculate effective tax rate based on combined taxes
  const totalTax = internal.taxes.totalTax + (internal.taxes2?.totalTax || 0);
  const effectiveTaxRate = input.grossMonthlyIncome > 0 
    ? totalTax / input.grossMonthlyIncome 
    : 0;
  
  return {
    grossMonthlyIncome: input.grossMonthlyIncome,
    monthlyRent: input.monthlyRent,
    hasDaycare: internal.hasDaycare,
    taxes: internal.taxes,
    taxes2: internal.taxes2,
    benefits: internal.benefits,
    netIncomeAfterTax: internal.netIncomeAfterTax,
    totalBenefits: internal.totalBenefits,
    daycareCost: internal.daycareCost,
    netBenefits: internal.netBenefits,
    netDisposableIncome: internal.netDisposableIncome,
    effectiveTaxRate,
    effectiveMarginalTaxRate: emtr,
    benefitClawbackRate: benefitClawback,
    daycareClawbackRate: daycareClawback,
    keepPerEuro: 1 - emtr,
    isDualEarner: internal.isDualEarner,
    earner1Income: internal.earner1Income,
    earner2Income: internal.earner2Income,
    taxSavingsFromSplit,
  };
}

/**
 * Calculate Effective Marginal Tax Rate
 * This includes actual taxes, benefit clawbacks, AND daycare fee increases
 */
function calculateEMTR(input: WageCalculationInput): { 
  emtr: number; 
  benefitClawback: number;
  daycareClawback: number;
} {
  const increment = 1; // €1 increment
  
  // Use internal function to avoid recursion
  const current = calculateWageInternal(input);
  
  const next = calculateWageInternal({
    ...input,
    grossMonthlyIncome: input.grossMonthlyIncome + increment,
  });
  
  // Change in disposable income (already accounts for daycare via netBenefits)
  const disposableIncomeDiff = next.netDisposableIncome - current.netDisposableIncome;
  
  // EMTR is 1 minus what you keep
  const emtr = Math.max(0, Math.min(1, 1 - disposableIncomeDiff));
  
  // Benefit clawback specifically (benefits excluding daycare)
  const benefitDiff = current.totalBenefits - next.totalBenefits;
  const benefitClawback = Math.max(0, benefitDiff);
  
  // Daycare cost increase per €1 income
  const daycareDiff = next.daycareCost - current.daycareCost;
  const daycareClawback = Math.max(0, daycareDiff);
  
  return { emtr, benefitClawback, daycareClawback };
}

/**
 * Generate curve data for visualization
 * Calculates net income at each income level
 */
export function generateWageCurve(
  monthlyRent: number,
  municipality: Municipality,
  householdProfile: HouseholdProfile,
  employmentStatus: EmploymentStatus,
  maxGrossIncome: number = 10000,
  step: number = 50,
  hasDaycare?: boolean,
  dualEarner?: boolean,
  incomeDistribution?: number
): WageCalculationResult[] {
  const results: WageCalculationResult[] = [];
  
  for (let gross = 0; gross <= maxGrossIncome; gross += step) {
    const result = calculateWage({
      grossMonthlyIncome: gross,
      monthlyRent,
      municipality,
      householdProfile,
      employmentStatus,
      hasDaycare,
      dualEarner,
      incomeDistribution,
    });
    results.push(result);
  }
  
  return results;
}

/**
 * Find the "Valley of Death" - income range with highest EMTR
 */
export function findValleyOfDeath(
  monthlyRent: number,
  municipality: Municipality,
  householdProfile: HouseholdProfile,
  employmentStatus: EmploymentStatus,
  hasDaycare?: boolean,
  dualEarner?: boolean,
  incomeDistribution?: number
): { start: number; end: number; peakEMTR: number; flatZone: boolean } {
  const curve = generateWageCurve(
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    10000,
    25,
    hasDaycare,
    dualEarner,
    incomeDistribution
  );
  
  // Find the range where EMTR is highest (>80%)
  let valleyStart = 0;
  let valleyEnd = 0;
  let peakEMTR = 0;
  let inValley = false;
  
  for (const point of curve) {
    const emtr = point.effectiveMarginalTaxRate;
    
    if (emtr >= 0.70 && !inValley) {
      valleyStart = point.grossMonthlyIncome;
      inValley = true;
    }
    
    if (emtr < 0.70 && inValley) {
      valleyEnd = point.grossMonthlyIncome;
      inValley = false;
    }
    
    if (emtr > peakEMTR) {
      peakEMTR = emtr;
    }
  }
  
  // If still in valley at end
  if (inValley) {
    valleyEnd = 10000;
  }
  
  // Check if there's a true flat zone (EMTR > 90%)
  const flatZone = curve.some(p => p.effectiveMarginalTaxRate > 0.90);
  
  return { start: valleyStart, end: valleyEnd, peakEMTR, flatZone };
}

/**
 * Calculate the "escape velocity" - income needed to break even with zero work
 */
export function calculateEscapeVelocity(
  monthlyRent: number,
  municipality: Municipality,
  householdProfile: HouseholdProfile,
  employmentStatus: EmploymentStatus,
  hasDaycare?: boolean,
  dualEarner?: boolean,
  incomeDistribution?: number
): number {
  // Income at zero work (no daycare fees when not working)
  const zeroWorkIncome = calculateWage({
    grossMonthlyIncome: 0,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
    dualEarner,
    incomeDistribution,
  }).netDisposableIncome;
  
  // Find where disposable income exceeds zero-work income
  for (let gross = 0; gross <= 10000; gross += 25) {
    const result = calculateWage({
      grossMonthlyIncome: gross,
      monthlyRent,
      municipality,
      householdProfile,
      employmentStatus,
      hasDaycare,
      dualEarner,
      incomeDistribution,
    });
    
    if (result.netDisposableIncome > zeroWorkIncome + 50) { // €50 buffer
      return gross;
    }
  }
  
  return 10000; // Not found within range
}

/**
 * Get summary statistics for a profile
 */
export function getProfileSummary(
  monthlyRent: number,
  municipality: Municipality,
  householdProfile: HouseholdProfile,
  employmentStatus: EmploymentStatus,
  hasDaycare?: boolean,
  dualEarner?: boolean,
  incomeDistribution?: number
): {
  zeroWorkIncome: number;
  escapeVelocity: number;
  valley: { start: number; end: number; peakEMTR: number };
  at2000Gross: WageCalculationResult;
  at4000Gross: WageCalculationResult;
} {
  const zeroWork = calculateWage({
    grossMonthlyIncome: 0,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
    dualEarner,
    incomeDistribution,
  });
  
  const escapeVelocity = calculateEscapeVelocity(
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
    dualEarner,
    incomeDistribution
  );
  
  const valley = findValleyOfDeath(
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
    dualEarner,
    incomeDistribution
  );
  
  const at2000 = calculateWage({
    grossMonthlyIncome: 2000,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
    dualEarner,
    incomeDistribution,
  });
  
  const at4000 = calculateWage({
    grossMonthlyIncome: 4000,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
    dualEarner,
    incomeDistribution,
  });
  
  return {
    zeroWorkIncome: zeroWork.netDisposableIncome,
    escapeVelocity,
    valley: { start: valley.start, end: valley.end, peakEMTR: valley.peakEMTR },
    at2000Gross: at2000,
    at4000Gross: at4000,
  };
}

// Re-export types and constants for convenience
export { HouseholdProfile, Municipality, EmploymentStatus, HOUSEHOLD_PROFILES };

