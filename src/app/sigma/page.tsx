'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import {
  simulatePopulationRange,
  getPopulationPyramidData,
  DEFAULT_SCENARIO,
  BIRTH_RATE_PRESETS,
  IMMIGRATION_PROFILES,
  DEFAULT_IMMIGRATION,
  GDP_SCENARIOS,
  DEFAULT_GDP_SCENARIO,
  INTEREST_RATE_SCENARIOS,
  DEFAULT_INTEREST_RATE_SCENARIO,
  HISTORICAL_DEBT,
} from '@/lib/populationSimulator';
import type { DemographicScenario } from '@/lib/populationSimulator';
import {
  IMMIGRATION_REFERENCE_PERIODS,
  HISTORICAL_IMMIGRATION,
  HISTORICAL_IMMIGRATION_BY_TYPE,
} from '@/lib/constants/demographicScenarios';

// ===========================================
// Formatting Helpers
// ===========================================

const formatNumber = (n: number) => 
  new Intl.NumberFormat('fi-FI').format(Math.round(n));

// n is in millions EUR
const formatMillions = (n: number) => {
  if (!isFinite(n)) return '€--';
  // Convert millions to billions for display
  const billions = n / 1000;
  if (Math.abs(billions) >= 1000) return `€${(billions / 1000).toFixed(1)}T`;
  if (Math.abs(billions) >= 1) return `€${billions.toFixed(1)}B`;
  return `€${n.toFixed(0)}M`;
};

const formatPercent = (n: number) => 
  `${n.toFixed(1)}%`;

const formatCompact = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
};

// ===========================================
// Main Component
// ===========================================

