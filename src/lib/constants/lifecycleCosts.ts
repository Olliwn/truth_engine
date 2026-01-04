/**
 * Finnish Lifecycle Cost Constants
 * 
 * Data sources:
 * - Statistics Finland (Tilastokeskus)
 * - Ministry of Education and Culture (OKM)
 * - THL (Finnish Institute for Health and Welfare)
 * - ETK (Finnish Centre for Pensions)
 * - Kela (Social Insurance Institution)
 */

// ===========================================
// Education Costs (State expenditure per student/year)
// ===========================================

export const EDUCATION_COSTS = {
  // Early childhood education (daycare) - ages 1-6
  // Source: Municipal statistics, ~€12,000-15,000/year per child
  daycare: {
    perYear: 13000,
    startAge: 1,
    endAge: 6,
  },
  
  // Pre-primary education (esiopetus) - age 6
  // Source: OKM, included in daycare costs
  prePrimary: {
    perYear: 8500,
    age: 6,
  },
  
  // Primary school (peruskoulu) - ages 7-15
  // Source: Statistics Finland, ~€9,000-11,000/year
  primarySchool: {
    perYear: 10000,
    startAge: 7,
    endAge: 15,
  },
  
  // Upper secondary (lukio) - ages 16-18
  // Source: OKM, ~€8,000/year
  upperSecondary: {
    perYear: 8000,
    startAge: 16,
    endAge: 18,
    durationYears: 3,
  },
  
  // Vocational education (ammattikoulu) - ages 16-18/19
  // Source: OKM, ~€10,000/year (higher due to equipment/materials)
  vocational: {
    perYear: 10500,
    startAge: 16,
    durationYears: 3,
  },
  
  // University of Applied Sciences (AMK) - 3.5-4 years
  // Source: OKM, ~€7,000-8,000/year
  polytechnic: {
    perYear: 7500,
    durationYears: 4,
  },
  
  // University Bachelor's - 3 years
  // Source: OKM, ~€7,000-9,000/year depending on field
  universityBachelor: {
    perYear: 8000,
    durationYears: 3,
  },
  
  // University Master's - 2 years
  // Source: OKM, ~€8,000-12,000/year
  universityMaster: {
    perYear: 10000,
    durationYears: 2,
  },
  
  // PhD - 4 years
  // Source: Academy of Finland, ~€15,000/year (includes research funding)
  phd: {
    perYear: 15000,
    durationYears: 4,
  },
};

// Education level enum for profile configuration
export type EducationLevel = 
  | 'basic'           // Only compulsory education (peruskoulu)
  | 'vocational'      // Ammattitutkinto
  | 'upperSecondary'  // Lukio only
  | 'polytechnic'     // AMK degree
  | 'bachelor'        // University bachelor
  | 'master'          // University master
  | 'phd';            // Doctoral degree

// Typical education completion ages and durations
export const EDUCATION_TIMELINES: Record<EducationLevel, {
  workStartAge: number;
  totalEducationYears: number;
  higherEdYears: number;
}> = {
  basic: { workStartAge: 16, totalEducationYears: 9, higherEdYears: 0 },
  vocational: { workStartAge: 19, totalEducationYears: 12, higherEdYears: 3 },
  upperSecondary: { workStartAge: 19, totalEducationYears: 12, higherEdYears: 0 },
  polytechnic: { workStartAge: 23, totalEducationYears: 16, higherEdYears: 4 },
  bachelor: { workStartAge: 22, totalEducationYears: 15, higherEdYears: 3 },
  master: { workStartAge: 24, totalEducationYears: 17, higherEdYears: 5 },
  phd: { workStartAge: 28, totalEducationYears: 21, higherEdYears: 9 },
};

// ===========================================
// Healthcare Costs by Age (State expenditure per person/year)
// ===========================================

