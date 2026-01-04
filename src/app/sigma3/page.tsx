'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// Simulation engine
import {
  simulatePopulationRange,
  getPopulationPyramidData,
  DEFAULT_SCENARIO,
  BIRTH_RATE_PRESETS,
  DEFAULT_IMMIGRATION,
  GDP_SCENARIOS,
  DEFAULT_GDP_SCENARIO,
  INTEREST_RATE_SCENARIOS,
  DEFAULT_INTEREST_RATE_SCENARIO,
  UNEMPLOYMENT_SCENARIOS,
  DEFAULT_UNEMPLOYMENT_SCENARIO,
} from '@/lib/simulation/adapter';
import type { DemographicScenario } from '@/lib/simulation/adapter';

// Spending engine
import {
  loadHistoricalSpendingData,
  getHistoricalSpending,
  convertSimulationToCOFOG,
  setSimulationBaseYearData,
  type YearlySpending,
} from '@/lib/simulation/spending';
import {
  SPENDING_SCENARIO_PRESETS,
  DEFAULT_SPENDING_SCENARIO,
  SPENDING_BASE_YEAR,
  type SpendingScenario,
  type DemographicScenarioId,
  type PopulationScenarioId,
  type GDPSpendingScenarioId,
  type DiscretionaryScenarioId,
  type GovernmentScenarioId,
} from '@/lib/constants/governmentSpending';

// Components
import { ScenarioPanel } from './components/ScenarioPanel';
import { ResultsArea } from './components/ResultsArea';

// ===========================================
// Types
// ===========================================

export interface ScenarioState {
  // Birth rate
  birthRatePreset: string;
  customTFR: number;
  transitionYear: number;
  useCustomBirthRate: boolean;
  // Immigration
  workBasedImmigration: number;
  familyImmigration: number;
  humanitarianImmigration: number;
  // GDP
  gdpScenarioId: string;
  useCustomGrowth: boolean;
  customGrowthRate: number;
  // Interest rate
  interestRateScenarioId: string;
  useCustomInterestRate: boolean;
  customInterestRate: number;
  // Unemployment
  unemploymentScenarioId: string;
  useCustomUnemployment: boolean;
  customUnemploymentRate: number;
  // Spending scenarios (NEW)
  spendingPreset: string;
  spendingScenario: SpendingScenario;
  useCustomSpending: boolean;
}

export interface ScenarioActions {
  setBirthRatePreset: (value: string) => void;
  setCustomTFR: (value: number) => void;
  setTransitionYear: (value: number) => void;
  setUseCustomBirthRate: (value: boolean) => void;
  setWorkBasedImmigration: (value: number) => void;
  setFamilyImmigration: (value: number) => void;
  setHumanitarianImmigration: (value: number) => void;
  setGdpScenarioId: (value: string) => void;
  setUseCustomGrowth: (value: boolean) => void;
  setCustomGrowthRate: (value: number) => void;
  setInterestRateScenarioId: (value: string) => void;
  setUseCustomInterestRate: (value: boolean) => void;
  setCustomInterestRate: (value: number) => void;
  setUnemploymentScenarioId: (value: string) => void;
  setUseCustomUnemployment: (value: boolean) => void;
  setCustomUnemploymentRate: (value: number) => void;
  handleBirthRatePresetSelect: (presetId: string) => void;
  // Spending actions (NEW)
  setSpendingPreset: (value: string) => void;
  setSpendingScenario: (value: SpendingScenario) => void;
  setUseCustomSpending: (value: boolean) => void;
  updateSpendingGroup: (groupId: keyof SpendingScenario, scenarioId: string) => void;
}

// ===========================================
// Main Component
// ===========================================

