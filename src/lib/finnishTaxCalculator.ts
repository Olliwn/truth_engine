/**
 * Finnish Tax Calculator 2024
 * 
 * Calculates income taxes, deductions, and social insurance contributions
 * based on gross income and personal circumstances.
 */

import {
  NATIONAL_TAX_BRACKETS_2024,
  MUNICIPAL_TAX_RATES_2024,
  SOCIAL_INSURANCE_2024,
  TAX_DEDUCTIONS_2024,
  monthlyToAnnual,
  annualToMonthly,
} from './constants/tax2024';
import { Municipality } from './constants/benefits2024';

export interface TaxCalculationInput {
  grossMonthlyIncome: number;
  municipality: Municipality;
  age?: number; // For pension contribution rate
  isChurchMember?: boolean;
}

export interface TaxBreakdown {
  // Gross income
  grossMonthlyIncome: number;
  grossAnnualIncome: number;
  
  // Social insurance contributions
  pensionContribution: number;
  unemploymentInsurance: number;
  healthInsurance: number;
  totalSocialInsurance: number;
  
  // Taxable income after social insurance
  taxableIncome: number;
  
  // Deductions
  basicDeduction: number;
  earnedIncomeDeduction: number;
  workIncomeDeduction: number;
  
  // Taxes
  nationalTax: number;
  municipalTax: number;
  churchTax: number;
  totalTax: number;
  
  // Net results (monthly)
  totalDeductions: number;
  netMonthlyIncome: number;
  
  // Effective rates
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

/**
 * Calculate social insurance contributions
 */
function calculateSocialInsurance(
  grossAnnual: number,
  age: number = 35
): { pension: number; unemployment: number; health: number; total: number } {
  // Pension contribution rate based on age
  let pensionRate = SOCIAL_INSURANCE_2024.pensionUnder53;
  if (age >= 53 && age <= 62) {
    pensionRate = SOCIAL_INSURANCE_2024.pension53to62;
  }
  
  const pension = grossAnnual * pensionRate;
  const unemployment = grossAnnual * SOCIAL_INSURANCE_2024.unemployment;
  
  // Health insurance - day allowance only on income over threshold
  let health = grossAnnual * SOCIAL_INSURANCE_2024.healthInsuranceMedical;
  if (grossAnnual > SOCIAL_INSURANCE_2024.healthInsuranceThreshold) {
    health += (grossAnnual - SOCIAL_INSURANCE_2024.healthInsuranceThreshold) * 
              SOCIAL_INSURANCE_2024.healthInsuranceDayAllowance;
  }
  
  return {
    pension,
    unemployment,
    health,
    total: pension + unemployment + health,
  };
}

/**
 * Calculate basic deduction (perusvähennys)
 * Reduces municipal tax base
 */
function calculateBasicDeduction(taxableIncome: number): number {
  const { max, phaseOutRate } = TAX_DEDUCTIONS_2024.basicDeduction;
  
  if (taxableIncome <= 0) return max;
  
  const reduction = taxableIncome * phaseOutRate;
  const deduction = Math.max(0, max - reduction);
  
  return Math.min(deduction, taxableIncome);
}

/**
 * Calculate earned income deduction (ansiotulovähennys)
 * Reduces both state and municipal tax base
 */
function calculateEarnedIncomeDeduction(earnedIncome: number): number {
  const { max, buildUpRate, buildUpStart, buildUpEnd, phaseOutRate, phaseOutStart } = 
    TAX_DEDUCTIONS_2024.earnedIncomeDeduction;
  
  if (earnedIncome <= buildUpStart) return 0;
  
  // Build up phase
  let deduction = 0;
  if (earnedIncome > buildUpStart) {
    const buildUpIncome = Math.min(earnedIncome, buildUpEnd) - buildUpStart;
    deduction = buildUpIncome * buildUpRate;
  }
  
  // Additional build up between buildUpEnd and phaseOutStart
  if (earnedIncome > buildUpEnd && earnedIncome <= phaseOutStart) {
    deduction = max;
  }
  
  // Phase out
  if (earnedIncome > phaseOutStart) {
    const excessIncome = earnedIncome - phaseOutStart;
    deduction = Math.max(0, max - (excessIncome * phaseOutRate));
  }
  
  return Math.min(deduction, max);
}

/**
 * Calculate work income deduction (työtulovähennys)
 * Reduces final tax amount
 */
function calculateWorkIncomeDeduction(earnedIncome: number): number {
  const { max, buildUpRate, buildUpStart, phaseOutRate, phaseOutStart } = 
    TAX_DEDUCTIONS_2024.workIncomeDeduction;
  
  if (earnedIncome <= buildUpStart) return 0;
  
  // Build up
  let deduction = (earnedIncome - buildUpStart) * buildUpRate;
  deduction = Math.min(deduction, max);
  
  // Phase out
  if (earnedIncome > phaseOutStart) {
    const reduction = (earnedIncome - phaseOutStart) * phaseOutRate;
    deduction = Math.max(0, deduction - reduction);
  }
  
  return deduction;
}

/**
 * Calculate national income tax (progressive brackets)
 */
function calculateNationalTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  
  for (const bracket of NATIONAL_TAX_BRACKETS_2024) {
    if (taxableIncome <= bracket.max) {
      const incomeInBracket = taxableIncome - bracket.min;
      return bracket.base + (incomeInBracket * bracket.rate);
    }
  }
  
