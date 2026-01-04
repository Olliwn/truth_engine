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
// Historical Immigration Data (Finland)
// ===========================================

// Total immigration to Finland by year
export const HISTORICAL_IMMIGRATION: Record<number, number> = {
  2010: 25636,
  2011: 29481,
  2012: 31278,
  2013: 31941,
  2014: 31507,
  2015: 28746,
  2016: 34905,
  2017: 31797,
  2018: 31720,
  2019: 32758,
  2020: 28917,
  2021: 33372,
  2022: 49998,  // Surge
  2023: 71918,  // Record high (Ukrainian refugees)
  2024: 63965,  // Slightly lower
};

// Estimated breakdown by immigration type (based on Finnish statistics)
// Note: These are estimates as official breakdowns vary by classification method
export const HISTORICAL_IMMIGRATION_BY_TYPE: Record<number, {
  workBased: number;
  family: number;
  humanitarian: number;
  other: number;  // Students, returnees, etc.
}> = {
  2015: { workBased: 8000, family: 10000, humanitarian: 3200, other: 7546 },
  2016: { workBased: 9000, family: 11000, humanitarian: 5500, other: 9405 },
  2017: { workBased: 9500, family: 10500, humanitarian: 3800, other: 7997 },
  2018: { workBased: 10000, family: 10000, humanitarian: 3500, other: 8220 },
  2019: { workBased: 11000, family: 10000, humanitarian: 3300, other: 8458 },
  2020: { workBased: 9000, family: 9000, humanitarian: 2500, other: 8417 },   // COVID impact
  2021: { workBased: 11000, family: 10000, humanitarian: 3000, other: 9372 },
  2022: { workBased: 14000, family: 12000, humanitarian: 12000, other: 11998 }, // Ukraine
  2023: { workBased: 16000, family: 14000, humanitarian: 28000, other: 13918 }, // Ukraine peak
  2024: { workBased: 15000, family: 13000, humanitarian: 22000, other: 13965 },
};

// Reference periods for context
export const IMMIGRATION_REFERENCE_PERIODS = {
  '2010s_average': {
    label: '2010s Average',
    years: '2010-2019',
    total: 30000,
    workBased: 9500,
    family: 10000,
    humanitarian: 3500,
    description: 'Pre-pandemic baseline',
  },
  '2022_2024_average': {
    label: 'Recent (2022-24)',
    years: '2022-2024',
    total: 62000,
    workBased: 15000,
    family: 13000,
    humanitarian: 21000,
    description: 'Post-pandemic surge, Ukrainian refugees',
  },
  'peak_2023': {
    label: '2023 Peak',
    years: '2023',
    total: 72000,
    workBased: 16000,
    family: 14000,
    humanitarian: 28000,
    description: 'Record year (Ukrainian refugee wave)',
  },
};

// Net migration (immigrants - emigrants)
export const HISTORICAL_NET_MIGRATION: Record<number, number> = {
  2010: 13754,
  2015: 12441,
  2018: 15997,
  2019: 17547,
  2020: 14103,
  2021: 22480,
  2022: 60353,  // Record net migration
  2023: 38156,
  2024: 26894,
};

// Helper function to get average immigration for a period
export function getAverageImmigration(startYear: number, endYear: number): {
  total: number;
  workBased: number;
  family: number;
  humanitarian: number;
} {
  let count = 0;
  let totals = { total: 0, workBased: 0, family: 0, humanitarian: 0 };
  
  for (let year = startYear; year <= endYear; year++) {
    const byType = HISTORICAL_IMMIGRATION_BY_TYPE[year];
    if (byType) {
      totals.total += byType.workBased + byType.family + byType.humanitarian + byType.other;
      totals.workBased += byType.workBased;
      totals.family += byType.family;
      totals.humanitarian += byType.humanitarian;
      count++;
    }
  }
  
  if (count === 0) return { total: 0, workBased: 0, family: 0, humanitarian: 0 };
  
  return {
    total: Math.round(totals.total / count),
    workBased: Math.round(totals.workBased / count),
    family: Math.round(totals.family / count),
    humanitarian: Math.round(totals.humanitarian / count),
  };
}

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
  gdp: {
    scenarioId: string;
    customGrowthRate: number | null;  // If set, overrides scenario
  };
  interestRate: {
    scenarioId: string;
    customRate: number | null;  // If set, overrides scenario
  };
}

