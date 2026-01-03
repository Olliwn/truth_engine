/**
 * Finnish Benefits Calculator 2024
 * 
 * Calculates social benefits including housing allowance, social assistance,
 * unemployment benefits, and child benefits based on income and circumstances.
 */

import {
  HOUSING_ALLOWANCE_2024,
  HOUSING_ALLOWANCE_MAX_COSTS_2024,
  SOCIAL_ASSISTANCE_2024,
  SOCIAL_ASSISTANCE_BASIC_AMOUNTS_2024,
  LABOUR_MARKET_SUBSIDY_2024,
  CHILD_BENEFIT_2024,
  STUDENT_AID_2024,
  DAYCARE_FEES_2024,
  HOUSEHOLD_PROFILES,
  HouseholdProfile,
  HouseholdConfig,
  Municipality,
  EmploymentStatus,
} from './constants/benefits2024';

export interface BenefitsCalculationInput {
  grossMonthlyIncome: number;
  netMonthlyIncomeAfterTax: number;
  monthlyRent: number;
  municipality: Municipality;
  householdProfile: HouseholdProfile;
  employmentStatus: EmploymentStatus;
  hasDaycare?: boolean; // Whether household uses municipal daycare (default: true for families with children)
  childrenInDaycare?: number; // Number of children in daycare (defaults to all children in household)
}

export interface BenefitsBreakdown {
  // Housing allowance
  housingAllowance: number;
  housingAllowanceMaxCost: number;
  housingAllowanceAcceptedCost: number;
  
  // Social assistance
  socialAssistance: number;
  socialAssistanceBasicAmount: number;
  socialAssistanceHousingCosts: number;
  socialAssistanceTotalNeed: number;
  
  // Unemployment benefits (if applicable)
  unemploymentBenefit: number;
  
  // Child benefits (universal)
  childBenefit: number;
  
  // Student aid (if student)
  studentAid: number;
  
  // Daycare fees (cost, not benefit - shown as negative impact)
  daycareFee: number; // Total monthly daycare cost
  daycareFeeFirstChild: number; // Fee for first/highest-fee child
  daycareFeeOtherChildren: number; // Fee for 2nd child (3rd+ are free)
  daycareIncomeThreshold: number; // Income threshold for free daycare
  
  // Totals
  totalMeansTestedBenefits: number;
  totalUniversalBenefits: number;
  totalBenefits: number;
  totalCosts: number; // Daycare and other income-based costs
  netBenefits: number; // totalBenefits - totalCosts
}

/**
 * Calculate housing allowance (Yleinen asumistuki)
 */
function calculateHousingAllowance(
  grossMonthlyIncome: number,
  monthlyRent: number,
  municipality: Municipality,
  householdConfig: HouseholdConfig
): { allowance: number; maxCost: number; acceptedCost: number } {
  const householdSize = householdConfig.adults + householdConfig.children;
  
  // Get max housing costs for municipality and household size
  const maxCosts = HOUSING_ALLOWANCE_MAX_COSTS_2024[municipality] || 
                   HOUSING_ALLOWANCE_MAX_COSTS_2024.other;
  const maxCost = maxCosts[Math.min(householdSize, 5)] || maxCosts[5];
  
  // Accepted housing cost is the lesser of actual rent and max
  const acceptedCost = Math.min(monthlyRent, maxCost);
  
  // Basic deduction from income
  const deduction = householdConfig.housingAllowanceDeduction;
  
  // Excess income over deduction
  const excessIncome = Math.max(0, grossMonthlyIncome - deduction);
  
  // Calculate allowance: 80% of accepted costs minus 42% of excess income
  let allowance = (HOUSING_ALLOWANCE_2024.coverageRate * acceptedCost) - 
                  (HOUSING_ALLOWANCE_2024.incomeReductionRate * excessIncome);
  
  // Minimum benefit threshold
  if (allowance < HOUSING_ALLOWANCE_2024.minimumBenefit) {
    allowance = 0;
  }
  
  // Cannot be negative
  allowance = Math.max(0, allowance);
  
  return { allowance, maxCost, acceptedCost };
}

/**
 * Calculate social assistance (Toimeentulotuki)
 * This is the "last resort" benefit - fills gap between income and basic needs
 */
