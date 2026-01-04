/**
 * Spending Projection Engine
 * 
 * Projects government spending by COFOG category using historical data (1990-2024)
 * and scenario-based projections (2025-2060).
 */

import {
  COFOG_CATEGORIES,
  SPENDING_GROUPS,
  SPENDING_BASE_YEAR,
  DEMOGRAPHIC_SCENARIOS,
  POPULATION_SCENARIOS,
  GDP_SCENARIOS_SPENDING,
  DISCRETIONARY_SCENARIOS,
  GOVERNMENT_SCENARIOS,
  COFOGCode,
  SpendingGroupId,
  SpendingScenario,
  DEFAULT_SPENDING_SCENARIO,
  DemographicWeights,
} from '../constants/governmentSpending';

// ===========================================
// Types
// ===========================================

/**
 * Spending data for a single COFOG category in a single year.
 */
export interface COFOGSpending {
  code: COFOGCode;
  name: string;
  amountMillion: number;
  pctOfGDP: number;
  perCapita: number;
}

/**
 * Complete spending data for a single year.
 */
export interface YearlySpending {
  year: number;
  isHistorical: boolean;
  totalMillion: number;
  totalPctGDP: number;
  byCategory: Record<COFOGCode, COFOGSpending>;
  byGroup: Record<SpendingGroupId, {
    name: string;
    amountMillion: number;
    pctOfGDP: number;
    categories: COFOGCode[];
  }>;
}

/**
 * Demographic context for projections.
 */
export interface DemographicContext {
  totalPopulation: number;
  children: number;      // 0-14
  workingAge: number;    // 15-64
  elderly: number;       // 65+
}

/**
 * Economic context for projections.
 */
export interface EconomicContext {
  gdpBillions: number;
  gdpGrowthRate: number;
  interestRate: number;
  debtStockBillions: number;
}

/**
 * Projection context combining demographics and economics.
 */
export interface ProjectionContext {
  year: number;
  demographics: DemographicContext;
  economics: EconomicContext;
  baseDemographics: DemographicContext;  // 2024 baseline
  baseEconomics: EconomicContext;        // 2024 baseline
}

// ===========================================
// Historical Data Cache
// ===========================================

// Cache for historical spending data loaded from JSON
let historicalDataCache: Map<number, YearlySpending> | null = null;
let historicalDataPromise: Promise<Map<number, YearlySpending>> | null = null;

/**
 * Load historical spending data from public_spending.json.
 * This function is designed to work both server-side and client-side.
 */
export async function loadHistoricalSpendingData(): Promise<Map<number, YearlySpending>> {
  // Return cached data if available
  if (historicalDataCache) {
    return historicalDataCache;
  }
  
  // Return existing promise if loading is in progress
  if (historicalDataPromise) {
    return historicalDataPromise;
  }
  
  // Start loading
  historicalDataPromise = (async () => {
    try {
      // Try fetch first (works in browser and some server contexts)
      const basePath = typeof window !== 'undefined' 
        ? (process.env.NEXT_PUBLIC_BASE_PATH || '')
        : '';
      
      let data: PublicSpendingJSON;
      
      if (typeof window !== 'undefined') {
        // Browser: use fetch
        const response = await fetch(`${basePath}/data/public_spending.json`);
        if (!response.ok) {
          throw new Error(`Failed to load spending data: ${response.status}`);
        }
        data = await response.json();
      } else {
        // Server: use fs
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', 'data', 'public_spending.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(fileContent);
      }
      
      // Convert to our format
      const cache = new Map<number, YearlySpending>();
      
      for (const entry of data.time_series) {
        const yearData = convertTimeSeriesEntry(entry, data.cofog_names);
        cache.set(entry.year, yearData);
      }
      
      historicalDataCache = cache;
      return cache;
    } catch (error) {
      console.error('Failed to load historical spending data:', error);
      // Return empty cache on error
      return new Map();
    }
  })();
  
  return historicalDataPromise;
}

