/**
 * Finnish Lifetime Fiscal Simulator
 * 
 * Simulates a person's fiscal relationship with Finland from birth to death,
 * calculating cumulative taxes paid vs benefits/services received.
 */

import { calculateTaxes } from './finnishTaxCalculator';
import {
  EDUCATION_COSTS,
  EDUCATION_TIMELINES,
  EducationLevel,
  getHealthcareCost,
  PENSION_SYSTEM,
  VAT_RATES,
  CORPORATE_TAX_CONTRIBUTION,
  INCOME_BY_DECILE,
  calculateIncomeByAge,
  UNEMPLOYMENT_BENEFITS,
  DISABILITY_BENEFITS,
  FAMILY_BENEFITS,
  CHILD_STATE_COSTS,
} from './constants/lifecycleCosts';
import {
  LifetimeProfile,
  PRESET_PROFILES,
  getProfileById,
} from './constants/presetProfiles';
import {
  LifecyclePhase,
  LifetimeSimulationInput,
  LifetimeSimulationResult,
  AnnualFiscalFlow,
} from './types';
import { CHILD_BENEFIT_2024 } from './constants/benefits2024';

// ===========================================
// Constants for Simulation
// ===========================================

const DISCOUNT_RATE = 0.03; // 3% annual discount rate for NPV calculations
const BASE_YEAR = 2024; // Reference year for calculations
const SIMULATION_VERSION = '1.0.0';

// ===========================================
// Lifecycle Phase Determination
// ===========================================

function determineLifecyclePhase(
  age: number,
  profile: LifetimeProfile,
  unemploymentYearsRemaining: number,
  parentalLeaveYearsRemaining: number,
  accumulatedWorkYears: number
): LifecyclePhase {
  // Childhood (before school)
  if (age < 7) {
    return 'childhood';
  }
  
  // Primary school
  if (age >= 7 && age <= 15) {
    return 'primary_school';
  }
  
  // Secondary education
  if (age >= 16 && age < profile.workStartAge) {
    // Check if in higher education or secondary
    const timeline = EDUCATION_TIMELINES[profile.educationLevel];
    if (timeline.higherEdYears > 0 && age >= 19) {
      return 'higher_education';
    }
    return 'secondary';
  }
  
  // Retirement
  if (age >= profile.retirementAge) {
    return 'retirement';
  }
  
  // Disability (if applicable)
  if (profile.healthTrajectory === 'early_disability' && 
      profile.disabilityStartAge && 
      age >= profile.disabilityStartAge) {
    return 'disability';
  }
  
  // Parental leave
  if (parentalLeaveYearsRemaining > 0) {
    return 'parental_leave';
  }
  
  // Unemployment
  if (unemploymentYearsRemaining > 0) {
    return 'unemployed';
  }
  
  // Working
  return 'working';
}

// ===========================================
// Income Calculation
// ===========================================

function calculateAnnualIncome(
  age: number,
  phase: LifecyclePhase,
  profile: LifetimeProfile,
  accumulatedWorkYears: number
): number {
  // No income in childhood, school, retirement
  if (['childhood', 'primary_school', 'secondary', 'higher_education', 'retirement'].includes(phase)) {
    return 0;
  }
  
  // Get peak income from decile
  const peakIncome = INCOME_BY_DECILE[profile.incomeDecile] || INCOME_BY_DECILE[5];
  
  // Disability pension (simplified)
  if (phase === 'disability') {
    // Disability pension is based on accrued earnings + projected earnings
    const accruedPension = accumulatedWorkYears * 
      peakIncome * 
      PENSION_SYSTEM.accrualRates.age17to52;
    
    const projectedYears = 63 - age;
    const projectedPension = projectedYears * 
      calculateIncomeByAge(age, profile.workStartAge, profile.incomeDecile) *
      DISABILITY_BENEFITS.disabilityPension.projectedAccrualRate;
    
    return (accruedPension + projectedPension) * 0.6; // Simplified disability rate
  }
  
  // Parental leave - get parental allowance based on previous income
  if (phase === 'parental_leave') {
    const previousIncome = calculateIncomeByAge(
      age - 1, 
      profile.workStartAge, 
      profile.incomeDecile
    );
    return previousIncome * FAMILY_BENEFITS.parentalAllowance.rate;
  }
  
  // Unemployment - get unemployment benefit
  if (phase === 'unemployed') {
    // Simplified: use labour market subsidy
    return UNEMPLOYMENT_BENEFITS.labourMarketSubsidy.monthlyApprox * 12;
  }
  
  // Working - calculate based on age and income decile
  const baseIncome = calculateIncomeByAge(
    age, 
    profile.workStartAge, 
    profile.incomeDecile
  );
  
  // Add income volatility (random variation)
  // For deterministic simulation, we use a sine-wave pattern
  const volatilityFactor = 1 + (profile.incomeVolatility * 0.3 * Math.sin(age * 0.5));
  
  return baseIncome * volatilityFactor;
}