export const DEFAULT_SCENARIO: DemographicScenario = {
  birthRate: {
    presetId: 'current_trend',
    customTFR: 1.3,
    transitionYear: 2060,
  },
  immigration: { ...DEFAULT_IMMIGRATION },
  gdp: {
    scenarioId: 'slow_growth',  // DEFAULT_GDP_SCENARIO value
    customGrowthRate: null,
  },
  interestRate: {
    scenarioId: 'low',  // DEFAULT_INTEREST_RATE_SCENARIO value
    customRate: null,
  },
};

// ===========================================
// GDP Growth Scenarios
// ===========================================

/**
 * GDP Growth = Productivity Growth + Labor Force Growth
 * 
 * If working-age population shrinks, GDP growth will be lower than productivity growth.
 * Example: 2% productivity + (-0.5%) workforce = 1.5% GDP growth
 */

export interface GDPScenario {
  id: string;
  name: string;
  description: string;
  productivityGrowthRate: number;  // Annual productivity growth (output per worker)
  realGrowthRate: number;          // Fixed GDP growth rate (used when adjustForWorkforce=false)
  adjustForWorkforce: boolean;     // If true, GDP = productivity + workforce change
  revenueElasticity: number;       // How much revenues grow per 1% GDP growth (typically ~1.0)
  healthcareCostGrowthPremium: number;  // Extra growth rate for healthcare above GDP (Baumol's disease)
  pensionCostGrowthPremium: number;     // Extra growth rate for pensions above GDP
  color: string;
}

export const GDP_SCENARIOS: Record<string, GDPScenario> = {
  stagnation: {
    id: 'stagnation',
    name: 'Stagnation',
    description: 'No productivity growth (0%/year)',
    productivityGrowthRate: 0.00,
    realGrowthRate: 0.00,
    adjustForWorkforce: false,
    revenueElasticity: 1.0,
    healthcareCostGrowthPremium: 0.02,
    pensionCostGrowthPremium: 0.01,
    color: '#6B7280',
  },
  slow_growth: {
    id: 'slow_growth',
    name: 'Fixed 1%',
    description: 'Fixed 1%/year GDP growth (ignores workforce)',
    productivityGrowthRate: 0.01,
    realGrowthRate: 0.01,
    adjustForWorkforce: false,
    revenueElasticity: 1.0,
    healthcareCostGrowthPremium: 0.02,
    pensionCostGrowthPremium: 0.01,
    color: '#F59E0B',
  },
  moderate_growth: {
    id: 'moderate_growth',
    name: 'Fixed 1.5%',
    description: 'Fixed 1.5%/year GDP growth (ignores workforce)',
    productivityGrowthRate: 0.015,
    realGrowthRate: 0.015,
    adjustForWorkforce: false,
    revenueElasticity: 1.0,
    healthcareCostGrowthPremium: 0.015,
    pensionCostGrowthPremium: 0.01,
    color: '#3B82F6',
  },
  // Workforce-adjusted scenarios (more realistic)
  productivity_1pct: {
    id: 'productivity_1pct',
    name: '1% Productivity',
    description: '1% productivity growth + workforce change',
    productivityGrowthRate: 0.01,
    realGrowthRate: 0.01,  // Baseline, adjusted at runtime
    adjustForWorkforce: true,
    revenueElasticity: 1.0,
    healthcareCostGrowthPremium: 0.02,
    pensionCostGrowthPremium: 0.01,
    color: '#06B6D4',
  },
  productivity_15pct: {
    id: 'productivity_15pct',
    name: '1.5% Productivity',
    description: '1.5% productivity growth + workforce change (Finnish historical)',
    productivityGrowthRate: 0.015,
    realGrowthRate: 0.015,
    adjustForWorkforce: true,
    revenueElasticity: 1.0,
    healthcareCostGrowthPremium: 0.015,
    pensionCostGrowthPremium: 0.01,
    color: '#8B5CF6',
  },
  productivity_2pct: {
    id: 'productivity_2pct',
    name: '2% Productivity',
    description: '2% productivity growth + workforce change',
    productivityGrowthRate: 0.02,
    realGrowthRate: 0.02,
    adjustForWorkforce: true,
    revenueElasticity: 1.0,
    healthcareCostGrowthPremium: 0.01,
    pensionCostGrowthPremium: 0.005,
    color: '#22C55E',
  },
  strong_growth: {
    id: 'strong_growth',
    name: 'Fixed 2.5%',
    description: 'Optimistic fixed 2.5%/year GDP growth',
    productivityGrowthRate: 0.025,
    realGrowthRate: 0.025,
    adjustForWorkforce: false,
    revenueElasticity: 1.0,
    healthcareCostGrowthPremium: 0.01,
    pensionCostGrowthPremium: 0.005,
    color: '#22C55E',
  },
  productivity_boom: {
    id: 'productivity_boom',
    name: '3% Productivity',
    description: 'Tech/AI-driven 3% productivity + workforce change',
    productivityGrowthRate: 0.03,
    realGrowthRate: 0.03,
    adjustForWorkforce: true,
    revenueElasticity: 1.05,
    healthcareCostGrowthPremium: 0.005,
    pensionCostGrowthPremium: 0.005,
    color: '#EC4899',
  },
};

