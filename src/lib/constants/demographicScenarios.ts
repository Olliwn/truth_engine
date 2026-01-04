/**
 * Demographic Scenario Constants
 * 
 * Birth rate presets and immigration profiles for population simulation
 */

// ===========================================
// Birth Rate / Total Fertility Rate (TFR)
// ===========================================

// Historical Finnish TFR data
export const HISTORICAL_TFR: Record<number, number> = {
  1950: 3.0,
  1960: 2.7,
  1970: 1.8,
  1980: 1.6,
  1990: 1.8,
  2000: 1.7,
  2010: 1.9,
  2015: 1.7,
  2018: 1.4,
  2020: 1.4,
  2022: 1.3,
  2024: 1.3,
};

// Current baseline: women of childbearing age (15-49)
// Used to convert TFR to annual births
export const WOMEN_CHILDBEARING_AGE_RATIO = 0.22; // ~22% of population

export interface BirthRatePreset {
  id: string;
  name: string;
  description: string;
  targetTFR: number;
  transitionYear: number;
  color: string;
}

export const BIRTH_RATE_PRESETS: Record<string, BirthRatePreset> = {
  current_trend: {
    id: 'current_trend',
    name: 'Current Trend',
    description: 'TFR remains at ~1.3, continuing the current low birth rate',
    targetTFR: 1.3,
    transitionYear: 2060,
    color: '#6B7280', // gray
  },
  recovery: {
    id: 'recovery',
    name: 'Recovery',
    description: 'TFR recovers to 1.8 by 2035 (Nordic average)',
    targetTFR: 1.8,
    transitionYear: 2035,
    color: '#22C55E', // green
  },
  further_decline: {
    id: 'further_decline',
    name: 'Further Decline',
    description: 'TFR drops to 1.1 by 2040 (South Korea scenario)',
    targetTFR: 1.1,
    transitionYear: 2040,
    color: '#EF4444', // red
  },
  replacement: {
    id: 'replacement',
    name: 'Replacement Level',
    description: 'TFR reaches 2.1 by 2045 (population stability)',
    targetTFR: 2.1,
    transitionYear: 2045,
    color: '#3B82F6', // blue
  },
};

// Calculate TFR for a given year based on scenario
export function calculateTFR(
  year: number,
  targetTFR: number,
  transitionYear: number,
  startYear: number = 2024,
  startTFR: number = 1.32
): number {
  // Historical data takes precedence
  if (year <= 2024) {
    return getHistoricalTFR(year);
  }
  
  // After transition year, use target
  if (year >= transitionYear) {
    return targetTFR;
  }
  
  // Linear interpolation between start and target
  const progress = (year - startYear) / (transitionYear - startYear);
  return startTFR + (targetTFR - startTFR) * progress;
}

// Get historical TFR with interpolation
export function getHistoricalTFR(year: number): number {
  const years = Object.keys(HISTORICAL_TFR).map(Number).sort((a, b) => a - b);
  
  if (year <= years[0]) return HISTORICAL_TFR[years[0]];
  if (year >= years[years.length - 1]) return HISTORICAL_TFR[years[years.length - 1]];
  
  // Find surrounding years and interpolate
  for (let i = 0; i < years.length - 1; i++) {
    if (year >= years[i] && year < years[i + 1]) {
      const ratio = (year - years[i]) / (years[i + 1] - years[i]);
      return HISTORICAL_TFR[years[i]] + 
        (HISTORICAL_TFR[years[i + 1]] - HISTORICAL_TFR[years[i]]) * ratio;
    }
  }
  
  return 1.3; // Default fallback
}

// Convert TFR to annual births estimate
// TFR = births per woman over lifetime
// Annual births ≈ TFR × women of childbearing age / average childbearing years
export function tfrToAnnualBirths(
  tfr: number,
  totalPopulation: number,
  femaleRatio: number = 0.51
): number {
  const womenOfChildbearingAge = totalPopulation * femaleRatio * WOMEN_CHILDBEARING_AGE_RATIO;
  const avgChildbearingYears = 35; // 15-49 = ~35 years
  return Math.round((tfr * womenOfChildbearingAge) / avgChildbearingYears);
}

// ===========================================
// Immigration Profiles
// ===========================================

export interface ImmigrationProfile {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  // Age distribution
  ageDistribution: {
    mean: number;
    std: number;
    minAge: number;
    maxAge: number;
  };
  // Income/employment characteristics
  incomeDecile: {
    initial: number;      // Starting decile
    target: number;       // After integration
    integrationYears: number; // Years to reach target
  };
  employmentRate: {
    initial: number;      // Starting employment rate
    target: number;       // After integration
    integrationYears: number;
  };
  // Fiscal assumptions
  initialWelfareDependency: number; // % receiving benefits initially
  familySize: number;               // Average accompanying dependents
}