// ===========================================
// State Cost Calculations
// ===========================================

function calculateEducationCost(age: number, profile: LifetimeProfile): number {
  // Daycare
  if (age >= 1 && age <= 6) {
    return EDUCATION_COSTS.daycare.perYear;
  }
  
  // Primary school
  if (age >= 7 && age <= 15) {
    return EDUCATION_COSTS.primarySchool.perYear;
  }
  
  // Secondary/higher education depends on path
  const timeline = EDUCATION_TIMELINES[profile.educationLevel];
  const educationYearsTotal = timeline.totalEducationYears;
  
  // Age 16-18: Upper secondary or vocational
  if (age >= 16 && age <= 18) {
    if (profile.educationLevel === 'vocational') {
      return EDUCATION_COSTS.vocational.perYear;
    }
    return EDUCATION_COSTS.upperSecondary.perYear;
  }
  
  // Higher education years
  const higherEdStartAge = 19;
  const yearsInHigherEd = age - higherEdStartAge;
  
  if (yearsInHigherEd < 0 || yearsInHigherEd >= timeline.higherEdYears) {
    return 0;
  }
  
  // Determine which type of higher education
  switch (profile.educationLevel) {
    case 'polytechnic':
      return EDUCATION_COSTS.polytechnic.perYear;
    case 'bachelor':
      if (yearsInHigherEd < EDUCATION_COSTS.universityBachelor.durationYears) {
        return EDUCATION_COSTS.universityBachelor.perYear;
      }
      return 0;
    case 'master':
      if (yearsInHigherEd < EDUCATION_COSTS.universityBachelor.durationYears) {
        return EDUCATION_COSTS.universityBachelor.perYear;
      }
      if (yearsInHigherEd < EDUCATION_COSTS.universityBachelor.durationYears + 
          EDUCATION_COSTS.universityMaster.durationYears) {
        return EDUCATION_COSTS.universityMaster.perYear;
      }
      return 0;
    case 'phd':
      if (yearsInHigherEd < EDUCATION_COSTS.universityBachelor.durationYears) {
        return EDUCATION_COSTS.universityBachelor.perYear;
      }
      if (yearsInHigherEd < EDUCATION_COSTS.universityBachelor.durationYears + 
          EDUCATION_COSTS.universityMaster.durationYears) {
        return EDUCATION_COSTS.universityMaster.perYear;
      }
      if (yearsInHigherEd < EDUCATION_COSTS.universityBachelor.durationYears + 
          EDUCATION_COSTS.universityMaster.durationYears +
          EDUCATION_COSTS.phd.durationYears) {
        return EDUCATION_COSTS.phd.perYear;
      }
      return 0;
    default:
      return 0;
  }
}

function calculateChildBenefitsReceived(
  age: number,
  profile: LifetimeProfile
): number {
  // Calculate how many children are under 17 at this age
  let totalBenefit = 0;
  
  for (let i = 0; i < profile.childrenAges.length; i++) {
    const childBirthAge = profile.childrenAges[i];
    const childAge = age - childBirthAge;
    
    // Child benefit paid until child is 17
    if (childAge >= 0 && childAge < 17) {
      // Amount depends on which child (1st, 2nd, etc.)
      switch (i) {
        case 0:
          totalBenefit += CHILD_BENEFIT_2024.firstChild;
          break;
        case 1:
          totalBenefit += CHILD_BENEFIT_2024.secondChild;
          break;
        case 2:
          totalBenefit += CHILD_BENEFIT_2024.thirdChild;
          break;
        case 3:
          totalBenefit += CHILD_BENEFIT_2024.fourthChild;
          break;
        default:
          totalBenefit += CHILD_BENEFIT_2024.fifthAndMore;
      }
      
      // Single parent supplement
      if (profile.familyPath === 'single_with_children') {
        totalBenefit += CHILD_BENEFIT_2024.singleParentSupplement;
      }
    }
  }
  
  return totalBenefit * 12; // Annual amount
}

