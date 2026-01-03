/**
 * Finnish Social Benefits Constants for 2024
 * Sources: Kela (Social Insurance Institution of Finland)
 * 
 * These constants define the benefit amounts, thresholds, and
 * clawback rates for Finnish social security benefits.
 */

// Re-export types from separate file for Turbopack compatibility
export type { HouseholdProfile, Municipality, EmploymentStatus, HouseholdConfig } from './benefitTypes';
import type { HouseholdProfile, HouseholdConfig } from './benefitTypes';

// ===========================================
// Housing Allowance (Yleinen asumistuki) 2024
// ===========================================

// Maximum accepted housing costs by municipality group and household size
// Municipality groups: 1 = Helsinki, 2 = Espoo/Vantaa/Kauniainen, 3 = Other cities, 4 = Rural
export const HOUSING_ALLOWANCE_MAX_COSTS_2024: Record<string, Record<number, number>> = {
  // Helsinki (Group 1)
  helsinki: {
    1: 752,   // 1 person
    2: 1014,  // 2 persons
    3: 1185,  // 3 persons
    4: 1367,  // 4 persons
    5: 1550,  // 5+ persons (add ~180 per additional)
  },
  // Espoo, Vantaa (Group 2)
  espoo: {
    1: 717,
    2: 964,
    3: 1127,
    4: 1300,
    5: 1473,
  },
  // Tampere, Turku, Oulu, and other larger cities (Group 3)
  tampere: {
    1: 603,
    2: 811,
    3: 948,
    4: 1094,
    5: 1240,
  },
  turku: {
    1: 603,
    2: 811,
    3: 948,
    4: 1094,
    5: 1240,
  },
  oulu: {
    1: 603,
    2: 811,
    3: 948,
    4: 1094,
    5: 1240,
  },
  // Other areas (Group 4)
  other: {
    1: 545,
    2: 733,
    3: 857,
    4: 989,
    5: 1121,
  },
};

export const HOUSING_ALLOWANCE_2024 = {
  // Basic deduction from income before calculating reduction
  basicDeductionSingle: 644,
  basicDeductionCouple: 1093,
  basicDeductionPerChild: 0, // Children don't add to deduction
  
  // Coverage rate - what percentage of accepted costs are covered
  coverageRate: 0.80, // 80% of accepted housing costs
  
  // Income reduction rate - benefit reduces by this % of income over deduction
  incomeReductionRate: 0.42, // 42% of excess income
  
  // Minimum benefit - below this, no benefit is paid
  minimumBenefit: 10, // €10/month minimum
  
  // Asset limits (rough - actual rules are complex)
  assetLimit: 10000, // Simplified; actual rules consider various assets
};

// ===========================================
// Social Assistance (Toimeentulotuki) 2024
// ===========================================

export const SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024 = {
  // Basic amounts per month (perusosa)
  singleAdult: 598.98,
  couplePerPerson: 508.63, // Each person in couple
  
  // Children's basic amounts (depends on age and position)
  childOver18LivingAtHome: 436.95, // Over 18, living with parents
  firstChildUnder10: 350.79,
  firstChild10to17: 394.14,
  secondChild: 364.82, // Each additional child
  child10to17: 394.14,
  
  // Single parent supplement
  singleParentSupplement: 59.90, // Added to basic amount
};

export const SOCIAL_ASSISTANCE_2024 = {
  // Earned income deduction (protected earnings)
  earnedIncomeDeduction: 150, // First €150 of earned income is not counted
  earnedIncomeDeductionRate: 0.20, // Plus 20% of the rest
  earnedIncomeDeductionMax: 300, // Maximum €300/month protected
  
  // Housing costs covered (in addition to basic amount)
  housingCostsFullyCovered: true, // Reasonable housing costs are covered
  
  // Reduction rate - income over deduction reduces benefit 1:1
  reductionRate: 1.0, // 100% - every euro of income reduces benefit by euro
};

// ===========================================
// Labour Market Subsidy (Työmarkkinatuki) 2024
// ===========================================

