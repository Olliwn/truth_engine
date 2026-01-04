/**
 * Population-Level Fiscal Sustainability Simulator
 * 
 * Simulates Finland's aggregate fiscal balance by:
 * 1. Tracking all birth cohorts over time
 * 2. Applying decile-based income/cost distributions
 * 3. Summing contributions and state costs across the entire population
 * 4. Supporting demographic scenarios (birth rate, immigration)
 * 
 * This provides a macro view of fiscal sustainability that accounts for
 * demographic transitions (baby boom → baby bust).
 */

import {
  FINNISH_BIRTHS_BY_YEAR,
  getSurvivalProbability,
  getCohortSizeAtAge,
  DECILE_CHARACTERISTICS,
  getPopulationPyramid,
  getWorkingAgePopulation,
  getElderlyPopulation,
  getPopulationByYear,
} from './constants/finnishDemographics';

import {
  INCOME_BY_DECILE,
  calculateIncomeByAge,
  getHealthcareCost,
  EDUCATION_COSTS,
  PENSION_SYSTEM,
  VAT_RATES,
} from './constants/lifecycleCosts';

import {
  DemographicScenario,
  DEFAULT_SCENARIO,
  calculateTFR,
  tfrToAnnualBirths,
  IMMIGRATION_PROFILES,
  estimateAnnualFiscalImpact,
  getHistoricalTFR,
  GDP_SCENARIOS,
  GDPScenario,
  getHistoricalGDP,
  projectGDP,
  calculateBreakevenGrowthRate,
  calculateSecondOrderEffects,
  SecondOrderEffects,
  INTEREST_RATE_SCENARIOS,
  InterestRateScenario,
  getHistoricalDebt,
  calculateEffectiveGDPGrowth,
} from './constants/demographicScenarios';

import { calculateTaxes } from './finnishTaxCalculator';

// ===========================================
// Types
// ===========================================

export interface AnnualPopulationResult {
  year: number;
  
  // Population breakdown
  totalPopulation: number;
  children: number;       // 0-14
  workingAge: number;     // 15-64  
  elderly: number;        // 65+
  
  // Dependency ratios
  dependencyRatio: number;        // (children + elderly) / workingAge
  oldAgeDependencyRatio: number;  // elderly / workingAge
  
  // Fiscal aggregates (in millions EUR) - BASE (without GDP growth)
  totalContributions: number;
  totalStateCosts: number;
  netFiscalBalance: number;
  
  // GDP-adjusted fiscal figures (in millions EUR)
  gdpAdjustedContributions: number;
  gdpAdjustedCosts: number;
  gdpAdjustedBalance: number;
  
  // Per capita metrics
  avgContributionPerWorker: number;
  avgCostPerPerson: number;
  
  // Breakdown of costs
  educationCosts: number;
  healthcareCosts: number;
  pensionCosts: number;
  benefitCosts: number;
  
  // Breakdown of contributions
  incomeTaxRevenue: number;
  socialInsuranceRevenue: number;
  vatRevenue: number;
  
  // Demographic scenario data
  tfr: number;                    // Total Fertility Rate for this year
  annualBirths: number;           // Projected/actual births
  
  // Immigration breakdown (in millions EUR)
  immigrationFiscalImpact: number;
  immigrationByType: {
    workBased: { count: number; fiscalImpact: number };
    family: { count: number; fiscalImpact: number };
    humanitarian: { count: number; fiscalImpact: number };
  };
  
  // GDP data
  gdp: number;                     // GDP in billions EUR
  gdpGrowthRate: number;           // Applied growth rate this year
  govtSpendingPctGDP: number;      // Government spending as % of GDP
  deficitPctGDP: number;           // Deficit as % of GDP (negative = deficit)
  
  // Debt data
  debtStock: number;               // Cumulative debt in billions EUR
  debtToGDP: number;               // Debt as % of GDP
  interestExpense: number;         // Annual interest payment in millions EUR
  interestRate: number;            // Applied interest rate this year
  primaryBalance: number;          // Fiscal balance before interest (millions EUR)
  
  // Workforce-adjusted GDP data
  workforceChangeRate: number;     // Annual change in working-age population (e.g., -0.005 = -0.5%)
  productivityGrowthRate: number;  // Productivity growth component
  effectiveGdpGrowthRate: number;  // Actual GDP growth = productivity + workforce change
  isWorkforceAdjusted: boolean;    // Whether GDP is adjusted for workforce
}

