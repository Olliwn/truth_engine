/**
 * Fiscal Module
 * 
 * Handles tax calculations, state costs, and fiscal flow computations
 * for both native and immigrant populations.
 */

import {
  PopulationState,
  PersonYearFiscal,
  AnnualFiscalFlows,
  GDPAdjustedFlows,
  stringToImmigrantKey,
  ImmigrantType,
} from './SimulationState';

import {
  getImmigrantEmploymentRate,
  getImmigrantIncomeDecile,
  getImmigrantWelfareDependency,
} from './immigration';

import {
  INCOME_BY_DECILE,
  calculateIncomeByAge,
  getHealthcareCost,
  EDUCATION_COSTS,
  PENSION_SYSTEM,
  VAT_RATES,
} from '../constants/lifecycleCosts';

import { DECILE_CHARACTERISTICS } from '../constants/finnishDemographics';

import { calculateTaxes } from '../finnishTaxCalculator';

// ===========================================
// Performance Cache
// ===========================================

// Cache for person-year fiscal calculations
// Key: "age:decile:gdpMultiplier" (rounded to 2 decimals)
const fiscalCache = new Map<string, PersonYearFiscal>();
const MAX_CACHE_SIZE = 50000;

function getCacheKey(
  age: number,
  decile: number,
  gdpMultiplier: number,
  employmentRate?: number,
  welfareMultiplier?: number,
  unemploymentRateMultiplier?: number
): string {
  // Round multipliers to avoid cache misses from floating point differences
  const gdpRounded = Math.round(gdpMultiplier * 100) / 100;
  const empRounded = employmentRate ? Math.round(employmentRate * 100) : 'x';
  const welRounded = welfareMultiplier ? Math.round(welfareMultiplier * 100) : 'x';
  const uneRounded = unemploymentRateMultiplier ? Math.round(unemploymentRateMultiplier * 100) : 100;
  return `${age}:${decile}:${gdpRounded}:${empRounded}:${welRounded}:${uneRounded}`;
}

/** Clear the fiscal calculation cache */
export function clearFiscalCache(): void {
  fiscalCache.clear();
}

/** Get cache statistics for debugging */
export function getFiscalCacheStats(): { size: number; maxSize: number } {
  return { size: fiscalCache.size, maxSize: MAX_CACHE_SIZE };
}

// ===========================================
// Person-Year Fiscal Calculation
// ===========================================

export interface FiscalCalculationOptions {
  /** GDP income multiplier for wage growth */
  gdpIncomeMultiplier?: number;
  
  /** Override employment rate (for immigrants) */
  employmentRate?: number;
  
  /** Override income decile (for immigrants) */
  incomeDecileOverride?: number;
  
  /** Override welfare dependency (for immigrants) */
  welfareMultiplier?: number;
  
  /** 
   * Multiplier for unemployment rate relative to baseline (6.5%).
   * E.g., 1.0 = 6.5%, 1.5 = 9.75%, 0.7 = 4.55%
   */
  unemploymentRateMultiplier?: number;
}

/**
 * Calculate fiscal flows for a single person-year.
 * This is the core calculation that determines contributions and costs
 * for a person of a given age and income decile.
 * 
 * Results are cached for performance (same inputs = same outputs).
 */
