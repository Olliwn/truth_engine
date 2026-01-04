'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// Use the new time-step simulation engine via the adapter
// This provides a drop-in replacement API with improved immigrant tracking
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
  USE_NEW_SIMULATION_ENGINE,
} from '@/lib/simulation/adapter';
import type { DemographicScenario } from '@/lib/simulation/adapter';
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
  handleBirthRatePresetSelect: (presetId: string) => void;
}

// ===========================================
// Main Component
// ===========================================

export default function Sigma2Page() {
  // Timeline state
  const [selectedYear, setSelectedYear] = useState(2024);
  const [isPlaying, setIsPlaying] = useState(false);

  // Scenario state
  const [birthRatePreset, setBirthRatePreset] = useState<string>('current_trend');
  const [customTFR, setCustomTFR] = useState(1.3);
  const [transitionYear, setTransitionYear] = useState(2040);
  const [useCustomBirthRate, setUseCustomBirthRate] = useState(false);

  const [workBasedImmigration, setWorkBasedImmigration] = useState(DEFAULT_IMMIGRATION.workBased);
  const [familyImmigration, setFamilyImmigration] = useState(DEFAULT_IMMIGRATION.family);
  const [humanitarianImmigration, setHumanitarianImmigration] = useState(DEFAULT_IMMIGRATION.humanitarian);

  const [gdpScenarioId, setGdpScenarioId] = useState<string>(DEFAULT_GDP_SCENARIO);
  const [useCustomGrowth, setUseCustomGrowth] = useState(false);
  const [customGrowthRate, setCustomGrowthRate] = useState(0.015);

  const [interestRateScenarioId, setInterestRateScenarioId] = useState<string>(DEFAULT_INTEREST_RATE_SCENARIO);
  const [useCustomInterestRate, setUseCustomInterestRate] = useState(false);
  const [customInterestRate, setCustomInterestRate] = useState(0.025);

  // Build scenario from state (current editing state)
  const scenario: DemographicScenario = useMemo(() => {
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
    };
  }, [
    birthRatePreset, customTFR, transitionYear, useCustomBirthRate,
    workBasedImmigration, familyImmigration, humanitarianImmigration,
    gdpScenarioId, useCustomGrowth, customGrowthRate,
    interestRateScenarioId, useCustomInterestRate, customInterestRate
  ]);

  // Track committed scenario (what the simulation actually runs with)
  const [committedScenario, setCommittedScenario] = useState<DemographicScenario>(scenario);
  const [isSimulating, setIsSimulating] = useState(false);
  const initialRender = useRef(true);

  // Detect if there are uncommitted changes
  const hasUncommittedChanges = useMemo(() => {
    return JSON.stringify(scenario) !== JSON.stringify(committedScenario);
  }, [scenario, committedScenario]);

  // Handle "Run Simulation" button click
  const handleRunSimulation = useCallback(() => {
    setIsSimulating(true);
    // Use setTimeout to allow UI to update before expensive computation
    setTimeout(() => {
      setCommittedScenario(scenario);
      setIsSimulating(false);
    }, 50);
  }, [scenario]);

  // Auto-run on initial render
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      setCommittedScenario(scenario);
    }
  }, [scenario]);

  // Run simulation with COMMITTED scenario (not editing scenario)
  const simulationResult = useMemo(() =>
    simulatePopulationRange(1990, 2060, committedScenario), [committedScenario]
  );

  // Get current year data from simulation results
  const currentYearData = useMemo(() => {
    const result = simulationResult.annualResults.find(r => r.year === selectedYear);
    return result || simulationResult.annualResults[simulationResult.annualResults.length - 1];
  }, [simulationResult, selectedYear]);

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

  // Pack state and actions for child components
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
    handleBirthRatePresetSelect,
  };

  // Get effective rates for display
  const activeGdpScenario = GDP_SCENARIOS[gdpScenarioId];
  const activeInterestScenario = INTEREST_RATE_SCENARIOS[interestRateScenarioId];

  const effectiveGrowthRate = useCustomGrowth
    ? customGrowthRate
    : currentYearData.effectiveGdpGrowthRate || activeGdpScenario?.realGrowthRate || 0.01;

  const effectiveInterestRate = useCustomInterestRate
    ? customInterestRate
    : activeInterestScenario?.rate || 0.025;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span className="text-sm">Back</span>
          </Link>

          <h1 className="text-lg font-semibold">
            <span className="text-amber-500">Σ²</span>{' '}
            <span className="text-gray-300">Finland&apos;s Demographic Destiny</span>
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
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30' 
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

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Scenario Panel */}
        <ScenarioPanel
          state={scenarioState}
          actions={scenarioActions}
          currentYearData={currentYearData}
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
          effectiveGrowthRate={effectiveGrowthRate}
          effectiveInterestRate={effectiveInterestRate}
          scenarioState={scenarioState}
        />
      </div>
    </main>
  );
}