export interface PopulationSimulationResult {
  startYear: number;
  endYear: number;
  annualResults: AnnualPopulationResult[];
  
  // Summary statistics
  summary: {
    peakSurplusYear: number;
    peakSurplusAmount: number;
    firstDeficitYear: number | null;
    cumulativeBalance: number;
    avgDependencyRatio: number;
    populationChange: number;
    // GDP-adjusted summaries
    gdpAdjustedCumulativeBalance: number;
    firstGdpAdjustedSurplusYear: number | null;  // Year budget becomes balanced with GDP growth
    breakevenGrowthRate: number | null;          // Growth rate needed to balance by 2060
    secondOrderEffects: SecondOrderEffects | null;
    // Debt summaries
    finalDebtStock: number;          // Debt in billions EUR at end year
    finalDebtToGDP: number;          // Debt/GDP ratio at end year
    peakDebtToGDP: number;           // Maximum debt/GDP ratio
    peakDebtYear: number;            // Year of maximum debt/GDP
    totalInterestPaid: number;       // Cumulative interest in millions EUR
  };
}

// ===========================================
// Core Simulation Functions
// ===========================================

/**
 * Calculate fiscal contributions and costs for a single person-year
 * at a given age and income decile
 */
function calculatePersonYearFiscal(
  age: number,
  incomeDecile: number,
  year: number
): { contributions: number; stateCosts: number; breakdown: Record<string, number> } {
  const decileChar = DECILE_CHARACTERISTICS[incomeDecile];
  const workStartAge = 19; // Simplified
  const retirementAge = decileChar.avgRetirementAge;
  
  let contributions = 0;
  let stateCosts = 0;
  const breakdown: Record<string, number> = {
    incomeTax: 0,
    socialInsurance: 0,
    vat: 0,
    education: 0,
    healthcare: 0,
    pension: 0,
    benefits: 0,
  };
  
  // === STATE COSTS ===
  
  // Education costs (ages 1-25 depending on path)
  if (age >= 1 && age <= 6) {
    breakdown.education = EDUCATION_COSTS.daycare.perYear;
  } else if (age >= 7 && age <= 15) {
    breakdown.education = EDUCATION_COSTS.primarySchool.perYear;
  } else if (age >= 16 && age <= 18) {
    // Higher deciles more likely to continue education
    if (incomeDecile >= 5) {
      breakdown.education = EDUCATION_COSTS.upperSecondary.perYear;
    } else {
      breakdown.education = EDUCATION_COSTS.vocational.perYear * 0.7; // Some drop out
    }
  } else if (age >= 19 && age <= 24 && incomeDecile >= 7) {
    // Higher deciles more likely to have university education
    breakdown.education = EDUCATION_COSTS.universityBachelor.perYear * 0.5; // Prorated
  }
  
  // Healthcare costs (U-shaped by age, modified by decile)
  const baseHealthcare = getHealthcareCost(age, false);
  breakdown.healthcare = baseHealthcare * decileChar.healthMultiplier;
  
  // Pension costs (only for retirees)
  if (age >= retirementAge) {
    // Pension based on lifetime earnings (simplified)
    const peakIncome = INCOME_BY_DECILE[incomeDecile];
    const yearsWorked = Math.max(0, retirementAge - workStartAge - decileChar.avgUnemploymentYears);
    const avgIncome = peakIncome * 0.7; // Lifetime average ~70% of peak
    const pensionAccrual = avgIncome * PENSION_SYSTEM.accrualRates.age17to52 * yearsWorked;
    
    // Apply life expectancy coefficient
    breakdown.pension = Math.max(
      pensionAccrual * 0.7, // Simplified pension calculation
      PENSION_SYSTEM.nationalPension.single * 12 // Minimum pension
    );
  }
  
  // Benefits (unemployment, housing allowance for lower deciles)
  if (age >= workStartAge && age < retirementAge) {
    // Probability of being unemployed this year
    const unemploymentProbability = decileChar.avgUnemploymentYears / (retirementAge - workStartAge);
    breakdown.benefits = unemploymentProbability * 10000; // Annual unemployment benefit
    
    // Housing allowance for lowest deciles
    if (incomeDecile <= 3) {
      breakdown.benefits += 3000 * (4 - incomeDecile) / 3; // Scaled by need
    }
  }
  
  stateCosts = breakdown.education + breakdown.healthcare + breakdown.pension + breakdown.benefits;
  
  // === CONTRIBUTIONS ===
  
  // Only working-age, employed people contribute significantly
  if (age >= workStartAge && age < retirementAge) {
    // Probability of being employed
    const employmentProbability = 1 - decileChar.avgUnemploymentYears / (retirementAge - workStartAge);
    
    if (employmentProbability > 0) {
      const income = calculateIncomeByAge(age, workStartAge, incomeDecile, true);
      const effectiveIncome = income * employmentProbability;
      
      if (effectiveIncome > 0) {
        // Calculate taxes
        const monthlyIncome = effectiveIncome / 12;
        try {
          const taxResult = calculateTaxes({
            grossMonthlyIncome: monthlyIncome,
            municipality: 'helsinki',
            age: age,
          });
          
          breakdown.incomeTax = (taxResult.nationalTax + taxResult.municipalTax) * 12;
          breakdown.socialInsurance = (
            taxResult.pensionContribution + 
            taxResult.unemploymentInsurance + 
            taxResult.healthInsurance
          ) * 12;
          
        // VAT on consumption (assume 60% of net income is consumed with VAT)
        const netIncome = taxResult.netMonthlyIncome * 12;
        breakdown.vat = netIncome * 0.6 * VAT_RATES.effectiveRate;
        } catch {
          // If tax calculation fails, use simplified estimate
          breakdown.incomeTax = effectiveIncome * 0.25;
          breakdown.socialInsurance = effectiveIncome * 0.10;
          breakdown.vat = effectiveIncome * 0.65 * 0.6 * VAT_RATES.effectiveRate;
        }
      }
    }
  } else if (age >= retirementAge) {
    // Retirees still pay VAT on consumption
    const pensionIncome = breakdown.pension;
    breakdown.vat = pensionIncome * 0.7 * VAT_RATES.effectiveRate;
  }
  
  contributions = breakdown.incomeTax + breakdown.socialInsurance + breakdown.vat;
  
  // Ensure no NaN values
  if (!isFinite(contributions)) contributions = 0;
  if (!isFinite(stateCosts)) stateCosts = 0;
  
  return { contributions, stateCosts, breakdown };
}