export const LABOUR_MARKET_SUBSIDY_2024 = {
  // Basic daily allowance
  basicDailyAllowance: 37.21, // €37.21/day
  
  // Monthly amount (21.5 payment days)
  monthlyAmount: 800.02, // Approximately
  
  // Child supplements
  childSupplement1: 7.01, // 1 child
  childSupplement2: 10.30, // 2 children (total)
  childSupplement3: 13.29, // 3+ children (total)
  
  // Income reduction
  protectedEarnings: 300, // First €300/month not reduced
  reductionRate: 0.50, // 50% reduction for income over €300
  
  // Spouse income affects
  spouseIncomeThreshold: 1192, // Spouse income over this affects benefit
};

// ===========================================
// Earnings-Related Unemployment Allowance 2024
// ===========================================

export const EARNINGS_RELATED_UNEMPLOYMENT_2024 = {
  // Basic daily allowance (same as labour market subsidy base)
  basicDailyAllowance: 37.21,
  
  // Earnings-related portion calculation
  earningsBase: 0.45, // 45% of daily wage
  earningsBaseHighIncome: 0.20, // 20% for income over €3534.95/month
  incomeThreshold: 3534.95, // Monthly income threshold for lower rate
  
  // Child supplements (same as labour market subsidy)
  childSupplement1: 7.01,
  childSupplement2: 10.30,
  childSupplement3: 13.29,
  
  // Income reduction (same as labour market subsidy)
  protectedEarnings: 300,
  reductionRate: 0.50,
};

// ===========================================
// Child Benefits (Lapsilisä) 2024
// ===========================================

export const CHILD_BENEFIT_2024 = {
  // Monthly amounts per child
  firstChild: 110.16,
  secondChild: 120.32, // Per child for 2nd child
  thirdChild: 153.94, // Per child for 3rd child
  fourthChild: 178.04, // Per child for 4th child
  fifthAndMore: 202.30, // Per child for 5th+ child
  
  // Single parent supplement
  singleParentSupplement: 73.00, // Additional per child for single parents
  
  // Not means-tested - universal benefit
  meansTested: false,
};

// ===========================================
// Child Home Care Allowance (Kotihoidon tuki) 2024
// ===========================================

export const CHILD_HOME_CARE_ALLOWANCE_2024 = {
  // Care allowance for child under 3
  basicAmount: 395.70, // For first child under 3
  siblingUnder3: 118.35, // For each additional child under 3
  siblingOver3Under7: 77.55, // For each child 3-6 years
  
  // Income-tested supplement
  supplementMax: 227.76, // Maximum supplement
  supplementIncomeThreshold: 857, // Family income threshold
  supplementReductionRate: 0.115, // Reduces by 11.5% of income over threshold
  
  // Municipal supplement (varies, Helsinki example)
  helsinkiSupplement: 264, // Helsinki pays additional
};

// ===========================================
// Student Financial Aid (Opintotuki) 2024
// ===========================================

export const STUDENT_AID_2024 = {
  // Study grant (opintoraha)
  studyGrant18Plus: 279.38, // Over 18, independent
  studyGrant17: 101.74, // 17 years old
  studyGrantUnder17: 42.40, // Under 17
  
  // Housing supplement for students
  housingSupplementMax: 252, // Maximum
  housingSupplementRate: 0.80, // 80% of rent up to max
  
  // Income limits (annual)
  annualIncomeLimit9Months: 15630, // If studying 9 months
  annualIncomeLimitPerMonth: 736, // Per non-study month
  
  // Loan guarantee
  loanGuarantee: 850, // Monthly loan guarantee available
};

// ===========================================
// Daycare Fees (Varhaiskasvatusmaksu) 2024
// Source: OKM / Municipal daycare fee regulations
// ===========================================