export function calculatePersonYearFiscal(
  age: number,
  baseIncomeDecile: number,
  options: FiscalCalculationOptions = {}
): PersonYearFiscal {
  const {
    gdpIncomeMultiplier = 1.0,
    employmentRate,
    incomeDecileOverride,
    welfareMultiplier = 1.0,
    unemploymentRateMultiplier = 1.0,
  } = options;
  
  const incomeDecile = incomeDecileOverride ?? baseIncomeDecile;
  
  // Check cache first
  const cacheKey = getCacheKey(age, incomeDecile, gdpIncomeMultiplier, employmentRate, welfareMultiplier, unemploymentRateMultiplier);
  const cached = fiscalCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const decileChar = DECILE_CHARACTERISTICS[incomeDecile] || DECILE_CHARACTERISTICS[5];
  const workStartAge = 19;  // Simplified average
  const retirementAge = decileChar?.avgRetirementAge ?? 65;
  
  const result: PersonYearFiscal = {
    incomeTax: 0,
    socialInsurance: 0,
    vat: 0,
    education: 0,
    healthcare: 0,
    pension: 0,
    benefits: 0,
    totalContributions: 0,
    totalCosts: 0,
    netFlow: 0,
  };
  
  // === STATE COSTS ===
  
  // Education costs (ages 1-25 depending on path)
  if (age >= 1 && age <= 6) {
    result.education = EDUCATION_COSTS.daycare.perYear;
  } else if (age >= 7 && age <= 15) {
    result.education = EDUCATION_COSTS.primarySchool.perYear;
  } else if (age >= 16 && age <= 18) {
    // Higher deciles more likely to continue education
    if (incomeDecile >= 5) {
      result.education = EDUCATION_COSTS.upperSecondary.perYear;
    } else {
      result.education = EDUCATION_COSTS.vocational.perYear * 0.7;
    }
  } else if (age >= 19 && age <= 24 && incomeDecile >= 7) {
    // Higher deciles more likely to have university education
    result.education = EDUCATION_COSTS.universityBachelor.perYear * 0.5;
  }
  
  // Healthcare costs (U-shaped by age, modified by decile)
  const baseHealthcare = getHealthcareCost(age, false);
  const healthMultiplier = decileChar?.healthMultiplier ?? 1.0;
  result.healthcare = baseHealthcare * healthMultiplier;
  
  // Pension costs (only for retirees)
  if (age >= retirementAge) {
    const peakIncome = INCOME_BY_DECILE[incomeDecile] * gdpIncomeMultiplier;
    // Scale unemployment years by national rate multiplier
    const baseUnemploymentYears = decileChar?.avgUnemploymentYears ?? 2;
    const avgUnemploymentYears = baseUnemploymentYears * unemploymentRateMultiplier;
    const yearsWorked = Math.max(0, retirementAge - workStartAge - avgUnemploymentYears);
    const avgIncome = peakIncome * 0.7;  // Lifetime average ~70% of peak
    const pensionAccrual = avgIncome * PENSION_SYSTEM.accrualRates.age17to52 * yearsWorked;
    
    // Apply life expectancy coefficient
    result.pension = Math.max(
      pensionAccrual * 0.7,
      PENSION_SYSTEM.nationalPension.single * 12 * gdpIncomeMultiplier
    );
  }
  
  // Benefits (unemployment, housing allowance for lower deciles)
  if (age >= workStartAge && age < retirementAge) {
    // Scale unemployment probability by national rate multiplier
    const baseUnemploymentYears = decileChar?.avgUnemploymentYears ?? 2;
    const avgUnemploymentYears = baseUnemploymentYears * unemploymentRateMultiplier;
    const unemploymentProbability = avgUnemploymentYears / (retirementAge - workStartAge);
    result.benefits = unemploymentProbability * 10000 * welfareMultiplier;
    
    // Housing allowance for lowest deciles
    if (incomeDecile <= 3) {
      result.benefits += 3000 * (4 - incomeDecile) / 3 * welfareMultiplier;
    }
  }
  
  result.totalCosts = result.education + result.healthcare + result.pension + result.benefits;
  
  // === CONTRIBUTIONS ===
  
  // Only working-age people contribute significantly
  if (age >= workStartAge && age < retirementAge) {
    // Get effective employment rate (scaled by unemployment rate multiplier)
    const baseUnemploymentYears = decileChar?.avgUnemploymentYears ?? 2;
    const scaledUnemploymentYears = baseUnemploymentYears * unemploymentRateMultiplier;
    const baseEmploymentRate = 1 - scaledUnemploymentYears / (retirementAge - workStartAge);
    const effectiveEmploymentRate = employmentRate ?? baseEmploymentRate;
    
    if (effectiveEmploymentRate > 0) {
      const baseIncome = calculateIncomeByAge(age, workStartAge, incomeDecile, true);
      const income = baseIncome * gdpIncomeMultiplier;
      const effectiveIncome = income * effectiveEmploymentRate;
      
      if (effectiveIncome > 0) {
        const monthlyIncome = effectiveIncome / 12;
        
        try {
          const taxResult = calculateTaxes({
            grossMonthlyIncome: monthlyIncome,
            municipality: 'helsinki',
            age: age,
          });
          
          result.incomeTax = (taxResult.nationalTax + taxResult.municipalTax) * 12;
          result.socialInsurance = (
            taxResult.pensionContribution +
            taxResult.unemploymentInsurance +
            taxResult.healthInsurance
          ) * 12;
          
          // VAT on consumption (assume 60% of net income is consumed with VAT)
          const netIncome = taxResult.netMonthlyIncome * 12;
          result.vat = netIncome * 0.6 * VAT_RATES.effectiveRate;
        } catch {
          // Fallback if tax calculation fails
          result.incomeTax = effectiveIncome * 0.25;
          result.socialInsurance = effectiveIncome * 0.10;
          result.vat = effectiveIncome * 0.65 * 0.6 * VAT_RATES.effectiveRate;
        }
      }
    }
  } else if (age >= retirementAge) {
    // Retirees still pay VAT on consumption
    const pensionIncome = result.pension;
    result.vat = pensionIncome * 0.7 * VAT_RATES.effectiveRate;
  }
  
  result.totalContributions = result.incomeTax + result.socialInsurance + result.vat;
  
  // Ensure no NaN values
  if (!isFinite(result.totalContributions)) result.totalContributions = 0;
  if (!isFinite(result.totalCosts)) result.totalCosts = 0;
  
  result.netFlow = result.totalContributions - result.totalCosts;
  
  // Store in cache (with size limit)
  if (fiscalCache.size < MAX_CACHE_SIZE) {
    fiscalCache.set(cacheKey, result);
  }
  
  return result;
}