/**
 * Get historical spending for a specific year (synchronous, requires pre-loading).
 */
export function getHistoricalSpending(year: number): YearlySpending | null {
  if (!historicalDataCache) {
    console.warn('Historical spending data not loaded. Call loadHistoricalSpendingData() first.');
    return null;
  }
  return historicalDataCache.get(year) || null;
}

/**
 * Get all historical years available.
 */
export function getHistoricalYears(): number[] {
  if (!historicalDataCache) return [];
  return Array.from(historicalDataCache.keys()).sort((a, b) => a - b);
}

// ===========================================
// Projection Engine
// ===========================================

/**
 * Project spending for a single year using scenarios.
 */
export function projectSpending(
  context: ProjectionContext,
  scenario: SpendingScenario = DEFAULT_SPENDING_SCENARIO
): YearlySpending {
  const { year } = context;
  
  // For historical years, return actual data
  if (year <= SPENDING_BASE_YEAR) {
    const historical = getHistoricalSpending(year);
    if (historical) return historical;
    // Fall through to projection if historical data not available
  }
  
  // Get base year spending (2024)
  const baseSpending = getHistoricalSpending(SPENDING_BASE_YEAR);
  if (!baseSpending) {
    throw new Error(`Base year ${SPENDING_BASE_YEAR} spending data not available`);
  }
  
  // Project each spending group
  const byCategory: Record<string, COFOGSpending> = {} as Record<COFOGCode, COFOGSpending>;
  const byGroup: YearlySpending['byGroup'] = {} as YearlySpending['byGroup'];
  
  let totalMillion = 0;
  
  for (const [groupId, groupConfig] of Object.entries(SPENDING_GROUPS)) {
    const groupScenarioId = getScenarioIdForGroup(groupId as SpendingGroupId, scenario);
    
    let groupTotal = 0;
    
    for (const cofogCode of groupConfig.cofogCodes) {
      const baseCategory = baseSpending.byCategory[cofogCode];
      if (!baseCategory) continue;
      
      // Project this category
      const projectedAmount = projectCategory(
        baseCategory.amountMillion,
        groupConfig.driver,
        groupScenarioId,
        context,
        groupConfig.demographicWeights
      );
      
      byCategory[cofogCode] = {
        code: cofogCode,
        name: baseCategory.name,
        amountMillion: projectedAmount,
        pctOfGDP: (projectedAmount / (context.economics.gdpBillions * 1000)) * 100,
        perCapita: projectedAmount * 1_000_000 / context.demographics.totalPopulation,
      };
      
      groupTotal += projectedAmount;
      totalMillion += projectedAmount;
    }
    
    byGroup[groupId as SpendingGroupId] = {
      name: groupConfig.name,
      amountMillion: groupTotal,
      pctOfGDP: (groupTotal / (context.economics.gdpBillions * 1000)) * 100,
      categories: groupConfig.cofogCodes,
    };
  }
  
  return {
    year,
    isHistorical: false,
    totalMillion,
    totalPctGDP: (totalMillion / (context.economics.gdpBillions * 1000)) * 100,
    byCategory: byCategory as Record<COFOGCode, COFOGSpending>,
    byGroup,
  };
}

/**
 * Project a single category based on driver type.
 */
function projectCategory(
  baseAmount: number,
  driver: string,
  scenarioId: string,
  context: ProjectionContext,
  demographicWeights?: DemographicWeights
): number {
  const yearsSinceBase = context.year - SPENDING_BASE_YEAR;
  
  switch (driver) {
    case 'demographic':
      return projectDemographic(baseAmount, scenarioId, context, demographicWeights!);
    
    case 'population':
      return projectPopulation(baseAmount, scenarioId, context, yearsSinceBase);
    
    case 'gdp':
      return projectGDP(baseAmount, scenarioId, context, yearsSinceBase);
    
    case 'discretionary':
      return projectDiscretionary(baseAmount, scenarioId, yearsSinceBase);
    
    case 'mixed':
      return projectMixed(baseAmount, scenarioId, context, yearsSinceBase);
    
    default:
      return baseAmount;
  }
}