function calculateChildrenEducationCost(
  age: number,
  profile: LifetimeProfile
): number {
  // Calculate state education costs for person's children
  let totalCost = 0;
  
  for (const childBirthAge of profile.childrenAges) {
    const childAge = age - childBirthAge;
    
    // Only count until child is ~22 (average higher ed completion)
    if (childAge >= 0 && childAge <= 22) {
      // Simplified: use average education cost by age
      if (childAge >= 1 && childAge <= 6) {
        totalCost += EDUCATION_COSTS.daycare.perYear;
      } else if (childAge >= 7 && childAge <= 15) {
        totalCost += EDUCATION_COSTS.primarySchool.perYear;
      } else if (childAge >= 16 && childAge <= 18) {
        // Assume vocational average
        totalCost += (EDUCATION_COSTS.upperSecondary.perYear + EDUCATION_COSTS.vocational.perYear) / 2;
      } else if (childAge >= 19 && childAge <= 22) {
        // 50% go to higher ed, average cost
        totalCost += EDUCATION_COSTS.polytechnic.perYear * 0.5;
      }
    }
  }
  
  return totalCost;
}

function calculatePension(
  age: number,
  profile: LifetimeProfile,
  lifetimeEarnings: number[]
): number {
  if (age < profile.retirementAge) {
    return 0;
  }
  
  // Calculate accrued pension
  let accruedPension = 0;
  
  for (let workAge = profile.workStartAge; workAge < profile.retirementAge; workAge++) {
    const earningsAtAge = lifetimeEarnings[workAge] || 0;
    
    let accrualRate: number;
    if (workAge < 53) {
      accrualRate = PENSION_SYSTEM.accrualRates.age17to52;
    } else if (workAge < 63) {
      accrualRate = PENSION_SYSTEM.accrualRates.age53to62;
    } else {
      accrualRate = PENSION_SYSTEM.accrualRates.age63plus;
    }
    
    accruedPension += earningsAtAge * accrualRate;
  }
  
  // Apply life expectancy coefficient
  accruedPension *= PENSION_SYSTEM.lifeExpectancyCoefficient[2024];
  
  // Early retirement penalty
  if (profile.retirementAge < PENSION_SYSTEM.retirementAges.normalMin) {
    const monthsEarly = (PENSION_SYSTEM.retirementAges.normalMin - profile.retirementAge) * 12;
    accruedPension *= (1 - monthsEarly * PENSION_SYSTEM.earlyRetirementReduction);
  }
  
  // Deferred retirement bonus
  if (profile.retirementAge > PENSION_SYSTEM.retirementAges.normalMax) {
    const monthsLate = (profile.retirementAge - PENSION_SYSTEM.retirementAges.normalMax) * 12;
    accruedPension *= (1 + monthsLate * PENSION_SYSTEM.deferredRetirementIncrease);
  }
  
  // Ensure at least national pension
  const nationalPension = profile.familyPath.includes('couple')
    ? PENSION_SYSTEM.nationalPension.married * 12
    : PENSION_SYSTEM.nationalPension.single * 12;
  
  const guaranteePension = PENSION_SYSTEM.guaranteePension.amount * 12;
  
  // If accrued is very low, get national pension supplement
  if (accruedPension < nationalPension) {
    return Math.max(accruedPension + nationalPension * 0.5, guaranteePension);
  }
  
  return accruedPension;
}

// ===========================================
// Tax Calculation
// ===========================================

function calculateAnnualTaxes(grossAnnualIncome: number): {
  incomeTax: number;
  municipalTax: number;
  pensionContribution: number;
  unemploymentInsurance: number;
  healthInsurance: number;
} {
  if (grossAnnualIncome <= 0) {
    return {
      incomeTax: 0,
      municipalTax: 0,
      pensionContribution: 0,
      unemploymentInsurance: 0,
      healthInsurance: 0,
    };
  }
  
  // Use the existing tax calculator (monthly-based)
  const monthlyGross = grossAnnualIncome / 12;
  const taxes = calculateTaxes({
    grossMonthlyIncome: monthlyGross,
    municipality: 'helsinki', // Use Helsinki as reference
  });
  
  return {
    incomeTax: taxes.nationalTax * 12,
    municipalTax: taxes.municipalTax * 12,
    pensionContribution: taxes.pensionContribution * 12,
    unemploymentInsurance: taxes.unemploymentInsurance * 12,
    healthInsurance: taxes.healthInsurance * 12,
  };
}

