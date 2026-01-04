/**
 * Government Spending Constants
 * 
 * COFOG (Classification of Functions of Government) mapping and projection scenarios.
 * Historical data comes from Statistics Finland (1990-2024).
 * Future projections use configurable scenario drivers.
 */

// ===========================================
// COFOG Category Definitions
// ===========================================

export const COFOG_CATEGORIES = {
  G01: { code: 'G01', name: 'General public services', color: '#6B7280' },
  G02: { code: 'G02', name: 'Defence', color: '#10B981' },
  G03: { code: 'G03', name: 'Public order and safety', color: '#06B6D4' },
  G04: { code: 'G04', name: 'Economic affairs', color: '#F59E0B' },
  G05: { code: 'G05', name: 'Environmental protection', color: '#22C55E' },
  G06: { code: 'G06', name: 'Housing and community', color: '#F97316' },
  G07: { code: 'G07', name: 'Health', color: '#3B82F6' },
  G08: { code: 'G08', name: 'Recreation, culture, religion', color: '#EC4899' },
  G09: { code: 'G09', name: 'Education', color: '#8B5CF6' },
  G10: { code: 'G10', name: 'Social protection', color: '#EF4444' },
} as const;

export type COFOGCode = keyof typeof COFOG_CATEGORIES;

// ===========================================
// Spending Group Definitions
// ===========================================

/**
 * Projection driver types determine how spending grows in future years.
 */
export type ProjectionDriver = 
  | 'demographic'    // Scales with age-specific population (elderly, children)
  | 'population'     // Scales with total population
  | 'gdp'            // Scales with GDP
  | 'discretionary'  // User-configurable growth rate
  | 'mixed';         // Combination (e.g., debt service + baseline)

/**
 * Demographic weights for age-sensitive spending categories.
 */
export interface DemographicWeights {
  elderly: number;      // Weight for 65+ population
  children: number;     // Weight for 0-14 population
  workingAge: number;   // Weight for 15-64 population
}

/**
 * Spending group configuration.
 */
export interface SpendingGroupConfig {
  id: string;
  name: string;
  emoji: string;
  cofogCodes: COFOGCode[];
  driver: ProjectionDriver;
  demographicWeights?: DemographicWeights;
  description: string;
}

/**
 * Spending groups aggregate COFOG categories for scenario control.
 * Each group has a primary projection driver.
 */
export const SPENDING_GROUPS: Record<string, SpendingGroupConfig> = {
  healthcare_aging: {
    id: 'healthcare_aging',
    name: 'Healthcare & Aging',
    emoji: '🏥',
    cofogCodes: ['G07', 'G10'],  // Health + Social Protection
    driver: 'demographic',
    demographicWeights: { 
      elderly: 0.70,    // 70% driven by elderly population
      children: 0.10,   // 10% driven by children (child benefits, daycare)
      workingAge: 0.20  // 20% baseline (working-age benefits, admin)
    },
    description: 'Healthcare, pensions, social benefits - highly sensitive to aging population',
  },
  education_youth: {
    id: 'education_youth',
    name: 'Education & Youth',
    emoji: '📚',
    cofogCodes: ['G09'],  // Education
    driver: 'demographic',
    demographicWeights: { 
      elderly: 0.00,    // No elderly component
      children: 0.80,   // 80% driven by school-age population
      workingAge: 0.20  // 20% for adult education, universities
    },
    description: 'Schools, universities, adult education - tracks youth population',
  },
  security: {
    id: 'security',
    name: 'Security & Order',
    emoji: '🛡️',
    cofogCodes: ['G02', 'G03'],  // Defence + Public Order
    driver: 'population',
    description: 'Defence, police, courts, fire services - scales with total population',
  },
  infrastructure: {
    id: 'infrastructure',
    name: 'Infrastructure',
    emoji: '🏗️',
    cofogCodes: ['G04', 'G05', 'G06'],  // Economic + Environment + Housing
    driver: 'gdp',
    description: 'Transport, energy, housing, environment - tied to economic output',
  },
  government: {
    id: 'government',
    name: 'Government Operations',
    emoji: '🏛️',
    cofogCodes: ['G01'],  // General public services
    driver: 'mixed',
    description: 'Administration, debt service, foreign affairs - includes debt interest',
  },
  culture: {
    id: 'culture',
    name: 'Culture & Recreation',
    emoji: '🎭',
    cofogCodes: ['G08'],  // Recreation, culture, religion
    driver: 'discretionary',
    description: 'Arts, sports, libraries, religious affairs - policy-dependent',
  },
} as const;

export type SpendingGroupId = keyof typeof SPENDING_GROUPS;

// ===========================================
// Projection Scenario Definitions
// ===========================================