/**
 * Project demographic-driven spending (healthcare, social protection, education).
 */
function projectDemographic(
  baseAmount: number,
  scenarioId: string,
  context: ProjectionContext,
  weights: DemographicWeights
): number {
  const scenario = DEMOGRAPHIC_SCENARIOS[scenarioId as keyof typeof DEMOGRAPHIC_SCENARIOS];
  if (!scenario) return baseAmount;
  
  // Calculate demographic ratio
  const elderlyRatio = context.demographics.elderly / context.baseDemographics.elderly;
  const childrenRatio = context.demographics.children / context.baseDemographics.children;
  const workingAgeRatio = context.demographics.workingAge / context.baseDemographics.workingAge;
  
  const demographicMultiplier = 
    weights.elderly * elderlyRatio +
    weights.children * childrenRatio +
    weights.workingAge * workingAgeRatio;
  
  // Apply scenario premium/discount compounded over years
  const yearsSinceBase = context.year - SPENDING_BASE_YEAR;
  const scenarioMultiplier = Math.pow(scenario.multiplier, yearsSinceBase);
  
  return baseAmount * demographicMultiplier * scenarioMultiplier;
}

/**
 * Project population-driven spending (security).
 */
function projectPopulation(
  baseAmount: number,
  scenarioId: string,
  context: ProjectionContext,
  yearsSinceBase: number
): number {
  const scenario = POPULATION_SCENARIOS[scenarioId as keyof typeof POPULATION_SCENARIOS];
  if (!scenario) return baseAmount;
  
  if (scenario.mode === 'absolute') {
    // Absolute freeze
    return baseAmount * Math.pow(1 + scenario.growthRate, yearsSinceBase);
  }
  
  // Per capita modes
  const populationRatio = context.demographics.totalPopulation / context.baseDemographics.totalPopulation;
  const growthMultiplier = Math.pow(1 + scenario.growthRate, yearsSinceBase);
  
  return baseAmount * populationRatio * growthMultiplier;
}

/**
 * Project GDP-driven spending (infrastructure).
 */
function projectGDP(
  baseAmount: number,
  scenarioId: string,
  context: ProjectionContext,
  yearsSinceBase: number
): number {
  const scenario = GDP_SCENARIOS_SPENDING[scenarioId as keyof typeof GDP_SCENARIOS_SPENDING];
  if (!scenario) return baseAmount;
  
  const gdpRatio = context.economics.gdpBillions / context.baseEconomics.gdpBillions;
  
  if (scenario.mode === 'ratio') {
    // Maintain constant GDP share
    return baseAmount * gdpRatio;
  }
  
  if (scenario.mode === 'absolute') {
    // Grow with GDP in absolute terms
    return baseAmount * gdpRatio;
  }
  
  if (scenario.mode === 'ratio_growth') {
    // Grow GDP share over time
    const ratioGrowth = scenario.ratioGrowth || 0;
    const additionalGrowth = Math.pow(1 + ratioGrowth, yearsSinceBase);
    return baseAmount * gdpRatio * additionalGrowth;
  }
  
  return baseAmount;
}

/**
 * Project discretionary spending (culture).
 */
function projectDiscretionary(
  baseAmount: number,
  scenarioId: string,
  yearsSinceBase: number
): number {
  const scenario = DISCRETIONARY_SCENARIOS[scenarioId as keyof typeof DISCRETIONARY_SCENARIOS];
  if (!scenario) return baseAmount;
  
  return baseAmount * Math.pow(1 + scenario.growthRate, yearsSinceBase);
}

/**
 * Project mixed-driver spending (government operations).
 */