// ===========================================
// Scenario-Based Calculations
// ===========================================

// Cache for immigrant cohorts (arrival year -> count by type)
const immigrantCohorts: Map<number, {
  workBased: number;
  family: number;
  humanitarian: number;
}> = new Map();

/**
 * Get births for a specific year based on scenario
 */
function getBirthsForYear(
  year: number,
  scenario: DemographicScenario,
  totalPopulation: number
): { births: number; tfr: number } {
  // Historical data (before 2025)
  if (year <= 2024 && FINNISH_BIRTHS_BY_YEAR[year]) {
    return {
      births: FINNISH_BIRTHS_BY_YEAR[year],
      tfr: getHistoricalTFR(year),
    };
  }
  
  // Calculate TFR based on scenario
  const tfr = calculateTFR(
    year,
    scenario.birthRate.customTFR,
    scenario.birthRate.transitionYear
  );
  
  // Convert TFR to births
  const births = tfrToAnnualBirths(tfr, totalPopulation);
  
  return { births, tfr };
}

/**
 * Calculate immigration fiscal impact for a year
 */
function calculateImmigrationImpact(
  year: number,
  scenario: DemographicScenario,
  simulationStartYear: number
): {
  totalImpact: number;
  byType: {
    workBased: { count: number; fiscalImpact: number };
    family: { count: number; fiscalImpact: number };
    humanitarian: { count: number; fiscalImpact: number };
  };
  populationAddition: number;
} {
  let totalImpact = 0;
  let populationAddition = 0;
  
  const byType = {
    workBased: { count: 0, fiscalImpact: 0 },
    family: { count: 0, fiscalImpact: 0 },
    humanitarian: { count: 0, fiscalImpact: 0 },
  };
  
  // Only add new immigrants from simulation start year onwards
  if (year >= simulationStartYear) {
    // Store this year's arrivals
    immigrantCohorts.set(year, {
      workBased: scenario.immigration.workBased,
      family: scenario.immigration.family,
      humanitarian: scenario.immigration.humanitarian,
    });
  }
  
  // Calculate fiscal impact of all immigrant cohorts still in country
  for (const [arrivalYear, cohort] of immigrantCohorts.entries()) {
    if (arrivalYear > year) continue;
    
    const yearsInCountry = year - arrivalYear;
    
    // Assume ~2% emigration per year
    const retentionRate = Math.pow(0.98, yearsInCountry);
    
    // Work-based immigrants
    const workBasedRemaining = Math.round(cohort.workBased * retentionRate);
    const workBasedImpact = workBasedRemaining * 
      estimateAnnualFiscalImpact(IMMIGRATION_PROFILES.work_based, yearsInCountry);
    byType.workBased.count += workBasedRemaining;
    byType.workBased.fiscalImpact += workBasedImpact;
    
    // Family immigrants
    const familyRemaining = Math.round(cohort.family * retentionRate);
    const familyImpact = familyRemaining * 
      estimateAnnualFiscalImpact(IMMIGRATION_PROFILES.family, yearsInCountry);
    byType.family.count += familyRemaining;
    byType.family.fiscalImpact += familyImpact;
    
    // Humanitarian immigrants
    const humanitarianRemaining = Math.round(cohort.humanitarian * retentionRate);
    const humanitarianImpact = humanitarianRemaining * 
      estimateAnnualFiscalImpact(IMMIGRATION_PROFILES.humanitarian, yearsInCountry);
    byType.humanitarian.count += humanitarianRemaining;
    byType.humanitarian.fiscalImpact += humanitarianImpact;
    
    populationAddition += workBasedRemaining + familyRemaining + humanitarianRemaining;
  }
  
  totalImpact = byType.workBased.fiscalImpact + 
    byType.family.fiscalImpact + 
    byType.humanitarian.fiscalImpact;
  
  return { totalImpact, byType, populationAddition };
}