function calculateVATContribution(disposableIncome: number): number {
  // Assume 80% of disposable income is spent on consumption
  const consumption = disposableIncome * 0.80;
  return consumption * VAT_RATES.effectiveRate;
}

function calculateCorporateTaxContribution(grossIncome: number): number {
  // Indirect contribution through employment
  return grossIncome * CORPORATE_TAX_CONTRIBUTION.effectiveRate;
}

// ===========================================
// Main Simulation Function
// ===========================================

export function simulateLifetime(
  input: LifetimeSimulationInput
): LifetimeSimulationResult {
  const annualFlows: AnnualFiscalFlow[] = [];
  const lifetimeEarnings: number[] = new Array(input.lifeExpectancy + 1).fill(0);
  
  // Track unemployment and parental leave allocation
  let unemploymentYearsRemaining = input.lifetimeUnemploymentYears;
  let parentalLeaveYearsRemaining = input.parentalLeaveYears;
  let accumulatedWorkYears = 0;
  let cumulativeNetFlow = 0;
  
  // Simulate each year
  for (let age = 0; age <= input.lifeExpectancy; age++) {
    // Determine lifecycle phase
    const phase = determineLifecyclePhase(
      age,
      convertInputToProfile(input),
      unemploymentYearsRemaining,
      parentalLeaveYearsRemaining,
      accumulatedWorkYears
    );
    
    // Calculate income for this year
    const grossIncome = calculateAnnualIncome(
      age,
      phase,
      convertInputToProfile(input),
      accumulatedWorkYears
    );
    lifetimeEarnings[age] = grossIncome;
    
    // Calculate taxes
    const taxes = calculateAnnualTaxes(grossIncome);
    const totalTaxes = taxes.incomeTax + taxes.municipalTax;
    const totalSocialInsurance = taxes.pensionContribution + 
      taxes.unemploymentInsurance + taxes.healthInsurance;
    
    const netIncome = grossIncome - totalTaxes - totalSocialInsurance;
    
    // Calculate disposable income (after housing)
    const annualRent = input.homeOwner ? 0 : input.averageRent * 12;
    const disposableIncome = Math.max(0, netIncome - annualRent);
    
    // Calculate VAT and corporate tax contributions
    const vatPaid = calculateVATContribution(disposableIncome);
    const corporateTaxContribution = phase === 'working' 
      ? calculateCorporateTaxContribution(grossIncome)
      : 0;
    
    // Calculate state costs
    const educationCost = calculateEducationCost(age, convertInputToProfile(input));
    const healthcareCost = getHealthcareCost(
      age, 
      input.healthTrajectory === 'chronic_condition' || 
      input.healthTrajectory === 'early_disability'
    );
    
    // Calculate benefits received
    const childBenefitReceived = calculateChildBenefitsReceived(age, convertInputToProfile(input));
    
    // Student aid
    const studentAid = phase === 'higher_education' && input.educationLevel !== 'basic'
      ? 279.38 * 9 + 252 * 9 // Study grant + housing supplement for 9 months
      : 0;
    
    // Housing allowance (simplified)
    const housingAllowance = 
      (phase === 'unemployed' || phase === 'higher_education') && !input.homeOwner
        ? Math.min(input.averageRent * 0.8, 752) * 12 // Simplified
        : 0;
    
    // Social assistance (for very low income situations)
    const socialAssistance = 
      (phase === 'unemployed' && grossIncome < 600 * 12)
        ? 600 * 12 - grossIncome
        : 0;
    
    // Unemployment benefit
    const unemploymentBenefit = phase === 'unemployed'
      ? UNEMPLOYMENT_BENEFITS.labourMarketSubsidy.monthlyApprox * 12
      : 0;
    
    // Parental allowance
    const parentalAllowance = phase === 'parental_leave'
      ? grossIncome // Already calculated as parental allowance
      : 0;
    
    // Disability benefit
    const disabilityBenefit = phase === 'disability'
      ? grossIncome // Already calculated as disability pension income
      : 0;
    
    // Pension received
    const pensionReceived = phase === 'retirement'
      ? calculatePension(age, convertInputToProfile(input), lifetimeEarnings)
      : 0;
    
    // Birth costs (maternity care, hospital stay)
    const birthCosts = input.childrenAges.includes(age)
      ? CHILD_STATE_COSTS.birthCost
      : 0;
    
    // Total state costs for this year
    // Note: Children's education is NOT included here - each child is a separate
    // individual who will have their own lifetime fiscal impact when simulated.
    // Child benefits ARE included since those are direct transfers to the parent.
    const totalStateCosts = 
      educationCost +
      healthcareCost +
      childBenefitReceived +
      studentAid +
      housingAllowance +
      socialAssistance +
      unemploymentBenefit +
      parentalAllowance +
      disabilityBenefit +
      pensionReceived +
      birthCosts;
    
    // Total contributions
    const totalContributions = 
      taxes.incomeTax +
      taxes.municipalTax +
      taxes.pensionContribution +
      taxes.unemploymentInsurance +
      taxes.healthInsurance +
      vatPaid +
      corporateTaxContribution;
    
    // Net flow for this year
    const netFlow = totalContributions - totalStateCosts;
    cumulativeNetFlow += netFlow;
    
    // Count dependent children
    const dependentChildren = input.childrenAges.filter(
      birthAge => age >= birthAge && age < birthAge + 18
    ).length;
    
    // Record annual flow
    annualFlows.push({
      age,
      year: BASE_YEAR + age,
      phase,
      stateCosts: {
        educationCost,
        healthcareCost,
        childBenefitReceived,
        parentalAllowance,
        housingAllowance,
        socialAssistance,
        unemploymentBenefit,
        studentAid,
        disabilityBenefit,
        pensionReceived,
        otherStateCosts: birthCosts,
        totalStateCosts,
      },
      contributions: {
        incomeTax: taxes.incomeTax,
        municipalTax: taxes.municipalTax,
        pensionContribution: taxes.pensionContribution,
        unemploymentInsurance: taxes.unemploymentInsurance,
        healthInsurance: taxes.healthInsurance,
        vatPaid,
        corporateTaxContribution,
        totalContributions,
      },
      netFlow,
      cumulativeNetFlow,
      grossIncome,
      netIncome,
      disposableIncome,
      isEmployed: phase === 'working',
      isRetired: phase === 'retirement',
      hasChildren: dependentChildren > 0,
      numberOfDependentChildren: dependentChildren,
    });
    
    // Update tracking variables
    if (phase === 'working') {
      accumulatedWorkYears++;
    }
    if (phase === 'unemployed') {
      unemploymentYearsRemaining = Math.max(0, unemploymentYearsRemaining - 1);
    }
    if (phase === 'parental_leave') {
      parentalLeaveYearsRemaining = Math.max(0, parentalLeaveYearsRemaining - 1);
    }
  }
  
  // Calculate summary statistics
  const summary = calculateSummary(annualFlows, input);
  
  return {
    input,
    annualFlows,
    summary,
    simulatedAt: new Date().toISOString(),
    simulationVersion: SIMULATION_VERSION,
  };
}

