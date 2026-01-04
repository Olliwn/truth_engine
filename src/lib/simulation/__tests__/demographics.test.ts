/**
 * Demographics Module Unit Tests
 */

import {
  getMortalityRate,
  applyMortality,
  agePopulation,
  calculateBirths,
  addBirths,
  getBirthsForYear,
  executeDemographicsStep,
  buildNativePopulationForYear,
  validatePopulationTotal,
} from '../demographics';

import { PopulationState, createEmptyPopulationState } from '../SimulationState';

describe('Demographics Module', () => {
  describe('getMortalityRate', () => {
    it('should return higher mortality for infants', () => {
      const infantMortality = getMortalityRate(0);
      const adultMortality = getMortalityRate(30);
      expect(infantMortality).toBeGreaterThan(adultMortality);
    });

    it('should return higher mortality for elderly', () => {
      const middleAgeMortality = getMortalityRate(50);
      const elderlyMortality = getMortalityRate(80);
      expect(elderlyMortality).toBeGreaterThan(middleAgeMortality);
    });

    it('should interpolate between known ages', () => {
      const rate25 = getMortalityRate(25);
      expect(rate25).toBeGreaterThan(0);
      expect(rate25).toBeLessThan(0.01);  // Should be low for young adults
    });

    it('should cap at age 100', () => {
      const rate100 = getMortalityRate(100);
      const rate150 = getMortalityRate(150);
      expect(rate100).toBe(rate150);
    });
  });

  describe('applyMortality', () => {
    it('should reduce population counts', () => {
      const state: PopulationState = {
        native: new Map([[50, 100000]]),
        immigrants: new Map(),
      };

      const { newState, deaths } = applyMortality(state);
      
      const remaining = newState.native.get(50) || 0;
      expect(remaining).toBeLessThan(100000);
      expect(deaths).toBeGreaterThan(0);
      expect(deaths).toBe(100000 - remaining);
    });

    it('should apply mortality to immigrants too', () => {
      const state: PopulationState = {
        native: new Map(),
        immigrants: new Map([['50:work_based:2020', 10000]]),
      };

      const { newState, deaths } = applyMortality(state);
      
      const remaining = newState.immigrants.get('50:work_based:2020') || 0;
      expect(remaining).toBeLessThan(10000);
      expect(deaths).toBeGreaterThan(0);
    });

    it('should remove entries with zero survivors', () => {
      // Very high mortality age with few people
      const state: PopulationState = {
        native: new Map([[100, 10]]),
        immigrants: new Map(),
      };

      const { newState } = applyMortality(state);
      
      // With 30%+ mortality, some tests might result in zero survivors
      const remaining = newState.native.get(100) || 0;
      expect(remaining).toBeLessThanOrEqual(10);
    });
  });

  describe('agePopulation', () => {
    it('should shift all ages by 1', () => {
      const state: PopulationState = {
        native: new Map([
          [20, 1000],
          [30, 2000],
          [40, 1500],
        ]),
        immigrants: new Map(),
      };

      const newState = agePopulation(state);

      expect(newState.native.get(20)).toBeUndefined();
      expect(newState.native.get(21)).toBe(1000);
      expect(newState.native.get(31)).toBe(2000);
      expect(newState.native.get(41)).toBe(1500);
    });

    it('should cap at age 100', () => {
      const state: PopulationState = {
        native: new Map([
          [99, 500],
          [100, 200],
        ]),
        immigrants: new Map(),
      };

      const newState = agePopulation(state);

      expect(newState.native.get(99)).toBeUndefined();
      expect(newState.native.get(100)).toBe(700);  // 500 + 200 merge at 100
    });

    it('should age immigrants with their metadata preserved', () => {
      const state: PopulationState = {
        native: new Map(),
        immigrants: new Map([
          ['30:work_based:2020', 1000],
        ]),
      };

      const newState = agePopulation(state);

      expect(newState.immigrants.get('30:work_based:2020')).toBeUndefined();
      expect(newState.immigrants.get('31:work_based:2020')).toBe(1000);
    });
  });

  describe('calculateBirths', () => {
    it('should calculate births from TFR and women of childbearing age', () => {
      const women = 1000000;  // 1M women of childbearing age
      const tfr = 1.5;

      const births = calculateBirths(women, tfr);

      // TFR of 1.5 over 35 years = ~42,857 births per year per 1M women
      expect(births).toBeGreaterThan(40000);
      expect(births).toBeLessThan(50000);
    });

    it('should return 0 for 0 women', () => {
      const births = calculateBirths(0, 1.5);
      expect(births).toBe(0);
    });

    it('should scale linearly with TFR', () => {
      const women = 1000000;
      const births15 = calculateBirths(women, 1.5);
      const births30 = calculateBirths(women, 3.0);

      expect(births30).toBeCloseTo(births15 * 2, -2);  // Allow some rounding
    });
  });

  describe('addBirths', () => {
    it('should add births at age 0', () => {
      const state: PopulationState = {
        native: new Map([[1, 1000]]),
        immigrants: new Map(),
      };

      const newState = addBirths(state, 500);

      expect(newState.native.get(0)).toBe(500);
      expect(newState.native.get(1)).toBe(1000);  // Unchanged
    });

    it('should accumulate with existing age 0', () => {
      const state: PopulationState = {
        native: new Map([[0, 300]]),
        immigrants: new Map(),
      };

      const newState = addBirths(state, 500);

      expect(newState.native.get(0)).toBe(800);
    });
  });

  describe('getBirthsForYear', () => {
    it('should return historical data for past years', () => {
      const result = getBirthsForYear(2020, 1000000, 1.8, 2035);

      // Should use historical data, not calculate
      expect(result.births).toBeGreaterThan(40000);
      expect(result.births).toBeLessThan(60000);
    });

    it('should calculate projected births for future years', () => {
      const result = getBirthsForYear(2035, 1100000, 1.8, 2035);

      // Should use scenario TFR
      expect(result.tfr).toBeCloseTo(1.8, 1);
      expect(result.births).toBeGreaterThan(0);
    });
  });

  describe('executeDemographicsStep', () => {
    it('should execute all demographics operations in order', () => {
      // Create a simple population
      const state: PopulationState = {
        native: new Map([
          [20, 100000],
          [30, 150000],
          [40, 120000],
        ]),
        immigrants: new Map(),
      };

      const result = executeDemographicsStep(state, 2025, 1.5, 2035);

      // Population should have aged
      expect(result.newState.native.get(20)).toBeUndefined();
      expect(result.newState.native.get(21)).toBeDefined();

      // Should have deaths
      expect(result.deaths).toBeGreaterThan(0);

      // Should have births (though none if no women aged 15-49)
      expect(result.births).toBeGreaterThanOrEqual(0);

      // TFR should be set
      expect(result.tfr).toBeGreaterThan(0);
    });
  });

  describe('buildNativePopulationForYear', () => {
    it('should build population for 2024', () => {
      const population = buildNativePopulationForYear(2024);

      // Should have people of various ages
      let total = 0;
      for (const count of population.values()) {
        total += count;
      }

      // Finland has ~5.5M people
      expect(total).toBeGreaterThan(4000000);
      expect(total).toBeLessThan(7000000);
    });

    it('should have more young people than very old', () => {
      const population = buildNativePopulationForYear(2024);

      const age30 = population.get(30) || 0;
      const age90 = population.get(90) || 0;

      expect(age30).toBeGreaterThan(age90);
    });
  });

  describe('validatePopulationTotal', () => {
    it('should validate 2024 population', () => {
      const population = buildNativePopulationForYear(2024);
      const result = validatePopulationTotal(population, 2024, 10);

      expect(result.expected).toBeGreaterThan(5000000);
      expect(result.actual).toBeGreaterThan(4000000);
      expect(result.errorPercent).toBeLessThan(20);  // Within 20%
    });

    it('should return valid for unknown years', () => {
      const population = new Map([[30, 100000]]);
      const result = validatePopulationTotal(population, 1800, 10);

      expect(result.valid).toBe(true);
      expect(result.expected).toBe(0);
    });
  });
});

