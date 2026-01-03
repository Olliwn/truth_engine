/**
 * Finnish Tax Constants for 2024
 * Source: Finnish Tax Administration (Vero.fi)
 * 
 * These constants define the tax brackets, rates, and deductions
 * used to calculate Finnish income taxes.
 */

// National Income Tax Brackets 2024 (progressive)
// Annual income thresholds and marginal rates
export const NATIONAL_TAX_BRACKETS_2024 = [
  { min: 0, max: 20500, rate: 0, base: 0 },
  { min: 20500, max: 30500, rate: 0.1264, base: 0 },
  { min: 30500, max: 50400, rate: 0.19, base: 1264 },
  { min: 50400, max: 88200, rate: 0.305, base: 5045 },
  { min: 88200, max: Infinity, rate: 0.34, base: 16574 },
];

// Municipal Tax Rates 2024 (flat rate, varies by municipality)
export const MUNICIPAL_TAX_RATES_2024: Record<string, number> = {
  helsinki: 0.18,
  espoo: 0.1775,
  tampere: 0.2125,
  turku: 0.205,
  oulu: 0.22,
  vantaa: 0.19,
  jyvaskyla: 0.215,
  kuopio: 0.215,
  lahti: 0.215,
  other: 0.20, // Average for other municipalities
};

// Church Tax Rates 2024 (optional, for members)
export const CHURCH_TAX_RATES_2024: Record<string, number> = {
  helsinki: 0.01,
  espoo: 0.01,
  tampere: 0.015,
  turku: 0.0125,
  oulu: 0.0125,
  other: 0.0125,
};

// Social Insurance Contributions 2024
export const SOCIAL_INSURANCE_2024 = {
  // Employee pension contribution (TyEL)
  pensionUnder53: 0.0715, // 7.15% for under 53 years
  pension53to62: 0.0865, // 8.65% for 53-62 years
  pensionOver62: 0.0715, // 7.15% for 63+ years
  
  // Unemployment insurance
  unemployment: 0.0179, // 1.79%
  
  // Health insurance (sairausvakuutusmaksu)
  healthInsuranceDayAllowance: 0.0118, // 1.18% (only on earned income over €16,499/year)
  healthInsuranceMedical: 0.0051, // 0.51%
  
  // Health insurance income threshold
  healthInsuranceThreshold: 16499, // Annual income threshold for day allowance contribution
};

// Tax Deductions 2024
export const TAX_DEDUCTIONS_2024 = {
  // Basic deduction (perusvähennys) - reduces municipal tax base
  basicDeduction: {
    max: 3870, // Maximum deduction
    phaseOutRate: 0.18, // Reduces by 18% of income over threshold
  },
  
  // Earned income deduction (ansiotulovähennys) - reduces state and municipal tax
  earnedIncomeDeduction: {
    max: 5170, // Maximum deduction
    buildUpRate: 0.13, // 13% of income between €2,500 and €7,230
    buildUpStart: 2500,
    buildUpEnd: 7230,
    phaseOutRate: 0.045, // Reduces by 4.5% of income over €14,750
    phaseOutStart: 14750,
  },
  
  // Work income deduction (työtulovähennys) - reduces final tax
  workIncomeDeduction: {
    max: 2140, // Maximum deduction
    buildUpRate: 0.127, // 12.7% of earned income over €2,500
    buildUpStart: 2500,
    phaseOutRate: 0.0184, // Reduces by 1.84% of income over €22,000
    phaseOutStart: 22000,
  },
};

// Standard deductions
export const STANDARD_DEDUCTIONS_2024 = {
  // Travel expense deduction (flat rate if no actual expenses)
  travelExpense: 900, // €900/year maximum without receipts
  
  // Home office deduction
  homeOffice: 900, // €900/year if working from home
};

// Tax-free thresholds
export const TAX_FREE_THRESHOLDS_2024 = {
  // Income below this is effectively tax-free due to deductions
  effectiveTaxFreeIncome: 16800, // Approximate annual income where tax starts
  
  // Minimum taxable income for national tax
  nationalTaxStart: 20500,
};

// Helper function to get monthly values from annual
export function annualToMonthly(annual: number): number {
  return annual / 12;
}

// Helper function to get annual values from monthly
export function monthlyToAnnual(monthly: number): number {
  return monthly * 12;
}

