/**
 * Spending Projection Engine Tests
 */

import {
  loadHistoricalSpendingData,
  getHistoricalSpending,
  projectSpending,
  convertToLegacyBreakdown,
  type ProjectionContext,
  type YearlySpending,
} from '../spending';

import {
  COFOG_CATEGORIES,
  SPENDING_GROUPS,
  DEFAULT_SPENDING_SCENARIO,
  SPENDING_BASE_YEAR,
  type SpendingScenario,
  type COFOGCode,
} from '../../constants/governmentSpending';

// ===========================================
// Test Setup
// ===========================================

// Base context for 2024 (matches historical data)
const BASE_CONTEXT: ProjectionContext = {
  year: 2024,
  demographics: {
    totalPopulation: 5600000,
    children: 800000,
    workingAge: 3600000,
    elderly: 1200000,
  },
  economics: {
    gdpBillions: 280,
    gdpGrowthRate: 0.01,
    interestRate: 0.025,
    debtStockBillions: 165,
  },
  baseDemographics: {
    totalPopulation: 5600000,
    children: 800000,
    workingAge: 3600000,
    elderly: 1200000,
  },
  baseEconomics: {
    gdpBillions: 280,
    gdpGrowthRate: 0.01,
    interestRate: 0.025,
    debtStockBillions: 165,
  },
};

// Future context for 2040 with aging population
const FUTURE_CONTEXT_2040: ProjectionContext = {
  year: 2040,
  demographics: {
    totalPopulation: 5400000,
    children: 600000,      // -25% from base
    workingAge: 3200000,   // -11% from base
    elderly: 1600000,      // +33% from base
  },
  economics: {
    gdpBillions: 350,       // GDP growth
    gdpGrowthRate: 0.01,
    interestRate: 0.03,
    debtStockBillions: 200,
  },
  baseDemographics: BASE_CONTEXT.baseDemographics,
  baseEconomics: BASE_CONTEXT.baseEconomics,
};

// ===========================================
// Historical Data Tests
// ===========================================

describe('Historical Spending Data', () => {
  beforeAll(async () => {
    // Load historical data before tests
    await loadHistoricalSpendingData();
  });

  it('should load historical spending data', async () => {
    const data = await loadHistoricalSpendingData();
    expect(data).toBeDefined();
    expect(data.size).toBeGreaterThan(0);
  });

  it('should have data for 2024 (base year)', () => {
    const spending = getHistoricalSpending(2024);
    expect(spending).not.toBeNull();
    expect(spending?.year).toBe(2024);
    expect(spending?.isHistorical).toBe(true);
  });

  it('should have all COFOG categories in 2024 data', () => {
    const spending = getHistoricalSpending(2024);
    expect(spending).not.toBeNull();
    
    const cofogCodes = Object.keys(COFOG_CATEGORIES) as COFOGCode[];
    for (const code of cofogCodes) {
      expect(spending?.byCategory[code]).toBeDefined();
      expect(spending?.byCategory[code].amountMillion).toBeGreaterThan(0);
    }
  });

  it('should have reasonable total spending for 2024 (~160B EUR)', () => {
    const spending = getHistoricalSpending(2024);
    expect(spending).not.toBeNull();
    
    // 2024 total should be around 159.4B EUR per public_spending.json
    expect(spending?.totalMillion).toBeGreaterThan(150000);  // >150B
    expect(spending?.totalMillion).toBeLessThan(175000);     // <175B
  });

  it('should have spending groups summing to total', () => {
    const spending = getHistoricalSpending(2024);
    expect(spending).not.toBeNull();
    
    let groupSum = 0;
    for (const groupId of Object.keys(SPENDING_GROUPS)) {
      const group = spending?.byGroup[groupId as keyof typeof SPENDING_GROUPS];
      if (group) {
        groupSum += group.amountMillion;
      }
    }
    
    // Allow 1% tolerance for rounding
    const tolerance = spending!.totalMillion * 0.01;
    expect(Math.abs(groupSum - spending!.totalMillion)).toBeLessThan(tolerance);
  });

  it('should return historical data for years 1990-2024', async () => {
    for (const year of [1990, 2000, 2010, 2020, 2024]) {
      const spending = getHistoricalSpending(year);
      expect(spending).not.toBeNull();
      expect(spending?.isHistorical).toBe(true);
    }
  });
});

