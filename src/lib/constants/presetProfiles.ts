/**
 * Preset Lifetime Simulation Profiles
 * 
 * Representative archetypes for simulating different life paths
 * and their fiscal impact on Finland.
 */

import { EducationLevel } from './lifecycleCosts';

// ===========================================
// Types for Profile Configuration
// ===========================================

export type OccupationType = 
  | 'private_sector'
  | 'public_sector'
  | 'entrepreneur'
  | 'self_employed';

export type HealthTrajectory = 
  | 'healthy'              // No major health issues
  | 'average'              // Some minor issues
  | 'chronic_condition'    // Ongoing health issues
  | 'early_disability';    // Becomes disabled before retirement

export type FamilyPath = 
  | 'single_no_children'
  | 'single_with_children'
  | 'couple_no_children'
  | 'couple_with_children';

export type CareerPath = 
  | 'continuous'           // Steady career, minimal gaps
  | 'interrupted'          // Career breaks (parental leave, etc.)
  | 'late_start'           // Delayed career start
  | 'part_time'            // Significant part-time work periods
  | 'unstable';            // Frequent job changes, unemployment

export interface LifetimeProfile {
  id: string;
  name: string;
  description: string;
  emoji: string;
  
  // Basic demographics
  gender: 'male' | 'female' | 'average';
  lifeExpectancy: number; // Override default
  
  // Education
  educationLevel: EducationLevel;
  educationStartAge: number; // When higher ed starts (if applicable)
  
  // Career
  occupationType: OccupationType;
  careerPath: CareerPath;
  workStartAge: number;
  retirementAge: number;
  
  // Income - now based on decile
  incomeDecile: number; // 1-10, where 5 is median, 10 is top 10% average
  incomeVolatility: number; // 0 = stable, 1 = very variable
  
  // Employment
  lifetimeUnemploymentYears: number; // Total years of unemployment
  unemploymentPattern: 'early' | 'mid' | 'late' | 'spread'; // When unemployment occurs
  
  // Health
  healthTrajectory: HealthTrajectory;
  disabilityStartAge?: number; // If early_disability
  
  // Family
  familyPath: FamilyPath;
  numberOfChildren: number;
  childrenAges: number[]; // Ages when children are born (parent's age)
  parentalLeaveYears: number; // Total years out of workforce for children
  
  // Housing
  homeOwner: boolean;
  averageRent: number; // Monthly, when renting
  
  // Special flags
  receivesHousingAllowance: boolean; // Eligible for housing support
  receivesStudentAid: boolean; // During studies
}

// ===========================================
// Preset Profiles
// ===========================================

