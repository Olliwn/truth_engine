/**
 * Immigration Module Unit Tests
 */

import {
  distributeImmigrantsByAge,
  getExpectedAgeDistribution,
  getImmigrationForYear,
  addImmigrants,
  getEmigrationRate,
  applyEmigration,
  getImmigrantEmploymentRate,
  getImmigrantIncomeDecile,
  executeImmigrationStep,
  getImmigrantPopulationByType,
} from '../immigration';

import { PopulationState } from '../SimulationState';
import { IMMIGRATION_PROFILES } from '../../constants/demographicScenarios';

describe('Immigration Module', () => {
  describe('distributeImmigrantsByAge', () => {
    it('should distribute count across ages', () => {
      const distribution = distributeImmigrantsByAge(
        1000,
        IMMIGRATION_PROFILES.work_based,
        12345  // Seed for reproducibility
      );

      let total = 0;
      for (const count of distribution.values()) {
        total += count;
      }

      expect(total).toBe(1000);
    });

    it('should concentrate around mean age', () => {
      const distribution = distributeImmigrantsByAge(
        10000,
        IMMIGRATION_PROFILES.work_based,
        12345
      );

      // Work-based has mean age 32
      const aroundMean = (distribution.get(30) || 0) +
                         (distribution.get(31) || 0) +
                         (distribution.get(32) || 0) +
                         (distribution.get(33) || 0) +
                         (distribution.get(34) || 0);

      // Should have significant concentration around mean
      expect(aroundMean).toBeGreaterThan(1000);
    });

    it('should return empty map for 0 count', () => {
      const distribution = distributeImmigrantsByAge(
        0,
        IMMIGRATION_PROFILES.work_based
      );

      expect(distribution.size).toBe(0);
    });
  });

  describe('getExpectedAgeDistribution', () => {
    it('should sum to input count', () => {
      const distribution = getExpectedAgeDistribution(
        5000,
        IMMIGRATION_PROFILES.family
      );

      let total = 0;
      for (const count of distribution.values()) {
        total += count;
      }

      expect(total).toBe(5000);
    });

    it('should respect min/max age bounds', () => {
      const distribution = getExpectedAgeDistribution(
        1000,
        IMMIGRATION_PROFILES.work_based
      );

      // Work-based: minAge 22, maxAge 55
      for (const [age] of distribution) {
        expect(age).toBeGreaterThanOrEqual(22);
        expect(age).toBeLessThanOrEqual(55);
      }
    });
  });

  describe('getImmigrationForYear', () => {
    it('should return historical data for 2020', () => {
      const immigration = getImmigrationForYear(2020, 15000, 10000, 8000);

      // 2020 had COVID impact
      expect(immigration.workBased).toBeLessThan(15000);
    });

    it('should return scenario values for 2030', () => {
      const immigration = getImmigrationForYear(2030, 15000, 10000, 8000);

      expect(immigration.workBased).toBe(15000);
      expect(immigration.family).toBe(10000);
      expect(immigration.humanitarian).toBe(8000);
    });

    it('should scale down for early years', () => {
      const immigration = getImmigrationForYear(1995, 15000, 10000, 8000);

      expect(immigration.workBased).toBeLessThan(8000);
    });
  });

  describe('addImmigrants', () => {
    it('should add immigrants to population', () => {
      const state: PopulationState = {
        native: new Map(),
        immigrants: new Map(),
      };

      const { newState, arrivals } = addImmigrants(
        state,
        2024,
        1000,
        500,
        300
      );

      expect(arrivals.total).toBe(1800);
      expect(arrivals.workBased).toBe(1000);
      expect(arrivals.family).toBe(500);
      expect(arrivals.humanitarian).toBe(300);

      // Should have immigrants in the map
      let immigrantTotal = 0;
      for (const count of newState.immigrants.values()) {
        immigrantTotal += count;
      }
      expect(immigrantTotal).toBe(1800);
    });
  });

  describe('getEmigrationRate', () => {
    it('should return higher rate for work-based', () => {
      const workRate = getEmigrationRate('work_based', 0);
      const humanitarianRate = getEmigrationRate('humanitarian', 0);

      expect(workRate).toBeGreaterThan(humanitarianRate);
    });

    it('should decrease with years in country', () => {
      const year0 = getEmigrationRate('family', 0);
      const year10 = getEmigrationRate('family', 10);

      expect(year10).toBeLessThan(year0);
    });
  });

  describe('applyEmigration', () => {
    it('should reduce immigrant population', () => {
      const state: PopulationState = {
        native: new Map(),
        immigrants: new Map([
          ['30:work_based:2020', 10000],
        ]),
      };

      const { newState, emigration } = applyEmigration(state, 2024);

      const remaining = newState.immigrants.get('30:work_based:2020') || 0;
      expect(remaining).toBeLessThan(10000);
      expect(emigration).toBeGreaterThan(0);
    });

    it('should not affect native population', () => {
      const state: PopulationState = {
        native: new Map([[30, 100000]]),
        immigrants: new Map(),
      };

      const { newState, emigration } = applyEmigration(state, 2024);

      expect(newState.native.get(30)).toBe(100000);
      expect(emigration).toBe(0);
    });
  });

  describe('getImmigrantEmploymentRate', () => {
    it('should return higher rate for work-based', () => {
      const workRate = getImmigrantEmploymentRate('work_based', 0);
      const humanitarianRate = getImmigrantEmploymentRate('humanitarian', 0);

      expect(workRate).toBeGreaterThan(humanitarianRate);
    });

    it('should increase with years in country', () => {
      const year0 = getImmigrantEmploymentRate('humanitarian', 0);
      const year10 = getImmigrantEmploymentRate('humanitarian', 10);

      expect(year10).toBeGreaterThan(year0);
    });

    it('should cap at target after integration years', () => {
      const year0 = getImmigrantEmploymentRate('work_based', 0);
      const year20 = getImmigrantEmploymentRate('work_based', 20);
      const year21 = getImmigrantEmploymentRate('work_based', 21);

      expect(year20).toBe(year21);  // Should be at target
      expect(year20).toBeGreaterThan(year0);
    });
  });

  describe('getImmigrantIncomeDecile', () => {
    it('should return higher decile for work-based', () => {
      const workDecile = getImmigrantIncomeDecile('work_based', 5);
      const humanitarianDecile = getImmigrantIncomeDecile('humanitarian', 5);

      expect(workDecile).toBeGreaterThan(humanitarianDecile);
    });

    it('should increase with years in country', () => {
      const year0 = getImmigrantIncomeDecile('family', 0);
      const year10 = getImmigrantIncomeDecile('family', 10);

      expect(year10).toBeGreaterThanOrEqual(year0);
    });
  });

  describe('executeImmigrationStep', () => {
    it('should add immigrants and apply emigration', () => {
      const state: PopulationState = {
        native: new Map(),
        immigrants: new Map([
          ['30:work_based:2020', 5000],
        ]),
      };

      // Use a future year (2030) to use scenario values instead of historical data
      const result = executeImmigrationStep(
        state,
        2030,
        1000,
        500,
        300
      );

      expect(result.arrivals.total).toBe(1800);
      expect(result.emigration).toBeGreaterThan(0);
      expect(result.netMigration).toBe(result.arrivals.total - result.emigration);
    });
  });

  describe('getImmigrantPopulationByType', () => {
    it('should count by type correctly', () => {
      const state: PopulationState = {
        native: new Map(),
        immigrants: new Map([
          ['30:work_based:2020', 1000],
          ['25:work_based:2021', 500],
          ['35:family:2022', 800],
          ['20:humanitarian:2023', 300],
        ]),
      };

      const byType = getImmigrantPopulationByType(state);

      expect(byType.workBased).toBe(1500);
      expect(byType.family).toBe(800);
      expect(byType.humanitarian).toBe(300);
      expect(byType.total).toBe(2600);
    });
  });
});