// ===========================================
// Immigrant-Specific Fiscal Calculation
// ===========================================

/**
 * Calculate fiscal flows for an immigrant person-year.
 * Uses immigrant-specific employment and income parameters.
 */
export function calculateImmigrantPersonYearFiscal(
  age: number,
  type: ImmigrantType,
  yearsInCountry: number,
  gdpIncomeMultiplier: number = 1.0
): PersonYearFiscal {
  const employmentRate = getImmigrantEmploymentRate(type, yearsInCountry);
  const incomeDecile = getImmigrantIncomeDecile(type, yearsInCountry);
  const welfareDependency = getImmigrantWelfareDependency(type, yearsInCountry);
  
  // Welfare multiplier: higher dependency = more benefits
  const welfareMultiplier = 1 + (welfareDependency - 0.05);  // Baseline 5% dependency
  
  return calculatePersonYearFiscal(age, 5, {  // Base decile 5 (median)
    gdpIncomeMultiplier,
    employmentRate,
    incomeDecileOverride: incomeDecile,
    welfareMultiplier: Math.max(1, welfareMultiplier),
  });
}

// ===========================================
// Aggregate Fiscal Calculations
// ===========================================

/**
 * Calculate aggregate fiscal flows for entire population.
 */
export function calculateAggregeFiscalFlows(
  state: PopulationState,
  year: number,
  gdpIncomeMultiplier: number = 1.0,
  interestExpense: number = 0,
  unemploymentRateMultiplier: number = 1.0
): AnnualFiscalFlows {
  // Initialize result
  const result: AnnualFiscalFlows = {
    totalPopulation: 0,
    nativePopulation: 0,
    immigrantPopulation: 0,
    children: 0,
    workingAge: 0,
    elderly: 0,
    dependencyRatio: 0,
    oldAgeDependencyRatio: 0,
    incomeTaxRevenue: 0,
    socialInsuranceRevenue: 0,
    vatRevenue: 0,
    totalContributions: 0,
    educationCosts: 0,
    healthcareCosts: 0,
    pensionCosts: 0,
    benefitCosts: 0,
    interestExpense,
    totalStateCosts: 0,
    primaryBalance: 0,
    netFiscalBalance: 0,
    nativeFiscal: { contributions: 0, costs: 0, balance: 0 },
    immigrantFiscal: {
      contributions: 0,
      costs: 0,
      balance: 0,
      byType: {
        workBased: { count: 0, contributions: 0, costs: 0, balance: 0 },
        family: { count: 0, contributions: 0, costs: 0, balance: 0 },
        humanitarian: { count: 0, contributions: 0, costs: 0, balance: 0 },
      },
    },
  };
  
  // Process native population
  for (const [age, count] of state.native) {
    if (count <= 0) continue;
    
    result.nativePopulation += count;
    result.totalPopulation += count;
    
    // Age group
    if (age < 15) result.children += count;
    else if (age < 65) result.workingAge += count;
    else result.elderly += count;
    
    // Calculate fiscal for each decile (10% each)
    for (let decile = 1; decile <= 10; decile++) {
      const decileCount = count * 0.10;
      const personFiscal = calculatePersonYearFiscal(age, decile, {
        gdpIncomeMultiplier,
        unemploymentRateMultiplier,
      });
      
      // Aggregate contributions
      result.incomeTaxRevenue += decileCount * personFiscal.incomeTax;
      result.socialInsuranceRevenue += decileCount * personFiscal.socialInsurance;
      result.vatRevenue += decileCount * personFiscal.vat;
      
      // Aggregate costs
      result.educationCosts += decileCount * personFiscal.education;
      result.healthcareCosts += decileCount * personFiscal.healthcare;
      result.pensionCosts += decileCount * personFiscal.pension;
      result.benefitCosts += decileCount * personFiscal.benefits;
      
      // Native totals
      result.nativeFiscal.contributions += decileCount * personFiscal.totalContributions;
      result.nativeFiscal.costs += decileCount * personFiscal.totalCosts;
    }
  }
  
  // Process immigrant population
  for (const [keyStr, count] of state.immigrants) {
    if (count <= 0) continue;
    
    const key = stringToImmigrantKey(keyStr);
    const yearsInCountry = year - key.arrivalYear;
    
    result.immigrantPopulation += count;
    result.totalPopulation += count;
    
    // Age group
    if (key.age < 15) result.children += count;
    else if (key.age < 65) result.workingAge += count;
    else result.elderly += count;
    
    // Calculate fiscal for this immigrant cohort
    const personFiscal = calculateImmigrantPersonYearFiscal(
      key.age,
      key.type,
      yearsInCountry,
      gdpIncomeMultiplier
    );
    
    // Aggregate contributions
    result.incomeTaxRevenue += count * personFiscal.incomeTax;
    result.socialInsuranceRevenue += count * personFiscal.socialInsurance;
    result.vatRevenue += count * personFiscal.vat;
    
    // Aggregate costs
    result.educationCosts += count * personFiscal.education;
    result.healthcareCosts += count * personFiscal.healthcare;
    result.pensionCosts += count * personFiscal.pension;
    result.benefitCosts += count * personFiscal.benefits;
    
    // Immigrant totals
    result.immigrantFiscal.contributions += count * personFiscal.totalContributions;
    result.immigrantFiscal.costs += count * personFiscal.totalCosts;
    
    // By type
    const typeKey = key.type === 'work_based' ? 'workBased' :
                    key.type === 'family' ? 'family' : 'humanitarian';
    result.immigrantFiscal.byType[typeKey].count += count;
    result.immigrantFiscal.byType[typeKey].contributions += count * personFiscal.totalContributions;
    result.immigrantFiscal.byType[typeKey].costs += count * personFiscal.totalCosts;
  }
  
  // Calculate totals
  result.totalContributions = result.incomeTaxRevenue + result.socialInsuranceRevenue + result.vatRevenue;
  result.totalStateCosts = result.educationCosts + result.healthcareCosts + 
                           result.pensionCosts + result.benefitCosts + result.interestExpense;
  
  // Calculate balances
  result.primaryBalance = result.totalContributions - 
    (result.educationCosts + result.healthcareCosts + result.pensionCosts + result.benefitCosts);
  result.netFiscalBalance = result.totalContributions - result.totalStateCosts;
  
  result.nativeFiscal.balance = result.nativeFiscal.contributions - result.nativeFiscal.costs;
  result.immigrantFiscal.balance = result.immigrantFiscal.contributions - result.immigrantFiscal.costs;
  
  for (const typeKey of ['workBased', 'family', 'humanitarian'] as const) {
    result.immigrantFiscal.byType[typeKey].balance = 
      result.immigrantFiscal.byType[typeKey].contributions - 
      result.immigrantFiscal.byType[typeKey].costs;
  }
  
  // Dependency ratios
  if (result.workingAge > 0) {
    result.dependencyRatio = (result.children + result.elderly) / result.workingAge * 100;
    result.oldAgeDependencyRatio = result.elderly / result.workingAge * 100;
  } else {
    result.dependencyRatio = 100;
    result.oldAgeDependencyRatio = 100;
  }
  
  // Convert to millions EUR
  const toMillions = (x: number) => x / 1_000_000;
  result.incomeTaxRevenue = toMillions(result.incomeTaxRevenue);
  result.socialInsuranceRevenue = toMillions(result.socialInsuranceRevenue);
  result.vatRevenue = toMillions(result.vatRevenue);
  result.totalContributions = toMillions(result.totalContributions);
  result.educationCosts = toMillions(result.educationCosts);
  result.healthcareCosts = toMillions(result.healthcareCosts);
  result.pensionCosts = toMillions(result.pensionCosts);
  result.benefitCosts = toMillions(result.benefitCosts);
  result.totalStateCosts = toMillions(result.totalStateCosts);
  result.primaryBalance = toMillions(result.primaryBalance);
  result.netFiscalBalance = toMillions(result.netFiscalBalance);
  result.nativeFiscal.contributions = toMillions(result.nativeFiscal.contributions);
  result.nativeFiscal.costs = toMillions(result.nativeFiscal.costs);
  result.nativeFiscal.balance = toMillions(result.nativeFiscal.balance);
  result.immigrantFiscal.contributions = toMillions(result.immigrantFiscal.contributions);
  result.immigrantFiscal.costs = toMillions(result.immigrantFiscal.costs);
  result.immigrantFiscal.balance = toMillions(result.immigrantFiscal.balance);
  for (const typeKey of ['workBased', 'family', 'humanitarian'] as const) {
    result.immigrantFiscal.byType[typeKey].contributions = toMillions(result.immigrantFiscal.byType[typeKey].contributions);
    result.immigrantFiscal.byType[typeKey].costs = toMillions(result.immigrantFiscal.byType[typeKey].costs);
    result.immigrantFiscal.byType[typeKey].balance = toMillions(result.immigrantFiscal.byType[typeKey].balance);
  }
  
  return result;
}

