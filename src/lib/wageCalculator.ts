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
  grossMonthlyIncome: number;
  monthlyRent: number;
  municipality: Municipality;
  householdProfile: HouseholdProfile;
  employmentStatus: EmploymentStatus;
  hasDaycare?: boolean; // Whether household uses municipal daycare (default: true for families with children)
}

export interface WageCalculationResult {
  // Input
  grossMonthlyIncome: number;
  monthlyRent: number;
  hasDaycare: boolean;
  
  // Tax breakdown
  taxes: TaxBreakdown;
  
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
}

/**
 * Internal calculation without EMTR (to avoid recursion)
 */
function calculateWageInternal(input: WageCalculationInput): {
  taxes: TaxBreakdown;
  benefits: BenefitsBreakdown;
  netDisposableIncome: number;
  totalBenefits: number;
  netBenefits: number;
  daycareCost: number;
  netIncomeAfterTax: number;
  hasDaycare: boolean;
} {
  const {
    grossMonthlyIncome,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
  } = input;
  
  // Calculate taxes
  const taxes = calculateTaxes({
    grossMonthlyIncome,
    municipality,
  });
  
  // Calculate benefits (includes daycare costs)
  const benefits = calculateBenefits({
    grossMonthlyIncome,
    netMonthlyIncomeAfterTax: taxes.netMonthlyIncome,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare, // Pass through - defaults to true for families with children
  });
  
  // Final disposable income = net income after tax + benefits - daycare costs
  // benefits.netBenefits already accounts for daycare
  const netDisposableIncome = taxes.netMonthlyIncome + benefits.netBenefits;
  
  return {
    taxes,
    benefits,
    netDisposableIncome,
    totalBenefits: benefits.totalBenefits,
    netBenefits: benefits.netBenefits,
    daycareCost: benefits.daycareFee,
    netIncomeAfterTax: taxes.netMonthlyIncome,
    hasDaycare: hasDaycare !== false && HOUSEHOLD_PROFILES[householdProfile].children > 0,
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
  
  return {
    grossMonthlyIncome: input.grossMonthlyIncome,
    monthlyRent: input.monthlyRent,
    hasDaycare: internal.hasDaycare,
    taxes: internal.taxes,
    benefits: internal.benefits,
    netIncomeAfterTax: internal.netIncomeAfterTax,
    totalBenefits: internal.totalBenefits,
    daycareCost: internal.daycareCost,
    netBenefits: internal.netBenefits,
    netDisposableIncome: internal.netDisposableIncome,
    effectiveTaxRate: internal.taxes.effectiveTaxRate,
    effectiveMarginalTaxRate: emtr,
    benefitClawbackRate: benefitClawback,
    daycareClawbackRate: daycareClawback,
    keepPerEuro: 1 - emtr,
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
  maxGrossIncome: number = 6000,
  step: number = 50,
  hasDaycare?: boolean
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
  hasDaycare?: boolean
): { start: number; end: number; peakEMTR: number; flatZone: boolean } {
  const curve = generateWageCurve(
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    6000,
    25,
    hasDaycare
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
    valleyEnd = 6000;
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
  hasDaycare?: boolean
): number {
  // Income at zero work (no daycare fees when not working)
  const zeroWorkIncome = calculateWage({
    grossMonthlyIncome: 0,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
  }).netDisposableIncome;
  
  // Find where disposable income exceeds zero-work income
  for (let gross = 0; gross <= 6000; gross += 25) {
    const result = calculateWage({
      grossMonthlyIncome: gross,
      monthlyRent,
      municipality,
      householdProfile,
      employmentStatus,
      hasDaycare,
    });
    
    if (result.netDisposableIncome > zeroWorkIncome + 50) { // €50 buffer
      return gross;
    }
  }
  
  return 6000; // Not found within range
}

/**
 * Get summary statistics for a profile
 */
export function getProfileSummary(
  monthlyRent: number,
  municipality: Municipality,
  householdProfile: HouseholdProfile,
  employmentStatus: EmploymentStatus,
  hasDaycare?: boolean
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
  });
  
  const escapeVelocity = calculateEscapeVelocity(
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare
  );
  
  const valley = findValleyOfDeath(
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare
  );
  
  const at2000 = calculateWage({
    grossMonthlyIncome: 2000,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
  });
  
  const at4000 = calculateWage({
    grossMonthlyIncome: 4000,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
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