function projectMixed(
  baseAmount: number,
  scenarioId: string,
  context: ProjectionContext,
  yearsSinceBase: number
): number {
  const scenario = GOVERNMENT_SCENARIOS[scenarioId as keyof typeof GOVERNMENT_SCENARIOS];
  if (!scenario) return baseAmount;
  
  // Split G01 into admin (~75%) and debt service (~25%)
  // Based on historical data: G0107 (debt transactions) is ~25% of G01
  const adminPortion = 0.75;
  const debtPortion = 0.25;
  
  let adminSpending: number;
  let debtSpending: number;
  
  // Admin spending projection
  if (scenario.adminGrowth === 'gdp') {
    const gdpRatio = context.economics.gdpBillions / context.baseEconomics.gdpBillions;
    adminSpending = baseAmount * adminPortion * gdpRatio;
  } else if (scenario.adminGrowth === 'freeze') {
    adminSpending = baseAmount * adminPortion;
  } else {
    adminSpending = baseAmount * adminPortion;
  }
  
  // Debt service projection
  if (scenario.debtService === 'calculated') {
    // Calculate from debt stock and interest rate
    const baseDebtService = baseAmount * debtPortion;
    const debtRatio = context.economics.debtStockBillions / context.baseEconomics.debtStockBillions;
    const rateRatio = context.economics.interestRate / context.baseEconomics.interestRate;
    debtSpending = baseDebtService * debtRatio * rateRatio;
  } else if (scenario.debtService === 'optimistic') {
    // Assume gradual debt reduction
    const reductionRate = 0.02;  // 2% annual debt reduction
    const baseDebtService = baseAmount * debtPortion;
    debtSpending = baseDebtService * Math.pow(1 - reductionRate, yearsSinceBase);
  } else {
    debtSpending = baseAmount * debtPortion;
  }
  
  return adminSpending + debtSpending;
}

/**
 * Get the scenario ID for a spending group from the full scenario config.
 */
function getScenarioIdForGroup(groupId: SpendingGroupId, scenario: SpendingScenario): string {
  switch (groupId) {
    case 'healthcare_aging': return scenario.healthcareAging;
    case 'education_youth': return scenario.educationYouth;
    case 'security': return scenario.security;
    case 'infrastructure': return scenario.infrastructure;
    case 'government': return scenario.government;
    case 'culture': return scenario.culture;
    default: return 'baseline';
  }
}

// ===========================================
// Legacy Compatibility
// ===========================================

/**
 * Legacy spending breakdown for backward compatibility with existing simulation.
 */
export interface LegacySpendingBreakdown {
  educationCosts: number;      // G09
  healthcareCosts: number;     // G07
  pensionCosts: number;        // G10 (pensions portion ~65%)
  benefitCosts: number;        // G10 (benefits portion ~35%) + other welfare
  otherCosts: number;          // G01-G06, G08
  totalStateCosts: number;
}

/**
 * Convert COFOG spending to legacy 4-category breakdown.
 */
export function convertToLegacyBreakdown(spending: YearlySpending): LegacySpendingBreakdown {
  const g09 = spending.byCategory.G09?.amountMillion || 0;  // Education
  const g07 = spending.byCategory.G07?.amountMillion || 0;  // Health
  const g10 = spending.byCategory.G10?.amountMillion || 0;  // Social protection
  
  // G10 split: ~65% pensions, ~35% other benefits (based on Finnish data)
  const pensionShare = 0.65;
  const benefitShare = 0.35;
  
  // Other categories
  const otherCOFOG = ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G08'] as COFOGCode[];
  const otherTotal = otherCOFOG.reduce((sum, code) => 
    sum + (spending.byCategory[code]?.amountMillion || 0), 0
  );
  
  return {
    educationCosts: g09,
    healthcareCosts: g07,
    pensionCosts: g10 * pensionShare,
    benefitCosts: g10 * benefitShare,
    otherCosts: otherTotal,
    totalStateCosts: spending.totalMillion,
  };
}

// ===========================================
// JSON Types (for parsing public_spending.json)
// ===========================================