function calculateSocialAssistance(
  netIncomeAfterTax: number,
  otherBenefits: number,
  monthlyRent: number,
  householdConfig: HouseholdConfig,
  grossEarnedIncome: number
): { assistance: number; basicAmount: number; housingCosts: number; totalNeed: number } {
  // Basic amount for household
  const basicAmount = householdConfig.socialAssistanceBasic;
  
  // Housing costs covered (reasonable rent + utilities estimate)
  const utilities = 50 + (householdConfig.children * 20); // Rough estimate
  const housingCosts = monthlyRent + utilities;
  
  // Total need
  const totalNeed = basicAmount + housingCosts;
  
  // Calculate available income
  // Earned income has a protected portion
  let countedEarnedIncome = 0;
  if (grossEarnedIncome > 0) {
    const protectedAmount = Math.min(
      SOCIAL_ASSISTANCE_2024.earnedIncomeDeduction,
      grossEarnedIncome
    );
    const remainingIncome = grossEarnedIncome - protectedAmount;
    const additionalProtection = remainingIncome * SOCIAL_ASSISTANCE_2024.earnedIncomeDeductionRate;
    countedEarnedIncome = Math.max(0, grossEarnedIncome - protectedAmount - additionalProtection);
    countedEarnedIncome = Math.max(0, grossEarnedIncome - SOCIAL_ASSISTANCE_2024.earnedIncomeDeductionMax);
  }
  
  // Available income = net income + other benefits (housing allowance is counted)
  const availableIncome = netIncomeAfterTax + otherBenefits;
  
  // Social assistance fills the gap
  let assistance = Math.max(0, totalNeed - availableIncome);
  
  return { assistance, basicAmount, housingCosts, totalNeed };
}

/**
 * Calculate unemployment benefit (Työmarkkinatuki or earnings-related)
 * Only applicable if unemployed
 */
function calculateUnemploymentBenefit(
  grossMonthlyIncome: number,
  employmentStatus: EmploymentStatus,
  householdConfig: HouseholdConfig
): number {
  if (employmentStatus !== 'unemployed') return 0;
  
  // If person has earned income while unemployed, benefit is reduced
  const { protectedEarnings, reductionRate, monthlyAmount } = LABOUR_MARKET_SUBSIDY_2024;
  
  // Child supplements
  let childSupplement = 0;
  if (householdConfig.children >= 1) childSupplement = LABOUR_MARKET_SUBSIDY_2024.childSupplement1 * 21.5;
  if (householdConfig.children >= 2) childSupplement = LABOUR_MARKET_SUBSIDY_2024.childSupplement2 * 21.5;
  if (householdConfig.children >= 3) childSupplement = LABOUR_MARKET_SUBSIDY_2024.childSupplement3 * 21.5;
  
  // Base benefit
  let benefit = monthlyAmount + childSupplement;
  
  // Reduce for earned income
  if (grossMonthlyIncome > protectedEarnings) {
    const excessIncome = grossMonthlyIncome - protectedEarnings;
    const reduction = excessIncome * reductionRate;
    benefit = Math.max(0, benefit - reduction);
  }
  
  return benefit;
}

/**
 * Calculate child benefits (Lapsilisä)
 * Universal benefit - not means-tested
 */
function calculateChildBenefit(householdConfig: HouseholdConfig): number {
  const { children, isSingleParent } = householdConfig;
  
  if (children === 0) return 0;
  
  let benefit = 0;
  
  // First child
  if (children >= 1) benefit += CHILD_BENEFIT_2024.firstChild;
  // Second child
  if (children >= 2) benefit += CHILD_BENEFIT_2024.secondChild;
  // Third child
  if (children >= 3) benefit += CHILD_BENEFIT_2024.thirdChild;
  // Fourth child
  if (children >= 4) benefit += CHILD_BENEFIT_2024.fourthChild;
  // Fifth and more
  if (children >= 5) {
    for (let i = 5; i <= children; i++) {
      benefit += CHILD_BENEFIT_2024.fifthAndMore;
    }
  }
  
  // Single parent supplement
  if (isSingleParent) {
    benefit += CHILD_BENEFIT_2024.singleParentSupplement * children;
  }
  
  return benefit;
}