// U-shaped curve: high for children/elderly, lower for working age
// Source: THL healthcare statistics, OECD health data
export const HEALTHCARE_COSTS_BY_AGE: Record<number, number> = {
  0: 8500,   // Birth year - very high
  1: 3500,
  2: 2800,
  3: 2500,
  4: 2200,
  5: 2000,
  6: 1900,
  7: 1800,
  8: 1700,
  9: 1600,
  10: 1500,
  11: 1500,
  12: 1500,
  13: 1500,
  14: 1600,
  15: 1700,
  16: 1800,
  17: 1800,
  18: 1700,
  19: 1600,
  20: 1500,
  25: 1400,
  30: 1500,
  35: 1600,
  40: 1800,
  45: 2100,
  50: 2500,
  55: 3200,
  60: 4200,
  65: 5500,
  70: 7500,
  75: 10000,
  80: 14000,
  85: 20000,
  90: 28000,
};

// Linear interpolation for ages not in the table
export function getHealthcareCost(age: number, hasDisability: boolean = false): number {
  const ages = Object.keys(HEALTHCARE_COSTS_BY_AGE).map(Number).sort((a, b) => a - b);
  
  // Find surrounding ages for interpolation
  let lowerAge = ages[0];
  let upperAge = ages[ages.length - 1];
  
  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age < ages[i + 1]) {
      lowerAge = ages[i];
      upperAge = ages[i + 1];
      break;
    }
  }
  
  if (age >= upperAge) {
    return HEALTHCARE_COSTS_BY_AGE[ages[ages.length - 1]] * (hasDisability ? 1.5 : 1);
  }
  
  // Linear interpolation
  const lowerCost = HEALTHCARE_COSTS_BY_AGE[lowerAge];
  const upperCost = HEALTHCARE_COSTS_BY_AGE[upperAge];
  const ratio = (age - lowerAge) / (upperAge - lowerAge);
  const baseCost = lowerCost + (upperCost - lowerCost) * ratio;
  
  return baseCost * (hasDisability ? 1.5 : 1);
}

// ===========================================
// Pension System Constants
// ===========================================

export const PENSION_SYSTEM = {
  // Earnings-related pension accrual rates
  // Source: ETK (Finnish Centre for Pensions)
  accrualRates: {
    age17to52: 0.015,    // 1.5% per year
    age53to62: 0.019,    // 1.9% per year (increased for older workers)
    age63plus: 0.045,    // 4.5% per year (incentive to work longer)
  },
  
  // Retirement ages
  retirementAges: {
    earliest: 63,          // Earliest possible retirement
    normalMin: 65,         // Normal retirement age (lower bound, rising)
    normalMax: 68,         // Normal retirement age (upper bound)
    deferred: 70,          // Latest with accrual
  },
  
  // Early retirement reduction (per month before normal age)
  earlyRetirementReduction: 0.004, // 0.4% per month = 4.8% per year
  
  // Deferred retirement increase (per month after normal age)
  deferredRetirementIncrease: 0.004, // 0.4% per month
  
  // National pension (kansaneläke) - guaranteed minimum
  // For those with little or no earnings-related pension
  nationalPension: {
    single: 775.70,      // €/month (2024)
    married: 692.54,     // €/month (reduced if spouse has pension)
    incomeLimit: 62.63,  // Full pension if earnings-related pension under this
    reductionRate: 0.50, // 50% reduction for earnings-related pension above limit
  },
  
  // Guarantee pension (takuueläke) - absolute minimum
  guaranteePension: {
    amount: 976.59,      // €/month (2024) - ensures minimum total pension
  },
  
  // Life expectancy coefficient (reduces pension for increasing longevity)
  lifeExpectancyCoefficient: {
    2024: 0.948,         // Applied at retirement
    // Decreases ~0.5-1% per year for younger cohorts
  },
};

// ===========================================
// Tax and Transfer Constants
// ===========================================

export const VAT_RATES = {
  // Effective VAT rate on total consumption (blended)
  // Food 14%, most goods 24%, some services 10%
  effectiveRate: 0.18, // ~18% average on all consumption
  
  // For more detailed calculations
  standard: 0.24,       // Most goods
  reduced1: 0.14,       // Food
  reduced2: 0.10,       // Books, magazines, hotels, etc.
  zero: 0.00,           // Health, education, financial services
};

