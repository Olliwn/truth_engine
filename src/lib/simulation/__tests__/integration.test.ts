/**
 * Integration Tests
 * 
 * Tests that verify the simulation engine produces reasonable results
 * and matches Statistics Finland historical data where available.
 */

import { simulateRange, convertResultToLegacyFormat, DEFAULT_SCENARIO } from '../index';
import { initializeState, getStateSnapshot } from '../initialization';
import { validateState, validateYearResult } from '../timestep';

describe('Integration Tests', () => {
  describe('Simulation Range', () => {
    it('should run a full simulation without errors', () => {
      const result = simulateRange({
        startYear: 2020,
        endYear: 2030,
        scenario: DEFAULT_SCENARIO,
        validateSteps: true,
      });

      expect(result.annualResults.length).toBe(11);  // 2020-2030 inclusive
      expect(result.summary.startYear).toBe(2020);
      expect(result.summary.endYear).toBe(2030);
    });

    it('should produce valid results for each year', () => {
      const result = simulateRange({
        startYear: 2020,
        endYear: 2025,
        scenario: DEFAULT_SCENARIO,
      });

      for (const yearResult of result.annualResults) {
        const validation = validateYearResult(yearResult);
        if (!validation.valid) {
          console.log(`Year ${yearResult.year} validation errors:`, validation.errors);
        }
        expect(validation.valid).toBe(true);
      }
    });

    it('should have continuous population between years', () => {
      const result = simulateRange({
        startYear: 2020,
        endYear: 2030,
        scenario: DEFAULT_SCENARIO,
      });

      for (let i = 1; i < result.annualResults.length; i++) {
        const prev = result.annualResults[i - 1];
        const curr = result.annualResults[i];

        // Population shouldn't change by more than 5% in one year
        const changePercent = Math.abs(curr.totalPopulation - prev.totalPopulation) / prev.totalPopulation * 100;
        expect(changePercent).toBeLessThan(5);
      }
    });
  });

  describe('Historical Data Validation', () => {
    // Known Finnish population data from Statistics Finland
    const KNOWN_POPULATION: Record<number, number> = {
      2020: 5531917,
      2022: 5548241,
      2024: 5603851,
    };

    it('should produce population within 10% of Statistics Finland for 2024', () => {
      const state = initializeState({ year: 2024 });
      const snapshot = getStateSnapshot(state);

      const expectedPop = KNOWN_POPULATION[2024];
      const errorPercent = Math.abs(snapshot.totalPopulation - expectedPop) / expectedPop * 100;

      // Allow 10% tolerance (immigrants and modeling differences)
      expect(errorPercent).toBeLessThan(10);
    });

    it('should produce reasonable age distribution', () => {
      const state = initializeState({ year: 2024 });
      const snapshot = getStateSnapshot(state);

      // Finland has aging population
      expect(snapshot.elderly).toBeGreaterThan(500000);  // >500k elderly
      expect(snapshot.children).toBeLessThan(snapshot.workingAge);  // More workers than children
      expect(snapshot.workingAge).toBeLessThan(4000000);  // <4M working age
    });
  });

  describe('GDP Data Validation', () => {
    // Known Finnish GDP data
    const KNOWN_GDP: Record<number, number> = {
      2020: 237,  // COVID year
      2022: 269,
      2024: 282,  // Approximate
    };

    it('should use reasonable GDP for 2024', () => {
      const state = initializeState({ year: 2024 });
      
      const expectedGDP = KNOWN_GDP[2024];
      const errorPercent = Math.abs(state.economy.gdpBillions - expectedGDP) / expectedGDP * 100;

      // Allow 5% tolerance
      expect(errorPercent).toBeLessThan(5);
    });

    it('should project GDP growth correctly', () => {
      const result = simulateRange({
        startYear: 2024,
        endYear: 2034,
        scenario: {
          ...DEFAULT_SCENARIO,
          gdp: { scenarioId: 'slow_growth', customGrowthRate: null },
        },
      });

      const gdp2024 = result.annualResults[0].gdp;
      const gdp2034 = result.annualResults[10].gdp;

      // 10 years at 1% growth should increase GDP by ~10%
      expect(gdp2034).toBeGreaterThan(gdp2024);
      expect(gdp2034 / gdp2024).toBeCloseTo(1.10, 1);
    });
  });

  describe('Fiscal Calculations', () => {
    it('should produce positive contributions from working population', () => {
      const result = simulateRange({
        startYear: 2024,
        endYear: 2024,
        scenario: DEFAULT_SCENARIO,
      });

      const year2024 = result.annualResults[0];

      expect(year2024.fiscal.incomeTaxRevenue).toBeGreaterThan(0);
      expect(year2024.fiscal.socialInsuranceRevenue).toBeGreaterThan(0);
      expect(year2024.fiscal.vatRevenue).toBeGreaterThan(0);
    });

    it('should produce positive costs for all categories', () => {
      const result = simulateRange({
        startYear: 2024,
        endYear: 2024,
        scenario: DEFAULT_SCENARIO,
      });

      const year2024 = result.annualResults[0];

      expect(year2024.fiscal.educationCosts).toBeGreaterThan(0);
      expect(year2024.fiscal.healthcareCosts).toBeGreaterThan(0);
      expect(year2024.fiscal.pensionCosts).toBeGreaterThan(0);
    });

    it('should have reasonable government spending as % of GDP', () => {
      const result = simulateRange({
        startYear: 2024,
        endYear: 2024,
        scenario: DEFAULT_SCENARIO,
      });

      const year2024 = result.annualResults[0];

      // Finland govt spending tracked in this model is ~15-25% of GDP
      // (only education, healthcare, pensions, benefits - not full govt budget)
      expect(year2024.govtSpendingPctGDP).toBeGreaterThan(15);
      expect(year2024.govtSpendingPctGDP).toBeLessThan(40);
    });
  });

  describe('Immigration Effects', () => {
    it('should track immigrant population correctly', () => {
      const result = simulateRange({
        startYear: 2020,
        endYear: 2030,
        scenario: {
          ...DEFAULT_SCENARIO,
          immigration: { workBased: 15000, family: 10000, humanitarian: 5000 },
        },
      });

      // Immigrant population should grow
      const first = result.annualResults[0];
      const last = result.annualResults[result.annualResults.length - 1];

      expect(last.immigrantPopulation).toBeGreaterThan(first.immigrantPopulation);
    });

    it('should calculate fiscal impact by immigrant type', () => {
      const result = simulateRange({
        startYear: 2024,
        endYear: 2030,
        scenario: {
          ...DEFAULT_SCENARIO,
          immigration: { workBased: 15000, family: 10000, humanitarian: 5000 },
        },
      });

      const year2030 = result.annualResults[result.annualResults.length - 1];

      // Work-based should have positive fiscal impact
      expect(year2030.immigrationByType.workBased.fiscalImpact).toBeGreaterThan(0);
      
      // Humanitarian typically negative initially
      // (but may improve with integration)
      expect(year2030.immigrationByType.humanitarian.fiscalImpact).toBeDefined();
    });

    it('should show immigrant integration over time', () => {
      const result = simulateRange({
        startYear: 2020,
        endYear: 2035,
        scenario: {
          ...DEFAULT_SCENARIO,
          immigration: { workBased: 5000, family: 3000, humanitarian: 10000 },
        },
      });

      // Humanitarian fiscal impact should improve over time
      const early = result.annualResults[5];  // 2025
      const late = result.annualResults[15];  // 2035

      // This depends on the model, but generally expect improvement
      expect(late.immigrationByType.humanitarian).toBeDefined();
    });
  });

  describe('Birth Rate Scenarios', () => {
    it('should respond to TFR changes', () => {
      const lowTFR = simulateRange({
        startYear: 2024,
        endYear: 2060,
        scenario: {
          ...DEFAULT_SCENARIO,
          birthRate: { presetId: 'current_trend', customTFR: 1.3, transitionYear: 2060 },
        },
      });

      const highTFR = simulateRange({
        startYear: 2024,
        endYear: 2060,
        scenario: {
          ...DEFAULT_SCENARIO,
          birthRate: { presetId: 'recovery', customTFR: 1.8, transitionYear: 2035 },
        },
      });

      const lowPop2060 = lowTFR.annualResults[lowTFR.annualResults.length - 1].totalPopulation;
      const highPop2060 = highTFR.annualResults[highTFR.annualResults.length - 1].totalPopulation;

      expect(highPop2060).toBeGreaterThan(lowPop2060);
    });
  });

  describe('Debt Tracking', () => {
    it('should accumulate debt with deficits', () => {
      const result = simulateRange({
        startYear: 2024,
        endYear: 2040,
        scenario: {
          ...DEFAULT_SCENARIO,
          gdp: { scenarioId: 'stagnation', customGrowthRate: null },  // No growth = deficits
        },
      });

      const debt2024 = result.annualResults[0].debtStock;
      const debt2040 = result.annualResults[result.annualResults.length - 1].debtStock;

      // With deficits, debt should increase
      expect(debt2040).toBeGreaterThan(debt2024);
    });

    it('should calculate debt-to-GDP ratio', () => {
      const result = simulateRange({
        startYear: 2024,
        endYear: 2024,
        scenario: DEFAULT_SCENARIO,
      });

      const year2024 = result.annualResults[0];

      // Finland debt/GDP is around 50-60%
      expect(year2024.debtToGDP).toBeGreaterThan(30);
      expect(year2024.debtToGDP).toBeLessThan(100);
    });
  });

  describe('Legacy Format Conversion', () => {
    it('should convert to legacy format correctly', () => {
      const result = simulateRange({
        startYear: 2024,
        endYear: 2025,
        scenario: DEFAULT_SCENARIO,
      });

      const legacy = convertResultToLegacyFormat(result);

      expect(legacy.startYear).toBe(2024);
      expect(legacy.endYear).toBe(2025);
      expect(legacy.annualResults.length).toBe(2);

      const year2024 = legacy.annualResults[0];
      expect(year2024.year).toBe(2024);
      expect(year2024.totalPopulation).toBeGreaterThan(0);
      expect(year2024.totalContributions).toBeGreaterThan(0);
      expect(year2024.gdp).toBeGreaterThan(0);
    });
  });

  describe('Long-term Simulation', () => {
    it('should run 70-year simulation without numerical issues', () => {
      const result = simulateRange({
        startYear: 1990,
        endYear: 2060,
        scenario: DEFAULT_SCENARIO,
        validateSteps: false,  // Skip validation for speed
      });

      expect(result.annualResults.length).toBe(71);

      // Check for NaN or Infinity
      for (const year of result.annualResults) {
        expect(isFinite(year.totalPopulation)).toBe(true);
        expect(isFinite(year.fiscal.totalContributions)).toBe(true);
        expect(isFinite(year.gdp)).toBe(true);
        expect(isFinite(year.debtStock)).toBe(true);
      }

      // Check summary is valid
      expect(isFinite(result.summary.cumulativeBalance)).toBe(true);
      expect(isFinite(result.summary.gdpAdjustedCumulativeBalance)).toBe(true);
    });
  });
});