export const PRESET_PROFILES: LifetimeProfile[] = [
  // 0. Top Earner (D10) - Executives, Doctors, Senior Lawyers
  {
    id: 'top_earner',
    name: 'Top Earner',
    description: 'Executive, doctor, or senior professional. Top 10% average income (€120k peak). Long education, late start, high earnings.',
    emoji: '💎',
    gender: 'average',
    lifeExpectancy: 87, // Higher life expectancy for top earners
    educationLevel: 'master',
    educationStartAge: 19,
    occupationType: 'private_sector',
    careerPath: 'continuous',
    workStartAge: 26,
    retirementAge: 67, // Often work longer
    incomeDecile: 10, // D10 = €120k peak
    incomeVolatility: 0.2,
    lifetimeUnemploymentYears: 0.3,
    unemploymentPattern: 'spread',
    healthTrajectory: 'healthy',
    familyPath: 'couple_with_children',
    numberOfChildren: 2,
    childrenAges: [34, 37],
    parentalLeaveYears: 0.3,
    homeOwner: true,
    averageRent: 1500,
    receivesHousingAllowance: false,
    receivesStudentAid: true,
  },

  // 1. High Achiever (D9) - Top 10% threshold
  {
    id: 'high_achiever',
    name: 'High Achiever',
    description: 'Master\'s degree, tech/finance career. Top 10% threshold (€78k peak). Strong career trajectory.',
    emoji: '🚀',
    gender: 'average',
    lifeExpectancy: 85,
    educationLevel: 'master',
    educationStartAge: 19,
    occupationType: 'private_sector',
    careerPath: 'continuous',
    workStartAge: 25,
    retirementAge: 65,
    incomeDecile: 9, // D9 = €78k peak
    incomeVolatility: 0.15,
    lifetimeUnemploymentYears: 0.5,
    unemploymentPattern: 'spread',
    healthTrajectory: 'healthy',
    familyPath: 'couple_with_children',
    numberOfChildren: 2,
    childrenAges: [32, 35],
    parentalLeaveYears: 0.5,
    homeOwner: true,
    averageRent: 1200,
    receivesHousingAllowance: false,
    receivesStudentAid: true,
  },
  
  // 2. Average Worker (D5) - Median
  {
    id: 'average_worker',
    name: 'Average Worker',
    description: 'Vocational education, stable employment. Median Finnish income (€40k peak).',
    emoji: '👷',
    gender: 'average',
    lifeExpectancy: 82,
    educationLevel: 'vocational',
    educationStartAge: 16,
    occupationType: 'private_sector',
    careerPath: 'continuous',
    workStartAge: 19,
    retirementAge: 64,
    incomeDecile: 5, // D5 = €40k peak (median)
    incomeVolatility: 0.1,
    lifetimeUnemploymentYears: 2,
    unemploymentPattern: 'spread',
    healthTrajectory: 'average',
    familyPath: 'couple_with_children',
    numberOfChildren: 2,
    childrenAges: [27, 30],
    parentalLeaveYears: 0.5,
    homeOwner: true,
    averageRent: 850,
    receivesHousingAllowance: false,
    receivesStudentAid: false,
  },
  
  // 3. Public Servant (D7) - Stable, moderate income
  {
    id: 'public_servant',
    name: 'Public Servant',
    description: 'University degree, municipal/state employee. D7 income (€54k peak). Very stable, good pension.',
    emoji: '🏛️',
    gender: 'average',
    lifeExpectancy: 84,
    educationLevel: 'master',
    educationStartAge: 19,
    occupationType: 'public_sector',
    careerPath: 'continuous',
    workStartAge: 26,
    retirementAge: 65,
    incomeDecile: 7, // D7 = €54k peak
    incomeVolatility: 0.05, // Very stable
    lifetimeUnemploymentYears: 0.2,
    unemploymentPattern: 'early',
    healthTrajectory: 'healthy',
    familyPath: 'couple_with_children',
    numberOfChildren: 2,
    childrenAges: [30, 33],
    parentalLeaveYears: 1.5,
    homeOwner: true,
    averageRent: 900,
    receivesHousingAllowance: false,
    receivesStudentAid: true,
  },
  
  // 4. Early Retiree (D4) - Health Issues
  {
    id: 'early_retiree',
    name: 'Early Retiree',
    description: 'Vocational background, disability from 55. D4 income (€34k peak). Shows healthcare cost impact.',
    emoji: '🏥',
    gender: 'average',
    lifeExpectancy: 78, // Reduced due to health
    educationLevel: 'vocational',
    educationStartAge: 16,
    occupationType: 'private_sector',
    careerPath: 'interrupted',
    workStartAge: 19,
    retirementAge: 55, // Early due to disability
    incomeDecile: 4, // D4 = €34k peak
    incomeVolatility: 0.15,
    lifetimeUnemploymentYears: 3,
    unemploymentPattern: 'late',
    healthTrajectory: 'early_disability',
    disabilityStartAge: 52,
    familyPath: 'couple_with_children',
    numberOfChildren: 1,
    childrenAges: [28],
    parentalLeaveYears: 0.3,
    homeOwner: true,
    averageRent: 750,
    receivesHousingAllowance: true,
    receivesStudentAid: false,
  },
  
  // 5. Parent Focused (D5) - Career breaks
  {
    id: 'parent_focused',
    name: 'Parent Focused',
    description: 'Polytechnic degree, extended parental leaves. D5 income (€40k peak) due to career gaps.',
    emoji: '👨‍👩‍👧‍👦',
    gender: 'female',
    lifeExpectancy: 85,
    educationLevel: 'polytechnic',
    educationStartAge: 19,
    occupationType: 'private_sector',
    careerPath: 'interrupted',
    workStartAge: 23,
    retirementAge: 65,
    incomeDecile: 5, // D5 = €40k peak (lower due to breaks)
    incomeVolatility: 0.2,
    lifetimeUnemploymentYears: 1,
    unemploymentPattern: 'mid',
    healthTrajectory: 'healthy',
    familyPath: 'couple_with_children',
    numberOfChildren: 3,
    childrenAges: [28, 31, 34],
    parentalLeaveYears: 6, // Extended home care
    homeOwner: true,
    averageRent: 950,
    receivesHousingAllowance: true,
    receivesStudentAid: true,
  },
  
  // 6. Entrepreneur (D8) - Variable income
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    description: 'Business owner, variable income. D8 income (€64k peak) but with gaps. Works longer.',
    emoji: '💼',
    gender: 'average',
    lifeExpectancy: 82,
    educationLevel: 'bachelor',
    educationStartAge: 19,
    occupationType: 'entrepreneur',
    careerPath: 'interrupted',
    workStartAge: 22,
    retirementAge: 67, // Often work longer
    incomeDecile: 8, // D8 = €64k peak
    incomeVolatility: 0.5, // Very variable
    lifetimeUnemploymentYears: 3, // Business failures
    unemploymentPattern: 'spread',
    healthTrajectory: 'average',
    familyPath: 'couple_with_children',
    numberOfChildren: 2,
    childrenAges: [34, 37],
    parentalLeaveYears: 0.3,
    homeOwner: true,
    averageRent: 1100,
    receivesHousingAllowance: false,
    receivesStudentAid: true,
  },
  
  // 7. Struggling Worker (D2) - Low income
  {
    id: 'long_term_unemployed',
    name: 'Struggling Worker',
    description: 'Basic education, frequent unemployment. D2 income (€26k peak). Benefit dependent.',
    emoji: '🔄',
    gender: 'average',
    lifeExpectancy: 76, // Lower due to socioeconomic factors
    educationLevel: 'basic',
    educationStartAge: 16,
    occupationType: 'private_sector',
    careerPath: 'unstable',
    workStartAge: 17,
    retirementAge: 63, // Earliest possible
    incomeDecile: 2, // D2 = €26k peak
    incomeVolatility: 0.4,
    lifetimeUnemploymentYears: 15, // Significant unemployment
    unemploymentPattern: 'spread',
    healthTrajectory: 'chronic_condition',
    familyPath: 'single_with_children',
    numberOfChildren: 1,
    childrenAges: [22],
    parentalLeaveYears: 1,
    homeOwner: false, // Renter
    averageRent: 650,
    receivesHousingAllowance: true,
    receivesStudentAid: false,
  },
];