// Corporate tax contribution (indirect, as employee)
// Simplified: assume corporate tax ~20% of employer surplus value
export const CORPORATE_TAX_CONTRIBUTION = {
  // Employer creates value beyond salary; portion goes to corporate tax
  // Very rough estimate: 10% of gross salary as indirect contribution
  effectiveRate: 0.10,
};

// ===========================================
// Income by Decile (Finnish Income Distribution)
// ===========================================

// Peak annual gross income by income decile
// Source: Statistics Finland income statistics 2022-2023
// These represent PEAK career income (around age 45-55)
export const INCOME_BY_DECILE: Record<number, number> = {
  1: 20000,   // D1 - bottom 10% (part-time, struggling)
  2: 26000,   // D2 - low income workers
  3: 30000,   // D3 
  4: 34000,   // D4
  5: 40000,   // D5 - median Finnish worker
  6: 46000,   // D6
  7: 54000,   // D7 - skilled workers, teachers
  8: 64000,   // D8 - professionals
  9: 78000,   // D9 - top 10% threshold
  10: 120000, // D10 - top 10% average (executives, doctors, lawyers)
};

// For UI display
export const DECILE_LABELS: Record<number, string> = {
  1: 'D1 (Bottom 10%)',
  2: 'D2 (20th percentile)',
  3: 'D3 (30th percentile)',
  4: 'D4 (40th percentile)',
  5: 'D5 (Median)',
  6: 'D6 (60th percentile)',
  7: 'D7 (70th percentile)',
  8: 'D8 (80th percentile)',
  9: 'D9 (Top 10%)',
  10: 'D10 (Top 10% avg)',
};

// Age at which peak income is typically reached (varies by decile)
export const PEAK_INCOME_AGE_BY_DECILE: Record<number, number> = {
  1: 35,   // Lower earners peak earlier
  2: 38,
  3: 40,
  4: 42,
  5: 44,   // Median peaks around mid-40s
  6: 46,
  7: 48,
  8: 50,
  9: 52,
  10: 55,  // Top earners peak later (executives)
};

// Starting income as % of peak (lower deciles start closer to peak)
export const STARTING_INCOME_RATIO_BY_DECILE: Record<number, number> = {
  1: 0.70,  // Low earners have flatter trajectory
  2: 0.65,
  3: 0.62,
  4: 0.60,
  5: 0.58,
  6: 0.55,
  7: 0.52,
  8: 0.48,
  9: 0.45,
  10: 0.40, // High earners have steeper growth
};

// Income decline after peak (% per year)
export const POST_PEAK_DECLINE_RATE = 0.005; // 0.5% per year decline after peak

// ===========================================
// Legacy: Income by Education (for reference)
// ===========================================

// Typical income decile by education level (median outcomes)
export const TYPICAL_DECILE_BY_EDUCATION: Record<EducationLevel, number> = {
  basic: 3,        // D3 - basic education → ~€30k
  vocational: 5,   // D5 - vocational → median ~€40k  
  upperSecondary: 4, // D4 - lukio only → ~€34k
  polytechnic: 6,  // D6 - AMK → ~€46k
  bachelor: 7,     // D7 - university bachelor → ~€54k
  master: 8,       // D8 - master's → ~€64k
  phd: 9,          // D9 - PhD → ~€78k
};