// ===========================================
// Summary Calculation
// ===========================================

function calculateSummary(
  flows: AnnualFiscalFlow[],
  input: LifetimeSimulationInput
): LifetimeSimulationResult['summary'] {
  // Totals
  const totalStateCosts = flows.reduce((sum, f) => sum + f.stateCosts.totalStateCosts, 0);
  const totalContributions = flows.reduce((sum, f) => sum + f.contributions.totalContributions, 0);
  const netLifetimeContribution = totalContributions - totalStateCosts;
  
  // Breakdowns
  const totalEducationCost = flows.reduce((sum, f) => sum + f.stateCosts.educationCost, 0);
  const totalHealthcareCost = flows.reduce((sum, f) => sum + f.stateCosts.healthcareCost, 0);
  const totalBenefitsReceived = flows.reduce((sum, f) => 
    sum + f.stateCosts.childBenefitReceived + 
    f.stateCosts.housingAllowance + 
    f.stateCosts.socialAssistance + 
    f.stateCosts.unemploymentBenefit +
    f.stateCosts.studentAid +
    f.stateCosts.parentalAllowance +
    f.stateCosts.disabilityBenefit, 0);
  const totalPensionReceived = flows.reduce((sum, f) => sum + f.stateCosts.pensionReceived, 0);
  
  const totalIncomeTaxPaid = flows.reduce((sum, f) => 
    sum + f.contributions.incomeTax + f.contributions.municipalTax, 0);
  const totalVatPaid = flows.reduce((sum, f) => sum + f.contributions.vatPaid, 0);
  const totalSocialInsurancePaid = flows.reduce((sum, f) => 
    sum + f.contributions.pensionContribution + 
    f.contributions.unemploymentInsurance + 
    f.contributions.healthInsurance, 0);
  
  // Key metrics
  let breakEvenAge: number | null = null;
  let peakDebtAge = 0;
  let peakDebtAmount = 0;
  
  for (const flow of flows) {
    if (flow.cumulativeNetFlow > 0 && breakEvenAge === null) {
      breakEvenAge = flow.age;
    }
    if (flow.cumulativeNetFlow < peakDebtAmount) {
      peakDebtAmount = flow.cumulativeNetFlow;
      peakDebtAge = flow.age;
    }
  }
  
  // Lifetime earnings
  const lifetimeGrossEarnings = flows.reduce((sum, f) => sum + f.grossIncome, 0);
  const lifetimeNetEarnings = flows.reduce((sum, f) => sum + f.netIncome, 0);
  const workingYears = flows.filter(f => f.isEmployed).length;
  const averageAnnualIncome = workingYears > 0 ? lifetimeGrossEarnings / workingYears : 0;
  
  // Fiscal return ratio
  const fiscalReturnRatio = totalStateCosts > 0 ? totalContributions / totalStateCosts : 0;
  
  // NPV calculations
  let npvContributions = 0;
  let npvStateCosts = 0;
  
  for (const flow of flows) {
    const discountFactor = Math.pow(1 + DISCOUNT_RATE, -flow.age);
    npvContributions += flow.contributions.totalContributions * discountFactor;
    npvStateCosts += flow.stateCosts.totalStateCosts * discountFactor;
  }
  
  const npvNet = npvContributions - npvStateCosts;
  
  return {
    totalStateCosts,
    totalContributions,
    netLifetimeContribution,
    totalEducationCost,
    totalHealthcareCost,
    totalBenefitsReceived,
    totalPensionReceived,
    totalIncomeTaxPaid,
    totalVatPaid,
    totalSocialInsurancePaid,
    breakEvenAge,
    peakDebtAge,
    peakDebtAmount,
    lifetimeGrossEarnings,
    lifetimeNetEarnings,
    averageAnnualIncome,
    fiscalReturnRatio,
    npvContributions,
    npvStateCosts,
    npvNet,
  };
}

