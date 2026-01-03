'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
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
  Bar,
} from 'recharts';
import { WorkforceProjectionData } from '@/lib/types';

export default function MuPage() {
  const [data, setData] = useState<WorkforceProjectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/data/workforce_projection.json`);
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
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading workforce projections...</p>
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

  const { summary, time_series, metadata } = data;

  // Separate historical and projected data
  const historicalData = time_series.filter((d) => !d.is_projection);
  const projectedData = time_series.filter((d) => d.is_projection);

  // Prepare participation rate chart data
  const participationData = historicalData.map((d) => ({
    year: d.year,
    participation_rate: d.participation_rate,
    employed: d.total_employed / 1_000_000,
    working_age: d.working_age_population / 1_000_000,
  }));

  // Prepare demographic chart data (all years)
  const demographicData = time_series.map((d) => ({
    year: d.year,
    working_age: d.working_age_population / 1_000_000,
    elderly: d.elderly_population / 1_000_000,
    is_projection: d.is_projection,
  }));

  // Prepare scenario comparison data
  const scenarioData = projectedData.map((d) => ({
    year: d.year,
    static: d.scenarios?.static.ratio || 0,
    aging_driven: d.scenarios?.aging_driven.ratio || 0,
    efficiency: d.scenarios?.efficiency.ratio || 0,
  }));

  // Add 2023 baseline to scenario data
  const baseline2023 = historicalData[historicalData.length - 1];
  if (baseline2023 && baseline2023.current_ratio) {
    scenarioData.unshift({
      year: baseline2023.year,
      static: baseline2023.current_ratio,
      aging_driven: baseline2023.current_ratio,
      efficiency: baseline2023.current_ratio,
    });
  }

  // Prepare public/private ratio trend
  const ratioTrendData = historicalData.map((d) => ({
    year: d.year,
    ratio: d.current_ratio || 0,
  }));

  // Calculate key metrics
  const latestHistorical = historicalData[historicalData.length - 1];
  const firstHistorical = historicalData[0];
  const final2040 = projectedData.find((d) => d.year === 2040);

  const elderlyGrowth = summary.elderly_change_pct;
  const workingAgeChange = summary.working_age_change_pct;

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
            <span className="text-cyan-500">Mu</span> | Workforce Futures
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-cyan-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The <span className="text-cyan-400">Shrinking Workforce</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            How will Finland&apos;s aging population impact the workforce? Projections to 2040 show 
            diverging futures based on policy choices.
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <StatCard
              label="Participation Rate"
              value={`${summary.current_participation_rate.toFixed(0)}%`}
              subtext="employed / working-age"
              color="text-cyan-400"
            />
            <StatCard
              label="Working Age (2040)"
              value={`${workingAgeChange > 0 ? '+' : ''}${workingAgeChange.toFixed(0)}%`}
              subtext="vs 2023"
              color={workingAgeChange >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <StatCard
              label="Elderly (2040)"
              value={`+${elderlyGrowth.toFixed(0)}%`}
              subtext="vs 2023"
              color="text-amber-400"
            />
            <StatCard
              label="2040 Aging Scenario"
              value={`${(summary.scenario_2040.aging_driven_ratio * 100).toFixed(0)}%`}
              subtext="public/private ratio"
              color="text-red-400"
            />
          </div>
        </div>
      </section>

      {/* Participation Rate Section */}
      <section className="py-12 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              Workforce Participation Rate <span className="text-cyan-400">(2007-2023)</span>
            </h2>
            <p className="text-gray-400 text-sm">
              What fraction of working-age population (20-64) is actually employed?
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 card p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={participationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" stroke="#9CA3AF" />
                  <YAxis
                    yAxisId="left"
                    stroke="#9CA3AF"
                    domain={[60, 80]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `${v}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="participation_rate"
                    stroke="#06B6D4"
                    strokeWidth={3}
                    name="Participation Rate (%)"
                    dot={false}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="employed"
                    fill="#22C55E"
                    fillOpacity={0.5}
                    name="Employed (millions)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <div className="card p-4">
                <div className="text-xs text-gray-500 uppercase mb-1">2007 Rate</div>
                <div className="text-2xl font-bold text-gray-400 mono-data">
                  {firstHistorical?.participation_rate.toFixed(1)}%
                </div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-gray-500 uppercase mb-1">2023 Rate</div>
                <div className="text-2xl font-bold text-cyan-400 mono-data">
                  {latestHistorical?.participation_rate.toFixed(1)}%
                </div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-gray-500 uppercase mb-1">2009 Crisis Dip</div>
                <div className="text-2xl font-bold text-red-400 mono-data">
                  {historicalData.find((d) => d.year === 2009)?.participation_rate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Financial crisis impact</div>
              </div>
              <div className="card p-4 border-cyan-900/30 bg-cyan-950/10">
                <div className="text-sm text-gray-400">
                  Participation rate recovered post-2009 but structural changes 
                  in public/private mix continued.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demographic Cliff Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-gray-900/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              The Demographic <span className="text-amber-400">Cliff</span>
            </h2>
            <p className="text-gray-400 text-sm">
              Working-age vs elderly population (millions) — projected to 2040
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demographicData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(v) => `${v}M`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(2)}M`, ''] : ['', '']}
                />
                <Legend />
                <ReferenceLine x={2023} stroke="#6B7280" strokeDasharray="3 3" label={{ value: '← Historical | Projected →', fill: '#9CA3AF', fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="working_age"
                  stackId="1"
                  stroke="#06B6D4"
                  fill="#06B6D4"
                  fillOpacity={0.6}
                  name="Working Age (20-64)"
                />
                <Area
                  type="monotone"
                  dataKey="elderly"
                  stackId="1"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.6}
                  name="Elderly (65+)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">Working Age 2023</div>
              <div className="text-xl font-bold text-cyan-400 mono-data">
                {(summary.current_working_age / 1_000_000).toFixed(2)}M
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">Working Age 2040</div>
              <div className="text-xl font-bold text-cyan-400 mono-data">
                {(summary.projected_working_age_2040 / 1_000_000).toFixed(2)}M
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">Elderly 2023</div>
              <div className="text-xl font-bold text-amber-400 mono-data">
                {(summary.current_elderly / 1_000_000).toFixed(2)}M
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">Elderly 2040</div>
              <div className="text-xl font-bold text-amber-400 mono-data">
                {(summary.projected_elderly_2040 / 1_000_000).toFixed(2)}M
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Scenarios Section */}
      <section className="py-12 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              Three <span className="text-cyan-400">Futures</span>
            </h2>
            <p className="text-gray-400 text-sm">
              Public sector / Private sector worker ratio under different policy scenarios
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scenarioData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis
                  stroke="#9CA3AF"
                  domain={[0.3, 0.55]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? [`${(value * 100).toFixed(1)}%`, ''] : ['', '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#22C55E"
                  strokeWidth={3}
                  name="Efficiency (-1%/year public)"
                  dot={{ fill: '#22C55E', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="static"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  name="Static (no change)"
                  dot={{ fill: '#F59E0B', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="aging_driven"
                  stroke="#EF4444"
                  strokeWidth={3}
                  name="Aging-Driven (healthcare grows)"
                  dot={{ fill: '#EF4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario explanation cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="card p-6 border-green-900/30 bg-green-950/10">
              <h4 className="text-lg font-semibold text-green-400 mb-2">
                Efficiency Scenario
              </h4>
              <div className="text-3xl font-bold text-green-400 mb-2 mono-data">
                {(summary.scenario_2040.efficiency_ratio * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-gray-400">
                {metadata.scenarios.efficiency}
              </p>
              <div className="text-xs text-gray-500 mt-3">
                Result: More workers in market-funded jobs, lower tax burden
              </div>
            </div>

            <div className="card p-6 border-amber-900/30 bg-amber-950/10">
              <h4 className="text-lg font-semibold text-amber-400 mb-2">
                Static Scenario
              </h4>
              <div className="text-3xl font-bold text-amber-400 mb-2 mono-data">
                {(summary.scenario_2040.static_ratio * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-gray-400">
                {metadata.scenarios.static}
              </p>
              <div className="text-xs text-gray-500 mt-3">
                Result: Current balance maintained, but aging pressure builds
              </div>
            </div>

            <div className="card p-6 border-red-900/30 bg-red-950/10">
              <h4 className="text-lg font-semibold text-red-400 mb-2">
                Aging-Driven Scenario
              </h4>
              <div className="text-3xl font-bold text-red-400 mb-2 mono-data">
                {(summary.scenario_2040.aging_driven_ratio * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-gray-400">
                {metadata.scenarios.aging_driven}
              </p>
              <div className="text-xs text-gray-500 mt-3">
                Result: Healthcare sector expands, market sector shrinks relatively
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Historical Ratio Trend */}
      <section className="py-12 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              Historical <span className="text-cyan-400">Public/Private Ratio</span>
            </h2>
            <p className="text-gray-400 text-sm">
              How the balance between public and private sector employment has shifted
            </p>
          </div>

          <div className="card p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ratioTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis
                  stroke="#9CA3AF"
                  domain={[0.35, 0.45]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? [`${(value * 100).toFixed(1)}%`, 'Public/Private Ratio'] : ['', '']}
                />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  stroke="#06B6D4"
                  strokeWidth={3}
                  dot={{ fill: '#06B6D4', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">2007 Ratio</div>
              <div className="text-2xl font-bold text-gray-400 mono-data">
                {((firstHistorical?.current_ratio || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">2023 Ratio</div>
              <div className="text-2xl font-bold text-cyan-400 mono-data">
                {((latestHistorical?.current_ratio || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">Change</div>
              <div className="text-2xl font-bold text-red-400 mono-data">
                +{(((latestHistorical?.current_ratio || 0) - (firstHistorical?.current_ratio || 0)) * 100).toFixed(1)}pp
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Insight */}
      <section className="py-8 px-6 bg-cyan-950/10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-lg md:text-xl text-gray-300 italic">
            &ldquo;{summary.key_insight}&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Methodology</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Data Sources</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• Population: Statistics Finland (historical 2007-2023)</li>
                <li>• Employment: Statistics Finland Table 115i</li>
                <li>• Projections: Trend-based extrapolation (no immigration assumption)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Scenario Assumptions</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• <strong>Static:</strong> 2023 public/private split maintained</li>
                <li>• <strong>Aging:</strong> Healthcare grows with 65+ population</li>
                <li>• <strong>Efficiency:</strong> Public sector shrinks 1%/year</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Projection Approach</h4>
            <p className="text-sm text-gray-400">
              Projections extrapolate the 2007-2023 historical trend with acceleration 
              factor for working-age decline (reflecting smaller cohorts entering, larger 
              cohorts exiting). Does <strong>not</strong> assume net immigration. With significant 
              immigration, outcomes could differ. Participation rates assumed constant.
            </p>
          </div>
        </div>
      </section>

      {/* Data Sources Footer */}
      <section className="py-8 px-6 bg-gray-950/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Data Sources</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Historical Population</div>
              <div className="text-gray-300">Statistics Finland</div>
              <div className="text-gray-500">Working-age and elderly 2007-2023</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Employment by Sector</div>
              <div className="text-gray-300">Statistics Finland, Table 115i</div>
              <div className="text-gray-500">Public vs private employment</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Population Projections</div>
              <div className="text-gray-300">Trend Extrapolation</div>
              <div className="text-gray-500">Based on 2007-2023 decline rate</div>
            </div>
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