/**
 * Simulate the entire Finnish population for a single year
 */
export function simulatePopulationYear(
  year: number,
  scenario: DemographicScenario = DEFAULT_SCENARIO,
  simulationStartYear: number = 1990,
  cumulativeGdpMultiplier: number = 1.0,  // Passed from range simulation for compounding
  previousDebtStock: number = 0,  // Previous year's debt in billions EUR
  previousWorkingAge: number = 0,  // Previous year's working-age population
  workforceChangeRate: number = 0,  // Calculated workforce change (Y-1 to Y-2) / Y-2
  calculatedEffectiveGrowthRate: number | null = null  // Effective GDP growth rate calculated by parent
): AnnualPopulationResult {
  let totalContributions = 0;
  let totalStateCosts = 0;
  
  let educationCosts = 0;
  let healthcareCosts = 0;
  let pensionCosts = 0;
  let benefitCosts = 0;
  
  let incomeTaxRevenue = 0;
  let socialInsuranceRevenue = 0;
  let vatRevenue = 0;
  
  let totalPopulation = 0;
  let children = 0;
  let workingAge = 0;
  let elderly = 0;
  
  // Get GDP scenario
  const gdpScenarioId = scenario.gdp?.scenarioId || 'slow_growth';
  const gdpScenario = GDP_SCENARIOS[gdpScenarioId] || GDP_SCENARIOS['slow_growth'];
  const growthRate = scenario.gdp?.customGrowthRate ?? gdpScenario.realGrowthRate;
  
  // Get interest rate scenario
  const interestRateScenarioId = scenario.interestRate?.scenarioId || 'low';
  const interestRateScenario = INTEREST_RATE_SCENARIOS[interestRateScenarioId] || INTEREST_RATE_SCENARIOS['low'];
  const interestRate = scenario.interestRate?.customRate ?? interestRateScenario.rate;
  
  // Iterate through all ages (0-100)
  for (let age = 0; age <= 100; age++) {
    const birthYear = year - age;
    
    // Get cohort size - use scenario-based births for future years
    let cohortSize: number;
    if (birthYear > 2024) {
      // Future birth year - use scenario projection
      // For simplicity, estimate based on TFR trajectory
      const futureTFR = calculateTFR(
        birthYear,
        scenario.birthRate.customTFR,
        scenario.birthRate.transitionYear
      );
      // Estimate births based on projected population at that time
      const estimatedPopulation = 5500000; // Simplified
      cohortSize = tfrToAnnualBirths(futureTFR, estimatedPopulation);
      // Apply survival to current age
      cohortSize = Math.round(cohortSize * getSurvivalProbability(age));
    } else {
      cohortSize = getCohortSizeAtAge(birthYear, age);
    }
    
    if (cohortSize <= 0) continue;
    
    totalPopulation += cohortSize;
    
    // Categorize by age group
    if (age < 15) {
      children += cohortSize;
    } else if (age < 65) {
      workingAge += cohortSize;
    } else {
      elderly += cohortSize;
    }
    
    // For each income decile (10% of population each)
    for (let decile = 1; decile <= 10; decile++) {
      const decilePopulation = cohortSize * 0.10;
      
      const personYear = calculatePersonYearFiscal(age, decile, year);
      
      totalContributions += decilePopulation * personYear.contributions;
      totalStateCosts += decilePopulation * personYear.stateCosts;
      
      educationCosts += decilePopulation * personYear.breakdown.education;
      healthcareCosts += decilePopulation * personYear.breakdown.healthcare;
      pensionCosts += decilePopulation * personYear.breakdown.pension;
      benefitCosts += decilePopulation * personYear.breakdown.benefits;
      
      incomeTaxRevenue += decilePopulation * personYear.breakdown.incomeTax;
      socialInsuranceRevenue += decilePopulation * personYear.breakdown.socialInsurance;
      vatRevenue += decilePopulation * personYear.breakdown.vat;
    }
  }
  
  // Calculate immigration impact
  const immigrationResult = calculateImmigrationImpact(year, scenario, simulationStartYear);
  
  // Add immigration to totals
  totalPopulation += immigrationResult.populationAddition;
  totalContributions += Math.max(0, immigrationResult.totalImpact);
  totalStateCosts += Math.abs(Math.min(0, immigrationResult.totalImpact));
  
  // Get birth rate data for this year
  const birthData = getBirthsForYear(year, scenario, totalPopulation);
  
  // Convert to millions EUR
  const toMillions = (x: number) => x / 1_000_000;
  
  const dependencyRatio = workingAge > 0 ? (children + elderly) / workingAge * 100 : 100;
  const oldAgeDependencyRatio = workingAge > 0 ? elderly / workingAge * 100 : 100;
  
  // Calculate GDP for this year
  const baseYear = 2024;
  const baseGDP = getHistoricalGDP(baseYear);  // ~282 billion EUR
  let currentGDP: number;
  
  if (year <= baseYear) {
    currentGDP = getHistoricalGDP(year);
  } else {
    // Project GDP with growth rate
    currentGDP = projectGDP(baseYear, year, growthRate, baseGDP);
  }
  
  // Apply GDP growth multiplier to fiscal figures
  // Revenues grow with GDP (elasticity ~1.0)
  // Costs grow with GDP + sector-specific premiums
  const yearsFromBase = Math.max(0, year - baseYear);
  
  // Revenue multiplier: grows with GDP
  const revenueMultiplier = cumulativeGdpMultiplier * gdpScenario.revenueElasticity;
  
  // Cost multipliers: different sectors grow at different rates
  // Healthcare and pensions grow faster than GDP (aging + Baumol's disease)
  const healthcareCostMultiplier = cumulativeGdpMultiplier * 
    Math.pow(1 + gdpScenario.healthcareCostGrowthPremium, yearsFromBase);
  const pensionCostMultiplier = cumulativeGdpMultiplier * 
    Math.pow(1 + gdpScenario.pensionCostGrowthPremium, yearsFromBase);
  // Education and benefits roughly track GDP
  const baseCostMultiplier = cumulativeGdpMultiplier;
  
  // Apply multipliers (only for future years)
  const gdpAdjustedContributions = year > baseYear 
    ? totalContributions * revenueMultiplier 
    : totalContributions;
  
  const gdpAdjustedHealthcare = year > baseYear 
    ? healthcareCosts * healthcareCostMultiplier 
    : healthcareCosts;
  const gdpAdjustedPensions = year > baseYear 
    ? pensionCosts * pensionCostMultiplier 
    : pensionCosts;
  const gdpAdjustedEducation = year > baseYear 
    ? educationCosts * baseCostMultiplier 
    : educationCosts;
  const gdpAdjustedBenefits = year > baseYear 
    ? benefitCosts * baseCostMultiplier 
    : benefitCosts;
  
  const gdpAdjustedCosts = gdpAdjustedHealthcare + gdpAdjustedPensions + 
    gdpAdjustedEducation + gdpAdjustedBenefits;
  const gdpAdjustedBalance = gdpAdjustedContributions - gdpAdjustedCosts;
  
  // Government spending as % of GDP
  const totalStateCostsInBillions = toMillions(totalStateCosts) / 1000;  // Convert to billions
  const govtSpendingPctGDP = (totalStateCostsInBillions / currentGDP) * 100;
  
  // Primary balance (before interest) as % of GDP
  const primaryBalanceInBillions = toMillions(totalContributions - totalStateCosts) / 1000;
  const deficitPctGDP = (primaryBalanceInBillions / currentGDP) * 100;
  
  // Debt calculations
  // For historical years, use actual debt data; for future years, accumulate
  const baseDebtYear = 2024;
  let debtStock: number;
  let interestExpenseMillions: number;
  
  if (year <= baseDebtYear) {
    // Historical debt
    debtStock = getHistoricalDebt(year);
    // Approximate historical interest expense (~2% average rate historically)
    interestExpenseMillions = debtStock * 0.02 * 1000;  // billions * rate * 1000 = millions EUR
  } else {
    // Future interest expense on previous debt stock
    interestExpenseMillions = previousDebtStock * interestRate * 1000;  // billions * rate * 1000 = millions EUR
    
    // Total balance including interest
    // Primary balance is already calculated (contributions - costs before interest)
    // Total deficit = primary deficit + interest expense
    const totalDeficitBillions = -primaryBalanceInBillions + (interestExpenseMillions / 1000);
    
    // Debt grows by total deficit (if positive = we're borrowing more)
    debtStock = previousDebtStock + totalDeficitBillions;
  }
  
  const debtToGDP = (debtStock / currentGDP) * 100;
  
  return {
    year,
    totalPopulation: Math.round(totalPopulation),
    children: Math.round(children),
    workingAge: Math.round(workingAge),
    elderly: Math.round(elderly),
    dependencyRatio,
    oldAgeDependencyRatio,
    totalContributions: toMillions(totalContributions),
    totalStateCosts: toMillions(totalStateCosts),
    netFiscalBalance: toMillions(totalContributions - totalStateCosts),
    gdpAdjustedContributions: toMillions(gdpAdjustedContributions),
    gdpAdjustedCosts: toMillions(gdpAdjustedCosts),
    gdpAdjustedBalance: toMillions(gdpAdjustedBalance),
    avgContributionPerWorker: workingAge > 0 ? totalContributions / workingAge : 0,
    avgCostPerPerson: totalPopulation > 0 ? totalStateCosts / totalPopulation : 0,
    educationCosts: toMillions(educationCosts),
    healthcareCosts: toMillions(healthcareCosts),
    pensionCosts: toMillions(pensionCosts),
    benefitCosts: toMillions(benefitCosts),
    incomeTaxRevenue: toMillions(incomeTaxRevenue),
    socialInsuranceRevenue: toMillions(socialInsuranceRevenue),
    vatRevenue: toMillions(vatRevenue),
    // Demographic data
    tfr: birthData.tfr,
    annualBirths: birthData.births,
    immigrationFiscalImpact: toMillions(immigrationResult.totalImpact),
    immigrationByType: {
      workBased: {
        count: immigrationResult.byType.workBased.count,
        fiscalImpact: toMillions(immigrationResult.byType.workBased.fiscalImpact),
      },
      family: {
        count: immigrationResult.byType.family.count,
        fiscalImpact: toMillions(immigrationResult.byType.family.fiscalImpact),
      },
      humanitarian: {
        count: immigrationResult.byType.humanitarian.count,
        fiscalImpact: toMillions(immigrationResult.byType.humanitarian.fiscalImpact),
      },
    },
    // GDP data
    gdp: currentGDP,
    gdpGrowthRate: growthRate,
    govtSpendingPctGDP,
    deficitPctGDP,
    // Debt data
    debtStock,
    debtToGDP,
    interestExpense: interestExpenseMillions,  // Already in millions EUR
    interestRate,
    primaryBalance: toMillions(totalContributions - totalStateCosts),
    // Workforce-adjusted GDP data
    // Use the passed-in values calculated by the parent function (simulatePopulationRange)
    // which correctly tracks Y-2 to Y-1 workforce change for year Y's GDP growth
    workforceChangeRate: workforceChangeRate,  // Passed from parent's correct calculation
    productivityGrowthRate: gdpScenario.productivityGrowthRate,
    effectiveGdpGrowthRate: calculatedEffectiveGrowthRate ?? growthRate,  // Use parent's calculation if provided
    isWorkforceAdjusted: gdpScenario.adjustForWorkforce,
  };
}