/**
 * Calculate student aid (Opintotuki)
 * Only applicable if student
 */
function calculateStudentAid(
  grossMonthlyIncome: number,
  monthlyRent: number,
  employmentStatus: EmploymentStatus
): number {
  if (employmentStatus !== 'student') return 0;
  
  // Study grant
  let studyGrant = STUDENT_AID_2024.studyGrant18Plus;
  
  // Housing supplement (separate from general housing allowance)
  const housingSupplementBase = Math.min(monthlyRent, STUDENT_AID_2024.housingSupplementMax / STUDENT_AID_2024.housingSupplementRate);
  const housingSupplement = Math.min(
    housingSupplementBase * STUDENT_AID_2024.housingSupplementRate,
    STUDENT_AID_2024.housingSupplementMax
  );
  
  // Income affects eligibility - simplified check
  // If earning significantly, student aid might be reduced or clawed back later
  // For now, we'll provide full amount and note the income limit
  
  return studyGrant + housingSupplement;
}

/**
 * Calculate daycare fees (Varhaiskasvatusmaksu)
 * Income-based municipal daycare fees
 * 
 * Key insight: This is a COST that increases with income, creating
 * additional marginal "tax" on income for families with children.
 */
function calculateDaycareFees(
  grossMonthlyIncome: number,
  householdConfig: HouseholdConfig,
  childrenInDaycare: number
): { 
  totalFee: number; 
  firstChildFee: number; 
  otherChildrenFee: number; 
  incomeThreshold: number;
} {
  // No daycare fee if no children in daycare
  if (childrenInDaycare <= 0) {
    return { totalFee: 0, firstChildFee: 0, otherChildrenFee: 0, incomeThreshold: 0 };
  }
  
  // Calculate family size for income threshold
  const familySize = householdConfig.adults + householdConfig.children;
  
  // Get income threshold for this family size
  let incomeThreshold: number;
  if (familySize <= 6) {
    incomeThreshold = DAYCARE_FEES_2024.incomeThresholds[familySize] || 
                      DAYCARE_FEES_2024.incomeThresholds[2];
  } else {
    // For families larger than 6, add €262 per additional member
    incomeThreshold = DAYCARE_FEES_2024.incomeThresholds[6] + 
                      (familySize - 6) * DAYCARE_FEES_2024.additionalMemberIncrease;
  }
  
  // Calculate income above threshold
  const incomeAboveThreshold = Math.max(0, grossMonthlyIncome - incomeThreshold);
  
  // Calculate fee for first/highest-fee child
  let firstChildFee = incomeAboveThreshold * DAYCARE_FEES_2024.feePercentage;
  
  // Apply max and min limits
  firstChildFee = Math.min(firstChildFee, DAYCARE_FEES_2024.maxFeeFirstChild);
  
  // If fee is below minimum, it's free
  if (firstChildFee < DAYCARE_FEES_2024.minFee) {
    firstChildFee = 0;
  }
  
  // Calculate fee for second child (40% of first child's fee)
  let secondChildFee = 0;
  if (childrenInDaycare >= 2) {
    secondChildFee = firstChildFee * DAYCARE_FEES_2024.secondChildRate;
    // Cap at max for second child
    secondChildFee = Math.min(secondChildFee, DAYCARE_FEES_2024.maxFeeSecondChild);
  }
  
  // Third and subsequent children are free
  const otherChildrenFee = secondChildFee;
  
  const totalFee = firstChildFee + otherChildrenFee;
  
  return { totalFee, firstChildFee, otherChildrenFee, incomeThreshold };
}

/**
 * Main benefits calculation function
 */