interface PublicSpendingJSON {
  time_series: Array<{
    year: number;
    total_million?: number;
    total_pct_gdp?: number;
    categories: Record<string, {
      amount_million: number;
      pct_of_gdp: number;
    }>;
  }>;
  cofog_names: Record<string, string>;
}

/**
 * Convert a time series entry from JSON to our format.
 */
function convertTimeSeriesEntry(
  entry: PublicSpendingJSON['time_series'][0],
  cofogNames: Record<string, string>
): YearlySpending {
  const byCategory: Record<string, COFOGSpending> = {} as Record<COFOGCode, COFOGSpending>;
  const byGroup: YearlySpending['byGroup'] = {} as YearlySpending['byGroup'];
  
  let totalMillion = 0;
  let totalPctGDP = 0;
  
  // Process each category
  for (const [code, data] of Object.entries(entry.categories)) {
    const cofogCode = code as COFOGCode;
    if (!COFOG_CATEGORIES[cofogCode]) continue;
    
    byCategory[cofogCode] = {
      code: cofogCode,
      name: cofogNames[code] || COFOG_CATEGORIES[cofogCode]?.name || code,
      amountMillion: data.amount_million,
      pctOfGDP: data.pct_of_gdp,
      perCapita: 0,  // Not available in time series
    };
    
    totalMillion += data.amount_million;
    totalPctGDP += data.pct_of_gdp;
  }
  
  // Aggregate by spending groups
  for (const [groupId, groupConfig] of Object.entries(SPENDING_GROUPS)) {
    let groupTotal = 0;
    let groupPctGDP = 0;
    
    for (const cofogCode of groupConfig.cofogCodes) {
      const cat = byCategory[cofogCode];
      if (cat) {
        groupTotal += cat.amountMillion;
        groupPctGDP += cat.pctOfGDP;
      }
    }
    
    byGroup[groupId as SpendingGroupId] = {
      name: groupConfig.name,
      amountMillion: groupTotal,
      pctOfGDP: groupPctGDP,
      categories: groupConfig.cofogCodes,
    };
  }
  
  return {
    year: entry.year,
    isHistorical: true,
    totalMillion,
    totalPctGDP,
    byCategory: byCategory as Record<COFOGCode, COFOGSpending>,
    byGroup,
  };
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Generate spending data for a range of years.
 */
export async function generateSpendingTimeline(
  startYear: number,
  endYear: number,
  getContext: (year: number) => ProjectionContext,
  scenario: SpendingScenario = DEFAULT_SPENDING_SCENARIO
): Promise<YearlySpending[]> {
  // Ensure historical data is loaded
  await loadHistoricalSpendingData();
  
  const results: YearlySpending[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const context = getContext(year);
    const spending = projectSpending(context, scenario);
    results.push(spending);
  }
  
  return results;
}

/**
 * Calculate spending change between two years.
 */
export function calculateSpendingChange(
  from: YearlySpending,
  to: YearlySpending
): {
  totalChange: number;
  totalChangePct: number;
  byCategory: Record<COFOGCode, { change: number; changePct: number }>;
} {
  const byCategory: Record<string, { change: number; changePct: number }> = {};
  
  for (const code of Object.keys(COFOG_CATEGORIES) as COFOGCode[]) {
    const fromAmount = from.byCategory[code]?.amountMillion || 0;
    const toAmount = to.byCategory[code]?.amountMillion || 0;
    
    byCategory[code] = {
      change: toAmount - fromAmount,
      changePct: fromAmount > 0 ? ((toAmount - fromAmount) / fromAmount) * 100 : 0,
    };
  }
  
  return {
    totalChange: to.totalMillion - from.totalMillion,
    totalChangePct: from.totalMillion > 0 
      ? ((to.totalMillion - from.totalMillion) / from.totalMillion) * 100 
      : 0,
    byCategory: byCategory as Record<COFOGCode, { change: number; changePct: number }>,
  };
}