// ===========================================
// Projection Tests
// ===========================================

describe('Spending Projections', () => {
  beforeAll(async () => {
    await loadHistoricalSpendingData();
  });

  it('should return historical data for base year', () => {
    const result = projectSpending(BASE_CONTEXT, DEFAULT_SPENDING_SCENARIO);
    
    expect(result.year).toBe(2024);
    expect(result.isHistorical).toBe(true);
    expect(result.totalMillion).toBeGreaterThan(150000);
  });

  it('should project future spending', () => {
    const result = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    
    expect(result.year).toBe(2040);
    expect(result.isHistorical).toBe(false);
    expect(result.totalMillion).toBeGreaterThan(0);
  });

  it('should have all COFOG categories in projection', () => {
    const result = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    
    const cofogCodes = Object.keys(COFOG_CATEGORIES) as COFOGCode[];
    for (const code of cofogCodes) {
      expect(result.byCategory[code]).toBeDefined();
      expect(result.byCategory[code].amountMillion).toBeGreaterThan(0);
    }
  });

  it('should increase healthcare spending with aging population', () => {
    const baseSpending = getHistoricalSpending(2024);
    const projectedSpending = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    
    const baseHealthcare = baseSpending?.byGroup.healthcare_aging?.amountMillion || 0;
    const projectedHealthcare = projectedSpending.byGroup.healthcare_aging?.amountMillion || 0;
    
    // Healthcare should increase due to 33% elderly increase
    expect(projectedHealthcare).toBeGreaterThan(baseHealthcare);
  });

  it('should decrease education spending with fewer children', () => {
    const baseSpending = getHistoricalSpending(2024);
    const projectedSpending = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    
    const baseEducation = baseSpending?.byGroup.education_youth?.amountMillion || 0;
    const projectedEducation = projectedSpending.byGroup.education_youth?.amountMillion || 0;
    
    // Education should decrease due to 25% children decrease
    expect(projectedEducation).toBeLessThan(baseEducation);
  });

  it('should scale infrastructure with GDP', () => {
    const baseSpending = getHistoricalSpending(2024);
    const projectedSpending = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    
    const baseInfra = baseSpending?.byGroup.infrastructure?.amountMillion || 0;
    const projectedInfra = projectedSpending.byGroup.infrastructure?.amountMillion || 0;
    
    // GDP ratio: 350/280 = 1.25, so infrastructure should increase
    expect(projectedInfra).toBeGreaterThan(baseInfra * 1.1);  // At least 10% increase
    expect(projectedInfra).toBeLessThan(baseInfra * 1.4);     // Less than 40% increase
  });
});

// ===========================================
// Scenario Tests
// ===========================================

describe('Spending Scenarios', () => {
  beforeAll(async () => {
    await loadHistoricalSpendingData();
  });

  it('should apply aging pressure scenario', () => {
    const agingScenario: SpendingScenario = {
      ...DEFAULT_SPENDING_SCENARIO,
      healthcareAging: 'aging_pressure',  // 1.5% annual premium
    };
    
    const baseResult = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    const agingResult = projectSpending(FUTURE_CONTEXT_2040, agingScenario);
    
    // Aging pressure should increase healthcare costs
    expect(agingResult.byGroup.healthcare_aging?.amountMillion)
      .toBeGreaterThan(baseResult.byGroup.healthcare_aging?.amountMillion || 0);
  });

  it('should apply efficiency gains scenario', () => {
    const efficientScenario: SpendingScenario = {
      ...DEFAULT_SPENDING_SCENARIO,
      healthcareAging: 'efficiency_gains',  // 0.5% annual savings
    };
    
    const baseResult = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    const efficientResult = projectSpending(FUTURE_CONTEXT_2040, efficientScenario);
    
    // Efficiency gains should reduce healthcare costs
    expect(efficientResult.byGroup.healthcare_aging?.amountMillion)
      .toBeLessThan(baseResult.byGroup.healthcare_aging?.amountMillion || 0);
  });

  it('should apply absolute freeze to discretionary spending', () => {
    const freezeScenario: SpendingScenario = {
      ...DEFAULT_SPENDING_SCENARIO,
      culture: 'freeze',
    };
    
    const baseSpending = getHistoricalSpending(2024);
    const projectedResult = projectSpending(FUTURE_CONTEXT_2040, freezeScenario);
    
    // Culture spending should stay at 2024 level
    const baseCulture = baseSpending?.byGroup.culture?.amountMillion || 0;
    const projectedCulture = projectedResult.byGroup.culture?.amountMillion || 0;
    
    // Allow 1% tolerance for rounding
    expect(Math.abs(projectedCulture - baseCulture)).toBeLessThan(baseCulture * 0.01);
  });
});