// Calculate income at a given age based on income decile
export function calculateIncomeByAge(
  age: number,
  workStartAge: number,
  incomeDecile: number,
  isEmployed: boolean = true
): number {
  if (!isEmployed) return 0;
  if (age < workStartAge) return 0;
  
  const peakIncome = INCOME_BY_DECILE[incomeDecile] || INCOME_BY_DECILE[5];
  const peakAge = PEAK_INCOME_AGE_BY_DECILE[incomeDecile] || 45;
  const startRatio = STARTING_INCOME_RATIO_BY_DECILE[incomeDecile] || 0.55;
  const startIncome = peakIncome * startRatio;
  
  if (age <= peakAge) {
    // S-curve growth from start to peak
    const yearsWorking = age - workStartAge;
    const totalYearsToPeak = peakAge - workStartAge;
    
    if (totalYearsToPeak <= 0) return peakIncome;
    
    const progress = Math.min(1, yearsWorking / totalYearsToPeak);
    
    // Sigmoid-like growth (accelerates then decelerates)
    const growthFactor = 1 / (1 + Math.exp(-10 * (progress - 0.5)));
    
    return startIncome + (peakIncome - startIncome) * growthFactor;
  } else {
    // Gradual decline after peak
    const yearsAfterPeak = age - peakAge;
    return peakIncome * Math.pow(1 - POST_PEAK_DECLINE_RATE, yearsAfterPeak);
  }
}

// ===========================================
// Unemployment and Disability
// ===========================================

export const UNEMPLOYMENT_BENEFITS = {
  // Labour market subsidy (basic, means-tested)
  labourMarketSubsidy: {
    dailyRate: 37.21,
    monthlyApprox: 800,
    childSupplement1: 7.01,
    childSupplement2: 10.30,
    childSupplement3: 13.29,
  },
  
  // Earnings-related unemployment (for those with work history)
  earningsRelated: {
    basicPart: 37.21,        // per day
    earningsPart: 0.45,      // 45% of daily wage
    earningsPartHighIncome: 0.20, // 20% above threshold
    incomeThreshold: 3534.95, // monthly
    maxDuration: 400,         // days (can be 300-500 depending on work history)
  },
};

export const DISABILITY_BENEFITS = {
  // Disability pension (työkyvyttömyyseläke)
  disabilityPension: {
    // Based on accrued pension + projected pension (as if worked to 63)
    projectedAccrualRate: 0.015, // 1.5% for projected years
  },
  
  // Sickness allowance (sairauspäiväraha)
  sicknessAllowance: {
    waitingPeriod: 9,        // days (+ day of illness)
    maxDuration: 300,        // days
    rate: 0.70,              // 70% of income up to threshold
    rateHighIncome: 0.20,    // 20% above threshold
  },
  
  // Rehabilitation allowance
  rehabilitationAllowance: {
    rate: 0.75, // 75% of what disability pension would be
  },
};

// ===========================================
// Family Benefits
// ===========================================

export const FAMILY_BENEFITS = {
  // Maternity/parental allowance
  parentalAllowance: {
    maternityDays: 40,       // Mother's exclusive period
    parentalDays: 320,       // Shared parental period
    rate: 0.70,              // 70% of income
    minimum: 31.99,          // €/day minimum
  },
  
  // Child benefit (lapsilisä) - already in benefits2024.ts
  // Home care allowance (kotihoidon tuki) - already in benefits2024.ts
  
  // Maternity grant (äitiysavustus)
  maternityGrant: {
    amount: 170, // One-time payment OR maternity package
  },
};

// ===========================================
// Life Expectancy and Mortality
// ===========================================

export const LIFE_EXPECTANCY = {
  // Finnish life expectancy at birth (2023)
  male: 79.0,
  female: 84.5,
  average: 81.8,
  
  // For simulation purposes, use a representative end age
  simulationEndAge: 85,
  
  // Death probabilities could be added for more realistic simulations
  // but for now we use fixed end age
};

// ===========================================
// Child-Related State Costs
// ===========================================

export const CHILD_STATE_COSTS = {
  // Annual state cost per child (not including education which is separate)
  // Includes child healthcare, child welfare services, etc.
  healthcareSupplementPerChild: 500, // Additional healthcare cost for parents
  
  // Birth-related costs
  birthCost: 5000, // Hospital stay, maternity care
  
  // Child protection services (average across population)
  childProtectionPerChild: 200,
};

// ===========================================
// Housing Support State Costs
// ===========================================

export const HOUSING_SUPPORT = {
  // Average housing allowance paid (for those who receive it)
  averageHousingAllowance: 350, // €/month
  
  // Social housing subsidy (ARA)
  socialHousingSubsidy: 150, // €/month average (implicit subsidy)
};