export const DEFAULT_GDP_SCENARIO = 'productivity_15pct';

/**
 * Calculate effective GDP growth rate accounting for workforce changes
 */
export function calculateEffectiveGDPGrowth(
  scenario: GDPScenario,
  workforceChangeRate: number  // e.g., -0.005 for -0.5% workforce decline
): number {
  if (scenario.adjustForWorkforce) {
    // GDP = Productivity + Labor Force Change
    return scenario.productivityGrowthRate + workforceChangeRate;
  }
  return scenario.realGrowthRate;
}

// ===========================================
// Interest Rate Scenarios
// ===========================================

export interface InterestRateScenario {
  id: string;
  name: string;
  description: string;
  rate: number;  // Annual interest rate (e.g., 0.03 = 3%)
  color: string;
}

export const INTEREST_RATE_SCENARIOS: Record<string, InterestRateScenario> = {
  ultra_low: {
    id: 'ultra_low',
    name: 'Ultra Low',
    description: 'Post-2008 QE era rates (1.5%)',
    rate: 0.015,
    color: '#22C55E',
  },
  low: {
    id: 'low',
    name: 'Low',
    description: 'Current low-rate environment (2.5%)',
    rate: 0.025,
    color: '#3B82F6',
  },
  moderate: {
    id: 'moderate',
    name: 'Moderate',
    description: 'Normalized rates (3.5%)',
    rate: 0.035,
    color: '#F59E0B',
  },
  high: {
    id: 'high',
    name: 'High',
    description: 'Historical average (5%)',
    rate: 0.05,
    color: '#EF4444',
  },
  crisis: {
    id: 'crisis',
    name: 'Crisis',
    description: 'Sovereign debt stress (7%+)',
    rate: 0.07,
    color: '#991B1B',
  },
};

export const DEFAULT_INTEREST_RATE_SCENARIO = 'low';

// Historical Finnish government debt data (billions EUR)
export const HISTORICAL_DEBT: Record<number, number> = {
  1990: 11.0,
  1995: 52.0,   // Post-recession peak
  2000: 61.0,
  2005: 57.0,
  2010: 75.0,
  2015: 100.0,
  2018: 105.0,
  2019: 106.0,
  2020: 125.0,  // COVID spike
  2021: 132.0,
  2022: 143.0,
  2023: 155.0,
  2024: 165.0,  // Estimate
};

// Get debt for a specific year (with interpolation)
export function getHistoricalDebt(year: number): number {
  const years = Object.keys(HISTORICAL_DEBT).map(Number).sort((a, b) => a - b);
  
  if (year <= years[0]) return HISTORICAL_DEBT[years[0]];
  if (year >= years[years.length - 1]) return HISTORICAL_DEBT[years[years.length - 1]];
  
  for (let i = 0; i < years.length - 1; i++) {
    if (year >= years[i] && year < years[i + 1]) {
      const ratio = (year - years[i]) / (years[i + 1] - years[i]);
      return HISTORICAL_DEBT[years[i]] + 
        (HISTORICAL_DEBT[years[i + 1]] - HISTORICAL_DEBT[years[i]]) * ratio;
    }
  }
  return HISTORICAL_DEBT[2024];
}

// Historical Finnish GDP data (billions EUR, current prices)
export const HISTORICAL_GDP: Record<number, number> = {
  1990: 89.4,
  1995: 96.1,
  2000: 132.2,
  2005: 164.4,
  2010: 187.1,
  2015: 209.6,
  2018: 233.5,
  2019: 240.1,
  2020: 236.3,  // COVID dip
  2021: 251.4,
  2022: 268.7,
  2023: 275.0,
  2024: 282.0,  // Estimate
};

// Historical Finnish government spending as % of GDP
export const HISTORICAL_GOVT_SPENDING_PCT: Record<number, number> = {
  1990: 45.5,
  1995: 61.5,  // Post-recession peak
  2000: 48.3,
  2005: 50.0,
  2010: 55.1,
  2015: 57.0,
  2018: 53.4,
  2019: 53.2,
  2020: 57.3,  // COVID spike
  2021: 55.6,
  2022: 53.4,
  2023: 54.5,
  2024: 55.0,  // Estimate
};

