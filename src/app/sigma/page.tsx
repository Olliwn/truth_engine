'use client';

import { useState, useMemo, useEffect } from 'react';
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
  simulatePopulationYear,
  getPopulationPyramidData,
  AnnualPopulationResult,
} from '@/lib/populationSimulator';

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

// ===========================================
// Main Component
// ===========================================

export default function SigmaPage() {
  const [selectedYear, setSelectedYear] = useState(2024);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Run simulation once on mount
  const simulationResult = useMemo(() => 
    simulatePopulationRange(1990, 2060), []
  );
  
  const currentYearData = useMemo(() => 
    simulatePopulationYear(selectedYear), [selectedYear]
  );
  
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
  
  const { annualResults, summary } = simulationResult;
  
  // Prepare chart data
  const fiscalChartData = annualResults.map(r => ({
    year: r.year,
    contributions: r.totalContributions,
    costs: r.totalStateCosts,
    balance: r.netFiscalBalance,
    dependencyRatio: r.oldAgeDependencyRatio,
  }));
  
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
  
  // Pyramid chart data (horizontal bar chart style)
  const pyramidChartData = pyramidData
    .filter((_, i) => i % 5 === 0) // Every 5 years for readability
    .map(d => ({
      age: `${d.age}`,
      male: -d.male / 1000, // Negative for left side
      female: d.female / 1000,
    }));
  
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
            The baby boom generation is retiring. Watch how Finland&apos;s population structure 
            transforms from 1990 to 2060 — and what it means for fiscal sustainability.
          </p>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
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
              label="Annual Fiscal Balance"
              value={formatMillions(currentYearData.netFiscalBalance)}
              sublabel={currentYearData.netFiscalBalance >= 0 ? 'surplus' : 'deficit'}
              color={currentYearData.netFiscalBalance >= 0 ? 'green' : 'red'}
            />
            <MetricCard
              label="Retirees"
              value={`${(currentYearData.elderly / 1000000).toFixed(2)}M`}
              sublabel={`age 65+ in ${selectedYear}`}
              color="purple"
            />
          </div>
        </div>
      </section>

      {/* Year Slider */}
      <section className="py-8 px-6 bg-gray-900/50">
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
                <h4 className="text-lg font-semibold mb-2 text-amber-400">Key Cohort</h4>
                <p className="text-gray-400 text-sm">
                  The <span className="text-white font-semibold">1947 baby boom cohort</span> (108,000 births) 
                  turns <span className="text-amber-400 font-semibold">{selectedYear - 1947}</span> in {selectedYear}.
                  {selectedYear >= 2012 && selectedYear < 2030 && " They're now retired and drawing pensions."}
                  {selectedYear >= 2030 && " Most have passed, but the fiscal legacy remains."}
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
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 80]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'dependencyRatio') return [`${(value as number).toFixed(1)}%`, 'Dependency Ratio'];
                    return [`€${((value as number)/1000).toFixed(1)}B`, name];
                  }}
                />
                <Legend />
                <ReferenceLine yAxisId="left" y={0} stroke="#6B7280" strokeDasharray="3 3" />
                <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
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
                  name="Net Balance"
                  stroke="#A855F7"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="dependencyRatio"
                  name="Dependency Ratio"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mt-6">
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
              <div className="text-sm text-gray-500 uppercase tracking-wide">Cumulative 1990-2060</div>
              <div className={`text-2xl font-bold ${summary.cumulativeBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatMillions(summary.cumulativeBalance)}
              </div>
              <div className="text-sm text-gray-400">total balance</div>
            </div>
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
          
          <div className="mt-6 p-4 bg-amber-950/30 rounded-lg border border-amber-800/50">
            <h4 className="font-semibold text-amber-400 mb-2">📈 The Pension Tsunami</h4>
            <p className="text-gray-400 text-sm">
              Watch the orange (pensions) area grow as baby boomers retire. By 2040, pension costs 
              dominate the budget, while education costs (blue) shrink due to fewer children. 
              Healthcare (green) also rises as the population ages.
            </p>
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
          
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">📊 Demographics</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• Birth cohorts from Finnish statistics (1945-2025)</li>
                <li>• Mortality tables applied to age each cohort</li>
                <li>• No migration adjustment (simplification)</li>
                <li>• Future births projected at ~43,000/year</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">💶 Fiscal Model</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• 10 income deciles (each = 10% of population)</li>
                <li>• Age-based income curves per decile</li>
                <li>• Real Finnish tax calculator</li>
                <li>• Education/healthcare costs from official data</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">⚠️ Limitations</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• No productivity growth assumed</li>
                <li>• Constant tax/benefit rules (2024)</li>
                <li>• Ignores debt interest costs</li>
                <li>• Simplified pension calculation</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Data Sources</h4>
            <p className="text-sm text-gray-500">
              Population data from Statistics Finland. Fiscal calculations use the same models as 
              the individual lifetime simulator (Rho). This macro view shows why the micro view 
              (&quot;most people are net recipients&quot;) has worked historically — but won&apos;t continue to work
              as demographics invert.
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
    <div className="card p-6">
      <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-4xl font-bold mono-data ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-gray-500 mt-1">{sublabel}</div>
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