export const DAYCARE_FEES_2024 = {
  // Fee percentage of income above threshold
  feePercentage: 0.107, // 10.7% of income above threshold
  
  // Maximum monthly fee per child
  maxFeeFirstChild: 295, // €295/month for first/highest-fee child
  maxFeeSecondChild: 118, // 40% of first child's fee (€295 × 0.4)
  maxFeeThirdAndMore: 0, // Free for 3rd+ children
  
  // Minimum fee - below this, daycare is free
  minFee: 28, // €28/month minimum; below this = free
  
  // Income thresholds by family size (gross monthly income)
  // Family size = adults + children
  incomeThresholds: {
    2: 3874, // 1 adult + 1 child, OR couple with no children (but no kids = no daycare)
    3: 3874, // 2 adults + 1 child
    4: 4998, // 2 adults + 2 children, OR 1 adult + 3 children
    5: 5260, // Larger families
    6: 5522, // +262 per additional member
  } as Record<number, number>,
  
  // Per additional family member over 6
  additionalMemberIncrease: 262, // Threshold increases by €262 per person
  
  // Sibling discount
  secondChildRate: 0.40, // 2nd child pays 40% of highest fee
  thirdChildRate: 0, // 3rd+ children are free
};

// ===========================================
// Household Profiles
// ===========================================

export const HOUSEHOLD_PROFILES: Record<HouseholdProfile, HouseholdConfig> = {
  single: {
    adults: 1,
    children: 0,
    isSingleParent: false,
    isStudent: false,
    socialAssistanceBasic: SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.singleAdult,
    childBenefitMonthly: 0,
    housingAllowanceDeduction: HOUSING_ALLOWANCE_2024.basicDeductionSingle,
  },
  single_1child: {
    adults: 1,
    children: 1,
    isSingleParent: true,
    isStudent: false,
    socialAssistanceBasic: 
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.singleAdult + 
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.singleParentSupplement +
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.firstChildUnder10,
    childBenefitMonthly: 
      CHILD_BENEFIT_2024.firstChild + 
      CHILD_BENEFIT_2024.singleParentSupplement,
    housingAllowanceDeduction: HOUSING_ALLOWANCE_2024.basicDeductionSingle,
  },
  single_2children: {
    adults: 1,
    children: 2,
    isSingleParent: true,
    isStudent: false,
    socialAssistanceBasic:
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.singleAdult +
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.singleParentSupplement +
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.firstChildUnder10 +
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.secondChild,
    childBenefitMonthly:
      CHILD_BENEFIT_2024.firstChild +
      CHILD_BENEFIT_2024.secondChild +
      (CHILD_BENEFIT_2024.singleParentSupplement * 2),
    housingAllowanceDeduction: HOUSING_ALLOWANCE_2024.basicDeductionSingle,
  },
  couple: {
    adults: 2,
    children: 0,
    isSingleParent: false,
    isStudent: false,
    socialAssistanceBasic: SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.couplePerPerson * 2,
    childBenefitMonthly: 0,
    housingAllowanceDeduction: HOUSING_ALLOWANCE_2024.basicDeductionCouple,
  },
  couple_1child: {
    adults: 2,
    children: 1,
    isSingleParent: false,
    isStudent: false,
    socialAssistanceBasic:
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.couplePerPerson * 2 +
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.firstChildUnder10,
    childBenefitMonthly: CHILD_BENEFIT_2024.firstChild,
    housingAllowanceDeduction: HOUSING_ALLOWANCE_2024.basicDeductionCouple,
  },
  couple_2children: {
    adults: 2,
    children: 2,
    isSingleParent: false,
    isStudent: false,
    socialAssistanceBasic:
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.couplePerPerson * 2 +
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.firstChildUnder10 +
      SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.secondChild,
    childBenefitMonthly: CHILD_BENEFIT_2024.firstChild + CHILD_BENEFIT_2024.secondChild,
    housingAllowanceDeduction: HOUSING_ALLOWANCE_2024.basicDeductionCouple,
  },
  student: {
    adults: 1,
    children: 0,
    isSingleParent: false,
    isStudent: true,
    socialAssistanceBasic: SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024.singleAdult,
    childBenefitMonthly: 0,
    housingAllowanceDeduction: HOUSING_ALLOWANCE_2024.basicDeductionSingle,
  },
};