export default function SigmaPage() {
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
  const [showImmigrationPanel, setShowImmigrationPanel] = useState(true);
  
  // GDP scenario state
  const [gdpScenarioId, setGdpScenarioId] = useState<string>(DEFAULT_GDP_SCENARIO);
  const [useCustomGrowth, setUseCustomGrowth] = useState(false);
  const [customGrowthRate, setCustomGrowthRate] = useState(0.015);
  const [showGdpPanel, setShowGdpPanel] = useState(true);
  
  // Interest rate scenario state
  const [interestRateScenarioId, setInterestRateScenarioId] = useState<string>(DEFAULT_INTEREST_RATE_SCENARIO);
  const [useCustomInterestRate, setUseCustomInterestRate] = useState(false);
  const [customInterestRate, setCustomInterestRate] = useState(0.025);
  const [showDebtPanel, setShowDebtPanel] = useState(true);
  
  // Build scenario from state
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
  }, [birthRatePreset, customTFR, transitionYear, useCustomBirthRate, 
      workBasedImmigration, familyImmigration, humanitarianImmigration,
      gdpScenarioId, useCustomGrowth, customGrowthRate,
      interestRateScenarioId, useCustomInterestRate, customInterestRate]);
  
  // Run simulation with scenario
  const simulationResult = useMemo(() => 
    simulatePopulationRange(1990, 2060, scenario), [scenario]
  );
  
  // Get current year data from simulation results (ensures GDP growth multiplier is correctly applied)
  const currentYearData = useMemo(() => {
    const result = simulationResult.annualResults.find(r => r.year === selectedYear);
    // Fallback if year not in range (shouldn't happen)
    return result || simulationResult.annualResults[simulationResult.annualResults.length - 1];
  }, [simulationResult, selectedYear]);
  
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
  const handlePresetSelect = useCallback((presetId: string) => {
    setBirthRatePreset(presetId);
    setUseCustomBirthRate(false);
    const preset = BIRTH_RATE_PRESETS[presetId];
    if (preset) {
      setCustomTFR(preset.targetTFR);
      setTransitionYear(preset.transitionYear);
    }
  }, []);
  
  const { annualResults, summary } = simulationResult;
  
  // Get current GDP scenario details
  const activeGdpScenario = GDP_SCENARIOS[gdpScenarioId];
  const effectiveGrowthRate = useCustomGrowth ? customGrowthRate : activeGdpScenario?.realGrowthRate || 0.01;
  
  // Prepare chart data
  const fiscalChartData = annualResults.map(r => ({
    year: r.year,
    contributions: r.totalContributions,
    costs: r.totalStateCosts,
    balance: r.netFiscalBalance,
    gdpAdjustedBalance: r.gdpAdjustedBalance,
    dependencyRatio: r.oldAgeDependencyRatio,
    tfr: r.tfr,
    gdp: r.gdp,
    deficitPctGDP: r.deficitPctGDP,
  }));
  
  // GDP and fiscal sustainability chart data
  const gdpChartData = annualResults.map(r => ({
    year: r.year,
    gdp: r.gdp,
    baseBalance: r.netFiscalBalance,
    gdpAdjustedBalance: r.gdpAdjustedBalance,
    deficitPctGDP: r.deficitPctGDP,
    govtSpendingPct: r.govtSpendingPctGDP,
  }));
  
  // Debt chart data
  const debtChartData = annualResults.map(r => ({
    year: r.year,
    debtToGDP: r.debtToGDP,
    debtStock: r.debtStock,
    interestExpense: r.interestExpense,
    primaryBalance: r.primaryBalance,
    gdp: r.gdp,
  }));
  
  // Get effective interest rate for display
  const activeInterestScenario = INTEREST_RATE_SCENARIOS[interestRateScenarioId];
  const effectiveInterestRate = useCustomInterestRate ? customInterestRate : activeInterestScenario?.rate || 0.025;
  
  const demographicChartData = annualResults.map(r => ({
    year: r.year,
    children: r.children / 1000000,
    workingAge: r.workingAge / 1000000,
    elderly: r.elderly / 1000000,
    total: r.totalPopulation / 1000000,
  }));
  
  const costBreakdownData = annualResults.map(r => ({
    year: r.year,
    education: r.educationCosts,
    healthcare: r.healthcareCosts,
    pensions: r.pensionCosts,
    benefits: r.benefitCosts,
  }));
  
  const birthRateChartData = annualResults.map(r => ({
    year: r.year,
    tfr: r.tfr,
    births: r.annualBirths / 1000,
  }));
  
  const immigrationChartData = annualResults.map(r => ({
    year: r.year,
    workBased: r.immigrationByType.workBased.fiscalImpact,
    family: r.immigrationByType.family.fiscalImpact,
    humanitarian: r.immigrationByType.humanitarian.fiscalImpact,
    total: r.immigrationFiscalImpact,
  }));
  
  // Pyramid chart data (horizontal bar chart style)
  const pyramidChartData = pyramidData
    .filter((_, i) => i % 5 === 0) // Every 5 years for readability
    .map(d => ({
      age: `${d.age}`,
      male: -d.male / 1000, // Negative for left side
      female: d.female / 1000,
    }));
  
  // Calculate estimated fiscal impact per type
  const workBasedAnnualImpact = currentYearData.immigrationByType.workBased.fiscalImpact;
  const familyAnnualImpact = currentYearData.immigrationByType.family.fiscalImpact;
  const humanitarianAnnualImpact = currentYearData.immigrationByType.humanitarian.fiscalImpact;
  const totalImmigrationImpact = currentYearData.immigrationFiscalImpact;
  
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back</span>
          </Link>

          <h1 className="text-lg font-semibold">
            <span className="text-amber-500">Σ Sigma</span> | Population Fiscal Simulator
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-amber-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Finland&apos;s <span className="text-amber-400">Demographic Destiny</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Explore how birth rate and immigration scenarios affect Finland&apos;s 
            fiscal sustainability from 1990 to 2060.
          </p>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 max-w-7xl mx-auto">
            <MetricCard
              label="Birth Rate (TFR)"
              value={currentYearData.tfr.toFixed(2)}
              sublabel={`in ${selectedYear}`}
              color={currentYearData.tfr >= 1.6 ? 'green' : currentYearData.tfr >= 1.3 ? 'amber' : 'red'}
            />
            <MetricCard
              label="Old-Age Dependency"
              value={formatPercent(currentYearData.oldAgeDependencyRatio)}
              sublabel={`in ${selectedYear}`}
              color={currentYearData.oldAgeDependencyRatio > 40 ? 'red' : 'amber'}
            />
            <MetricCard
              label="Working Age Pop."
              value={`${(currentYearData.workingAge / 1000000).toFixed(2)}M`}
              sublabel={`${selectedYear}`}
              color="blue"
            />
            <MetricCard
              label="Fiscal Balance"
              value={formatMillions(currentYearData.netFiscalBalance)}
              sublabel={currentYearData.netFiscalBalance >= 0 ? 'surplus' : 'deficit'}
              color={currentYearData.netFiscalBalance >= 0 ? 'green' : 'red'}
            />
            <MetricCard
              label="Interest Expense"
              value={formatMillions(currentYearData.interestExpense)}
              sublabel={`${(effectiveInterestRate * 100).toFixed(1)}% rate`}
              color="red"
            />
            <MetricCard
              label="Debt/GDP"
              value={`${currentYearData.debtToGDP.toFixed(0)}%`}
              sublabel={`€${currentYearData.debtStock.toFixed(0)}B`}
              color={currentYearData.debtToGDP < 60 ? 'green' : currentYearData.debtToGDP < 100 ? 'amber' : 'red'}
            />
            <MetricCard
              label="GDP"
              value={`€${currentYearData.gdp.toFixed(0)}B`}
              sublabel={`${(effectiveGrowthRate * 100).toFixed(1)}%/yr growth`}
              color="purple"
            />
          </div>
        </div>
      </section>

      {/* Year Slider */}
      <section className="py-6 px-6 bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isPlaying 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isPlaying ? '⏹ Stop' : '▶ Play Timeline'}
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min={1990}
                max={2060}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>1990</span>
                <span className="text-2xl font-bold text-amber-400">{selectedYear}</span>
                <span>2060</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scenario Controls */}
      <section className="py-6 px-6 bg-gray-900/30 border-b border-gray-800">
        <div className="max-w-6xl mx-auto">
          {/* Birth Rate Scenario */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">👶</span>
                Birth Rate Scenario
              </h3>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={useCustomBirthRate}
                  onChange={(e) => setUseCustomBirthRate(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-700"
                />
                Custom
              </label>
            </div>
            
            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.values(BIRTH_RATE_PRESETS).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    birthRatePreset === preset.id && !useCustomBirthRate
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  style={{ 
                    borderLeft: `4px solid ${preset.color}` 
                  }}
                >
                  {preset.name}
                  <span className="ml-2 text-xs opacity-70">TFR {preset.targetTFR}</span>
                </button>
              ))}
            </div>
            
            {/* Custom Sliders */}
            {useCustomBirthRate && (
              <div className="grid md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-800">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Target TFR</span>
                    <span className="text-amber-400 font-semibold">{customTFR.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={2.5}
                    step={0.05}
                    value={customTFR}
                    onChange={(e) => setCustomTFR(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>0.8 (Korea)</span>
                    <span>2.1 (Replacement)</span>
                    <span>2.5</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Target Year</span>
                    <span className="text-amber-400 font-semibold">{transitionYear}</span>
                  </div>
                  <input
                    type="range"
                    min={2025}
                    max={2060}
                    step={1}
                    value={transitionYear}
                    onChange={(e) => setTransitionYear(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>2025</span>
                    <span>2060</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Birth Rate Mini Chart */}
            <div className="mt-4 h-32 bg-gray-900/50 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={birthRateChartData}>
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#6B7280" />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 10 }} 
                    stroke="#6B7280"
                    domain={[0, 3]}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 10 }} 
                    stroke="#6B7280"
                    tickFormatter={(v) => `${v}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine yAxisId="left" y={2.1} stroke="#22C55E" strokeDasharray="3 3" label={{ value: 'Replacement', fontSize: 10, fill: '#22C55E' }} />
                  <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="tfr" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={false}
                    name="TFR"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="births"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                    stroke="#3B82F6"
                    name="Births (k)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Immigration Scenario */}
          <div className="card p-6">
            <button
              onClick={() => setShowImmigrationPanel(!showImmigrationPanel)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">✈️</span>
                Immigration Scenario
              </h3>
              <span className="text-gray-500">{showImmigrationPanel ? '▼' : '▶'}</span>
            </button>
            
            {showImmigrationPanel && (
              <div className="space-y-6">
                {/* Work-based */}
                <ImmigrationSlider
                  profile={IMMIGRATION_PROFILES.work_based}
                  value={workBasedImmigration}
                  onChange={setWorkBasedImmigration}
                  max={30000}
                  fiscalImpact={workBasedAnnualImpact}
                />
                
                {/* Family */}
                <ImmigrationSlider
                  profile={IMMIGRATION_PROFILES.family}
                  value={familyImmigration}
                  onChange={setFamilyImmigration}
                  max={30000}
                  fiscalImpact={familyAnnualImpact}
                />
                
                {/* Humanitarian */}
                <ImmigrationSlider
                  profile={IMMIGRATION_PROFILES.humanitarian}
                  value={humanitarianImmigration}
                  onChange={setHumanitarianImmigration}
                  max={30000}
                  fiscalImpact={humanitarianAnnualImpact}
                />
                
                {/* Total */}
                <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                  <div>
                    <span className="text-gray-400">Total Immigration: </span>
                    <span className="text-white font-semibold">
                      {formatCompact(workBasedImmigration + familyImmigration + humanitarianImmigration)}/year
                    </span>
                  </div>
                  <div className={`font-bold ${totalImmigrationImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    Net: {formatMillions(totalImmigrationImpact)}/year
                  </div>
                </div>
                
                {/* Historical Reference */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">📊 Historical Reference</h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <HistoricalReference
                      period={IMMIGRATION_REFERENCE_PERIODS['2010s_average']}
                      currentTotal={workBasedImmigration + familyImmigration + humanitarianImmigration}
                      currentWorkBased={workBasedImmigration}
                    />
                    <HistoricalReference
                      period={IMMIGRATION_REFERENCE_PERIODS['2022_2024_average']}
                      currentTotal={workBasedImmigration + familyImmigration + humanitarianImmigration}
                      currentWorkBased={workBasedImmigration}
                    />
                    <HistoricalReference
                      period={IMMIGRATION_REFERENCE_PERIODS['peak_2023']}
                      currentTotal={workBasedImmigration + familyImmigration + humanitarianImmigration}
                      currentWorkBased={workBasedImmigration}
                    />
                  </div>
                  
                  {/* Historical trend mini-chart */}
                  <div className="mt-4 h-24 bg-gray-900/50 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(HISTORICAL_IMMIGRATION).map(([year, total]) => ({
                          year: parseInt(year),
                          total: total / 1000,
                          workBased: (HISTORICAL_IMMIGRATION_BY_TYPE[parseInt(year)]?.workBased || 0) / 1000,
                        }))}
                        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                      >
                        <XAxis 
                          dataKey="year" 
                          tick={{ fontSize: 9 }} 
                          stroke="#6B7280"
                          tickFormatter={(v) => `'${String(v).slice(-2)}`}
                        />
                        <YAxis 
                          tick={{ fontSize: 9 }} 
                          stroke="#6B7280"
                          tickFormatter={(v) => `${v}k`}
                          width={25}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '6px',
                            fontSize: '11px',
                          }}
                          formatter={(value) => [`${((value as number) * 1000).toLocaleString()}`, '']}
                        />
                        <Bar dataKey="total" fill="#6B7280" name="Total" />
                        <Bar dataKey="workBased" fill="#22C55E" name="Work-based" />
                        {/* Reference line for current scenario */}
                        <ReferenceLine 
                          y={(workBasedImmigration + familyImmigration + humanitarianImmigration) / 1000} 
                          stroke="#F59E0B" 
                          strokeDasharray="3 3"
                          label={{ value: 'Scenario', fontSize: 9, fill: '#F59E0B' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1 text-center">
                    Historical immigration 2010-2024 vs your scenario (dashed line)
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* GDP Growth Scenario */}
          <div className="card p-6">
            <button
              onClick={() => setShowGdpPanel(!showGdpPanel)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">📈</span>
                GDP Growth Scenario
              </h3>
              <span className="text-gray-500">{showGdpPanel ? '▼' : '▶'}</span>
            </button>
            
            {showGdpPanel && (
              <div className="space-y-4">
                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-2">
                  {Object.values(GDP_SCENARIOS).map((gdpScenario) => (
                    <button
                      key={gdpScenario.id}
                      onClick={() => {
                        setGdpScenarioId(gdpScenario.id);
                        setUseCustomGrowth(false);
                        setCustomGrowthRate(gdpScenario.realGrowthRate);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        gdpScenarioId === gdpScenario.id && !useCustomGrowth
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      style={{ borderLeft: `4px solid ${gdpScenario.color}` }}
                    >
                      {gdpScenario.name}
                      <span className="ml-2 text-xs opacity-70">{(gdpScenario.realGrowthRate * 100).toFixed(1)}%</span>
                    </button>
                  ))}
                </div>
                
                {/* Custom Growth Rate */}
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    checked={useCustomGrowth}
                    onChange={(e) => setUseCustomGrowth(e.target.checked)}
                    className="rounded bg-gray-800 border-gray-700"
                  />
                  <span className="text-sm text-gray-400">Custom growth rate</span>
                </div>
                
                {useCustomGrowth && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Annual Real GDP Growth</span>
                      <span className="text-purple-400 font-semibold">{(customGrowthRate * 100).toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={-0.02}
                      max={0.05}
                      step={0.001}
                      value={customGrowthRate}
                      onChange={(e) => setCustomGrowthRate(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>-2% (recession)</span>
                      <span>1.5% (hist avg)</span>
                      <span>5% (boom)</span>
                    </div>
                  </div>
                )}
                
                {/* GDP Scenario Description */}
                <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                  <p className="text-sm text-gray-400">
                    {useCustomGrowth ? (
                      `Custom growth rate: ${(customGrowthRate * 100).toFixed(1)}% real GDP growth per year from 2024.`
                    ) : (
                      activeGdpScenario?.description || 'Select a GDP growth scenario.'
                    )}
                  </p>
                </div>
                
                {/* Second-order effects warning */}
                {summary.secondOrderEffects && (
                  <div className="mt-4 p-4 bg-amber-950/30 border border-amber-800/50 rounded-lg">
                    <h4 className="text-amber-400 font-semibold text-sm mb-2 flex items-center gap-2">
                      ⚠️ Second-Order Effects (Fiscal Multiplier)
                    </h4>
                    <p className="text-xs text-gray-400 mb-3">
                      Government deficit spending contributes to GDP. Eliminating the deficit would itself reduce GDP.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Current deficit</div>
                        <div className="text-red-400 font-semibold">
                          {summary.secondOrderEffects.deficitAsPercentOfGDP.toFixed(1)}% of GDP
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">If balanced, GDP would fall</div>
                        <div className="text-amber-400 font-semibold">
                          ~{summary.secondOrderEffects.gdpReductionIfBalanced.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Basic growth needed</div>
                        <div className="text-gray-300 font-semibold">
                          {summary.breakevenGrowthRate 
                            ? `${(summary.breakevenGrowthRate * 100).toFixed(1)}%/year`
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Effective growth needed</div>
                        <div className="text-purple-400 font-semibold">
                          {summary.secondOrderEffects.effectiveGrowthNeeded
                            ? `${(summary.secondOrderEffects.effectiveGrowthNeeded * 100).toFixed(1)}%/year`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-3">
                      * Fiscal multiplier assumed at 0.8 (conservative for developed economies)
                    </p>
                  </div>
                )}
                
                {/* GDP projection mini-chart */}
                <div className="mt-4 h-32 bg-gray-900/50 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={gdpChartData.filter(d => d.year >= 2010)}>
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#6B7280" />
                      <YAxis 
                        yAxisId="gdp"
                        tick={{ fontSize: 10 }} 
                        stroke="#6B7280"
                        tickFormatter={(v) => `€${v}B`}
                      />
                      <YAxis 
                        yAxisId="pct"
                        orientation="right"
                        tick={{ fontSize: 10 }} 
                        stroke="#6B7280"
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        domain={[-10, 10]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value, name) => {
                          if (name === 'GDP') return [`€${(value as number).toFixed(0)}B`, name];
                          if (name === 'Deficit % GDP') return [`${(value as number).toFixed(1)}%`, name];
                          return [value, name];
                        }}
                      />
                      <ReferenceLine yAxisId="pct" y={0} stroke="#6B7280" strokeDasharray="3 3" />
                      <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
                      <ReferenceLine x={2024} stroke="#A855F7" strokeDasharray="3 3" label={{ value: 'Now', fontSize: 9, fill: '#A855F7' }} />
                      <Area 
                        yAxisId="gdp"
                        type="monotone" 
                        dataKey="gdp" 
                        fill="#8B5CF6"
                        fillOpacity={0.2}
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        name="GDP"
                      />
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="deficitPctGDP"
                        stroke="#EF4444"
                        strokeWidth={2}
                        dot={false}
                        name="Deficit % GDP"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-600 text-center">
                  GDP projection and deficit as % of GDP (historical 2010-2024, projected 2025-2060)
                </p>
              </div>
            )}
          </div>
          
          {/* Debt & Interest Rate Scenario */}
          <div className="card p-6">
            <button
              onClick={() => setShowDebtPanel(!showDebtPanel)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">💳</span>
                Debt & Interest Rate
              </h3>
              <span className="text-gray-500">{showDebtPanel ? '▼' : '▶'}</span>
            </button>
            
            {showDebtPanel && (
              <div className="space-y-4">
                {/* Interest Rate Preset Buttons */}
                <div className="flex flex-wrap gap-2">
                  {Object.values(INTEREST_RATE_SCENARIOS).map((irScenario) => (
                    <button
                      key={irScenario.id}
                      onClick={() => {
                        setInterestRateScenarioId(irScenario.id);
                        setUseCustomInterestRate(false);
                        setCustomInterestRate(irScenario.rate);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        interestRateScenarioId === irScenario.id && !useCustomInterestRate
                          ? 'bg-rose-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      style={{ borderLeft: `4px solid ${irScenario.color}` }}
                    >
                      {irScenario.name}
                      <span className="ml-2 text-xs opacity-70">{(irScenario.rate * 100).toFixed(1)}%</span>
                    </button>
                  ))}
                </div>
                
                {/* Custom Interest Rate */}
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    checked={useCustomInterestRate}
                    onChange={(e) => setUseCustomInterestRate(e.target.checked)}
                    className="rounded bg-gray-800 border-gray-700"
                  />
                  <span className="text-sm text-gray-400">Custom interest rate</span>
                </div>
                
                {useCustomInterestRate && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Annual Interest Rate</span>
                      <span className="text-rose-400 font-semibold">{(customInterestRate * 100).toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.005}
                      max={0.10}
                      step={0.005}
                      value={customInterestRate}
                      onChange={(e) => setCustomInterestRate(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>0.5% (QE era)</span>
                      <span>3.5% (normal)</span>
                      <span>10% (crisis)</span>
                    </div>
                  </div>
                )}
                
                {/* Interest Rate Description */}
                <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                  <p className="text-sm text-gray-400">
                    {useCustomInterestRate ? (
                      `Custom interest rate: ${(customInterestRate * 100).toFixed(1)}% annual rate on government debt.`
                    ) : (
                      activeInterestScenario?.description || 'Select an interest rate scenario.'
                    )}
                  </p>
                </div>
                
                {/* Debt Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-500">Current Debt (2024)</div>
                    <div className="text-lg font-bold text-gray-300">€{HISTORICAL_DEBT[2024]}B</div>
                    <div className="text-xs text-gray-600">~60% of GDP</div>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-500">End Debt ({2060})</div>
                    <div className="text-lg font-bold text-rose-400">€{summary.finalDebtStock.toFixed(0)}B</div>
                    <div className="text-xs text-gray-600">{summary.finalDebtToGDP.toFixed(0)}% of GDP</div>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-500">Peak Debt/GDP</div>
                    <div className="text-lg font-bold text-amber-400">{summary.peakDebtToGDP.toFixed(0)}%</div>
                    <div className="text-xs text-gray-600">in {summary.peakDebtYear}</div>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-500">Total Interest (1990-2060)</div>
                    <div className="text-lg font-bold text-red-400">{formatMillions(summary.totalInterestPaid)}</div>
                    <div className="text-xs text-gray-600">cumulative</div>
                  </div>
                </div>
                
                {/* Debt/GDP Mini Chart */}
                <div className="mt-4 h-40 bg-gray-900/50 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={debtChartData.filter(d => d.year >= 1990)}>
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#6B7280" />
                      <YAxis 
                        yAxisId="pct"
                        tick={{ fontSize: 10 }} 
                        stroke="#6B7280"
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        domain={[0, 'auto']}
                      />
                      <YAxis 
                        yAxisId="eur"
                        orientation="right"
                        tick={{ fontSize: 10 }} 
                        stroke="#6B7280"
                        tickFormatter={(v) => `€${v}B`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value, name) => {
                          if (name === 'Debt/GDP') return [`${(value as number).toFixed(1)}%`, name];
                          if (name === 'Debt Stock') return [`€${(value as number).toFixed(0)}B`, name];
                          if (name === 'Interest (€M)') return [`€${(value as number / 1000).toFixed(1)}B`, name];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <ReferenceLine yAxisId="pct" y={60} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Maastricht 60%', fontSize: 9, fill: '#F59E0B' }} />
                      <ReferenceLine yAxisId="pct" y={100} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '100%', fontSize: 9, fill: '#EF4444' }} />
                      <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
                      <ReferenceLine x={2024} stroke="#A855F7" strokeDasharray="3 3" />
                      <Area 
                        yAxisId="pct"
                        type="monotone" 
                        dataKey="debtToGDP" 
                        fill="#DC2626"
                        fillOpacity={0.3}
                        stroke="#DC2626" 
                        strokeWidth={2}
                        name="Debt/GDP"
                      />
                      <Line
                        yAxisId="eur"
                        type="monotone"
                        dataKey="debtStock"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        dot={false}
                        name="Debt Stock"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-600 text-center">
                  Government debt as % of GDP and total debt stock (1990-2060)
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Population Pyramid */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">👥</span>
            Population Pyramid — {selectedYear}
          </h3>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Pyramid Chart */}
            <div className="card p-6 h-[500px]">
              <h4 className="text-lg font-semibold mb-4 text-gray-300">Age Distribution</h4>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart
                  data={pyramidChartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    type="number" 
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `${Math.abs(v)}k`}
                    domain={[-60, 60]}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="age" 
                    stroke="#9CA3AF"
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => `${formatNumber(Math.abs(value as number) * 1000)}`}
                  />
                  <Legend />
                  <Bar dataKey="male" name="Male" fill="#3B82F6" stackId="a" />
                  <Bar dataKey="female" name="Female" fill="#EC4899" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Population Stats */}
            <div className="space-y-4">
              <div className="card p-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-300">Population Breakdown</h4>
                <div className="space-y-4">
                  <StatBar 
                    label="Children (0-14)" 
                    value={currentYearData.children} 
                    total={currentYearData.totalPopulation}
                    color="bg-cyan-500"
                  />
                  <StatBar 
                    label="Working Age (15-64)" 
                    value={currentYearData.workingAge} 
                    total={currentYearData.totalPopulation}
                    color="bg-green-500"
                  />
                  <StatBar 
                    label="Elderly (65+)" 
                    value={currentYearData.elderly} 
                    total={currentYearData.totalPopulation}
                    color="bg-amber-500"
                  />
                </div>
              </div>
              
              <div className="card p-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-300">The Challenge</h4>
                <div className="text-gray-400 space-y-3">
                  <p>
                    <span className="text-amber-400 font-semibold">
                      {(currentYearData.workingAge / currentYearData.elderly).toFixed(1)}
                    </span> workers per retiree in {selectedYear}
                  </p>
                  <p className="text-sm">
                    {selectedYear < 2000 && "The golden ratio — each retiree supported by 4+ workers."}
                    {selectedYear >= 2000 && selectedYear < 2020 && "Baby boomers approaching retirement. Ratio declining."}
                    {selectedYear >= 2020 && selectedYear < 2040 && "Baby boom retirement wave in full swing. Pressure mounting."}
                    {selectedYear >= 2040 && "Post-transition: Fewer than 2 workers per retiree. New normal."}
                  </p>
                </div>
              </div>
              
              <div className="card p-6 bg-gradient-to-br from-amber-950/30 to-transparent">
                <h4 className="text-lg font-semibold mb-2 text-amber-400">Birth Rate: {currentYearData.tfr.toFixed(2)}</h4>
                <p className="text-gray-400 text-sm">
                  {currentYearData.tfr >= 2.1 && "At or above replacement level — population can grow naturally."}
                  {currentYearData.tfr >= 1.6 && currentYearData.tfr < 2.1 && "Moderate fertility — slow population decline without immigration."}
                  {currentYearData.tfr >= 1.3 && currentYearData.tfr < 1.6 && "Low fertility — significant population decline ahead."}
                  {currentYearData.tfr < 1.3 && "Very low fertility — rapid population decline and aging."}
                  {' '}Projected {formatCompact(currentYearData.annualBirths)} births this year.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Fiscal Balance Over Time */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">📊</span>
            Fiscal Balance Timeline
          </h3>
          
          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fiscalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF"
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#9CA3AF"
                  tickFormatter={(v) => `€${(v/1000).toFixed(0)}B`}
                  label={{ value: 'Billions EUR', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#F59E0B"
                  tickFormatter={(v) => `${v.toFixed(1)}`}
                  domain={[0, 3]}
                  label={{ value: 'TFR', angle: 90, position: 'insideRight', fill: '#F59E0B' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'Birth Rate (TFR)') return [(value as number).toFixed(2), name];
                    if (name === 'dependencyRatio') return [`${(value as number).toFixed(1)}%`, 'Dependency Ratio'];
                    return [`€${((value as number)/1000).toFixed(1)}B`, name];
                  }}
                />
                <Legend />
                <ReferenceLine yAxisId="left" y={0} stroke="#6B7280" strokeDasharray="3 3" />
                <ReferenceLine yAxisId="right" y={2.1} stroke="#22C55E" strokeDasharray="3 3" />
                <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
                <ReferenceLine x={2024} stroke="#A855F7" strokeDasharray="3 3" />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="contributions"
                  name="Contributions"
                  fill="#22C55E"
                  fillOpacity={0.3}
                  stroke="#22C55E"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="costs"
                  name="State Costs"
                  fill="#EF4444"
                  fillOpacity={0.3}
                  stroke="#EF4444"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="balance"
                  name="Net Balance (base)"
                  stroke="#A855F7"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="gdpAdjustedBalance"
                  name={`With ${(effectiveGrowthRate * 100).toFixed(1)}% GDP growth`}
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tfr"
                  name="Birth Rate (TFR)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <div className="card p-4 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Peak Surplus</div>
              <div className="text-2xl font-bold text-green-400">{summary.peakSurplusYear}</div>
              <div className="text-sm text-gray-400">{formatMillions(summary.peakSurplusAmount)}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wide">First Deficit</div>
              <div className="text-2xl font-bold text-red-400">{summary.firstDeficitYear || 'N/A'}</div>
              <div className="text-sm text-gray-400">when costs exceed contributions</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Cumulative (base)</div>
              <div className={`text-2xl font-bold ${summary.cumulativeBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatMillions(summary.cumulativeBalance)}
              </div>
              <div className="text-sm text-gray-400">1990-2060</div>
            </div>
            <div className="card p-4 text-center bg-purple-950/20">
              <div className="text-sm text-gray-500 uppercase tracking-wide">With GDP Growth</div>
              <div className={`text-2xl font-bold ${summary.gdpAdjustedCumulativeBalance >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                {formatMillions(summary.gdpAdjustedCumulativeBalance)}
              </div>
              <div className="text-sm text-gray-400">{(effectiveGrowthRate * 100).toFixed(1)}%/year</div>
            </div>
          </div>
          
          {/* Breakeven Growth Rate Analysis */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-950/30 to-transparent rounded-lg border border-purple-800/30">
            <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
              🎯 GDP Growth Required to Balance Budget
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Basic breakeven growth (by 2060)</div>
                <div className="text-2xl font-bold text-gray-300">
                  {summary.breakevenGrowthRate 
                    ? `${(summary.breakevenGrowthRate * 100).toFixed(1)}%`
                    : 'N/A'}/year
                </div>
                <div className="text-xs text-gray-600">Required to close deficit gap</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Accounting for fiscal multiplier</div>
                <div className="text-2xl font-bold text-purple-400">
                  {summary.secondOrderEffects?.effectiveGrowthNeeded 
                    ? `${(summary.secondOrderEffects.effectiveGrowthNeeded * 100).toFixed(1)}%`
                    : 'N/A'}/year
                </div>
                <div className="text-xs text-gray-600">Deficit cut reduces GDP by {summary.secondOrderEffects?.gdpReductionIfBalanced.toFixed(1) || '?'}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Your scenario</div>
                <div className={`text-2xl font-bold ${
                  effectiveGrowthRate >= (summary.secondOrderEffects?.effectiveGrowthNeeded || 0)
                    ? 'text-green-400'
                    : 'text-amber-400'
                }`}>
                  {(effectiveGrowthRate * 100).toFixed(1)}%/year
                </div>
                <div className="text-xs text-gray-600">
                  {effectiveGrowthRate >= (summary.secondOrderEffects?.effectiveGrowthNeeded || 0)
                    ? '✓ Potentially sustainable'
                    : '⚠ Below breakeven threshold'}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              <strong>Note:</strong> The fiscal multiplier effect means that cutting government spending (to balance the budget) 
              would itself reduce GDP. This creates a &quot;moving target&quot; — the more you cut, the more the economy shrinks, 
              requiring even higher private sector growth to compensate. Finland&apos;s historical real GDP growth averaged ~1.5%/year.
            </p>
          </div>
        </section>

        {/* Debt Sustainability */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">💳</span>
            Debt Sustainability
          </h3>
          
          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={debtChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis 
                  yAxisId="pct"
                  stroke="#9CA3AF"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  label={{ value: 'Debt/GDP %', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                />
                <YAxis 
                  yAxisId="eur"
                  orientation="right"
                  stroke="#F59E0B"
                  tickFormatter={(v) => `€${(v/1000).toFixed(1)}B`}
                  label={{ value: 'Interest (€B)', angle: 90, position: 'insideRight', fill: '#F59E0B' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'Debt/GDP %') return [`${(value as number).toFixed(1)}%`, name];
                    if (name === 'Interest Expense') return [`€${((value as number)/1000).toFixed(2)}B/year`, name];
                    if (name === 'Primary Balance') return [`€${((value as number)/1000).toFixed(2)}B`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <ReferenceLine yAxisId="pct" y={60} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Maastricht 60%', fontSize: 10, fill: '#F59E0B' }} />
                <ReferenceLine yAxisId="pct" y={100} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '100%', fontSize: 10, fill: '#EF4444' }} />
                <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
                <ReferenceLine x={2024} stroke="#A855F7" strokeDasharray="3 3" />
                <Area
                  yAxisId="pct"
                  type="monotone"
                  dataKey="debtToGDP"
                  name="Debt/GDP %"
                  fill="#DC2626"
                  fillOpacity={0.4}
                  stroke="#DC2626"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="eur"
                  type="monotone"
                  dataKey="interestExpense"
                  name="Interest Expense"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <div className="card p-4 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Current Debt (2024)</div>
              <div className="text-2xl font-bold text-gray-300">€{HISTORICAL_DEBT[2024]}B</div>
              <div className="text-sm text-gray-400">~60% of GDP</div>
            </div>
            <div className="card p-4 text-center bg-red-950/20">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Projected Debt (2060)</div>
              <div className="text-2xl font-bold text-red-400">€{summary.finalDebtStock.toFixed(0)}B</div>
              <div className="text-sm text-gray-400">{summary.finalDebtToGDP.toFixed(0)}% of GDP</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Peak Debt/GDP</div>
              <div className="text-2xl font-bold text-amber-400">{summary.peakDebtToGDP.toFixed(0)}%</div>
              <div className="text-sm text-gray-400">in {summary.peakDebtYear}</div>
            </div>
            <div className="card p-4 text-center bg-rose-950/20">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Total Interest (1990-2060)</div>
              <div className="text-2xl font-bold text-rose-400">{formatMillions(summary.totalInterestPaid)}</div>
              <div className="text-sm text-gray-400">at {(effectiveInterestRate * 100).toFixed(1)}% rate</div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-400">
              <span className="text-rose-400 font-semibold">Interest expense</span> compounds over time as debt accumulates.
              At {(effectiveInterestRate * 100).toFixed(1)}% interest rate, the annual interest burden reaches 
              <span className="text-amber-400 font-semibold"> €{(currentYearData.interestExpense / 1000).toFixed(1)}B </span>
              in {selectedYear}. The <span className="text-red-400 font-semibold">Maastricht criterion</span> (60% debt/GDP) 
              is a benchmark for EU fiscal sustainability.
              {currentYearData.debtToGDP > 100 && (
                <span className="text-red-400"> ⚠️ Debt exceeds 100% of GDP — potential debt sustainability risk.</span>
              )}
            </p>
          </div>
        </section>

        {/* Immigration Fiscal Impact */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">✈️</span>
            Immigration Fiscal Impact
          </h3>
          
          <div className="card p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={immigrationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis 
                  stroke="#9CA3AF"
                  tickFormatter={(v) => `€${(v/1000).toFixed(1)}B`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => formatMillions(value as number)}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
                <Area
                  type="monotone"
                  dataKey="workBased"
                  name="Work-based"
                  stackId="1"
                  fill="#22C55E"
                  stroke="#22C55E"
                />
                <Area
                  type="monotone"
                  dataKey="family"
                  name="Family"
                  stackId="1"
                  fill="#F59E0B"
                  stroke="#F59E0B"
                />
                <Area
                  type="monotone"
                  dataKey="humanitarian"
                  name="Humanitarian"
                  stackId="1"
                  fill="#EF4444"
                  stroke="#EF4444"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Net Impact"
                  stroke="#A855F7"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-400">
              <span className="text-green-400 font-semibold">Work-based</span> immigration typically yields 
              positive fiscal returns due to high employment and income. 
              <span className="text-amber-400 font-semibold"> Family</span> reunification is mixed — 
              includes working-age spouses but also children and elderly.
              <span className="text-red-400 font-semibold"> Humanitarian</span> immigration shows initial 
              fiscal costs but improves over integration years (7-10 years to employment convergence).
            </p>
          </div>
        </section>

        {/* Cost Breakdown */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">💰</span>
            State Cost Breakdown
          </h3>
          
          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis 
                  stroke="#9CA3AF"
                  tickFormatter={(v) => `€${(v/1000).toFixed(0)}B`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `€${((value as number)/1000).toFixed(1)}B`}
                />
                <Legend />
                <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
                <Area
                  type="monotone"
                  dataKey="education"
                  name="Education"
                  stackId="1"
                  fill="#3B82F6"
                  stroke="#3B82F6"
                />
                <Area
                  type="monotone"
                  dataKey="healthcare"
                  name="Healthcare"
                  stackId="1"
                  fill="#10B981"
                  stroke="#10B981"
                />
                <Area
                  type="monotone"
                  dataKey="pensions"
                  name="Pensions"
                  stackId="1"
                  fill="#F59E0B"
                  stroke="#F59E0B"
                />
                <Area
                  type="monotone"
                  dataKey="benefits"
                  name="Benefits"
                  stackId="1"
                  fill="#EF4444"
                  stroke="#EF4444"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Demographic Timeline */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">📈</span>
            Population Composition
          </h3>
          
          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demographicChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis 
                  stroke="#9CA3AF"
                  tickFormatter={(v) => `${v}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `${(value as number).toFixed(2)}M`}
                />
                <Legend />
                <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
                <Area
                  type="monotone"
                  dataKey="children"
                  name="Children (0-14)"
                  stackId="1"
                  fill="#06B6D4"
                  stroke="#06B6D4"
                />
                <Area
                  type="monotone"
                  dataKey="workingAge"
                  name="Working Age (15-64)"
                  stackId="1"
                  fill="#22C55E"
                  stroke="#22C55E"
                />
                <Area
                  type="monotone"
                  dataKey="elderly"
                  name="Elderly (65+)"
                  stackId="1"
                  fill="#F59E0B"
                  stroke="#F59E0B"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Methodology */}
        <section className="mt-12 pt-12 border-t border-gray-800">
          <h2 className="text-2xl font-bold mb-6">Methodology</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">📊 Birth Rate Model</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• Historical TFR from Statistics Finland</li>
                <li>• Linear interpolation to target year</li>
                <li>• TFR converted to births via women 15-49</li>
                <li>• Presets based on international comparisons</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">✈️ Immigration Model</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• Three types: work, family, humanitarian</li>
                <li>• Different age/income distributions</li>
                <li>• Integration curves over 7-10 years</li>
                <li>• ~2% annual emigration rate</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-3">📈 GDP Growth Model</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• Revenues grow with GDP (elasticity ~1.0)</li>
                <li>• Healthcare costs: GDP + 1-2% (Baumol)</li>
                <li>• Pension costs: GDP + 0.5-1%</li>
                <li>• Fiscal multiplier: 0.8 (second-order)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">⚠️ Limitations</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• GDP growth doesn&apos;t include deficit contribution</li>
                <li>• Constant tax/benefit rules (2024)</li>
                <li>• Simplified pension calculation</li>
                <li>• Immigration cohorts start from 1990</li>
              </ul>
            </div>
          </div>
          
          {/* Second-order effects explanation */}
          <div className="mt-8 p-6 bg-gray-900/50 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold text-purple-400 mb-3">🔄 Understanding the Fiscal Multiplier (Second-Order Effects)</h3>
            <p className="text-gray-400 text-sm mb-4">
              The &quot;breakeven GDP growth&quot; calculation accounts for a critical economic feedback loop:
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="text-amber-400 font-semibold mb-1">1. Deficit in GDP</div>
                <p className="text-gray-500">Government deficit spending (G) contributes directly to GDP = C + I + G + (X-M)</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="text-amber-400 font-semibold mb-1">2. Cutting the Deficit</div>
                <p className="text-gray-500">Reducing the deficit removes this GDP contribution, shrinking the economy</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="text-amber-400 font-semibold mb-1">3. Moving Target</div>
                <p className="text-gray-500">Private sector growth must compensate — requiring higher growth than naive calculation suggests</p>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-4">
              Example: If deficit = 3% of GDP and fiscal multiplier = 0.8, eliminating the deficit directly reduces GDP by ~2.4%. 
              To maintain GDP while balancing the budget, private sector activity must grow an additional 2.4% beyond what would otherwise be needed.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

// ===========================================
// Helper Components
// ===========================================

function MetricCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string;
  sublabel: string;
  color: 'amber' | 'blue' | 'green' | 'red' | 'purple';
}) {
  const colorClasses = {
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };
  
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold mono-data ${colorClasses[color]}`}>{value}</div>
      <div className="text-xs text-gray-500">{sublabel}</div>
    </div>
  );
}

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = (value / total) * 100;
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-semibold">
          {formatNumber(value)} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ImmigrationSlider({
  profile,
  value,
  onChange,
  max,
  fiscalImpact,
}: {
  profile: { name: string; emoji: string; color: string; description: string };
  value: number;
  onChange: (value: number) => void;
  max: number;
  fiscalImpact: number;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span>{profile.emoji}</span>
          <span className="text-gray-300 font-medium">{profile.name}</span>
          <span className="text-xs text-gray-600">({profile.description})</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white font-semibold">{formatCompact(value)}/yr</span>
          <span 
            className={`text-sm font-semibold ${fiscalImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {fiscalImpact >= 0 ? '+' : ''}{formatMillions(fiscalImpact)}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: profile.color }}
      />
    </div>
  );
}

function HistoricalReference({
  period,
  currentTotal,
  currentWorkBased,
}: {
  period: {
    label: string;
    years: string;
    total: number;
    workBased: number;
    family: number;
    humanitarian: number;
    description: string;
  };
  currentTotal: number;
  currentWorkBased: number;
}) {
  const diffTotal = ((currentTotal - period.total) / period.total) * 100;
  const diffWorkBased = ((currentWorkBased - period.workBased) / period.workBased) * 100;
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-2">
      <div className="font-medium text-gray-300 mb-1">{period.label}</div>
      <div className="text-gray-500 mb-2">{period.years}</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Total:</span>
          <span className="text-gray-300">{formatCompact(period.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Work:</span>
          <span className="text-green-400">{formatCompact(period.workBased)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Hum:</span>
          <span className="text-red-400">{formatCompact(period.humanitarian)}</span>
        </div>
      </div>
      <div className={`mt-2 pt-2 border-t border-gray-700 text-center ${
        diffTotal >= 0 ? 'text-green-400' : 'text-red-400'
      }`}>
        {diffTotal >= 0 ? '↑' : '↓'} {Math.abs(diffTotal).toFixed(0)}% vs scenario
      </div>
    </div>
  );
}