export default function Sigma3Page() {
  // Historical spending data loading
  const [spendingDataLoaded, setSpendingDataLoaded] = useState(false);
  
  useEffect(() => {
    loadHistoricalSpendingData().then(() => setSpendingDataLoaded(true));
  }, []);

  // Timeline state
  const [selectedYear, setSelectedYear] = useState(2024);
  const [isPlaying, setIsPlaying] = useState(false);

  // Birth rate state
  const [birthRatePreset, setBirthRatePreset] = useState<string>('current_trend');
  const [customTFR, setCustomTFR] = useState(1.3);
  const [transitionYear, setTransitionYear] = useState(2040);
  const [useCustomBirthRate, setUseCustomBirthRate] = useState(false);

  // Immigration state
  const [workBasedImmigration, setWorkBasedImmigration] = useState(DEFAULT_IMMIGRATION.workBased);
  const [familyImmigration, setFamilyImmigration] = useState(DEFAULT_IMMIGRATION.family);
  const [humanitarianImmigration, setHumanitarianImmigration] = useState(DEFAULT_IMMIGRATION.humanitarian);

  // GDP state
  const [gdpScenarioId, setGdpScenarioId] = useState<string>(DEFAULT_GDP_SCENARIO);
  const [useCustomGrowth, setUseCustomGrowth] = useState(false);
  const [customGrowthRate, setCustomGrowthRate] = useState(0.015);

  // Interest rate state
  const [interestRateScenarioId, setInterestRateScenarioId] = useState<string>(DEFAULT_INTEREST_RATE_SCENARIO);
  const [useCustomInterestRate, setUseCustomInterestRate] = useState(false);
  const [customInterestRate, setCustomInterestRate] = useState(0.025);

  // Unemployment state
  const [unemploymentScenarioId, setUnemploymentScenarioId] = useState<string>(DEFAULT_UNEMPLOYMENT_SCENARIO);
  const [useCustomUnemployment, setUseCustomUnemployment] = useState(false);
  const [customUnemploymentRate, setCustomUnemploymentRate] = useState(0.07);

  // Spending scenario state (NEW)
  const [spendingPreset, setSpendingPreset] = useState<string>('status_quo');
  const [spendingScenario, setSpendingScenario] = useState<SpendingScenario>(DEFAULT_SPENDING_SCENARIO);
  const [useCustomSpending, setUseCustomSpending] = useState(false);

  // Build demographic scenario from state
  const demographicScenario: DemographicScenario = useMemo(() => {
    const preset = BIRTH_RATE_PRESETS[birthRatePreset];
    return {
      birthRate: {
        presetId: useCustomBirthRate ? null : birthRatePreset,
        customTFR: useCustomBirthRate ? customTFR : preset?.targetTFR || 1.3,
        transitionYear: useCustomBirthRate ? transitionYear : preset?.transitionYear || 2060,
      },
      immigration: {
        workBased: workBasedImmigration,
        family: familyImmigration,
        humanitarian: humanitarianImmigration,
      },
      gdp: {
        scenarioId: gdpScenarioId,
        customGrowthRate: useCustomGrowth ? customGrowthRate : null,
      },
      interestRate: {
        scenarioId: interestRateScenarioId,
        customRate: useCustomInterestRate ? customInterestRate : null,
      },
      unemployment: {
        scenarioId: unemploymentScenarioId,
        customRate: useCustomUnemployment ? customUnemploymentRate : null,
      },
    };
  }, [
    birthRatePreset, customTFR, transitionYear, useCustomBirthRate,
    workBasedImmigration, familyImmigration, humanitarianImmigration,
    gdpScenarioId, useCustomGrowth, customGrowthRate,
    interestRateScenarioId, useCustomInterestRate, customInterestRate,
    unemploymentScenarioId, useCustomUnemployment, customUnemploymentRate
  ]);

  // Get effective spending scenario
  const effectiveSpendingScenario = useMemo(() => {
    if (useCustomSpending) {
      return spendingScenario;
    }
    return SPENDING_SCENARIO_PRESETS[spendingPreset]?.scenario || DEFAULT_SPENDING_SCENARIO;
  }, [spendingPreset, spendingScenario, useCustomSpending]);

  // Track committed scenario for simulation
  const [committedDemoScenario, setCommittedDemoScenario] = useState<DemographicScenario>(demographicScenario);
  const [committedSpendingScenario, setCommittedSpendingScenario] = useState<SpendingScenario>(effectiveSpendingScenario);
  const [isSimulating, setIsSimulating] = useState(false);
  const initialRender = useRef(true);

  // Detect uncommitted changes
  const hasUncommittedChanges = useMemo(() => {
    const demoChanged = JSON.stringify(demographicScenario) !== JSON.stringify(committedDemoScenario);
    const spendingChanged = JSON.stringify(effectiveSpendingScenario) !== JSON.stringify(committedSpendingScenario);
    return demoChanged || spendingChanged;
  }, [demographicScenario, committedDemoScenario, effectiveSpendingScenario, committedSpendingScenario]);

  // Handle "Run Simulation" button
  const handleRunSimulation = useCallback(() => {
    setIsSimulating(true);
    setTimeout(() => {
      setCommittedDemoScenario(demographicScenario);
      setCommittedSpendingScenario(effectiveSpendingScenario);
      setIsSimulating(false);
    }, 50);
  }, [demographicScenario, effectiveSpendingScenario]);

  // Auto-run on initial render
  useEffect(() => {
    if (initialRender.current && spendingDataLoaded) {
      initialRender.current = false;
      setCommittedDemoScenario(demographicScenario);
      setCommittedSpendingScenario(effectiveSpendingScenario);
    }
  }, [demographicScenario, effectiveSpendingScenario, spendingDataLoaded]);

  // Run demographic simulation
  const simulationResult = useMemo(() =>
    simulatePopulationRange(1990, 2060, committedDemoScenario), [committedDemoScenario]
  );

  // Generate spending timeline:
  // - Historical years (≤2024): Use actual COFOG data from Statistics Finland
  // - Projected years (>2024): Use simulation's fiscal costs converted to COFOG format
  const spendingTimeline = useMemo(() => {
    if (!spendingDataLoaded) return [];
    
    const results: YearlySpending[] = [];
    
    // Get base year COFOG data for ratio calculations
    const baseYearCOFOG = getHistoricalSpending(SPENDING_BASE_YEAR);
    
    // Get simulation data for base year to calculate growth rates
    const simBaseYearData = simulationResult.annualResults.find(r => r.year === SPENDING_BASE_YEAR);
    if (simBaseYearData) {
      setSimulationBaseYearData({
        educationCosts: simBaseYearData.educationCosts,
        healthcareCosts: simBaseYearData.healthcareCosts,
        pensionCosts: simBaseYearData.pensionCosts,
        benefitCosts: simBaseYearData.benefitCosts,
        totalPopulation: simBaseYearData.totalPopulation,
        gdpBillions: simBaseYearData.gdp,
      });
    }
    
    for (const yearData of simulationResult.annualResults) {
      if (yearData.year <= SPENDING_BASE_YEAR) {
        // Historical: Use actual COFOG data
        const historicalSpending = getHistoricalSpending(yearData.year);
        if (historicalSpending) {
          results.push(historicalSpending);
        }
      } else {
        // Projected: Convert simulation fiscal costs to COFOG format
        const spending = convertSimulationToCOFOG({
          year: yearData.year,
          educationCosts: yearData.educationCosts,
          healthcareCosts: yearData.healthcareCosts,
          pensionCosts: yearData.pensionCosts,
          benefitCosts: yearData.benefitCosts,
          interestExpense: yearData.interestExpense,
          totalStateCosts: yearData.totalStateCosts,
          gdpBillions: yearData.gdp,
          totalPopulation: yearData.totalPopulation,
        }, baseYearCOFOG);
        results.push(spending);
      }
    }
    
    return results;
  }, [simulationResult, spendingDataLoaded]);

  // Get current year data
  const currentYearData = useMemo(() => {
    const result = simulationResult.annualResults.find(r => r.year === selectedYear);
    return result || simulationResult.annualResults[simulationResult.annualResults.length - 1];
  }, [simulationResult, selectedYear]);

  // Get current year spending
  const currentYearSpending = useMemo(() => {
    return spendingTimeline.find(s => s.year === selectedYear) || null;
  }, [spendingTimeline, selectedYear]);

  // Population pyramid data
  const pyramidData = useMemo(() =>
    getPopulationPyramidData(selectedYear), [selectedYear]
  );

  // Animation effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedYear(year => {
        if (year >= 2060) {
          setIsPlaying(false);
          return 2060;
        }
        return year + 1;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle preset selection
  const handleBirthRatePresetSelect = useCallback((presetId: string) => {
    setBirthRatePreset(presetId);
    setUseCustomBirthRate(false);
    const preset = BIRTH_RATE_PRESETS[presetId];
    if (preset) {
      setCustomTFR(preset.targetTFR);
      setTransitionYear(preset.transitionYear);
    }
  }, []);

  // Handle spending group update
  const updateSpendingGroup = useCallback((groupId: keyof SpendingScenario, scenarioId: string) => {
    setSpendingScenario(prev => ({
      ...prev,
      [groupId]: scenarioId,
    }));
    setUseCustomSpending(true);
  }, []);

  // Handle spending preset selection
  const handleSpendingPresetSelect = useCallback((presetId: string) => {
    setSpendingPreset(presetId);
    setUseCustomSpending(false);
    const preset = SPENDING_SCENARIO_PRESETS[presetId];
    if (preset) {
      setSpendingScenario(preset.scenario);
    }
  }, []);

  // Pack state and actions
  const scenarioState: ScenarioState = {
    birthRatePreset,
    customTFR,
    transitionYear,
    useCustomBirthRate,
    workBasedImmigration,
    familyImmigration,
    humanitarianImmigration,
    gdpScenarioId,
    useCustomGrowth,
    customGrowthRate,
    interestRateScenarioId,
    useCustomInterestRate,
    customInterestRate,
    unemploymentScenarioId,
    useCustomUnemployment,
    customUnemploymentRate,
    spendingPreset,
    spendingScenario,
    useCustomSpending,
  };

  const scenarioActions: ScenarioActions = {
    setBirthRatePreset,
    setCustomTFR,
    setTransitionYear,
    setUseCustomBirthRate,
    setWorkBasedImmigration,
    setFamilyImmigration,
    setHumanitarianImmigration,
    setGdpScenarioId,
    setUseCustomGrowth,
    setCustomGrowthRate,
    setInterestRateScenarioId,
    setUseCustomInterestRate,
    setCustomInterestRate,
    setUnemploymentScenarioId,
    setUseCustomUnemployment,
    setCustomUnemploymentRate,
    handleBirthRatePresetSelect,
    setSpendingPreset: handleSpendingPresetSelect,
    setSpendingScenario,
    setUseCustomSpending,
    updateSpendingGroup,
  };

  // Get effective rates
  const activeGdpScenario = GDP_SCENARIOS[gdpScenarioId];
  const activeInterestScenario = INTEREST_RATE_SCENARIOS[interestRateScenarioId];

  const effectiveGrowthRate = useCustomGrowth
    ? customGrowthRate
    : currentYearData.effectiveGdpGrowthRate || activeGdpScenario?.realGrowthRate || 0.01;

  const effectiveInterestRate = useCustomInterestRate
    ? customInterestRate
    : activeInterestScenario?.rate || 0.025;

  // Loading state
  if (!spendingDataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading spending data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span className="text-sm">Back</span>
          </Link>

          <h1 className="text-lg font-semibold">
            <span className="text-emerald-500">Σ³</span>{' '}
            <span className="text-gray-300">Finland&apos;s Fiscal Future</span>
            <span className="text-xs text-gray-500 ml-2">COFOG Spending Model</span>
          </h1>

          {/* Run Simulation Button */}
          <div className="flex items-center gap-3">
            {hasUncommittedChanges && (
              <span className="text-xs text-amber-400 animate-pulse">
                Settings changed
              </span>
            )}
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating || !hasUncommittedChanges}
              className={`
                px-4 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                ${hasUncommittedChanges 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }
                ${isSimulating ? 'opacity-75' : ''}
              `}
            >
              {isSimulating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running...
                </>
              ) : (
                <>▶ Run Simulation</>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Scenario Panel */}
        <ScenarioPanel
          state={scenarioState}
          actions={scenarioActions}
          currentYearData={currentYearData}
          currentYearSpending={currentYearSpending}
          effectiveGrowthRate={effectiveGrowthRate}
          effectiveInterestRate={effectiveInterestRate}
        />

        {/* Right Content - Results Area */}
        <ResultsArea
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          simulationResult={simulationResult}
          currentYearData={currentYearData}
          pyramidData={pyramidData}
          spendingTimeline={spendingTimeline}
          currentYearSpending={currentYearSpending}
          effectiveGrowthRate={effectiveGrowthRate}
          effectiveInterestRate={effectiveInterestRate}
          scenarioState={scenarioState}
        />
      </div>
    </main>
  );
}

