'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';
import {
  simulateLifetime,
  convertProfileToInput,
  PRESET_PROFILES,
  LifetimeProfile,
} from '@/lib/lifetimeSimulator';
import {
  LifetimeSimulationInput,
  LifetimeSimulationResult,
  AnnualFiscalFlow,
  LIFECYCLE_PHASE_COLORS,
  LIFECYCLE_PHASE_LABELS,
  LifecyclePhase,
} from '@/lib/types';
import { PROFILE_ADJUSTMENT_RANGES } from '@/lib/constants/presetProfiles';
import { EDUCATION_TIMELINES, EducationLevel, INCOME_BY_DECILE, DECILE_LABELS } from '@/lib/constants/lifecycleCosts';

// ===========================================
// Helper Functions
// ===========================================

const formatEuro = (amount: number) => {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatEuroCompact = (amount: number) => {
  const absAmount = Math.abs(amount);
  if (absAmount >= 1_000_000) {
    return `€${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 1_000) {
    return `€${(amount / 1_000).toFixed(0)}k`;
  }
  return `€${amount.toFixed(0)}`;
};

// ===========================================
// Main Page Component
// ===========================================

export default function RhoPage() {
  // State for selected profile and customizations
  const [selectedProfileId, setSelectedProfileId] = useState<string>('average_worker');
  const [customizations, setCustomizations] = useState<Partial<LifetimeSimulationInput>>({});
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [chartView, setChartView] = useState<'cumulative' | 'annual' | 'phases'>('cumulative');
  
  // Get base profile
  const baseProfile = useMemo(() => {
    return PRESET_PROFILES.find(p => p.id === selectedProfileId) || PRESET_PROFILES[0];
  }, [selectedProfileId]);
  
  // Create input with customizations
  const simulationInput = useMemo((): LifetimeSimulationInput => {
    const baseInput = convertProfileToInput(baseProfile);
    return { ...baseInput, ...customizations };
  }, [baseProfile, customizations]);
  
  // Run simulation
  const simulationResult = useMemo(() => {
    return simulateLifetime(simulationInput);
  }, [simulationInput]);
  
  // Handle profile selection
  const handleProfileSelect = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
    setCustomizations({}); // Reset customizations
  }, []);
  
  // Handle parameter change
  const handleParamChange = useCallback((key: keyof LifetimeSimulationInput, value: number | string) => {
    setCustomizations(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Prepare chart data
  const chartData = useMemo(() => {
    return simulationResult.annualFlows.map(flow => ({
      age: flow.age,
      contributions: flow.contributions.totalContributions,
      stateCosts: -flow.stateCosts.totalStateCosts, // Negative for stacking below zero
      netFlow: flow.netFlow,
      cumulativeNet: flow.cumulativeNetFlow,
      phase: flow.phase,
      // Detailed breakdowns
      incomeTax: flow.contributions.incomeTax + flow.contributions.municipalTax,
      socialInsurance: flow.contributions.pensionContribution + 
        flow.contributions.unemploymentInsurance + flow.contributions.healthInsurance,
      vat: flow.contributions.vatPaid,
      education: -flow.stateCosts.educationCost,
      healthcare: -flow.stateCosts.healthcareCost,
      benefits: -(flow.stateCosts.childBenefitReceived + flow.stateCosts.housingAllowance + 
        flow.stateCosts.socialAssistance + flow.stateCosts.unemploymentBenefit + 
        flow.stateCosts.studentAid + flow.stateCosts.parentalAllowance),
      pension: -flow.stateCosts.pensionReceived,
    }));
  }, [simulationResult]);
  
  // Calculate key insight
  const { summary } = simulationResult;
  const isNetContributor = summary.netLifetimeContribution > 0;
  
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back</span>
          </Link>

          <h1 className="text-lg font-semibold">
            <span className="text-teal-400">Rho</span> | Lifetime Fiscal Simulator
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gradient-to-b from-teal-950/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Your <span className="text-teal-400">Lifetime</span> Fiscal Impact
              </h2>
              <p className="text-xl text-gray-400 mb-6">
                Simulate how different life paths affect Finland&apos;s finances. 
                From childhood education to retirement pension — see the complete picture.
              </p>
              
              {/* Key stat highlight */}
              <div className={`card p-6 ${isNetContributor ? 'bg-teal-950/20 border-teal-900/30' : 'bg-red-950/20 border-red-900/30'}`}>
                <div className="text-sm text-gray-400 mb-2">
                  Lifetime Net Contribution as &quot;{baseProfile.name}&quot;:
                </div>
                <div className={`text-4xl font-bold mb-2 ${isNetContributor ? 'text-teal-400' : 'text-red-400'}`}>
                  {formatEuroCompact(summary.netLifetimeContribution)}
                </div>
                <div className="text-sm text-gray-500">
                  {isNetContributor 
                    ? `✓ Net contributor from age ${summary.breakEvenAge || 'never'}`
                    : `⚠ Net recipient — peak debt at age ${summary.peakDebtAge}`}
                </div>
              </div>
            </div>

            {/* Quick result cards */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Total Contributions"
                value={formatEuroCompact(summary.totalContributions)}
                subtext="taxes + social insurance + VAT"
                color="text-green-400"
              />
              <StatCard
                label="Total State Costs"
                value={formatEuroCompact(summary.totalStateCosts)}
                subtext="education + healthcare + benefits"
                color="text-red-400"
              />
              <StatCard
                label="Break-even Age"
                value={summary.breakEvenAge ? `${summary.breakEvenAge} years` : 'Never'}
                subtext="when cumulative turns positive"
                color="text-amber-400"
              />
              <StatCard
                label="Fiscal Return"
                value={`${(summary.fiscalReturnRatio * 100).toFixed(0)}%`}
                subtext="contributions / state costs"
                color="text-cyan-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Controls sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile selector */}
            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-4">Select Profile</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {PRESET_PROFILES.map(profile => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isSelected={selectedProfileId === profile.id}
                    onClick={() => handleProfileSelect(profile.id)}
                  />
                ))}
              </div>
            </div>

            {/* Parameter adjustments */}
            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-4">Customize Parameters</h3>
              <div className="space-y-4">
                <ParamSlider
                  label="Income Decile"
                  value={simulationInput.incomeDecile}
                  min={1}
                  max={10}
                  step={1}
                  formatValue={(v) => `D${v} (€${Math.round(INCOME_BY_DECILE[v] / 1000)}k)`}
                  onChange={(v) => handleParamChange('incomeDecile', v)}
                />
                <ParamSlider
                  label="Retirement Age"
                  value={simulationInput.retirementAge}
                  min={55}
                  max={70}
                  step={1}
                  formatValue={(v) => `${v} years`}
                  onChange={(v) => handleParamChange('retirementAge', v)}
                />
                <ParamSlider
                  label="Unemployment Years"
                  value={simulationInput.lifetimeUnemploymentYears}
                  min={0}
                  max={20}
                  step={0.5}
                  formatValue={(v) => `${v} years`}
                  onChange={(v) => handleParamChange('lifetimeUnemploymentYears', v)}
                />
                <ParamSlider
                  label="Children"
                  value={simulationInput.numberOfChildren}
                  min={0}
                  max={5}
                  step={1}
                  formatValue={(v) => `${v}`}
                  onChange={(v) => handleParamChange('numberOfChildren', v)}
                />
                <ParamSlider
                  label="Life Expectancy"
                  value={simulationInput.lifeExpectancy}
                  min={65}
                  max={95}
                  step={1}
                  formatValue={(v) => `${v} years`}
                  onChange={(v) => handleParamChange('lifeExpectancy', v)}
                />
              </div>
            </div>
          </div>

          {/* Chart area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Chart view selector */}
            <div className="flex gap-2 mb-4">
              <ChartViewButton
                active={chartView === 'cumulative'}
                onClick={() => setChartView('cumulative')}
              >
                Cumulative
              </ChartViewButton>
              <ChartViewButton
                active={chartView === 'annual'}
                onClick={() => setChartView('annual')}
              >
                Annual Flows
              </ChartViewButton>
              <ChartViewButton
                active={chartView === 'phases'}
                onClick={() => setChartView('phases')}
              >
                By Category
              </ChartViewButton>
            </div>
            
            {/* Main Chart */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">
                {chartView === 'cumulative' && 'Cumulative Net Position Over Lifetime'}
                {chartView === 'annual' && 'Annual Contributions vs State Costs'}
                {chartView === 'phases' && 'Breakdown by Category'}
              </h3>
              
              <div className="h-[450px]">
                {chartView === 'cumulative' && (
                  <CumulativeChart data={chartData} breakEvenAge={summary.breakEvenAge} />
                )}
                {chartView === 'annual' && (
                  <AnnualFlowChart data={chartData} />
                )}
                {chartView === 'phases' && (
                  <CategoryBreakdownChart data={chartData} />
                )}
              </div>
            </div>

            {/* Summary breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contributions breakdown */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <span>💰</span> Lifetime Contributions
                </h3>
                <div className="space-y-3 text-sm">
                  <BreakdownRow 
                    label="Income Tax" 
                    value={summary.totalIncomeTaxPaid} 
                    total={summary.totalContributions}
                    color="bg-green-500"
                  />
                  <BreakdownRow 
                    label="Social Insurance" 
                    value={summary.totalSocialInsurancePaid} 
                    total={summary.totalContributions}
                    color="bg-emerald-500"
                  />
                  <BreakdownRow 
                    label="VAT (estimated)" 
                    value={summary.totalVatPaid} 
                    total={summary.totalContributions}
                    color="bg-teal-500"
                  />
                  <div className="pt-3 border-t border-gray-800 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-green-400">{formatEuro(summary.totalContributions)}</span>
                  </div>
                </div>
              </div>

              {/* State costs breakdown */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <span>🏛️</span> Lifetime State Costs
                </h3>
                <div className="space-y-3 text-sm">
                  <BreakdownRow 
                    label="Education" 
                    value={summary.totalEducationCost} 
                    total={summary.totalStateCosts}
                    color="bg-orange-500"
                  />
                  <BreakdownRow 
                    label="Healthcare" 
                    value={summary.totalHealthcareCost} 
                    total={summary.totalStateCosts}
                    color="bg-red-500"
                  />
                  <BreakdownRow 
                    label="Benefits & Transfers" 
                    value={summary.totalBenefitsReceived} 
                    total={summary.totalStateCosts}
                    color="bg-amber-500"
                  />
                  <BreakdownRow 
                    label="Pension" 
                    value={summary.totalPensionReceived} 
                    total={summary.totalStateCosts}
                    color="bg-blue-500"
                  />
                  <div className="pt-3 border-t border-gray-800 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-red-400">{formatEuro(summary.totalStateCosts)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed breakdown (collapsible) */}
        <section className="mt-8">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
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
              className={`transform transition-transform ${showBreakdown ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span className="text-lg font-semibold">
              Year-by-Year Breakdown ({simulationResult.annualFlows.length} years)
            </span>
          </button>
          
          {showBreakdown && (
            <YearByYearTable flows={simulationResult.annualFlows} />
          )}
        </section>

        {/* Methodology */}
        <section className="mt-12 pt-12 border-t border-gray-800">
          <h2 className="text-2xl font-bold mb-6">Understanding the Simulation</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-teal-400 mb-3">Contributions Include</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li className="flex gap-2">
                  <span className="text-green-400">•</span>
                  <span>Income tax (national + municipal)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">•</span>
                  <span>Social insurance (pension, unemployment, health)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">•</span>
                  <span>VAT on consumption (~18% blended rate)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">•</span>
                  <span>Indirect corporate tax (as employee)</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-3">State Costs Include</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li className="flex gap-2">
                  <span className="text-red-400">•</span>
                  <span>Education (daycare €13k/yr, school €10k/yr)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">•</span>
                  <span>Healthcare (U-curve: €8k infant, €1.5k adult, €20k+ elderly)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">•</span>
                  <span>Benefits (child benefit, housing, unemployment)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">•</span>
                  <span>Pension (accrued 1.5-4.5% of annual earnings)</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">Key Assumptions</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>2024 tax & benefit rules throughout</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>No inflation adjustment (nominal values)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Individual-only costs (children tracked separately)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>NPV uses 3% discount rate</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Data Sources</h4>
            <p className="text-sm text-gray-500">
              Education costs from Ministry of Education (OKM), healthcare costs from THL,
              tax rates from Vero.fi, pension rules from ETK, benefit amounts from Kela.
              This is a simplified model for illustration — actual fiscal impact depends on
              many factors not captured here.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

// ===========================================
// Sub-components
// ===========================================

function StatCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

function ProfileCard({
  profile,
  isSelected,
  onClick,
}: {
  profile: LifetimeProfile;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-teal-950/30 border-teal-500'
          : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{profile.emoji}</span>
        <div>
          <div className="font-medium text-sm">{profile.name}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{profile.description}</div>
        </div>
      </div>
    </button>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-mono">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
      />
    </div>
  );
}

function ChartViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-teal-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function BreakdownRow({
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
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono">{formatEuroCompact(value)}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ===========================================
// Chart Components
// ===========================================

interface ChartDataPoint {
  age: number;
  contributions: number;
  stateCosts: number;
  netFlow: number;
  cumulativeNet: number;
  phase: LifecyclePhase;
  incomeTax: number;
  socialInsurance: number;
  vat: number;
  education: number;
  healthcare: number;
  benefits: number;
  pension: number;
}

function CumulativeChart({ 
  data, 
  breakEvenAge 
}: { 
  data: ChartDataPoint[]; 
  breakEvenAge: number | null;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="age" 
          stroke="#9CA3AF"
          label={{ value: 'Age', position: 'bottom', fill: '#9CA3AF' }}
        />
        <YAxis 
          stroke="#9CA3AF"
          tickFormatter={(v) => formatEuroCompact(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          formatter={(value) => formatEuro(value as number)}
          labelFormatter={(age) => `Age ${age}`}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
        {breakEvenAge && (
          <ReferenceLine 
            x={breakEvenAge} 
            stroke="#14B8A6" 
            strokeDasharray="5 5"
            label={{ value: `Break-even: ${breakEvenAge}`, fill: '#14B8A6', position: 'top' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="cumulativeNet"
          stroke="#14B8A6"
          fill="#14B8A6"
          fillOpacity={0.3}
          name="Cumulative Net"
        />
        <Line
          type="monotone"
          dataKey="cumulativeNet"
          stroke="#14B8A6"
          strokeWidth={2}
          dot={false}
          name="Cumulative Position"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function AnnualFlowChart({ data }: { data: ChartDataPoint[] }) {
  // Transform data for colored net flow bars
  const chartData = data.map(d => ({
    ...d,
    positiveFlow: d.netFlow > 0 ? d.netFlow : 0,
    negativeFlow: d.netFlow < 0 ? d.netFlow : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="age" 
          stroke="#9CA3AF"
          label={{ value: 'Age', position: 'bottom', fill: '#9CA3AF' }}
        />
        <YAxis 
          stroke="#9CA3AF"
          tickFormatter={(v) => formatEuroCompact(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm">
                <div className="font-semibold mb-2">Age {label}</div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-green-400">Contributions:</span>
                    <span className="font-mono">{formatEuro(d.contributions)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-red-400">State Costs:</span>
                    <span className="font-mono">{formatEuro(Math.abs(d.stateCosts))}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-1 mt-1 flex justify-between gap-4">
                    <span className={d.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}>Net Flow:</span>
                    <span className="font-mono">{d.netFlow >= 0 ? '+' : ''}{formatEuro(d.netFlow)}</span>
                  </div>
                </div>
              </div>
            );
          }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
        <Bar dataKey="positiveFlow" fill="#22C55E" name="Net Contributor" />
        <Bar dataKey="negativeFlow" fill="#EF4444" name="Net Recipient" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CategoryBreakdownChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <defs>
          <linearGradient id="colorEducation" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#F97316" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorHealthcare" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorBenefits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorPension" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorTax" x1="0" y1="1" x2="0" y2="0">
            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorSocial" x1="0" y1="1" x2="0" y2="0">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorVat" x1="0" y1="1" x2="0" y2="0">
            <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.2}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="age" 
          stroke="#9CA3AF"
          label={{ value: 'Age', position: 'bottom', fill: '#9CA3AF' }}
        />
        <YAxis 
          stroke="#9CA3AF"
          tickFormatter={(v) => formatEuroCompact(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          formatter={(value, name) => [formatEuro(Math.abs(value as number)), name]}
          labelFormatter={(age) => `Age ${age}`}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
        {/* State Costs (negative values - stack below zero) */}
        <Area type="monotone" dataKey="education" stackId="costs" stroke="#F97316" fill="url(#colorEducation)" name="Education" />
        <Area type="monotone" dataKey="healthcare" stackId="costs" stroke="#EF4444" fill="url(#colorHealthcare)" name="Healthcare" />
        <Area type="monotone" dataKey="benefits" stackId="costs" stroke="#F59E0B" fill="url(#colorBenefits)" name="Benefits" />
        <Area type="monotone" dataKey="pension" stackId="costs" stroke="#3B82F6" fill="url(#colorPension)" name="Pension" />
        {/* Contributions (positive values - stack above zero) */}
        <Area type="monotone" dataKey="incomeTax" stackId="contrib" stroke="#22C55E" fill="url(#colorTax)" name="Income Tax" />
        <Area type="monotone" dataKey="socialInsurance" stackId="contrib" stroke="#10B981" fill="url(#colorSocial)" name="Social Insurance" />
        <Area type="monotone" dataKey="vat" stackId="contrib" stroke="#14B8A6" fill="url(#colorVat)" name="VAT" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ===========================================
// Year-by-Year Table
// ===========================================

function YearByYearTable({ flows }: { flows: AnnualFiscalFlow[] }) {
  const [filter, setFilter] = useState<LifecyclePhase | 'all'>('all');
  
  const filteredFlows = filter === 'all' 
    ? flows 
    : flows.filter(f => f.phase === filter);
  
  return (
    <div className="card overflow-hidden">
      {/* Filter */}
      <div className="p-4 border-b border-gray-800 flex gap-2 flex-wrap">
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton>
        {Object.keys(LIFECYCLE_PHASE_LABELS).map(phase => (
          <FilterButton
            key={phase}
            active={filter === phase}
            onClick={() => setFilter(phase as LifecyclePhase)}
          >
            {LIFECYCLE_PHASE_LABELS[phase as LifecyclePhase]}
          </FilterButton>
        ))}
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Age</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Phase</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Gross Income</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Contributions</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">State Costs</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Net Flow</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Cumulative</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredFlows.map(flow => (
              <tr key={flow.age} className="hover:bg-gray-900/50">
                <td className="px-4 py-2 font-mono">{flow.age}</td>
                <td className="px-4 py-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ 
                      backgroundColor: `${LIFECYCLE_PHASE_COLORS[flow.phase]}20`,
                      color: LIFECYCLE_PHASE_COLORS[flow.phase],
                    }}
                  >
                    {LIFECYCLE_PHASE_LABELS[flow.phase]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {formatEuroCompact(flow.grossIncome)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-green-400">
                  {formatEuroCompact(flow.contributions.totalContributions)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-red-400">
                  {formatEuroCompact(flow.stateCosts.totalStateCosts)}
                </td>
                <td className={`px-4 py-2 text-right font-mono ${
                  flow.netFlow >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {flow.netFlow >= 0 ? '+' : ''}{formatEuroCompact(flow.netFlow)}
                </td>
                <td className={`px-4 py-2 text-right font-mono ${
                  flow.cumulativeNetFlow >= 0 ? 'text-teal-400' : 'text-amber-400'
                }`}>
                  {formatEuroCompact(flow.cumulativeNetFlow)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-teal-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