export function calculateBenefits(input: BenefitsCalculationInput): BenefitsBreakdown {
  const {
    grossMonthlyIncome,
    netMonthlyIncomeAfterTax,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
    hasDaycare,
    childrenInDaycare,
  } = input;
  
  const householdConfig = HOUSEHOLD_PROFILES[householdProfile];
  
  // Determine daycare usage - default to all children if household has children and hasDaycare not explicitly false
  const effectiveChildrenInDaycare = householdConfig.children > 0 && hasDaycare !== false
    ? (childrenInDaycare ?? householdConfig.children)
    : 0;
  
  // Universal benefits (not means-tested)
  const childBenefit = calculateChildBenefit(householdConfig);
  
  // Student aid (if applicable)
  const studentAid = calculateStudentAid(grossMonthlyIncome, monthlyRent, employmentStatus);
  
  // Housing allowance (means-tested)
  const housingResult = calculateHousingAllowance(
    grossMonthlyIncome,
    monthlyRent,
    municipality,
    householdConfig
  );
  
  // If student with student housing supplement, don't also get general housing allowance
  const housingAllowance = employmentStatus === 'student' ? 0 : housingResult.allowance;
  
  // Unemployment benefit (if applicable)
  const unemploymentBenefit = calculateUnemploymentBenefit(
    grossMonthlyIncome,
    employmentStatus,
    householdConfig
  );
  
  // Daycare fees (income-based cost)
  const daycareResult = calculateDaycareFees(
    grossMonthlyIncome,
    householdConfig,
    effectiveChildrenInDaycare
  );
  
  // Social assistance (last resort - calculated after other benefits)
  const otherBenefits = housingAllowance + childBenefit + unemploymentBenefit + studentAid;
  const socialAssistanceResult = calculateSocialAssistance(
    netMonthlyIncomeAfterTax,
    otherBenefits,
    monthlyRent,
    householdConfig,
    grossMonthlyIncome
  );
  
  // Totals
  const totalMeansTestedBenefits = housingAllowance + socialAssistanceResult.assistance + unemploymentBenefit;
  const totalUniversalBenefits = childBenefit + (employmentStatus === 'student' ? studentAid : 0);
  const totalBenefits = totalMeansTestedBenefits + totalUniversalBenefits;
  const totalCosts = daycareResult.totalFee;
  const netBenefits = totalBenefits - totalCosts;
  
  return {
    housingAllowance,
    housingAllowanceMaxCost: housingResult.maxCost,
    housingAllowanceAcceptedCost: housingResult.acceptedCost,
    
    socialAssistance: socialAssistanceResult.assistance,
    socialAssistanceBasicAmount: socialAssistanceResult.basicAmount,
    socialAssistanceHousingCosts: socialAssistanceResult.housingCosts,
    socialAssistanceTotalNeed: socialAssistanceResult.totalNeed,
    
    unemploymentBenefit,
    childBenefit,
    studentAid,
    
    // Daycare fees
    daycareFee: daycareResult.totalFee,
    daycareFeeFirstChild: daycareResult.firstChildFee,
    daycareFeeOtherChildren: daycareResult.otherChildrenFee,
    daycareIncomeThreshold: daycareResult.incomeThreshold,
    
    totalMeansTestedBenefits,
    totalUniversalBenefits,
    totalBenefits,
    totalCosts,
    netBenefits,
  };
}

/**
 * Calculate how much benefit is lost per euro of additional income
 * This helps determine the effective marginal tax rate including benefit clawbacks
 */
export function calculateBenefitClawbackRate(
  grossMonthlyIncome: number,
  netMonthlyIncomeAfterTax: number,
  monthlyRent: number,
  municipality: Municipality,
  householdProfile: HouseholdProfile,
  employmentStatus: EmploymentStatus
): number {
  const increment = 1; // €1 increment
  
  const currentBenefits = calculateBenefits({
    grossMonthlyIncome,
    netMonthlyIncomeAfterTax,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
  });
  
  // Estimate net income with €1 more gross
  // Rough approximation - actual would need tax recalculation
  const nextNetIncome = netMonthlyIncomeAfterTax + (increment * 0.7); // Assume ~30% marginal tax
  
  const nextBenefits = calculateBenefits({
    grossMonthlyIncome: grossMonthlyIncome + increment,
    netMonthlyIncomeAfterTax: nextNetIncome,
    monthlyRent,
    municipality,
    householdProfile,
    employmentStatus,
  });
  
  const benefitLoss = currentBenefits.totalBenefits - nextBenefits.totalBenefits;
  
  return benefitLoss; // How much benefit is lost per €1 of gross income
}