/**
 * Reset immigrant cohorts cache (call before new simulation)
 */
export function resetImmigrantCohorts(): void {
  immigrantCohorts.clear();
}

/**
 * Run full population simulation across a range of years
 */
export function simulatePopulationRange(
  startYear: number = 1990,
  endYear: number = 2060,
  scenario: DemographicScenario = DEFAULT_SCENARIO
): PopulationSimulationResult {
  // Reset immigrant cohorts for fresh simulation
  resetImmigrantCohorts();
  
  const annualResults: AnnualPopulationResult[] = [];
  
  // Get GDP scenario
  const gdpScenarioId = scenario.gdp?.scenarioId || 'productivity_15pct';
  const gdpScenario = GDP_SCENARIOS[gdpScenarioId] || GDP_SCENARIOS['productivity_15pct'];
  
  const baseYear = 2024;
  let cumulativeGdpMultiplier = 1.0;
  let previousDebtStock = getHistoricalDebt(startYear - 1);  // Start with debt from year before simulation
  
  // Track TWO years of working age data to calculate year-over-year change correctly
  // workingAgeYearN_2 = working age from year Y-2
  // workingAgeYearN_1 = working age from year Y-1
  let workingAgeYearN_2 = 0;
  let workingAgeYearN_1 = 0;
  
  const tempResults: AnnualPopulationResult[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    // For first iteration, use base growth rate
    let effectiveGrowthRate = scenario.gdp?.customGrowthRate ?? gdpScenario.realGrowthRate;
    
    // Calculate workforce change rate: (Y-1 working age - Y-2 working age) / Y-2 working age
    // This represents the workforce growth that occurred leading into year Y
    let workforceChangeRate = 0;
    if (workingAgeYearN_2 > 0 && year > startYear + 1) {
      // We need at least 2 years of data to calculate change
      workforceChangeRate = (workingAgeYearN_1 - workingAgeYearN_2) / workingAgeYearN_2;
    }
    
    // Calculate effective GDP growth rate (productivity + workforce change)
    if (year > baseYear && gdpScenario.adjustForWorkforce && !scenario.gdp?.customGrowthRate) {
      effectiveGrowthRate = calculateEffectiveGDPGrowth(gdpScenario, workforceChangeRate);
    }
    
    // Update cumulative multiplier for years after base year
    if (year > baseYear) {
      cumulativeGdpMultiplier *= (1 + effectiveGrowthRate);
    }
    
    const yearResult = simulatePopulationYear(
      year, 
      scenario, 
      startYear, 
      cumulativeGdpMultiplier, 
      previousDebtStock,
      workingAgeYearN_1,  // Pass previous year's working age for display purposes
      workforceChangeRate,  // Pass the calculated workforce change rate
      effectiveGrowthRate  // Pass the effective growth rate we calculated
    );
    tempResults.push(yearResult);
    
    // Shift values for next iteration: Y-1 becomes Y-2, current becomes Y-1
    previousDebtStock = yearResult.debtStock;
    workingAgeYearN_2 = workingAgeYearN_1;
    workingAgeYearN_1 = yearResult.workingAge;
  }
  
  // Use temp results as final results
  annualResults.push(...tempResults);
  
  // Calculate summary statistics
  let peakSurplusYear = startYear;
  let peakSurplusAmount = -Infinity;
  let firstDeficitYear: number | null = null;
  let cumulativeBalance = 0;
  let gdpAdjustedCumulativeBalance = 0;
  let firstGdpAdjustedSurplusYear: number | null = null;
  let totalDependencyRatio = 0;
  let peakDebtToGDP = 0;
  let peakDebtYear = startYear;
  let totalInterestPaid = 0;
  
  for (const result of annualResults) {
    cumulativeBalance += result.netFiscalBalance;
    gdpAdjustedCumulativeBalance += result.gdpAdjustedBalance;
    totalDependencyRatio += result.dependencyRatio;
    totalInterestPaid += result.interestExpense;
    
    if (result.netFiscalBalance > peakSurplusAmount) {
      peakSurplusAmount = result.netFiscalBalance;
      peakSurplusYear = result.year;
    }
    
    if (result.netFiscalBalance < 0 && firstDeficitYear === null) {
      firstDeficitYear = result.year;
    }
    
    // Track when GDP-adjusted balance becomes positive (budget balanced with growth)
    if (result.gdpAdjustedBalance > 0 && result.year > baseYear && firstGdpAdjustedSurplusYear === null) {
      firstGdpAdjustedSurplusYear = result.year;
    }
    
    // Track peak debt/GDP
    if (result.debtToGDP > peakDebtToGDP) {
      peakDebtToGDP = result.debtToGDP;
      peakDebtYear = result.year;
    }
  }
  
  const populationChange = annualResults.length > 1
    ? annualResults[annualResults.length - 1].totalPopulation - annualResults[0].totalPopulation
    : 0;
  
  const lastResult = annualResults[annualResults.length - 1];
  const finalDebtStock = lastResult?.debtStock ?? 0;
  const finalDebtToGDP = lastResult?.debtToGDP ?? 0;
  
  // Calculate breakeven growth rate needed to balance by 2060
  // Use the current (2024) deficit as the baseline
  const year2024Data = annualResults.find(r => r.year === 2024);
  let breakevenGrowthRate: number | null = null;
  let secondOrderEffects: SecondOrderEffects | null = null;
  
  if (year2024Data && year2024Data.netFiscalBalance < 0) {
    const currentDeficitBillions = year2024Data.netFiscalBalance / 1000;  // Convert millions to billions
    const avgCostPremium = (gdpScenario.healthcareCostGrowthPremium + gdpScenario.pensionCostGrowthPremium) / 2;
    
    breakevenGrowthRate = calculateBreakevenGrowthRate(
      currentDeficitBillions,
      year2024Data.gdp,
      2060,
      2024,
      gdpScenario.revenueElasticity,
      avgCostPremium
    );
    
    // Calculate second-order effects (deficit contribution to GDP)
    secondOrderEffects = calculateSecondOrderEffects(
      currentDeficitBillions,
      year2024Data.gdp,
      breakevenGrowthRate,
      0.8  // Conservative fiscal multiplier for Finland
    );
  }
  
  return {
    startYear,
    endYear,
    annualResults,
    summary: {
      peakSurplusYear,
      peakSurplusAmount,
      firstDeficitYear,
      cumulativeBalance,
      avgDependencyRatio: totalDependencyRatio / annualResults.length,
      populationChange,
      gdpAdjustedCumulativeBalance,
      firstGdpAdjustedSurplusYear,
      breakevenGrowthRate,
      secondOrderEffects,
      // Debt summaries
      finalDebtStock,
      finalDebtToGDP,
      peakDebtToGDP,
      peakDebtYear,
      totalInterestPaid,
    },
  };
}

