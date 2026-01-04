export interface MunicipalityData {
  municipality_code: string;
  municipality_name: string;
  projection_year: string;
  debt_year: string;
  
  // Raw values
  total_debt_eur: number;
  working_age_population: number;
  total_dependents: number;
  young_dependents_0_19: number;
  elderly_dependents_65_plus: number;
  total_population: number;
  
  // Calculated metrics
  debt_per_worker_eur: number;
  dependency_ratio: number;
  elderly_ratio: number;
  youth_ratio: number;
  
  // Additional debt metrics
  loan_per_capita_eur: number;
  relative_indebtedness_pct: number;
  equity_ratio_pct: number;
  
  // The Ponzi Index
  ponzi_index: number;
  
  // Risk category
  risk_category: 'critical' | 'high' | 'elevated' | 'moderate' | 'low';
  
  // Ranking
  rank: number;
}

export interface PonziStatistics {
  total_municipalities: number;
  ponzi_index: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdev: number;
  };
  debt_per_worker: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
  dependency_ratio: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
  risk_distribution: {
    critical: number;
    high: number;
    elevated: number;
    moderate: number;
    low: number;
  };
}

export interface YearData {
  municipalities: MunicipalityData[];
  statistics: PonziStatistics;
}

export interface PonziData {
  [year: string]: YearData;
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    id: number;
    kunta: string; // municipality code
    vuosi: number;
    nimi: string; // Finnish name
    namn: string; // Swedish name
    name: string; // English name
  };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export type RiskCategory = 'critical' | 'high' | 'elevated' | 'moderate' | 'low';

export const RISK_COLORS: Record<RiskCategory, string> = {
  critical: '#dc2626',
  high: '#f97316',
  elevated: '#eab308',
  moderate: '#3b82f6',
  low: '#22c55e',
};

export const RISK_LABELS: Record<RiskCategory, string> = {
  critical: 'Critical',
  high: 'High Risk',
  elevated: 'Elevated',
  moderate: 'Moderate',
  low: 'Low Risk',
};

// ============================================
// Maslow CPI Types (Project Gamma)
// ============================================

export interface IndexEntry {
  index: number;
  yoy_change: number;
}

export interface MaslowTimeSeriesEntry {
  year: number;
  maslow_cpi: IndexEntry;
  official_cpi: IndexEntry;
  asset_index: IndexEntry;
  gdp_per_capita: IndexEntry;
  nominal_wage: IndexEntry;
  real_wage: IndexEntry;
  sp500: IndexEntry;
  omx_helsinki: IndexEntry;
  inflation_gap: number;
  wealth_gap: number;
}

export interface MaslowCategoryData {
  name: string;
  weight: number;
  values: Array<{
    year: number;
    index: number;
  }>;
}

export interface SummaryEntry {
  start: number;
  end: number;
  total_change_pct: number;
}

export interface MaslowSummary {
  period: string;
  maslow_cpi: SummaryEntry;
  official_cpi: SummaryEntry;
  asset_index: SummaryEntry;
  gdp_per_capita: SummaryEntry;
  nominal_wage: SummaryEntry;
  real_wage: SummaryEntry;
  sp500: SummaryEntry;
  key_insight: string;
}

export interface MaslowData {
  metadata: {
    name: string;
    description: string;
    methodology: string;
    base_year: number;
    calculated_at: string;
  };
  summary: MaslowSummary;
  time_series: MaslowTimeSeriesEntry[];
  category_breakdown: Record<string, MaslowCategoryData>;
  weights: {
    food: number;
    housing: number;
    energy: number;
    fuel: number;
  };
}

// ============================================
// Purchasing Power Types (Project Delta)
// ============================================

export interface DecileIncomeData {
  nominal_income: number | null;
  real_income: number | null;
  nominal_median: number | null;
  real_median: number | null;
  income_index: number | null;
  real_income_index: number | null;
}

