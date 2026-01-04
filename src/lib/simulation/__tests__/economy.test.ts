/**
 * Economy Module Unit Tests
 */

import {
  isHistoricalYear,
  getHistoricalEconomicState,
  projectGDP,
  calculateWorkforceChangeRate,
  calculateDebt,
  getInterestRate,
  calculateGovernmentMetrics,
  executeEconomyStep,
  calculateBreakevenGrowthRate,
  estimateFiscalMultiplierEffect,
} from '../economy';

import { GDP_SCENARIOS } from '../../constants/demographicScenarios';

describe('Economy Module', () => {
  describe('isHistoricalYear', () => {
    it('should return true for 2024 and earlier', () => {
      expect(isHistoricalYear(2024)).toBe(true);
      expect(isHistoricalYear(2020)).toBe(true);
      expect(isHistoricalYear(1990)).toBe(true);
    });

    it('should return false for 2025 and later', () => {
      expect(isHistoricalYear(2025)).toBe(false);
      expect(isHistoricalYear(2030)).toBe(false);
      expect(isHistoricalYear(2060)).toBe(false);
    });
  });

  describe('getHistoricalEconomicState', () => {
    it('should return valid state for 2024', () => {
      const state = getHistoricalEconomicState(2024);

      expect(state.gdpBillions).toBeGreaterThan(200);  // Finland GDP > €200B
      expect(state.debtStockBillions).toBeGreaterThan(100);  // Debt > €100B
      expect(state.interestRate).toBeGreaterThan(0);
      expect(state.cumulativeGdpMultiplier).toBe(1.0);
    });
  });

  describe('projectGDP', () => {
    it('should apply growth rate correctly', () => {
      const result = projectGDP(
        100,   // Previous GDP
        1.0,   // Previous multiplier
        GDP_SCENARIOS['slow_growth'],
        0,     // No workforce change
        null   // Use scenario rate
      );

      // 1% growth
      expect(result.gdpBillions).toBeCloseTo(101, 0);
      expect(result.cumulativeGdpMultiplier).toBeCloseTo(1.01, 2);
    });

    it('should use custom growth rate if provided', () => {
      const result = projectGDP(
        100,
        1.0,
        GDP_SCENARIOS['slow_growth'],
        0,
        0.03  // Custom 3% growth
      );

      expect(result.gdpBillions).toBeCloseTo(103, 0);
      expect(result.effectiveGrowthRate).toBe(0.03);
    });

    it('should adjust for workforce change when enabled', () => {
      const noWorkforce = projectGDP(
        100,
        1.0,
        GDP_SCENARIOS['productivity_15pct'],
        0,     // No workforce change
        null
      );

      const withWorkforce = projectGDP(
        100,
        1.0,
        GDP_SCENARIOS['productivity_15pct'],
        -0.005,  // -0.5% workforce decline
        null
      );

      expect(withWorkforce.gdpBillions).toBeLessThan(noWorkforce.gdpBillions);
      expect(withWorkforce.isWorkforceAdjusted).toBe(true);
    });

    it('should compound multiplier correctly', () => {
      const result = projectGDP(
        100,
        1.5,  // Already have 50% cumulative growth
        GDP_SCENARIOS['slow_growth'],
        0,
        null
      );

      // 1.5 * 1.01 = 1.515
      expect(result.cumulativeGdpMultiplier).toBeCloseTo(1.515, 2);
    });
  });

  describe('calculateWorkforceChangeRate', () => {
    it('should calculate positive change', () => {
      const rate = calculateWorkforceChangeRate(1000000, 1010000);
      expect(rate).toBeCloseTo(0.01, 3);  // 1% increase
    });

    it('should calculate negative change', () => {
      const rate = calculateWorkforceChangeRate(1000000, 990000);
      expect(rate).toBeCloseTo(-0.01, 3);  // 1% decrease
    });

    it('should return 0 for zero previous', () => {
      const rate = calculateWorkforceChangeRate(0, 1000);
      expect(rate).toBe(0);
    });
  });

  describe('calculateDebt', () => {
    it('should increase debt with deficit', () => {
      const result = calculateDebt(
        100,     // Previous debt (billions)
        -5000,   // Deficit of €5B (millions, negative = deficit)
        300,     // GDP (billions)
        0.02     // 2% interest rate
      );

      expect(result.debtStock).toBeCloseTo(105, 0);  // Debt increases by €5B
    });

    it('should decrease debt with surplus', () => {
      const result = calculateDebt(
        100,
        5000,   // Surplus of €5B (millions, positive = surplus)
        300,
        0.02
      );

      expect(result.debtStock).toBeCloseTo(95, 0);  // Debt decreases by €5B
    });

    it('should calculate interest expense', () => {
      const result = calculateDebt(
        100,
        0,      // Balanced budget
        300,
        0.03    // 3% interest rate
      );

      // Interest on €100B at 3% = €3B = €3000M
      expect(result.interestExpense).toBeCloseTo(3000, -1);
    });

    it('should calculate debt to GDP ratio', () => {
      const result = calculateDebt(
        150,
        0,
        300,
        0.02
      );

      expect(result.debtToGDP).toBeCloseTo(50, 0);  // 150/300 = 50%
    });

    it('should not allow negative debt', () => {
      const result = calculateDebt(
        10,
        20000,  // Large surplus
        300,
        0.02
      );

      expect(result.debtStock).toBe(0);  // Can't go negative
    });
  });

  describe('getInterestRate', () => {
    it('should return scenario rate', () => {
      const rate = getInterestRate('moderate', null);
      expect(rate).toBeGreaterThan(0.02);
      expect(rate).toBeLessThan(0.05);
    });

    it('should use custom rate if provided', () => {
      const rate = getInterestRate('moderate', 0.08);
      expect(rate).toBe(0.08);
    });

    it('should fallback to low for unknown scenario', () => {
      const rate = getInterestRate('unknown_scenario', null);
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('calculateGovernmentMetrics', () => {
    it('should calculate spending as % of GDP', () => {
      const metrics = calculateGovernmentMetrics(
        60000,   // State costs (millions)
        -10000,  // Fiscal balance (millions)
        -8000,   // Primary balance (millions)
        200      // GDP (billions)
      );

      // 60000M / 200000M = 30%
      expect(metrics.govtSpendingPctGDP).toBeCloseTo(30, 0);
    });

    it('should calculate deficit as % of GDP', () => {
      const metrics = calculateGovernmentMetrics(
        60000,
        -10000,  // Deficit
        -8000,
        200
      );

      // -10000M / 200000M = -5%
      expect(metrics.deficitPctGDP).toBeCloseTo(-5, 0);
    });
  });

  describe('executeEconomyStep', () => {
    it('should return historical state for past years', () => {
      const previousState = {
        gdpBillions: 250,
        cumulativeGdpMultiplier: 1.0,
        debtStockBillions: 100,
        interestRate: 0.02,
      };

      const result = executeEconomyStep(
        previousState,
        2020,
        2024,  // Base year
        3000000,
        3000000,
        -5000,
        -3000,
        60000,
        'slow_growth',
        null,
        'low',
        null
      );

      // Should use historical GDP
      expect(result.newState.gdpBillions).not.toBe(previousState.gdpBillions * 1.01);
    });

    it('should project for future years', () => {
      const previousState = {
        gdpBillions: 282,
        cumulativeGdpMultiplier: 1.0,
        debtStockBillions: 160,
        interestRate: 0.025,
      };

      const result = executeEconomyStep(
        previousState,
        2025,
        2024,
        3000000,
        3000000,
        -5000,
        -3000,
        60000,
        'slow_growth',  // 1% growth
        null,
        'low',
        null
      );

      expect(result.newState.gdpBillions).toBeGreaterThan(previousState.gdpBillions);
      expect(result.gdpResult.growthRate).toBeCloseTo(0.01, 2);
    });
  });

  describe('calculateBreakevenGrowthRate', () => {
    it('should return 0 for balanced budget', () => {
      const rate = calculateBreakevenGrowthRate(0, 50000, 1.0);
      expect(rate).toBe(0);
    });

    it('should return 0 for surplus', () => {
      const rate = calculateBreakevenGrowthRate(5000, 50000, 1.0);
      expect(rate).toBe(0);
    });

    it('should calculate growth needed for deficit', () => {
      const rate = calculateBreakevenGrowthRate(
        -5000,   // €5B deficit
        50000,   // €50B contributions
        1.0
      );

      // Need 10% more revenue = 10% GDP growth at elasticity 1.0
      expect(rate).toBeCloseTo(0.10, 2);
    });
  });

  describe('estimateFiscalMultiplierEffect', () => {
    it('should estimate GDP reduction from spending cuts', () => {
      const effect = estimateFiscalMultiplierEffect(
        10,    // €10B spending cut
        300,   // €300B GDP
        0.5    // Multiplier of 0.5
      );

      // 10 * 0.5 / 300 = 1.67%
      expect(effect).toBeCloseTo(0.0167, 2);
    });

    it('should return 0 for zero GDP', () => {
      const effect = estimateFiscalMultiplierEffect(10, 0, 0.5);
      expect(effect).toBe(0);
    });
  });
});