/**
 * Get population pyramid data for visualization
 */
export function getPopulationPyramidData(year: number): Array<{
  age: number;
  male: number;
  female: number;
  total: number;
}> {
  const pyramid = getPopulationPyramid(year);
  
  // Approximate 49% male, 51% female (actual Finnish ratio)
  return pyramid.map(({ age, population }) => ({
    age,
    male: Math.round(population * 0.49),
    female: Math.round(population * 0.51),
    total: population,
  }));
}

/**
 * Compare two years to show demographic shift
 */
export function compareDemographics(year1: number, year2: number): {
  year1: AnnualPopulationResult;
  year2: AnnualPopulationResult;
  changes: {
    populationChange: number;
    workingAgeChange: number;
    elderlyChange: number;
    dependencyRatioChange: number;
    fiscalBalanceChange: number;
  };
} {
  const result1 = simulatePopulationYear(year1);
  const result2 = simulatePopulationYear(year2);
  
  return {
    year1: result1,
    year2: result2,
    changes: {
      populationChange: result2.totalPopulation - result1.totalPopulation,
      workingAgeChange: result2.workingAge - result1.workingAge,
      elderlyChange: result2.elderly - result1.elderly,
      dependencyRatioChange: result2.dependencyRatio - result1.dependencyRatio,
      fiscalBalanceChange: result2.netFiscalBalance - result1.netFiscalBalance,
    },
  };
}

// Re-export demographic helpers
export { getPopulationPyramid, getWorkingAgePopulation, getElderlyPopulation };

// Re-export scenario types and utilities
export { 
  DEFAULT_SCENARIO,
  BIRTH_RATE_PRESETS,
  IMMIGRATION_PROFILES,
  DEFAULT_IMMIGRATION,
  GDP_SCENARIOS,
  DEFAULT_GDP_SCENARIO,
  HISTORICAL_GDP,
  getHistoricalGDP,
  projectGDP,
  calculateBreakevenGrowthRate,
  calculateSecondOrderEffects,
  INTEREST_RATE_SCENARIOS,
  DEFAULT_INTEREST_RATE_SCENARIO,
  HISTORICAL_DEBT,
  getHistoricalDebt,
  calculateEffectiveGDPGrowth,
} from './constants/demographicScenarios';

export type { 
  DemographicScenario, 
  BirthRatePreset, 
  ImmigrationProfile,
  GDPScenario,
  SecondOrderEffects,
  InterestRateScenario,
} from './constants/demographicScenarios';