export interface IncomeYearEntry {
  year: number;
  deciles: Record<string, DecileIncomeData>;
}

export interface DecileWealthMeanMedian {
  nettoae_DN3001?: number | null;  // Net wealth
  bruttoae_DA1000?: number | null; // Total assets
  realvar?: number | null;          // Real wealth
  finan?: number | null;            // Financial assets
  luototy?: number | null;          // Total debt
  asuntm?: number | null;           // Housing loans
  kturaha?: number | null;          // Disposable income
}

export interface DecileWealthData {
  mean: DecileWealthMeanMedian;
  median: DecileWealthMeanMedian;
  debt_to_income: number | null;
  wealth_index: number | null;
}

export interface WealthYearEntry {
  year: number;
  deciles: Record<string, DecileWealthData>;
}

export interface DecileChangeSummary {
  real_income_change_pct?: number;
  nominal_income_change_pct?: number;
  wealth_change_pct?: number;
}

export interface PurchasingPowerSummary {
  income_period: string;
  wealth_period: string;
  decile_changes: Record<string, DecileChangeSummary>;
  gaps: {
    income_gap_widened: number;
    wealth_gap_widened: number;
  };
  key_insight: string;
}

export interface PurchasingPowerData {
  metadata: {
    name: string;
    description: string;
    calculated_at: string;
    base_year: number;
    maslow_adjusted: boolean;
  };
  summary: PurchasingPowerSummary;
  income_time_series: IncomeYearEntry[];
  wealth_data: {
    years_available: number[];
    time_series: WealthYearEntry[];
  };
  decile_labels: Record<string, string>;
}

export const DECILE_COLORS: Record<string, string> = {
  '1': '#ef4444',   // Red - Bottom 10%
  '2': '#f97316',   // Orange
  '3': '#f59e0b',   // Amber
  '4': '#eab308',   // Yellow
  '5': '#84cc16',   // Lime - Median
  '6': '#22c55e',   // Green
  '7': '#14b8a6',   // Teal
  '8': '#06b6d4',   // Cyan
  '9': '#3b82f6',   // Blue
  '10': '#8b5cf6',  // Purple - Top 10%
};

// ============================================
// Wage Trap Types (Project Alpha)
// ============================================

export type WageTrapHouseholdProfile = 
  | 'single'
  | 'single_1child'
  | 'single_2children'
  | 'couple'
  | 'couple_1child'
  | 'couple_2children'
  | 'student';

export type WageTrapMunicipality = 'helsinki' | 'espoo' | 'tampere' | 'turku' | 'oulu' | 'other';

export type WageTrapEmploymentStatus = 'employed' | 'unemployed' | 'student';

