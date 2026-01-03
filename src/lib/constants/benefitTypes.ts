/**
 * TypeScript type definitions for Finnish Benefits Calculator
 * Using const assertions for Turbopack compatibility
 */

// Use const objects with type inference instead of type aliases
// This helps Turbopack track the exports properly

export const HOUSEHOLD_PROFILES_KEYS = [
  'single',
  'single_1child',
  'single_2children',
  'couple',
  'couple_1child',
  'couple_2children',
  'student',
] as const;

export type HouseholdProfile = typeof HOUSEHOLD_PROFILES_KEYS[number];

export const EMPLOYMENT_STATUS_KEYS = ['employed', 'unemployed', 'student'] as const;
export type EmploymentStatus = typeof EMPLOYMENT_STATUS_KEYS[number];

export const MUNICIPALITY_KEYS = ['helsinki', 'espoo', 'tampere', 'turku', 'oulu', 'other'] as const;
export type Municipality = typeof MUNICIPALITY_KEYS[number];

export interface HouseholdConfig {
  adults: number;
  children: number;
  isSingleParent: boolean;
  isStudent: boolean;
  socialAssistanceBasic: number;
  childBenefitMonthly: number;
  housingAllowanceDeduction: number;
}
