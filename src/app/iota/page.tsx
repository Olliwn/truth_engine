'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import { FertilityData, CorrelationFactor } from '@/lib/types';

// Color palette for factors
const FACTOR_COLORS: Record<string, string> = {
  age_first_birth: '#F59E0B',
  marriage_age: '#8B5CF6',
  female_tertiary_edu: '#06B6D4',
  female_labor_25_44: '#10B981',
  family_spending: '#EF4444',
  housing_index: '#F97316',
  wage_index: '#6366F1',
  singles_ratio_25_34: '#EC4899',
};

export default function IotaPage() {
  const [data, setData] = useState<FertilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFactors, setSelectedFactors] = useState<string[]>(['age_first_birth', 'female_tertiary_edu']);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/data/fertility.json`);
        if (response.ok) {
          setData(await response.json());
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading fertility data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load data</p>
          <Link href="/" className="text-blue-400 hover:underline">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  const { summary, time_series, metadata, correlation_factors, tfr_normalized } = data;

  // Filter to modern era (1950+) for main chart
  const modernData = time_series.filter((y) => y.year >= 1950 && y.tfr !== null);
  
  // Recent data (1990+) for detailed view
  const recentData = time_series.filter((y) => y.year >= 1990 && y.tfr !== null);

  // Prepare chart data
  const chartData = modernData.map((entry) => ({
    year: entry.year,
    tfr: entry.tfr,
    replacement: metadata.replacement_level,
    gap: entry.replacement_gap,
  }));

  const recentChartData = recentData.map((entry) => ({
    year: entry.year,
    tfr: entry.tfr,
    replacement: metadata.replacement_level,
  }));

  // Key milestones
  const tfr1990 = time_series.find((y) => y.year === 1990)?.tfr || 0;
  const tfr2010 = time_series.find((y) => y.year === 2010)?.tfr || 0;
  const currentTFR = summary.current_tfr;

  // Correlation data for bar chart
  const correlationBarData = correlation_factors?.map((f) => ({
    name: f.name,
    id: f.id,
    correlation: f.correlation,
    fill: f.correlation < 0 ? '#EF4444' : '#22C55E',
  })) || [];

  // Prepare normalized trends data for overlay chart
  const trendData = tfr_normalized?.map((tfr) => {
    const point: Record<string, number | null> = {
      year: tfr.year,
      tfr: tfr.normalized,
    };
    
    // Add selected factors
    selectedFactors.forEach((factorId) => {
      const factor = correlation_factors?.find((f) => f.id === factorId);
      const factorPoint = factor?.time_series.find((p) => p.year === tfr.year);
      point[factorId] = factorPoint?.normalized ?? null;
    });
    
    return point;
  }) || [];

  // Toggle factor selection
  const toggleFactor = (factorId: string) => {
    setSelectedFactors((prev) =>
      prev.includes(factorId)
        ? prev.filter((f) => f !== factorId)
        : [...prev, factorId]
    );
  };

  // Prepare scatter data for each factor
  const getScatterData = (factor: CorrelationFactor) => {
    return factor.time_series
      .filter((p) => p.value !== null)
      .map((p) => {
        const tfrEntry = time_series.find((t) => t.year === p.year);
        return {
          x: p.value,
          y: tfrEntry?.tfr ?? null,
          year: p.year,
        };
      })
      .filter((p) => p.y !== null);
  };

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
            <span className="text-pink-500">Iota</span> | The Fertility Equation
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-pink-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The <span className="text-pink-400">Fertility</span> Collapse
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Finland has one of the world&apos;s most generous parental leave policies. So why is
            the birth rate at historic lows?
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Current Fertility Rate
              </div>
              <div className="text-4xl font-bold text-red-400 mono-data">{currentTFR.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-1">
                children per woman ({time_series[time_series.length - 1]?.year})
              </div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Replacement Level
              </div>
              <div className="text-4xl font-bold text-green-400 mono-data">
                {metadata.replacement_level.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500 mt-1">needed for stable population</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Below Replacement Since
              </div>
              <div className="text-4xl font-bold text-amber-400 mono-data">
                {summary.below_replacement_since || 'N/A'}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {summary.below_replacement_since
                  ? `${new Date().getFullYear() - summary.below_replacement_since} years`
                  : ''}
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard
              label="1990 TFR"
              value={tfr1990.toFixed(2)}
              color="text-gray-400"
            />
            <StatCard
              label="2010 TFR"
              value={tfr2010.toFixed(2)}
              subtext={`${((tfr2010 - tfr1990) * 100 / tfr1990).toFixed(0)}% vs 1990`}
              color="text-amber-400"
            />
            <StatCard
              label="Change Since 1990"
              value={`${summary.tfr_change_since_1990 && summary.tfr_change_since_1990 > 0 ? '+' : ''}${summary.tfr_change_since_1990?.toFixed(2) || 'N/A'}`}
              color="text-red-400"
            />
            <StatCard
              label="Historic Peak"
              value={summary.peak_tfr.toFixed(2)}
              subtext={summary.peak_year.toString()}
              color="text-purple-400"
            />
          </div>
        </div>
      </section>

      {/* Correlation Analysis Section */}
      {correlation_factors && correlation_factors.length > 0 && (
        <section className="py-8 px-6 border-b border-gray-800 bg-gradient-to-b from-gray-950/50 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Correlation Analysis</h2>
              <p className="text-gray-400 text-sm">
                Statistical correlations between fertility rate and socioeconomic factors (1990-2024).
                <span className="text-amber-400 ml-2">Note: Correlation ≠ causation.</span>
              </p>
            </div>

            {/* Correlation Coefficient Bar Chart */}
            <div className="card p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Correlation Coefficients with TFR</h3>
              <p className="text-gray-500 text-sm mb-4">
                Pearson r: -1 (perfect inverse) to +1 (perfect positive). All factors show negative correlation — 
                as each increases, fertility decreases.
              </p>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={correlationBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      type="number"
                      domain={[-1, 0.5]}
                      stroke="#9CA3AF"
                      tickFormatter={(v) => v.toFixed(1)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#9CA3AF"
                      width={160}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined) =>
                        value !== undefined
                          ? [`r = ${value.toFixed(3)}`, 'Correlation']
                          : ['N/A', 'Correlation']
                      }
                    />
                    <ReferenceLine x={0} stroke="#6B7280" />
                    <Bar dataKey="correlation" name="Correlation">
                      {correlationBarData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.correlation < 0 ? '#EF4444' : '#22C55E'}
                          fillOpacity={Math.abs(entry.correlation)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-gray-500 text-xs mt-3">
                Strongest correlation: <span className="text-red-400">{correlation_factors[0]?.name}</span> (r = {correlation_factors[0]?.correlation.toFixed(3)})
              </p>
            </div>

            {/* Normalized Trends Chart */}
            <div className="card p-6 mb-8">
              <h3 className="text-lg font-semibold mb-2">Factor Trends vs Fertility (Normalized 0-100)</h3>
              <p className="text-gray-500 text-sm mb-4">
                All values scaled to 0-100 for comparison. Click factors below to toggle visibility.
              </p>
              
              {/* Factor toggles */}
              <div className="flex flex-wrap gap-2 mb-4">
                {correlation_factors.map((factor) => (
                  <button
                    key={factor.id}
                    onClick={() => toggleFactor(factor.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all text-white ${
                      selectedFactors.includes(factor.id)
                        ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white/50'
                        : 'opacity-50 hover:opacity-75'
                    }`}
                    style={{
                      backgroundColor: FACTOR_COLORS[factor.id] || '#6B7280',
                    }}
                  >
                    {factor.name}
                  </button>
                ))}
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined) =>
                        value !== undefined ? value.toFixed(1) : 'N/A'
                      }
                    />
                    <Legend />
                    {/* TFR line always shown */}
                    <Line
                      type="monotone"
                      dataKey="tfr"
                      stroke="#EC4899"
                      strokeWidth={3}
                      name="Fertility Rate"
                      dot={false}
                    />
                    {/* Selected factor lines */}
                    {selectedFactors.map((factorId) => {
                      const factor = correlation_factors.find((f) => f.id === factorId);
                      return (
                        <Line
                          key={factorId}
                          type="monotone"
                          dataKey={factorId}
                          stroke={FACTOR_COLORS[factorId] || '#6B7280'}
                          strokeWidth={2}
                          name={factor?.name || factorId}
                          dot={false}
                          strokeDasharray={factorId.includes('spending') ? '5 5' : undefined}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-gray-500 text-xs mt-3">
                Pink line = TFR. As factor values rise (especially education, age at first birth), fertility falls.
              </p>
            </div>

            {/* Scatter Plots Grid */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">TFR vs Each Factor (Scatter Plots)</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {correlation_factors.slice(0, 8).map((factor) => {
                  const scatterData = getScatterData(factor);
                  return (
                    <div key={factor.id} className="card p-4">
                      <div className="text-sm font-medium text-gray-300 mb-1">{factor.name}</div>
                      <div className="text-xs text-gray-500 mb-2">r = {factor.correlation.toFixed(3)}</div>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                              type="number"
                              dataKey="x"
                              stroke="#6B7280"
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v) => v.toFixed(0)}
                            />
                            <YAxis
                              type="number"
                              dataKey="y"
                              stroke="#6B7280"
                              tick={{ fontSize: 10 }}
                              domain={[1, 2]}
                              tickFormatter={(v) => v.toFixed(1)}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number | undefined, name: string | undefined) =>
                                value !== undefined
                                  ? [value.toFixed(2), name === 'x' ? factor.name : 'TFR']
                                  : ['N/A', 'Value']
                              }
                              labelFormatter={(label) => `Year: ${label}`}
                            />
                            <Scatter
                              data={scatterData}
                              fill={FACTOR_COLORS[factor.id] || '#EC4899'}
                              fillOpacity={0.7}
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key Insight Box */}
            <div className="card p-6 border-amber-900/50 bg-amber-950/10">
              <h4 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <span>⚠️</span> Interpreting the Data
              </h4>
              <div className="text-gray-400 space-y-3">
                <p>
                  <strong className="text-white">All measured factors show negative correlation</strong> with fertility.
                  As female education increases, workforce participation rises, marriage delays, and housing costs grow — 
                  fertility declines. Even family benefit spending shows negative correlation (more spending, fewer babies).
                </p>
                <p>
                  <strong className="text-amber-400">Important:</strong> This does NOT prove causation. These factors are 
                  interrelated and may all be symptoms of broader societal changes. The data suggests that generous 
                  family policies alone don&apos;t boost birth rates when other structural factors push against family formation.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Long-term Fertility Chart */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Total Fertility Rate: 1950-Present</h2>
            <p className="text-gray-400 text-sm">
              Average number of children a woman would have over her lifetime
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={[0, 4]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => Number(value).toFixed(2)}
                />
                <Legend />
                <ReferenceLine
                  y={metadata.replacement_level}
                  stroke="#22C55E"
                  strokeDasharray="5 5"
                  label={{
                    value: 'Replacement (2.1)',
                    fill: '#22C55E',
                    position: 'right',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tfr"
                  stroke="#EC4899"
                  fill="#EC4899"
                  fillOpacity={0.3}
                  name="Total Fertility Rate"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent Decline Chart */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">The Recent Collapse (1990-Present)</h2>
            <p className="text-gray-400 text-sm">
              Fertility has fallen despite increasing family support spending
            </p>
          </div>

          <div className="card p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={[1, 2.5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => Number(value).toFixed(2)}
                />
                <Legend />
                <ReferenceLine
                  y={metadata.replacement_level}
                  stroke="#22C55E"
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="tfr"
                  stroke="#EC4899"
                  strokeWidth={3}
                  name="Total Fertility Rate"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* The Paradox */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The Nordic Paradox</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card p-6 border-green-900/30">
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">✅</span> What Finland Provides
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">→</span>
                  <span>Up to 14 months paid parental leave</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">→</span>
                  <span>Free healthcare including prenatal care</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">→</span>
                  <span>Subsidized childcare (~€300/month max)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">→</span>
                  <span>Child benefits (€100+/month per child)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">→</span>
                  <span>Free education through university</span>
                </li>
              </ul>
            </div>

            <div className="card p-6 border-red-900/30">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">❌</span> The Results
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>TFR dropped from 1.78 (1990) to {currentTFR.toFixed(2)}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>One of lowest in Finnish recorded history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>Lower than most European countries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>Accelerating decline since 2010</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>Population set to decline without immigration</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Implications */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Why This Matters</h2>

          <div className="card p-6 border-red-900/50">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-red-400 mb-2">Pension Crisis</h4>
                <p className="text-gray-400 text-sm">
                  Fewer workers will pay for more retirees. The pension system becomes
                  mathematically unsustainable.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-red-400 mb-2">Economic Decline</h4>
                <p className="text-gray-400 text-sm">
                  Shrinking workforce means less innovation, lower GDP growth, and reduced
                  international competitiveness.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-red-400 mb-2">Cultural Shift</h4>
                <p className="text-gray-400 text-sm">
                  Without domestic population growth, Finland relies entirely on immigration
                  to maintain population — with unknown cultural consequences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-8 px-6 bg-gray-950/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Methodology & Data Sources</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm mb-6">
            <div>
              <div className="text-gray-500 mb-1">Total Fertility Rate</div>
              <div className="text-gray-300">Statistics Finland, Table 12dt</div>
              <div className="text-gray-500">TFR 1776-2024</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Female Workforce Participation</div>
              <div className="text-gray-300">Statistics Finland, Table 135y</div>
              <div className="text-gray-500">Labor force rate, ages 25-44</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Education Levels</div>
              <div className="text-gray-300">Statistics Finland, Table 12bq</div>
              <div className="text-gray-500">Tertiary education attainment</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Age at First Birth / Marriage</div>
              <div className="text-gray-300">Statistics Finland publications</div>
              <div className="text-gray-500">Estimated from official reports</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Housing & Wages</div>
              <div className="text-gray-300">Statistics Finland indices</div>
              <div className="text-gray-500">Estimated from official reports</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Statistical Method</div>
              <div className="text-gray-300">Pearson correlation coefficient</div>
              <div className="text-gray-500">Calculated over overlapping years</div>
            </div>
          </div>

          <div className="card p-4 border-amber-900/30 bg-amber-950/10">
            <p className="text-gray-400 text-sm">
              <strong className="text-amber-400">Disclaimer:</strong> This analysis presents statistical correlations 
              only. Correlation does not establish causation. Fertility is influenced by complex, interconnected 
              factors that cannot be reduced to simple cause-effect relationships. Data for some factors uses 
              estimates from official publications where direct API access was unavailable.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

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
    <div className="card p-4 text-center">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-bold mono-data ${color}`}>{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}