export interface WageTrapTaxBreakdown {
  grossMonthlyIncome: number;
  grossAnnualIncome: number;
  pensionContribution: number;
  unemploymentInsurance: number;
  healthInsurance: number;
  totalSocialInsurance: number;
  taxableIncome: number;
  basicDeduction: number;
  earnedIncomeDeduction: number;
  workIncomeDeduction: number;
  nationalTax: number;
  municipalTax: number;
  churchTax: number;
  totalTax: number;
  totalDeductions: number;
  netMonthlyIncome: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

export interface WageTrapBenefitsBreakdown {
  housingAllowance: number;
  housingAllowanceMaxCost: number;
  housingAllowanceAcceptedCost: number;
  socialAssistance: number;
  socialAssistanceBasicAmount: number;
  socialAssistanceHousingCosts: number;
  socialAssistanceTotalNeed: number;
  unemploymentBenefit: number;
  childBenefit: number;
  studentAid: number;
  totalMeansTestedBenefits: number;
  totalUniversalBenefits: number;
  totalBenefits: number;
}

export interface WageTrapDataPoint {
  grossMonthlyIncome: number;
  monthlyRent: number;
  taxes: WageTrapTaxBreakdown;
  benefits: WageTrapBenefitsBreakdown;
  netIncomeAfterTax: number;
  totalBenefits: number;
  netDisposableIncome: number;
  effectiveTaxRate: number;
  effectiveMarginalTaxRate: number;
  benefitClawbackRate: number;
  keepPerEuro: number;
}

export interface WageTrapValley {
  start: number;
  end: number;
  peakEMTR: number;
  flatZone: boolean;
}

export interface WageTrapProfileSummary {
  zeroWorkIncome: number;
  escapeVelocity: number;
  valley: WageTrapValley;
  at2000Gross: WageTrapDataPoint;
  at4000Gross: WageTrapDataPoint;
}

export const HOUSEHOLD_PROFILE_LABELS: Record<WageTrapHouseholdProfile, string> = {
  single: 'Single, no children',
  single_1child: 'Single parent + 1 child',
  single_2children: 'Single parent + 2 children',
  couple: 'Couple, no children',
  couple_1child: 'Couple + 1 child',
  couple_2children: 'Couple + 2 children',
  student: 'Student',
};

export const MUNICIPALITY_LABELS: Record<WageTrapMunicipality, string> = {
  helsinki: 'Helsinki',
  espoo: 'Espoo',
  tampere: 'Tampere',
  turku: 'Turku',
  oulu: 'Oulu',
  other: 'Other municipality',
};

export const EMPLOYMENT_STATUS_LABELS: Record<WageTrapEmploymentStatus, string> = {
  employed: 'Employed',
  unemployed: 'Unemployed (seeking work)',
  student: 'Student',
};

// EMTR color scale
export const EMTR_COLORS = {
  low: '#22c55e',      // <50% - Green
  medium: '#eab308',   // 50-70% - Yellow
  high: '#f97316',     // 70-90% - Orange
  critical: '#dc2626', // >90% - Red
};

export function getEMTRColor(emtr: number): string {
  if (emtr < 0.5) return EMTR_COLORS.low;
  if (emtr < 0.7) return EMTR_COLORS.medium;
  if (emtr < 0.9) return EMTR_COLORS.high;
  return EMTR_COLORS.critical;
}

// ============================================
// GDP Sectors Types (Project Epsilon)
// ============================================

export interface GDPSectorEntry {
  year: number;
  total_gdp: number;
  public_sector_gdp: number;
  private_sector_gdp: number;
  manufacturing_gdp: number;
  ict_gdp: number;
  public_share_pct: number;
  private_share_pct: number;
  manufacturing_share_pct: number;
  ict_share_pct: number;
  sectors: Record<string, { label: string; value_million_eur: number }>;
}

export interface GDPSectorsData {
  metadata: {
    source: string;
    table: string;
    description: string;
    fetched_at: string;
    public_sectors: string[];
    public_sectors_description: string;
  };
  time_series: GDPSectorEntry[];
}

// ============================================
// Employment Sectors Types (Project Zeta)
// ============================================

export interface EmploymentSectorEntry {
  year: number;
  total_employed: number;
  public_sector: number;
  private_sector: number;
  manufacturing: number;
  construction: number;
  primary: number;
  ict: number;
  public_pct: number;
  private_pct: number;
  manufacturing_pct: number;
  ict_pct: number;
  construction_pct: number;
  primary_pct: number;
  private_per_public: number | null;
  sectors: Record<string, { label: string; employed: number }>;
}

export interface EmploymentSectorsData {
  metadata: {
    source: string;
    table: string;
    description: string;
    fetched_at: string;
    sector_classification: Record<string, string>;
  };
  summary: {
    period: string;
    employment_change: {
      total: number;
      public: number;
      private: number;
      manufacturing: number;
    };
    share_change: {
      public_pct: number;
      manufacturing_pct: number;
      ict_pct: number;
    };
  };
  time_series: EmploymentSectorEntry[];
}

// ============================================
// Trade Balance Types (Project Eta)
// ============================================

export interface TradeBalanceEntry {
  year: number;
  exports_total: number;
  imports_total: number;
  trade_balance: number;
  goods_balance: number;
  services_balance: number;
  goods_exports: number;
  goods_imports: number;
  services_exports: number;
  services_imports: number;
  current_account: number;
  export_coverage_pct?: number;
  services_share_pct?: number;
}

export interface TradeBalanceData {
  metadata: {
    source: string;
    table: string;
    description: string;
    fetched_at: string;
    unit: string;
  };
  summary: {
    period: string;
    current_balance_billion: number;
    peak_year: number;
    peak_balance_billion: number;
    surplus_years: number;
    deficit_years: number;
    services_share_change: number;
    key_insight: string;
  };
  time_series: TradeBalanceEntry[];
}

// ============================================
// Government Debt Types (Project Theta)
// ============================================

export interface GovernmentDebtEntry {
  year: number;
  total_debt_million: number;
  central_debt_million: number;
  local_debt_million: number;
  social_security_debt_million: number;
  central_share_pct?: number;
  local_share_pct?: number;
}

export interface GovernmentDebtData {
  metadata: {
    source: string;
    table: string;
    description: string;
    fetched_at: string;
    unit: string;
    sectors: Record<string, string>;
  };
  summary: {
    period: string;
    current_debt_billion: number;
    debt_change_billion: number;
    debt_growth_pct: number | null;
    central_debt_billion: number;
    local_debt_billion: number;
  };
  time_series: GovernmentDebtEntry[];
}

// ============================================
// Fertility Types (Project Iota)
// ============================================

export interface FertilityEntry {
  year: number;
  tfr: number | null;
  replacement_gap?: number;
  // Dynamic factor fields
  [key: string]: number | null | undefined;
}

export interface CorrelationFactorPoint {
  year: number;
  value: number | null;
  indexed: number | null;  // Index normalized (first year = 100)
}

export interface CorrelationFactor {
  id: string;
  name: string;
  description: string;
  correlation: number;
  direction: 'positive' | 'negative';
  data_available: boolean;
  data_points: number;
  time_series: CorrelationFactorPoint[];
}

export interface FertilityData {
  metadata: {
    source: string;
    tables: string[];
    description: string;
    fetched_at: string;
    replacement_level: number;
    note: string;
    methodology?: string;
  };
  summary: {
    period: string;
    analysis_period?: string;
    current_tfr: number;
    peak_year: number;
    peak_tfr: number;
    trough_year: number;
    trough_tfr: number;
    below_replacement_since: number | null;
    tfr_change_since_1990: number | null;
    strongest_negative?: CorrelationFactor | null;
    strongest_positive?: CorrelationFactor | null;
  };
  time_series: FertilityEntry[];
  tfr_normalized?: CorrelationFactorPoint[];
  correlation_factors?: CorrelationFactor[];
}

// ============================================
// Public Subsidies Types (Project Epsilon Enhanced)
// ============================================

export interface PublicSubsidiesEntry {
  year: number;
  // D3K Subsidies breakdown (EUR millions)
  subsidies_total_million: number;
  subsidies_economic_million: number;  // G04 - Business subsidies
  subsidies_agriculture_million: number;  // G0402 - Agricultural subsidies
  subsidies_housing_million: number;  // G06 - Housing subsidies
  subsidies_other_million: number;
  // D62K Social benefits (EUR millions) - pensions, unemployment, child benefits
  benefits_total_million: number;
  benefits_social_protection_million: number;  // G10 - Main category
  // D632K Purchased market production (EUR millions)
  purchased_total_million: number;
  purchased_health_million: number;  // G07 - Kela reimbursements, private healthcare
  purchased_social_million: number;  // G10 - Private care homes, outsourced services
  purchased_education_million: number;  // G09 - Private education services
  // Combined totals
  direct_public_to_private_million: number;  // D3K + D632K
  total_public_funding_million: number;  // D3K + D62K + D632K
}

export interface PublicSubsidiesData {
  metadata: {
    source: string;
    table: string;
    description: string;
    fetched_at: string;
    categories: {
      D3K: string;
      D62K: string;
      D632K: string;
    };
  };
  summary: {
    period: string;
    start_year: number;
    end_year: number;
    // Total public funding (all three categories)
    current_total_billion: number;
    total_pct_of_gdp: number;
    // Individual categories
    current_subsidies_billion: number;
    current_benefits_billion: number;
    current_purchased_billion: number;
    // Direct flows (D3K + D632K) - for backward compatibility
    direct_public_to_private_billion: number;
    direct_pct_of_gdp: number;
    // Benefits as % of GDP
    benefits_pct_of_gdp: number;
    // Growth
    growth_since_start_pct: number;
    // Categories
    largest_category: string;
    largest_category_billion: number;
    key_insight: string;
  };
  time_series: PublicSubsidiesEntry[];
}

// ============================================
// Workforce Projection Types (Project Mu)
// ============================================

export interface WorkforceScenario {
  public: number;
  private: number;
  ratio: number;
}

export interface WorkforceProjectionEntry {
  year: number;
  is_projection: boolean;
  working_age_population: number;
  elderly_population: number;
  total_population: number;
  total_employed: number;
  public_sector?: number;
  private_sector?: number;
  participation_rate: number;
  current_ratio?: number;
  // Scenario data (only for projection years)
  scenarios?: {
    static: WorkforceScenario;
    aging_driven: WorkforceScenario;
    efficiency: WorkforceScenario;
  };
}

export interface WorkforceProjectionData {
  metadata: {
    source: string;
    tables: string[];
    description: string;
    fetched_at: string;
    scenarios: {
      static: string;
      aging_driven: string;
      efficiency: string;
    };
  };
  summary: {
    period: string;
    historical_period: string;
    projection_period: string;
    current_participation_rate: number;
    current_working_age: number;
    current_elderly: number;
    projected_working_age_2040: number;
    projected_elderly_2040: number;
    working_age_change_pct: number;
    elderly_change_pct: number;
    scenario_2040: {
      static_ratio: number;
      aging_driven_ratio: number;
      efficiency_ratio: number;
    };
    key_insight: string;
  };
  time_series: WorkforceProjectionEntry[];
}

// ============================================
// Public Spending Types (Project Nu)
// ============================================

export interface SpendingSubcategory {
  code: string;
  name: string;
  amount_million: number;
  pct_of_gdp: number;
  per_capita: number;
}

export interface SpendingCategory {
  code: string;           // G01, G02, etc.
  name: string;           // "Health", "Education", etc.
  amount_million: number;
  pct_of_gdp: number;
  per_capita: number;
  subcategories?: SpendingSubcategory[];
}

export interface SectorSpending {
  code: string;
  name: string;
  amount_million: number;
  pct_of_gdp: number;
  per_capita: number;
}

export interface SpendingTimeSeriesEntry {
  year: number;
  total_million: number;
  total_pct_gdp: number;
  total_per_capita: number;
  categories: Record<string, {
    amount_million: number;
    pct_of_gdp: number;
  }>;
}

export interface PublicSpendingData {
  metadata: {
    source: string;
    table: string;
    description: string;
    fetched_at: string;
    classification: string;
    note: string;
  };
  summary: {
    year: number;
    comparison_year: number;
    total_spending_billion: number;
    pct_of_gdp: number;
    per_capita: number;
    largest_category: string;
    largest_category_billion: number;
    largest_category_pct: number;
    fastest_growing: string;
    fastest_growing_pct: number;
  };
  by_function: SpendingCategory[];
  by_sector: {
    central: SectorSpending;
    local: SectorSpending;
    social_security: SectorSpending;
  };
  time_series: SpendingTimeSeriesEntry[];
  cofog_names: Record<string, string>;
}