// ===========================================
// GDP-Adjusted Fiscal Flows
// ===========================================

/**
 * Apply GDP growth effects to fiscal flows.
 * Includes sector-specific cost premiums (healthcare, pensions).
 */
export function applyGDPAdjustments(
  baseFiscal: AnnualFiscalFlows,
  year: number,
  baseYear: number,
  revenueElasticity: number,
  healthcareCostGrowthPremium: number,
  pensionCostGrowthPremium: number,
  cumulativeGdpMultiplier: number
): GDPAdjustedFlows {
  const yearsFromBase = Math.max(0, year - baseYear);
  
  // Revenue adjustment (elasticity effect beyond wage growth)
  const revenueElasticityAdjustment = Math.pow(revenueElasticity, yearsFromBase);
  
  // Cost premiums for sectors that grow faster than GDP
  const healthcarePremiumMultiplier = Math.pow(1 + healthcareCostGrowthPremium, yearsFromBase);
  const pensionPremiumMultiplier = Math.pow(1 + pensionCostGrowthPremium, yearsFromBase);
  
  // Apply adjustments only for future years
  const adjustedContributions = year > baseYear
    ? baseFiscal.totalContributions * revenueElasticityAdjustment
    : baseFiscal.totalContributions;
  
  // Healthcare: GDP multiplier + premium (if not already in wage calc)
  const adjustedHealthcare = year > baseYear
    ? baseFiscal.healthcareCosts * cumulativeGdpMultiplier * healthcarePremiumMultiplier
    : baseFiscal.healthcareCosts;
  
  // Pensions: already GDP-adjusted via pension calculation, add premium
  const adjustedPensions = year > baseYear
    ? baseFiscal.pensionCosts * pensionPremiumMultiplier
    : baseFiscal.pensionCosts;
  
  // Education: already tracks wages via cost calculation
  const adjustedEducation = baseFiscal.educationCosts * (year > baseYear ? cumulativeGdpMultiplier : 1);
  
  // Benefits: already GDP-adjusted via wage-based calculation
  const adjustedBenefits = baseFiscal.benefitCosts;
  
  const adjustedTotalCosts = adjustedEducation + adjustedHealthcare + 
                              adjustedPensions + adjustedBenefits + 
                              baseFiscal.interestExpense;
  
  return {
    adjustedContributions,
    adjustedEducation,
    adjustedHealthcare,
    adjustedPensions,
    adjustedBenefits,
    adjustedTotalCosts,
    adjustedBalance: adjustedContributions - adjustedTotalCosts,
  };
}

