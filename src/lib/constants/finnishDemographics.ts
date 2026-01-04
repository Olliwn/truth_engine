/**
 * Finnish Demographics Data for Population-Level Fiscal Simulation
 * 
 * Sources:
 * - Statistics Finland (Tilastokeskus)
 * - World Bank population data
 * - Finnish Centre for Pensions (ETK)
 * 
 * Note: Some values are approximations based on available data
 */

// ===========================================
// Birth Cohorts (Live births per year)
// ===========================================

// Finnish births by year - captures baby boom and decline
export const FINNISH_BIRTHS_BY_YEAR: Record<number, number> = {
  // Post-war baby boom (1945-1950)
  1945: 95000,
  1946: 106000, // Near peak
  1947: 108000, // Peak baby boom year
  1948: 107000,
  1949: 103000,
  1950: 98000,
  
  // 1950s - declining from boom
  1951: 93000,
  1952: 94000,
  1953: 90000,
  1954: 89000,
  1955: 89000,
  1956: 88000,
  1957: 86000,
  1958: 82000,
  1959: 83000,
  1960: 82000,
  
  // 1960s - continued decline
  1961: 82000,
  1962: 82000,
  1963: 82000,
  1964: 80000,
  1965: 78000,
  1966: 77000,
  1967: 77000,
  1968: 73000,
  1969: 67000,
  1970: 64000,
  
  // 1970s - low point
  1971: 61000,
  1972: 59000,
  1973: 57000,
  1974: 63000,
  1975: 66000,
  1976: 67000,
  1977: 65000,
  1978: 64000,
  1979: 63000,
  1980: 63000,
  
  // 1980s - stable low
  1981: 64000,
  1982: 66000,
  1983: 67000,
  1984: 65000,
  1985: 63000,
  1986: 60000,
  1987: 60000,
  1988: 63000,
  1989: 63000,
  1990: 65000,
  
  // 1990s - slight increase then decline
  1991: 66000,
  1992: 67000,
  1993: 65000,
  1994: 65000,
  1995: 63000,
  1996: 61000,
  1997: 59000,
  1998: 57000,
  1999: 57000,
  2000: 57000,
  
  // 2000s - around 57-60k
  2001: 56000,
  2002: 56000,
  2003: 57000,
  2004: 57000,
  2005: 58000,
  2006: 59000,
  2007: 58000,
  2008: 59000,
  2009: 60000,
  2010: 61000,
  
  // 2010s - decline begins
  2011: 60000,
  2012: 59000,
  2013: 58000,
  2014: 58000,
  2015: 55000,
  2016: 53000,
  2017: 51000,
  2018: 47000,
  2019: 45000,
  2020: 47000, // COVID bump
  
  // 2020s - record lows
  2021: 46000,
  2022: 45000,
  2023: 44000,
  2024: 43000, // Estimate
  2025: 42000, // Projection
};

// ===========================================
// Mortality / Survival Rates
// ===========================================

// Probability of surviving from birth to age X (Finnish life tables, simplified)
// Source: Statistics Finland life tables
export const SURVIVAL_PROBABILITY_BY_AGE: Record<number, number> = {
  0: 1.000,
  1: 0.997,
  5: 0.996,
  10: 0.996,
  15: 0.995,
  20: 0.994,
  25: 0.992,
  30: 0.990,
  35: 0.987,
  40: 0.982,
  45: 0.974,
  50: 0.962,
  55: 0.943,
  60: 0.915,
  65: 0.875,
  70: 0.815,
  75: 0.720,
  80: 0.580,
  85: 0.400,
  90: 0.220,
  95: 0.080,
  100: 0.020,
};

// Linear interpolation for survival at any age
export function getSurvivalProbability(age: number): number {
  const ages = Object.keys(SURVIVAL_PROBABILITY_BY_AGE)
    .map(Number)
    .sort((a, b) => a - b);
  
  if (age <= ages[0]) return SURVIVAL_PROBABILITY_BY_AGE[ages[0]];
  if (age >= ages[ages.length - 1]) return SURVIVAL_PROBABILITY_BY_AGE[ages[ages.length - 1]];
  
  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age < ages[i + 1]) {
      const lowerAge = ages[i];
      const upperAge = ages[i + 1];
      const ratio = (age - lowerAge) / (upperAge - lowerAge);
      return SURVIVAL_PROBABILITY_BY_AGE[lowerAge] + 
        (SURVIVAL_PROBABILITY_BY_AGE[upperAge] - SURVIVAL_PROBABILITY_BY_AGE[lowerAge]) * ratio;
    }
  }
  
  return 0;
}

// ===========================================
// Life Expectancy by Birth Cohort
// ===========================================

// Life expectancy at birth has improved over time
export const LIFE_EXPECTANCY_BY_BIRTH_YEAR: Record<number, number> = {
  1945: 62,
  1950: 66,
  1960: 69,
  1970: 70,
  1980: 74,
  1990: 75,
  2000: 78,
  2010: 80,
  2020: 82,
};

// ===========================================
// Income Decile Distribution
// ===========================================

// By definition, each decile contains 10% of the working population
// This is invariant and statistically robust
export const DECILE_DISTRIBUTION = {
  D1: 0.10,
  D2: 0.10,
  D3: 0.10,
  D4: 0.10,
  D5: 0.10,
  D6: 0.10,
  D7: 0.10,
  D8: 0.10,
  D9: 0.10,
  D10: 0.10,
};