/**
 * Scenario options for demographic-driven spending.
 */
export const DEMOGRAPHIC_SCENARIOS = {
  baseline: {
    id: 'baseline',
    name: 'Baseline',
    description: 'Costs grow proportionally with demographic changes',
    multiplier: 1.0,
  },
  aging_pressure: {
    id: 'aging_pressure',
    name: 'Aging Pressure',
    description: 'Healthcare costs grow 1.5% faster than demographics due to medical advances',
    multiplier: 1.015,  // 1.5% annual premium
  },
  efficiency_gains: {
    id: 'efficiency_gains',
    name: 'Efficiency Gains',
    description: 'Productivity improvements offset 0.5% of demographic growth',
    multiplier: 0.995,  // 0.5% annual savings
  },
} as const;

/**
 * Scenario options for population-driven spending.
 */
export const POPULATION_SCENARIOS = {
  per_capita_constant: {
    id: 'per_capita_constant',
    name: 'Per Capita Constant',
    description: 'Spending per person stays constant (real terms)',
    mode: 'per_capita',
    growthRate: 0,
  },
  per_capita_growth: {
    id: 'per_capita_growth',
    name: 'Per Capita Growth',
    description: 'Spending per person grows 1% annually (quality improvements)',
    mode: 'per_capita',
    growthRate: 0.01,
  },
  absolute_constant: {
    id: 'absolute_constant',
    name: 'Absolute Freeze',
    description: 'Total spending frozen at 2024 levels (real terms)',
    mode: 'absolute',
    growthRate: 0,
  },
} as const;

/**
 * Scenario options for GDP-driven spending.
 */
export const GDP_SCENARIOS_SPENDING = {
  gdp_ratio_constant: {
    id: 'gdp_ratio_constant',
    name: 'GDP Ratio Constant',
    description: 'Maintain constant share of GDP (e.g., 5%)',
    mode: 'ratio',
  },
  gdp_linked: {
    id: 'gdp_linked',
    name: 'GDP Linked',
    description: 'Grow with GDP (absolute terms)',
    mode: 'absolute',
  },
  productivity_investment: {
    id: 'productivity_investment',
    name: 'Productivity Investment',
    description: 'Increase GDP share by 0.5%/decade for productivity gains',
    mode: 'ratio_growth',
    ratioGrowth: 0.005 / 10,  // 0.5% per decade = 0.05% per year
  },
} as const;

/**
 * Scenario options for discretionary spending.
 */
export const DISCRETIONARY_SCENARIOS = {
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    description: 'Spending frozen at 2024 levels (real terms)',
    growthRate: 0,
  },
  cpi_growth: {
    id: 'cpi_growth',
    name: 'CPI Growth',
    description: 'Grow with inflation only (maintain purchasing power)',
    growthRate: 0,  // Real growth = 0, nominal = CPI
  },
  modest_growth: {
    id: 'modest_growth',
    name: 'Modest Growth',
    description: '1% annual real growth',
    growthRate: 0.01,
  },
} as const;

/**
 * Scenario options for government operations (mixed driver).
 */
export const GOVERNMENT_SCENARIOS = {
  baseline: {
    id: 'baseline',
    name: 'Baseline',
    description: 'Admin grows with GDP, debt service follows interest rates',
    adminGrowth: 'gdp',
    debtService: 'calculated',  // From debt stock * interest rate
  },
  debt_optimized: {
    id: 'debt_optimized',
    name: 'Debt Optimized',
    description: 'Assumes debt reduction efforts, lower interest burden',
    adminGrowth: 'gdp',
    debtService: 'optimistic',  // Assumes gradual debt reduction
  },
  austerity: {
    id: 'austerity',
    name: 'Austerity',
    description: 'Admin costs frozen, aggressive debt management',
    adminGrowth: 'freeze',
    debtService: 'calculated',
  },
} as const;

// ===========================================
// Aggregated Scenario Types
// ===========================================

export type DemographicScenarioId = keyof typeof DEMOGRAPHIC_SCENARIOS;
export type PopulationScenarioId = keyof typeof POPULATION_SCENARIOS;
export type GDPSpendingScenarioId = keyof typeof GDP_SCENARIOS_SPENDING;
export type DiscretionaryScenarioId = keyof typeof DISCRETIONARY_SCENARIOS;
export type GovernmentScenarioId = keyof typeof GOVERNMENT_SCENARIOS;

/**
 * Complete spending scenario configuration.
 */
export interface SpendingScenario {
  healthcareAging: DemographicScenarioId;
  educationYouth: DemographicScenarioId;
  security: PopulationScenarioId;
  infrastructure: GDPSpendingScenarioId;
  government: GovernmentScenarioId;
  culture: DiscretionaryScenarioId;
}