// ===========================================
// Helper Functions
// ===========================================

function convertInputToProfile(input: LifetimeSimulationInput): LifetimeProfile {
  return {
    id: input.profileId,
    name: input.profileName,
    description: '',
    emoji: '👤',
    gender: input.gender,
    lifeExpectancy: input.lifeExpectancy,
    educationLevel: input.educationLevel as EducationLevel,
    educationStartAge: 19,
    occupationType: input.occupationType,
    careerPath: input.careerPath,
    workStartAge: input.workStartAge,
    retirementAge: input.retirementAge,
    incomeDecile: input.incomeDecile,
    incomeVolatility: 0.1,
    lifetimeUnemploymentYears: input.lifetimeUnemploymentYears,
    unemploymentPattern: 'spread',
    healthTrajectory: input.healthTrajectory,
    disabilityStartAge: input.disabilityStartAge,
    familyPath: input.familyPath,
    numberOfChildren: input.numberOfChildren,
    childrenAges: input.childrenAges,
    parentalLeaveYears: input.parentalLeaveYears,
    homeOwner: input.homeOwner,
    averageRent: input.averageRent,
    receivesHousingAllowance: !input.homeOwner,
    receivesStudentAid: true,
  };
}

export function convertProfileToInput(profile: LifetimeProfile): LifetimeSimulationInput {
  return {
    profileId: profile.id,
    profileName: profile.name,
    gender: profile.gender,
    lifeExpectancy: profile.lifeExpectancy,
    educationLevel: profile.educationLevel,
    occupationType: profile.occupationType,
    careerPath: profile.careerPath,
    workStartAge: profile.workStartAge,
    retirementAge: profile.retirementAge,
    incomeDecile: profile.incomeDecile,
    lifetimeUnemploymentYears: profile.lifetimeUnemploymentYears,
    healthTrajectory: profile.healthTrajectory,
    disabilityStartAge: profile.disabilityStartAge,
    familyPath: profile.familyPath,
    numberOfChildren: profile.numberOfChildren,
    childrenAges: profile.childrenAges,
    parentalLeaveYears: profile.parentalLeaveYears,
    averageRent: profile.averageRent,
    homeOwner: profile.homeOwner,
  };
}

export function simulatePresetProfile(profileId: string): LifetimeSimulationResult | null {
  const profile = getProfileById(profileId);
  if (!profile) {
    return null;
  }
  
  const input = convertProfileToInput(profile);
  return simulateLifetime(input);
}

// Re-export for convenience
export { PRESET_PROFILES, getProfileById };
export type { LifetimeProfile };