  // Highest bracket
  const highestBracket = NATIONAL_TAX_BRACKETS_2024[NATIONAL_TAX_BRACKETS_2024.length - 1];
  const incomeInBracket = taxableIncome - highestBracket.min;
  return highestBracket.base + (incomeInBracket * highestBracket.rate);
}

/**
 * Calculate municipal tax (flat rate on taxable income after deductions)
 */
function calculateMunicipalTax(
  taxableIncome: number,
  basicDeduction: number,
  earnedIncomeDeduction: number,
  municipality: Municipality
): number {
  const rate = MUNICIPAL_TAX_RATES_2024[municipality] || MUNICIPAL_TAX_RATES_2024.other;
  const taxBase = Math.max(0, taxableIncome - basicDeduction - earnedIncomeDeduction);
  return taxBase * rate;
}

/**
 * Internal tax calculation without marginal rate (to avoid recursion)
 */
function calculateTaxesInternal(input: TaxCalculationInput): Omit<TaxBreakdown, 'marginalTaxRate'> {
  const { grossMonthlyIncome, municipality, age = 35, isChurchMember = false } = input;
  
  const grossAnnual = monthlyToAnnual(grossMonthlyIncome);
  
  // Calculate social insurance
  const socialInsurance = calculateSocialInsurance(grossAnnual, age);
  
  // Taxable income after social insurance deductions
  const taxableIncome = grossAnnual - socialInsurance.total;
  
  // Calculate deductions
  const basicDeduction = calculateBasicDeduction(taxableIncome);
  const earnedIncomeDeduction = calculateEarnedIncomeDeduction(grossAnnual);
  const workIncomeDeduction = calculateWorkIncomeDeduction(grossAnnual);
  
  // Calculate taxes
  const stateTaxBase = Math.max(0, taxableIncome - earnedIncomeDeduction);
  const nationalTax = calculateNationalTax(stateTaxBase);
  const municipalTax = calculateMunicipalTax(
    taxableIncome, 
    basicDeduction, 
    earnedIncomeDeduction, 
    municipality
  );
  
  // Church tax (optional)
  const churchTax = isChurchMember 
    ? (taxableIncome - basicDeduction - earnedIncomeDeduction) * 0.01 
    : 0;
  
  // Apply work income deduction to final tax
  const totalTaxBeforeWorkDeduction = nationalTax + municipalTax + churchTax;
  const finalWorkDeduction = Math.min(workIncomeDeduction, totalTaxBeforeWorkDeduction);
  const totalTax = Math.max(0, totalTaxBeforeWorkDeduction - finalWorkDeduction);
  
  // Total annual deductions and net income
  const totalAnnualDeductions = socialInsurance.total + totalTax;
  const netAnnualIncome = grossAnnual - totalAnnualDeductions;
  
  // Calculate effective tax rate
  const effectiveTaxRate = grossAnnual > 0 ? totalAnnualDeductions / grossAnnual : 0;
  
  return {
    grossMonthlyIncome,
    grossAnnualIncome: grossAnnual,
    
    pensionContribution: annualToMonthly(socialInsurance.pension),
    unemploymentInsurance: annualToMonthly(socialInsurance.unemployment),
    healthInsurance: annualToMonthly(socialInsurance.health),
    totalSocialInsurance: annualToMonthly(socialInsurance.total),
    
    taxableIncome: annualToMonthly(taxableIncome),
    
    basicDeduction: annualToMonthly(basicDeduction),
    earnedIncomeDeduction: annualToMonthly(earnedIncomeDeduction),
    workIncomeDeduction: annualToMonthly(finalWorkDeduction),
    
    nationalTax: annualToMonthly(nationalTax),
    municipalTax: annualToMonthly(municipalTax),
    churchTax: annualToMonthly(churchTax),
    totalTax: annualToMonthly(totalTax),
    
    totalDeductions: annualToMonthly(totalAnnualDeductions),
    netMonthlyIncome: annualToMonthly(netAnnualIncome),
    
    effectiveTaxRate,
  };
}

/**
 * Main tax calculation function
 */
export function calculateTaxes(input: TaxCalculationInput): TaxBreakdown {
  const baseResult = calculateTaxesInternal(input);
  
  // Calculate marginal tax rate (rate on next euro)
  const marginalTaxRate = calculateMarginalTaxRate(
    input.grossMonthlyIncome, 
    input.municipality, 
    input.age || 35
  );
  
  return {
    ...baseResult,
    marginalTaxRate,
  };
}

/**
 * Calculate marginal tax rate at a given income level
 */
function calculateMarginalTaxRate(
  grossMonthlyIncome: number,
  municipality: Municipality,
  age: number = 35
): number {
  const increment = 1; // €1 increment
  
  // Use internal function to avoid recursion
  const current = calculateTaxesInternal({
    grossMonthlyIncome,
    municipality,
    age,
  });
  
  const next = calculateTaxesInternal({
    grossMonthlyIncome: grossMonthlyIncome + increment,
    municipality,
    age,
  });
  
  const netDifference = next.netMonthlyIncome - current.netMonthlyIncome;
  
  // Marginal rate is 1 minus what you keep
  return 1 - netDifference;
}

/**
 * Calculate net income after taxes only (used by benefits calculator)
 */
export function calculateNetIncomeAfterTax(
  grossMonthlyIncome: number,
  municipality: Municipality = 'helsinki'
): number {
  const taxes = calculateTaxesInternal({ grossMonthlyIncome, municipality });
  return taxes.netMonthlyIncome;
}