// ===========================================
// Legacy Compatibility Tests
// ===========================================

describe('Legacy Format Conversion', () => {
  beforeAll(async () => {
    await loadHistoricalSpendingData();
  });

  it('should convert to legacy 4-category breakdown', () => {
    const spending = getHistoricalSpending(2024);
    expect(spending).not.toBeNull();
    
    const legacy = convertToLegacyBreakdown(spending!);
    
    expect(legacy.educationCosts).toBeGreaterThan(0);
    expect(legacy.healthcareCosts).toBeGreaterThan(0);
    expect(legacy.pensionCosts).toBeGreaterThan(0);
    expect(legacy.benefitCosts).toBeGreaterThan(0);
    expect(legacy.otherCosts).toBeGreaterThan(0);
    expect(legacy.totalStateCosts).toBeGreaterThan(0);
  });

  it('should have legacy costs summing to total', () => {
    const spending = getHistoricalSpending(2024);
    expect(spending).not.toBeNull();
    
    const legacy = convertToLegacyBreakdown(spending!);
    
    const sum = legacy.educationCosts + legacy.healthcareCosts + 
                legacy.pensionCosts + legacy.benefitCosts + legacy.otherCosts;
    
    // Allow 1% tolerance
    const tolerance = legacy.totalStateCosts * 0.01;
    expect(Math.abs(sum - legacy.totalStateCosts)).toBeLessThan(tolerance);
  });

  it('should map G09 to education', () => {
    const spending = getHistoricalSpending(2024);
    expect(spending).not.toBeNull();
    
    const legacy = convertToLegacyBreakdown(spending!);
    const g09Amount = spending!.byCategory.G09.amountMillion;
    
    expect(Math.abs(legacy.educationCosts - g09Amount)).toBeLessThan(1);
  });

  it('should map G07 to healthcare', () => {
    const spending = getHistoricalSpending(2024);
    expect(spending).not.toBeNull();
    
    const legacy = convertToLegacyBreakdown(spending!);
    const g07Amount = spending!.byCategory.G07.amountMillion;
    
    expect(Math.abs(legacy.healthcareCosts - g07Amount)).toBeLessThan(1);
  });
});

// ===========================================
// Sanity Checks
// ===========================================

describe('Projection Sanity Checks', () => {
  beforeAll(async () => {
    await loadHistoricalSpendingData();
  });

  it('should keep spending within reasonable GDP bounds', () => {
    const result = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    
    // Finnish spending typically 40-60% of GDP
    expect(result.totalPctGDP).toBeGreaterThan(35);
    expect(result.totalPctGDP).toBeLessThan(70);
  });

  it('should maintain social protection as largest category', () => {
    const result = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    
    const g10 = result.byCategory.G10?.amountMillion || 0;
    
    // G10 should be largest category
    for (const code of Object.keys(COFOG_CATEGORIES) as COFOGCode[]) {
      if (code !== 'G10') {
        expect(g10).toBeGreaterThan(result.byCategory[code]?.amountMillion || 0);
      }
    }
  });

  it('should not have negative spending', () => {
    const result = projectSpending(FUTURE_CONTEXT_2040, DEFAULT_SPENDING_SCENARIO);
    
    for (const code of Object.keys(COFOG_CATEGORIES) as COFOGCode[]) {
      expect(result.byCategory[code]?.amountMillion).toBeGreaterThanOrEqual(0);
    }
  });
});