// Get GDP for a specific year (with interpolation)
export function getHistoricalGDP(year: number): number {
  const years = Object.keys(HISTORICAL_GDP).map(Number).sort((a, b) => a - b);
  
  if (year <= years[0]) return HISTORICAL_GDP[years[0]];
  if (year >= years[years.length - 1]) return HISTORICAL_GDP[years[years.length - 1]];
  
  for (let i = 0; i < years.length - 1; i++) {
    if (year >= years[i] && year < years[i + 1]) {
      const ratio = (year - years[i]) / (years[i + 1] - years[i]);
      return HISTORICAL_GDP[years[i]] + 
        (HISTORICAL_GDP[years[i + 1]] - HISTORICAL_GDP[years[i]]) * ratio;
    }
  }
  return HISTORICAL_GDP[2024];
}

// Calculate GDP for a future year given a growth scenario
export function projectGDP(
  baseYear: number,
  targetYear: number,
  growthRate: number,
  baseGDP?: number
): number {
  const startGDP = baseGDP ?? getHistoricalGDP(baseYear);
  const years = targetYear - baseYear;
  return startGDP * Math.pow(1 + growthRate, years);
}

// Calculate the GDP growth rate needed to balance the budget by target year
export function calculateBreakevenGrowthRate(
  currentDeficit: number,           // Deficit in €B
  currentGDP: number,               // GDP in €B
  targetYear: number,
  currentYear: number = 2024,
  revenueElasticity: number = 1.0,
  avgCostGrowthPremium: number = 0.015  // Avg of healthcare + pension premiums
): number {
  // We need revenue growth to outpace cost growth enough to close the deficit
  // Let D = deficit, G = GDP, r = revenue growth, c = cost growth
  // At balance: revenue_growth_per_year > cost_growth_per_year by enough to close D
  
  // Simplified model:
  // deficit as % of GDP
  const deficitRatio = currentDeficit / currentGDP;
  
  // Years to close the gap
  const years = targetYear - currentYear;
  if (years <= 0) return Infinity;
  
  // Required net improvement per year (assuming linear closure)
  // This is a simplification - reality is compounding
  const requiredAnnualImprovement = deficitRatio / years;
  
  // Growth rate needed where:
  // GDP_growth * revenue_elasticity - (GDP_growth + cost_premium) = required_improvement
  // g * 1.0 - g - premium = required_improvement
  // -premium = required_improvement (impossible if costs grow faster)
  
  // More accurate: we need compounding revenue growth to close cumulative gap
  // This is a rough approximation
  const estimatedGrowthNeeded = (requiredAnnualImprovement + avgCostGrowthPremium) / 
    (revenueElasticity - 1 + 0.3); // The 0.3 accounts for non-linear effects
  
  // Clamp to reasonable bounds
  return Math.min(0.10, Math.max(0, estimatedGrowthNeeded));
}

// Second-order effect: government deficit spending as % of GDP
// This highlights that cutting deficit would itself reduce GDP
export interface SecondOrderEffects {
  deficitAsPercentOfGDP: number;
  fiscalMultiplier: number;        // ~0.5-1.5 for developed economies
  gdpReductionIfBalanced: number;  // % GDP reduction if deficit eliminated
  effectiveGrowthNeeded: number;   // Growth needed accounting for this effect
}

export function calculateSecondOrderEffects(
  deficit: number,       // in €B (negative = deficit)
  gdp: number,          // in €B
  baseGrowthNeeded: number,
  fiscalMultiplier: number = 0.8  // Conservative estimate for Finland
): SecondOrderEffects {
  // Deficit is negative, so abs for percentage
  const deficitAsPercentOfGDP = (Math.abs(deficit) / gdp) * 100;
  
  // If we cut the deficit entirely, GDP would fall by multiplier * deficit
  const gdpReductionIfBalanced = deficitAsPercentOfGDP * fiscalMultiplier;
  
  // This means we need even more private sector growth to compensate
  // If deficit = 3% of GDP and multiplier = 0.8, eliminating it reduces GDP by 2.4%
  // So to maintain GDP level while balancing, we need 2.4% extra private growth
  const effectiveGrowthNeeded = baseGrowthNeeded + (gdpReductionIfBalanced / 100);
  
  return {
    deficitAsPercentOfGDP,
    fiscalMultiplier,
    gdpReductionIfBalanced,
    effectiveGrowthNeeded,
  };
}

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