/**
 * Default spending scenario (moderate assumptions).
 */
export const DEFAULT_SPENDING_SCENARIO: SpendingScenario = {
  healthcareAging: 'baseline',
  educationYouth: 'baseline',
  security: 'per_capita_constant',
  infrastructure: 'gdp_ratio_constant',
  government: 'baseline',
  culture: 'cpi_growth',
};

/**
 * Preset spending scenarios for quick selection.
 */
export const SPENDING_SCENARIO_PRESETS: Record<string, { name: string; emoji: string; scenario: SpendingScenario; description: string }> = {
  status_quo: {
    name: 'Status Quo',
    emoji: '📊',
    scenario: DEFAULT_SPENDING_SCENARIO,
    description: 'Current policies continue with demographic adjustments',
  },
  aging_crisis: {
    name: 'Aging Crisis',
    emoji: '⚠️',
    scenario: {
      healthcareAging: 'aging_pressure',
      educationYouth: 'baseline',
      security: 'per_capita_constant',
      infrastructure: 'gdp_ratio_constant',
      government: 'baseline',
      culture: 'freeze',
    },
    description: 'Healthcare costs surge due to aging population and medical advances',
  },
  austerity: {
    name: 'Austerity',
    emoji: '✂️',
    scenario: {
      healthcareAging: 'efficiency_gains',
      educationYouth: 'efficiency_gains',
      security: 'absolute_constant',
      infrastructure: 'gdp_linked',
      government: 'austerity',
      culture: 'freeze',
    },
    description: 'Aggressive cost controls across all sectors',
  },
  investment: {
    name: 'Investment Focus',
    emoji: '📈',
    scenario: {
      healthcareAging: 'baseline',
      educationYouth: 'baseline',
      security: 'per_capita_constant',
      infrastructure: 'productivity_investment',
      government: 'baseline',
      culture: 'modest_growth',
    },
    description: 'Increased infrastructure and productivity investments',
  },
};

// ===========================================
// Historical Data Constants
// ===========================================

/**
 * Base year for projections (last year with actual data).
 */
export const SPENDING_BASE_YEAR = 2024;

/**
 * First year with historical data.
 */
export const SPENDING_START_YEAR = 1990;

/**
 * Last projection year.
 */
export const SPENDING_END_YEAR = 2060;

/**
 * COFOG categories ordered for stacked charts (largest at bottom).
 */
export const COFOG_STACK_ORDER: COFOGCode[] = [
  'G10',  // Social protection (largest)
  'G07',  // Health
  'G01',  // General public services
  'G09',  // Education
  'G04',  // Economic affairs
  'G08',  // Recreation, culture
  'G02',  // Defence
  'G03',  // Public order
  'G06',  // Housing
  'G05',  // Environment (smallest)
];

/**
 * Map from COFOG to legacy 4-category system for backward compatibility.
 */
export const COFOG_TO_LEGACY_MAP: Record<COFOGCode, 'education' | 'healthcare' | 'pensions' | 'benefits' | 'other'> = {
  G01: 'other',       // General public services
  G02: 'other',       // Defence
  G03: 'other',       // Public order
  G04: 'other',       // Economic affairs
  G05: 'other',       // Environment
  G06: 'other',       // Housing
  G07: 'healthcare',  // Health
  G08: 'other',       // Recreation, culture
  G09: 'education',   // Education
  G10: 'pensions',    // Social protection (split between pensions and benefits)
};

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get the spending group that contains a COFOG code.
 */
export function getSpendingGroupForCOFOG(cofogCode: COFOGCode): SpendingGroupConfig | undefined {
  return Object.values(SPENDING_GROUPS).find(group => 
    group.cofogCodes.includes(cofogCode)
  );
}

/**
 * Get all COFOG codes for a spending group.
 */
export function getCOFOGCodesForGroup(groupId: SpendingGroupId): COFOGCode[] {
  return SPENDING_GROUPS[groupId]?.cofogCodes || [];
}

/**
 * Get scenario options for a spending group's driver type.
 */
export function getScenarioOptionsForGroup(groupId: SpendingGroupId): Record<string, { id: string; name: string; description: string }> {
  const group = SPENDING_GROUPS[groupId];
  if (!group) return {};
  
  switch (group.driver) {
    case 'demographic':
      return DEMOGRAPHIC_SCENARIOS;
    case 'population':
      return POPULATION_SCENARIOS;
    case 'gdp':
      return GDP_SCENARIOS_SPENDING;
    case 'discretionary':
      return DISCRETIONARY_SCENARIOS;
    case 'mixed':
      return GOVERNMENT_SCENARIOS;
    default:
      return {};
  }
}