// Average characteristics by income decile (simplified)
// Based on Finnish statistics - lower income correlates with:
// - Higher unemployment
// - Lower life expectancy
// - Earlier retirement (often disability)
export const DECILE_CHARACTERISTICS: Record<number, {
  avgUnemploymentYears: number;
  avgLifeExpectancy: number;
  avgRetirementAge: number;
  healthMultiplier: number; // Healthcare cost multiplier
}> = {
  1: { avgUnemploymentYears: 15, avgLifeExpectancy: 74, avgRetirementAge: 60, healthMultiplier: 1.8 },
  2: { avgUnemploymentYears: 8, avgLifeExpectancy: 76, avgRetirementAge: 62, healthMultiplier: 1.5 },
  3: { avgUnemploymentYears: 5, avgLifeExpectancy: 78, avgRetirementAge: 63, healthMultiplier: 1.3 },
  4: { avgUnemploymentYears: 3, avgLifeExpectancy: 80, avgRetirementAge: 64, healthMultiplier: 1.1 },
  5: { avgUnemploymentYears: 2, avgLifeExpectancy: 82, avgRetirementAge: 64, healthMultiplier: 1.0 },
  6: { avgUnemploymentYears: 1.5, avgLifeExpectancy: 83, avgRetirementAge: 65, healthMultiplier: 0.95 },
  7: { avgUnemploymentYears: 1, avgLifeExpectancy: 84, avgRetirementAge: 65, healthMultiplier: 0.9 },
  8: { avgUnemploymentYears: 0.5, avgLifeExpectancy: 85, avgRetirementAge: 66, healthMultiplier: 0.85 },
  9: { avgUnemploymentYears: 0.3, avgLifeExpectancy: 86, avgRetirementAge: 66, healthMultiplier: 0.8 },
  10: { avgUnemploymentYears: 0.2, avgLifeExpectancy: 87, avgRetirementAge: 67, healthMultiplier: 0.75 },
};

// ===========================================
// Dependency Ratio Calculation
// ===========================================

export interface PopulationSnapshot {
  year: number;
  totalPopulation: number;
  children: number;      // 0-14
  workingAge: number;    // 15-64
  elderly: number;       // 65+
  dependencyRatio: number; // (children + elderly) / workingAge * 100
  oldAgeDependencyRatio: number; // elderly / workingAge * 100
}

// ===========================================
// Historical Finnish Economic Data
// ===========================================

// GDP per capita (nominal EUR, for scaling)
export const GDP_PER_CAPITA_BY_YEAR: Record<number, number> = {
  1990: 18000,
  1995: 20000,
  2000: 26000,
  2005: 32000,
  2010: 36000,
  2015: 38000,
  2020: 43000,
  2024: 48000,
};

// Government revenue as % of GDP (for validation)
export const GOV_REVENUE_PCT_GDP: Record<number, number> = {
  1990: 0.50,
  2000: 0.52,
  2010: 0.51,
  2020: 0.51,
  2024: 0.50,
};

// Government expenditure as % of GDP
export const GOV_EXPENDITURE_PCT_GDP: Record<number, number> = {
  1990: 0.48,
  2000: 0.46,
  2010: 0.52,
  2020: 0.57, // COVID spike
  2024: 0.55,
};

// ===========================================
// Population Projections (Statistics Finland)
// ===========================================

export const POPULATION_PROJECTION = {
  // Total Finnish population projections
  2024: 5600000,
  2030: 5650000,
  2040: 5600000,
  2050: 5500000,
  2060: 5350000,
  2070: 5150000,
};

// ===========================================
// Helper Functions
// ===========================================

export function getPopulationByYear(year: number): number {
  // Calculate approximate population for a given year
  // by summing surviving cohorts
  let totalPopulation = 0;
  
  for (let birthYear = year - 100; birthYear <= year; birthYear++) {
    const births = FINNISH_BIRTHS_BY_YEAR[birthYear] || 0;
    const age = year - birthYear;
    const survival = getSurvivalProbability(age);
    totalPopulation += births * survival;
  }
  
  return Math.round(totalPopulation);
}

export function getCohortSizeAtAge(birthYear: number, age: number): number {
  const births = FINNISH_BIRTHS_BY_YEAR[birthYear] || 50000; // Default estimate
  const survival = getSurvivalProbability(age);
  return Math.round(births * survival);
}

export function getWorkingAgePopulation(year: number): number {
  let workingAge = 0;
  for (let age = 15; age <= 64; age++) {
    const birthYear = year - age;
    workingAge += getCohortSizeAtAge(birthYear, age);
  }
  return workingAge;
}

export function getElderlyPopulation(year: number): number {
  let elderly = 0;
  for (let age = 65; age <= 100; age++) {
    const birthYear = year - age;
    elderly += getCohortSizeAtAge(birthYear, age);
  }
  return elderly;
}

export function getDependencyRatio(year: number): number {
  const working = getWorkingAgePopulation(year);
  const elderly = getElderlyPopulation(year);
  const children = getPopulationByYear(year) - working - elderly;
  
  return (children + elderly) / working * 100;
}

export function getOldAgeDependencyRatio(year: number): number {
  const working = getWorkingAgePopulation(year);
  const elderly = getElderlyPopulation(year);
  
  return elderly / working * 100;
}

// Get population pyramid data for a given year
export function getPopulationPyramid(year: number): Array<{
  age: number;
  population: number;
  birthYear: number;
}> {
  const pyramid: Array<{ age: number; population: number; birthYear: number }> = [];
  
  for (let age = 0; age <= 100; age++) {
    const birthYear = year - age;
    const population = getCohortSizeAtAge(birthYear, age);
    pyramid.push({ age, population, birthYear });
  }
  
  return pyramid;
}

