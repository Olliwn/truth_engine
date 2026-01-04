/**
 * Fiscal Module Unit Tests
 */

import {
  calculatePersonYearFiscal,
  calculateImmigrantPersonYearFiscal,
  calculateAggregeFiscalFlows,
  applyGDPAdjustments,
} from '../fiscal';

import { PopulationState, AnnualFiscalFlows } from '../SimulationState';

describe('Fiscal Module', () => {
  describe('calculatePersonYearFiscal', () => {
    it('should return education costs for children', () => {
      const result = calculatePersonYearFiscal(10, 5);

      expect(result.education).toBeGreaterThan(5000);  // Primary school costs
      expect(result.totalCosts).toBeGreaterThan(0);
      expect(result.incomeTax).toBe(0);  // Children don't pay taxes
    });

    it('should return contributions for working-age adults', () => {
      const result = calculatePersonYearFiscal(35, 5);

      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.socialInsurance).toBeGreaterThan(0);
      expect(result.vat).toBeGreaterThan(0);
      expect(result.totalContributions).toBeGreaterThan(0);
    });

    it('should return pension costs for retirees', () => {
      const result = calculatePersonYearFiscal(70, 5);

      expect(result.pension).toBeGreaterThan(0);
      expect(result.incomeTax).toBe(0);  // Retirees don't pay income tax (simplified)
      expect(result.vat).toBeGreaterThan(0);  // Still pay VAT
    });

    it('should return higher contributions for higher deciles', () => {
      const decile3 = calculatePersonYearFiscal(35, 3);
      const decile8 = calculatePersonYearFiscal(35, 8);

      expect(decile8.totalContributions).toBeGreaterThan(decile3.totalContributions);
    });

    it('should apply GDP income multiplier', () => {
      const base = calculatePersonYearFiscal(35, 5, { gdpIncomeMultiplier: 1.0 });
      const grown = calculatePersonYearFiscal(35, 5, { gdpIncomeMultiplier: 1.5 });

      expect(grown.incomeTax).toBeGreaterThan(base.incomeTax);
    });

    it('should calculate netFlow correctly', () => {
      const result = calculatePersonYearFiscal(35, 7);

      expect(result.netFlow).toBeCloseTo(
        result.totalContributions - result.totalCosts,
        0
      );
    });

    it('should override employment rate for immigrants', () => {
      const fullEmployment = calculatePersonYearFiscal(35, 5, { employmentRate: 1.0 });
      const lowEmployment = calculatePersonYearFiscal(35, 5, { employmentRate: 0.5 });

      expect(fullEmployment.incomeTax).toBeGreaterThan(lowEmployment.incomeTax);
    });
  });

  describe('calculateImmigrantPersonYearFiscal', () => {
    it('should return lower contributions for new humanitarian immigrants', () => {
      const workBased = calculateImmigrantPersonYearFiscal(35, 'work_based', 0);
      const humanitarian = calculateImmigrantPersonYearFiscal(35, 'humanitarian', 0);

      expect(workBased.totalContributions).toBeGreaterThan(humanitarian.totalContributions);
    });

    it('should increase contributions with years in country', () => {
      const year0 = calculateImmigrantPersonYearFiscal(35, 'humanitarian', 0);
      const year10 = calculateImmigrantPersonYearFiscal(35, 'humanitarian', 10);

      expect(year10.totalContributions).toBeGreaterThan(year0.totalContributions);
    });

    it('should return education costs for immigrant children', () => {
      const result = calculateImmigrantPersonYearFiscal(10, 'family', 2);

      expect(result.education).toBeGreaterThan(5000);
    });
  });

  describe('calculateAggregeFiscalFlows', () => {
    it('should aggregate native population fiscal flows', () => {
      const state: PopulationState = {
        native: new Map([
          [10, 50000],   // Children
          [35, 200000],  // Working age
          [70, 80000],   // Elderly
        ]),
        immigrants: new Map(),
      };

      const result = calculateAggregeFiscalFlows(state, 2024, 1.0, 0);

      expect(result.totalPopulation).toBe(330000);
      expect(result.children).toBe(50000);
      expect(result.workingAge).toBe(200000);
      expect(result.elderly).toBe(80000);

      // Should have contributions from working age
      expect(result.totalContributions).toBeGreaterThan(0);

      // Should have costs from all groups
      expect(result.totalStateCosts).toBeGreaterThan(0);
      expect(result.educationCosts).toBeGreaterThan(0);
      expect(result.healthcareCosts).toBeGreaterThan(0);
      expect(result.pensionCosts).toBeGreaterThan(0);
    });

    it('should aggregate immigrant fiscal flows separately', () => {
      const state: PopulationState = {
        native: new Map([[35, 100000]]),
        immigrants: new Map([
          ['35:work_based:2020', 10000],
          ['35:humanitarian:2022', 5000],
        ]),
      };

      const result = calculateAggregeFiscalFlows(state, 2024, 1.0, 0);

      expect(result.nativePopulation).toBe(100000);
      expect(result.immigrantPopulation).toBe(15000);
      expect(result.totalPopulation).toBe(115000);

      // Immigrant fiscal should be separate
      expect(result.immigrantFiscal.contributions).toBeGreaterThan(0);
      expect(result.immigrantFiscal.byType.workBased.count).toBe(10000);
      expect(result.immigrantFiscal.byType.humanitarian.count).toBe(5000);
    });

    it('should calculate dependency ratios', () => {
      const state: PopulationState = {
        native: new Map([
          [10, 100000],  // Children
          [35, 300000],  // Working age
          [70, 100000],  // Elderly
        ]),
        immigrants: new Map(),
      };

      const result = calculateAggregeFiscalFlows(state, 2024, 1.0, 0);

      // Dependency ratio = (children + elderly) / working age * 100
      expect(result.dependencyRatio).toBeCloseTo(66.67, 0);
      // Old-age ratio = elderly / working age * 100
      expect(result.oldAgeDependencyRatio).toBeCloseTo(33.33, 0);
    });

    it('should include interest expense in total costs', () => {
      const state: PopulationState = {
        native: new Map([[35, 100000]]),
        immigrants: new Map(),
      };

      const withoutInterest = calculateAggregeFiscalFlows(state, 2024, 1.0, 0);
      const withInterest = calculateAggregeFiscalFlows(state, 2024, 1.0, 5000);

      expect(withInterest.totalStateCosts).toBeGreaterThan(withoutInterest.totalStateCosts);
      expect(withInterest.interestExpense).toBe(5000);
    });
  });

  describe('applyGDPAdjustments', () => {
    it('should not adjust historical years', () => {
      const baseFiscal: AnnualFiscalFlows = {
        totalPopulation: 100000,
        nativePopulation: 100000,
        immigrantPopulation: 0,
        children: 20000,
        workingAge: 60000,
        elderly: 20000,
        dependencyRatio: 66.67,
        oldAgeDependencyRatio: 33.33,
        incomeTaxRevenue: 10000,
        socialInsuranceRevenue: 5000,
        vatRevenue: 3000,
        totalContributions: 18000,
        educationCosts: 5000,
        healthcareCosts: 8000,
        pensionCosts: 6000,
        benefitCosts: 2000,
        interestExpense: 1000,
        totalStateCosts: 22000,
        primaryBalance: -3000,
        netFiscalBalance: -4000,
        nativeFiscal: { contributions: 18000, costs: 21000, balance: -3000 },
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

      const result = applyGDPAdjustments(
        baseFiscal,
        2020,  // Before base year
        2024,
        1.0,
        0.02,
        0.01,
        1.0
      );

      // Should not adjust historical years
      expect(result.adjustedContributions).toBe(baseFiscal.totalContributions);
      expect(result.adjustedHealthcare).toBe(baseFiscal.healthcareCosts);
    });

    it('should apply cost premiums for future years', () => {
      const baseFiscal: AnnualFiscalFlows = {
        totalPopulation: 100000,
        nativePopulation: 100000,
        immigrantPopulation: 0,
        children: 20000,
        workingAge: 60000,
        elderly: 20000,
        dependencyRatio: 66.67,
        oldAgeDependencyRatio: 33.33,
        incomeTaxRevenue: 10000,
        socialInsuranceRevenue: 5000,
        vatRevenue: 3000,
        totalContributions: 18000,
        educationCosts: 5000,
        healthcareCosts: 8000,
        pensionCosts: 6000,
        benefitCosts: 2000,
        interestExpense: 1000,
        totalStateCosts: 22000,
        primaryBalance: -3000,
        netFiscalBalance: -4000,
        nativeFiscal: { contributions: 18000, costs: 21000, balance: -3000 },
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

      const result = applyGDPAdjustments(
        baseFiscal,
        2034,  // 10 years after base year
        2024,
        1.0,
        0.02,   // 2% healthcare premium
        0.01,   // 1% pension premium
        1.2     // 20% cumulative GDP growth
      );

      // Healthcare should be higher (GDP multiplier + premium)
      expect(result.adjustedHealthcare).toBeGreaterThan(baseFiscal.healthcareCosts);
      
      // Pensions should have premium applied
      expect(result.adjustedPensions).toBeGreaterThan(baseFiscal.pensionCosts);
    });
  });
});