export const IMMIGRATION_PROFILES: Record<string, ImmigrationProfile> = {
  work_based: {
    id: 'work_based',
    name: 'Work-based',
    description: 'Skilled workers, professionals, recruited employees',
    emoji: '💼',
    color: '#22C55E', // green - net positive
    ageDistribution: {
      mean: 32,
      std: 8,
      minAge: 22,
      maxAge: 55,
    },
    incomeDecile: {
      initial: 7,     // Start higher - they're recruited for skills
      target: 8,
      integrationYears: 3,
    },
    employmentRate: {
      initial: 0.90,  // Higher - they have jobs lined up
      target: 0.94,
      integrationYears: 2,
    },
    initialWelfareDependency: 0.02, // Very low
    familySize: 0.3, // Often come alone, family joins later separately
  },
  
  family: {
    id: 'family',
    name: 'Family Reunification',
    description: 'Spouses, children, and parents of residents',
    emoji: '👨‍👩‍👧',
    color: '#F59E0B', // amber - mixed
    ageDistribution: {
      mean: 28,
      std: 18,  // Wide range - includes children and elderly
      minAge: 0,
      maxAge: 75,
    },
    incomeDecile: {
      initial: 4,
      target: 5,
      integrationYears: 5,
    },
    employmentRate: {
      initial: 0.40,
      target: 0.65,
      integrationYears: 5,
    },
    initialWelfareDependency: 0.35,
    familySize: 0, // They ARE the family
  },
  
  humanitarian: {
    id: 'humanitarian',
    name: 'Humanitarian',
    description: 'Refugees, asylum seekers, protection status',
    emoji: '🏠',
    color: '#EF4444', // red - initially net negative
    ageDistribution: {
      mean: 25,
      std: 14,
      minAge: 0,
      maxAge: 65,
    },
    incomeDecile: {
      initial: 2,
      target: 4,
      integrationYears: 10,
    },
    employmentRate: {
      initial: 0.15,
      target: 0.55,
      integrationYears: 10,
    },
    initialWelfareDependency: 0.85,
    familySize: 1.5, // Often have dependents
  },
};

// Default immigration numbers (approximate current Finnish levels)
export const DEFAULT_IMMIGRATION = {
  workBased: 12000,
  family: 8000,
  humanitarian: 5000,
};

// ===========================================
// Combined Demographic Scenario
// ===========================================

export interface DemographicScenario {
  birthRate: {
    presetId: string | null;
    customTFR: number;
    transitionYear: number;
  };
  immigration: {
    workBased: number;
    family: number;
    humanitarian: number;
  };
}

export const DEFAULT_SCENARIO: DemographicScenario = {
  birthRate: {
    presetId: 'current_trend',
    customTFR: 1.3,
    transitionYear: 2060,
  },
  immigration: { ...DEFAULT_IMMIGRATION },
};

// ===========================================
// Fiscal Impact Calculations
// ===========================================

// Estimate annual fiscal contribution per immigrant type
// Based on employment rate, income decile, and welfare dependency
export function estimateAnnualFiscalImpact(
  profile: ImmigrationProfile,
  yearsInCountry: number
): number {
  // Interpolate employment and income based on integration progress
  const employmentProgress = Math.min(1, yearsInCountry / profile.employmentRate.integrationYears);
  const incomeProgress = Math.min(1, yearsInCountry / profile.incomeDecile.integrationYears);
  
  const currentEmployment = profile.employmentRate.initial + 
    (profile.employmentRate.target - profile.employmentRate.initial) * employmentProgress;
  
  const currentDecile = profile.incomeDecile.initial + 
    (profile.incomeDecile.target - profile.incomeDecile.initial) * incomeProgress;
  
  // Rough estimate of fiscal balance per person
  // Based on Finnish data: working-age employed person at median income contributes positively
  // Higher deciles contribute more, lower deciles may receive net benefits
  const INCOME_TO_FISCAL: Record<number, number> = {
    1: -8000,  // Net recipient (unemployment, housing benefits)
    2: -4000,
    3: -1000,
    4: 2000,
    5: 5000,   // Median worker - net positive
    6: 8000,
    7: 12000,  // Above median - solid contributor
    8: 16000,
    9: 22000,
    10: 35000, // High earner - significant contributor
  };
  
  const baseFiscal = INCOME_TO_FISCAL[Math.round(currentDecile)] || 0;
  
  // Adjust for employment rate
  // Employed: gets the base fiscal value
  // Unemployed: costs ~€18k/year (unemployment benefits, housing, services)
  const employedFiscal = baseFiscal * currentEmployment;
  const unemployedCost = (1 - currentEmployment) * -18000;
  
  // Family dependents cost (but work-based has low familySize of 0.8)
  // Children cost ~€15k/year (education, healthcare, child benefits)
  // This is already factored into familySize being low for work-based
  const dependentCost = profile.familySize * -15000;
  
  // Initial welfare dependency adjustment (for first few years)
  const welfareAdjustment = yearsInCountry < 2 
    ? -profile.initialWelfareDependency * 8000 
    : 0;
  
  return employedFiscal + unemployedCost + dependentCost + welfareAdjustment;
}

// Calculate weighted average fiscal impact for a cohort
export function calculateCohortFiscalImpact(
  count: number,
  profile: ImmigrationProfile,
  year: number,
  arrivalYear: number
): number {
  const yearsInCountry = year - arrivalYear;
  const perPersonImpact = estimateAnnualFiscalImpact(profile, yearsInCountry);
  return count * perPersonImpact;
}