// ===========================================
// Helper Functions
// ===========================================

export function getProfileById(id: string): LifetimeProfile | undefined {
  return PRESET_PROFILES.find(p => p.id === id);
}

export function getProfilesByEducation(education: EducationLevel): LifetimeProfile[] {
  return PRESET_PROFILES.filter(p => p.educationLevel === education);
}

// Get a "customizable" version of a profile (all values can be overridden)
export function createCustomProfile(
  baseProfile: Partial<LifetimeProfile>,
  overrides: Partial<LifetimeProfile>
): LifetimeProfile {
  const defaultProfile: LifetimeProfile = {
    id: 'custom',
    name: 'Custom Profile',
    description: 'User-configured profile',
    emoji: '⚙️',
    gender: 'average',
    lifeExpectancy: 82,
    educationLevel: 'vocational',
    educationStartAge: 16,
    occupationType: 'private_sector',
    careerPath: 'continuous',
    workStartAge: 19,
    retirementAge: 65,
    peakIncomeMultiplier: 1.0,
    incomeVolatility: 0.1,
    lifetimeUnemploymentYears: 2,
    unemploymentPattern: 'spread',
    healthTrajectory: 'average',
    familyPath: 'single_no_children',
    numberOfChildren: 0,
    childrenAges: [],
    parentalLeaveYears: 0,
    homeOwner: false,
    averageRent: 800,
    receivesHousingAllowance: true,
    receivesStudentAid: false,
  };
  
  return { ...defaultProfile, ...baseProfile, ...overrides };
}

// ===========================================
// Profile Adjustment Ranges (for UI sliders)
// ===========================================

export const PROFILE_ADJUSTMENT_RANGES = {
  incomeDecile: { min: 1, max: 10, step: 1, label: 'Income Decile' },
  retirementAge: { min: 55, max: 70, step: 1, label: 'Retirement Age' },
  lifetimeUnemploymentYears: { min: 0, max: 20, step: 0.5, label: 'Unemployment Years' },
  numberOfChildren: { min: 0, max: 5, step: 1, label: 'Number of Children' },
  parentalLeaveYears: { min: 0, max: 10, step: 0.5, label: 'Parental Leave Years' },
  lifeExpectancy: { min: 65, max: 95, step: 1, label: 'Life Expectancy' },
  averageRent: { min: 400, max: 2000, step: 50, label: 'Monthly Rent' },
};

// ===========================================
// Profile Summary Statistics (for display)
// ===========================================

export function getProfileSummary(profile: LifetimeProfile) {
  const workingYears = profile.retirementAge - profile.workStartAge - 
    profile.lifetimeUnemploymentYears - profile.parentalLeaveYears;
  
  const educationYears = profile.workStartAge - 7; // Assume school starts at 7
  const retiredYears = profile.lifeExpectancy - profile.retirementAge;
  
  return {
    educationYears,
    workingYears: Math.max(0, workingYears),
    unemploymentYears: profile.lifetimeUnemploymentYears,
    parentalLeaveYears: profile.parentalLeaveYears,
    retiredYears: Math.max(0, retiredYears),
    totalYears: profile.lifeExpectancy,
    childDependentYears: profile.numberOfChildren * 18, // Years with dependent children
  };
}

