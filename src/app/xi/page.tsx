'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import { SpendingEfficiencyData, SocialProtectionSubcategory, CostPerBeneficiary, DecompositionEntry, OECDBenchmarkCountry } from '@/lib/types';

// Subcategory colors
const SUBCATEGORY_COLORS: Record<string, string> = {
  G1001: '#3B82F6', // Sickness - blue
  G1002: '#10B981', // Old age - emerald
  G1003: '#8B5CF6', // Survivors - purple
  G1004: '#F59E0B', // Family - amber
  G1005: '#EF4444', // Unemployment - red
  G1006: '#06B6D4', // Housing - cyan
  G1007: '#EC4899', // Social exclusion - pink
  G1008: '#6B7280', // R&D - gray
  G1009: '#9CA3AF', // Other - gray
};

export default function XiPage() {
  const [data, setData] = useState<SpendingEfficiencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<SocialProtectionSubcategory | null>(null);
  const [chartMode, setChartMode] = useState<'gdp' | 'absolute' | 'efficiency'>('gdp');
  const [decompMode, setDecompMode] = useState<'nominal' | 'real' | 'gdp_share'>('real');

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/data/spending_efficiency.json`);
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
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading efficiency data...</p>
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

  const { summary, g10_time_series, subcategories, cost_per_beneficiary, decomposition, oecd_benchmark, decomposition_base_year, inflation_data } = data;

  // Prepare stacked area chart data for subcategories over time (€ Billions)
  const stackedAreaData = g10_time_series.map((entry) => {
    const row: Record<string, number> = { year: entry.year };
    // Add subcategory data for this year
    subcategories.forEach((sub) => {
      const subEntry = sub.time_series.find((ts) => ts.year === entry.year);
      if (subEntry) {
        row[sub.code] = subEntry.total_million / 1000; // billions
      }
    });
    return row;
  });

  // Prepare stacked area chart data for subcategories over time (% of GDP)
  const stackedAreaDataGdp = g10_time_series.map((entry) => {
    const row: Record<string, number> = { year: entry.year, total: entry.total_gdp_pct };
    // Add subcategory data for this year
    subcategories.forEach((sub) => {
      const subEntry = sub.time_series.find((ts) => ts.year === entry.year);
      if (subEntry) {
        row[sub.code] = subEntry.total_gdp_pct;
      }
    });
    return row;
  });

  // Prepare efficiency trend data
  const efficiencyTrendData = g10_time_series.map((entry) => {
    const row: Record<string, number> = { 
      year: entry.year,
      total_efficiency: entry.efficiency_pct,
      total_bureaucracy: entry.bureaucracy_pct,
    };
    // Add subcategory efficiency data
    subcategories.forEach((sub) => {
      const subEntry = sub.time_series.find((ts) => ts.year === entry.year);
      if (subEntry) {
        row[`${sub.code}_eff`] = subEntry.efficiency_pct;
        row[`${sub.code}_bur`] = subEntry.bureaucracy_pct;
      }
    });
    return row;
  });

  // Prepare horizontal bar chart data for latest year
  const latestBarData = subcategories.map((sub) => ({
    name: sub.name.replace(' and ', '/').replace('(pensions)', '').trim(),
    code: sub.code,
    efficiency: sub.efficiency_pct,
    bureaucracy: sub.bureaucracy_pct,
    total: sub.total_million / 1000,
  })).filter(d => d.total > 0.1);

  // Get selected subcategory or default to largest (Old age)
  const displaySub = selectedSub || subcategories[0];

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
            <span className="text-emerald-500">Xi</span> | Social Protection Efficiency
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Social Protection: <span className="text-emerald-400">{summary.efficiency_pct}%</span> Efficient
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Of €{summary.total_billion}B in social spending,{' '}
            <span className="text-emerald-400">€{summary.benefits_billion}B</span> reaches citizens directly.{' '}
            <span className="text-red-400">€{summary.bureaucracy_billion}B</span> goes to administration.
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Total ({summary.year})
              </div>
              <div className="text-3xl font-bold text-white mono-data">
                €{summary.total_billion}B
              </div>
              <div className="text-sm text-gray-500 mt-1">{summary.total_gdp_pct}% of GDP</div>
            </div>

            <div className="card p-6 border-emerald-900/30">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                To Citizens
              </div>
              <div className="text-3xl font-bold text-emerald-400 mono-data">
                {summary.efficiency_pct}%
              </div>
              <div className="text-sm text-gray-500 mt-1">€{summary.benefits_billion}B direct</div>
            </div>

            <div className="card p-6 border-red-900/30">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Bureaucracy
              </div>
              <div className="text-3xl font-bold text-red-400 mono-data">
                {summary.bureaucracy_pct}%
              </div>
              <div className="text-sm text-gray-500 mt-1">€{summary.bureaucracy_billion}B wages</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Best Program
              </div>
              <div className="text-lg font-bold text-white">
                {summary.most_efficient?.name || 'N/A'}
              </div>
              <div className="text-sm text-emerald-400 mt-1">
                {summary.most_efficient?.efficiency_pct}% efficient
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spending Evolution */}
      <section className="py-8 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Spending by Program (1990-{summary.year})</h2>
              <p className="text-gray-400 text-sm">
                How social protection spending has evolved over time
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setChartMode('gdp')}
                className={`px-3 py-1 rounded text-sm ${
                  chartMode === 'gdp' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                % of GDP
              </button>
              <button
                onClick={() => setChartMode('absolute')}
                className={`px-3 py-1 rounded text-sm ${
                  chartMode === 'absolute' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                € Billions
              </button>
              <button
                onClick={() => setChartMode('efficiency')}
                className={`px-3 py-1 rounded text-sm ${
                  chartMode === 'efficiency' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Efficiency %
              </button>
            </div>
          </div>

          <div className="card p-6 h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'gdp' ? (
                <AreaChart data={stackedAreaDataGdp}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="year"
                    stroke="#9CA3AF"
                    tickFormatter={(v) => String(v)}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    domain={[0, 30]}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => {
                      const sub = subcategories.find(s => s.code === name);
                      return value !== undefined ? [`${value.toFixed(1)}% GDP`, sub?.name || name || ''] : ['N/A', ''];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const sub = subcategories.find(s => s.code === value);
                      return sub?.name.split(' ')[0] || value;
                    }}
                  />
                  {subcategories.slice(0, 7).map((sub) => (
                    <Area
                      key={sub.code}
                      type="monotone"
                      dataKey={sub.code}
                      stackId="1"
                      fill={SUBCATEGORY_COLORS[sub.code] || '#6B7280'}
                      stroke={SUBCATEGORY_COLORS[sub.code] || '#6B7280'}
                    />
                  ))}
                </AreaChart>
              ) : chartMode === 'absolute' ? (
                <AreaChart data={stackedAreaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="year"
                    stroke="#9CA3AF"
                    tickFormatter={(v) => String(v)}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={(v: number) => `€${v}B`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => {
                      const sub = subcategories.find(s => s.code === name);
                      return value !== undefined ? [`€${value.toFixed(1)}B`, sub?.name || name || ''] : ['N/A', ''];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const sub = subcategories.find(s => s.code === value);
                      return sub?.name.split(' ')[0] || value;
                    }}
                  />
                  {subcategories.slice(0, 7).map((sub) => (
                    <Area
                      key={sub.code}
                      type="monotone"
                      dataKey={sub.code}
                      stackId="1"
                      fill={SUBCATEGORY_COLORS[sub.code] || '#6B7280'}
                      stroke={SUBCATEGORY_COLORS[sub.code] || '#6B7280'}
                    />
                  ))}
                </AreaChart>
              ) : (
                <LineChart data={efficiencyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="year"
                    stroke="#9CA3AF"
                    tickFormatter={(v) => String(v)}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => {
                      if (value === undefined) return ['N/A', name || ''];
                      if (name === 'total_efficiency') return [`${value.toFixed(1)}%`, 'Total Efficiency'];
                      const code = name?.replace('_eff', '');
                      const sub = subcategories.find(s => s.code === code);
                      return [`${value.toFixed(1)}%`, sub?.name || name || ''];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      if (value === 'total_efficiency') return 'Total G10';
                      const code = value.replace('_eff', '');
                      const sub = subcategories.find(s => s.code === code);
                      return sub?.name.split(' ')[0] || value;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_efficiency"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={false}
                  />
                  {subcategories.slice(0, 5).map((sub) => (
                    <Line
                      key={sub.code}
                      type="monotone"
                      dataKey={`${sub.code}_eff`}
                      stroke={SUBCATEGORY_COLORS[sub.code] || '#6B7280'}
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="3 3"
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Program Comparison */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Program Efficiency Comparison ({summary.year})</h2>
            <p className="text-gray-400 text-sm">
              What percentage of each program reaches citizens?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Bar Chart */}
            <div className="card p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latestBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => 
                      value !== undefined ? [`${value.toFixed(1)}%`, name === 'efficiency' ? 'To Citizens' : 'Bureaucracy'] : ['N/A', '']
                    }
                  />
                  <Legend />
                  <Bar dataKey="efficiency" name="To Citizens" fill="#10B981" />
                  <Bar dataKey="bureaucracy" name="Bureaucracy" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Program Cards */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {subcategories.filter(s => s.total_million > 100).map((sub) => (
                <button
                  key={sub.code}
                  onClick={() => setSelectedSub(selectedSub?.code === sub.code ? null : sub)}
                  className={`w-full card p-3 text-left transition-all ${
                    selectedSub?.code === sub.code
                      ? 'ring-2 ring-emerald-500/50 border-emerald-900/30'
                      : 'hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: SUBCATEGORY_COLORS[sub.code] }}
                      />
                      <span className="font-medium text-sm">{sub.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">€{(sub.total_million / 1000).toFixed(1)}B</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">To Citizens</span>
                        <span className={sub.efficiency_pct > 70 ? 'text-emerald-400' : sub.efficiency_pct > 40 ? 'text-amber-400' : 'text-red-400'}>
                          {sub.efficiency_pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sub.efficiency_pct > 70 ? 'bg-emerald-500' : 
                            sub.efficiency_pct > 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sub.efficiency_pct}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Bureaucracy</span>
                        <span className={sub.bureaucracy_pct < 10 ? 'text-emerald-400' : sub.bureaucracy_pct < 25 ? 'text-amber-400' : 'text-red-400'}>
                          {sub.bureaucracy_pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sub.bureaucracy_pct < 10 ? 'bg-emerald-500' : 
                            sub.bureaucracy_pct < 25 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sub.bureaucracy_pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Selected Program Detail */}
      {displaySub && (
        <section className="py-8 px-6 border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: SUBCATEGORY_COLORS[displaySub.code] }}>
                {displaySub.name} - Deep Dive
              </h2>
              <p className="text-gray-400 text-sm">
                €{(displaySub.total_million / 1000).toFixed(1)}B total |{' '}
                {displaySub.efficiency_pct}% to citizens |{' '}
                {displaySub.bureaucracy_pct}% bureaucracy
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Time series for selected program */}
              <div className="card p-6 h-[350px]">
                <h3 className="text-lg font-semibold mb-4">Efficiency Over Time</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={displaySub.time_series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="year"
                      stroke="#9CA3AF"
                      tickFormatter={(v) => String(v)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        if (value === undefined) return ['N/A', ''];
                        const label = name === 'efficiency_pct' ? 'To Citizens' : 'Bureaucracy';
                        return [`${value.toFixed(1)}%`, label];
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="efficiency_pct"
                      name="To Citizens"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bureaucracy_pct"
                      name="Bureaucracy"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Spending growth */}
              <div className="card p-6 h-[350px]">
                <h3 className="text-lg font-semibold mb-4">Spending Growth</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={displaySub.time_series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="year"
                      stroke="#9CA3AF"
                      tickFormatter={(v) => String(v)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}B`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        if (value === undefined) return ['N/A', ''];
                        const label = name === 'benefits_million' ? 'To Citizens' : 
                                      name === 'bureaucracy_million' ? 'Bureaucracy' : 'Total';
                        return [`€${(value / 1000).toFixed(1)}B`, label];
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="benefits_million"
                      name="To Citizens"
                      fill="#10B981"
                      stroke="#10B981"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="bureaucracy_million"
                      name="Bureaucracy"
                      fill="#EF4444"
                      stroke="#EF4444"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Key Insights */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Key Insights</h2>

          <div className="space-y-6">
            <div className="card p-6 border-emerald-900/30">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">
                Cash Transfers Are Most Efficient
              </h3>
              <p className="text-gray-400">
                <strong className="text-white">Housing assistance (100%)</strong>, <strong className="text-white">survivors (97%)</strong>, 
                and <strong className="text-white">unemployment (95%)</strong> all deliver nearly all funds directly to recipients.
                These are automated cash transfers with minimal administrative overhead.
              </p>
            </div>

            <div className="card p-6 border-amber-900/30">
              <h3 className="text-lg font-semibold text-amber-400 mb-3">
                Service-Based Programs Have Higher Overhead
              </h3>
              <p className="text-gray-400">
                <strong className="text-white">Family/children (48%)</strong> and <strong className="text-white">social exclusion (53%)</strong> 
                show lower efficiency because they include services (daycare, social work) where staff costs are inherent.
                The question: would direct cash transfers achieve better outcomes?
              </p>
            </div>

            <div className="card p-6 border-blue-900/30">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">
                Pensions: The Gold Standard
              </h3>
              <p className="text-gray-400">
                <strong className="text-white">Old age pensions (87%)</strong> deliver €37B directly to retirees with only 7.6% 
                going to administration. This is what efficient government looks like: automated, rules-based, minimal discretion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Per Beneficiary */}
      {cost_per_beneficiary && cost_per_beneficiary.length > 0 && (
        <section className="py-8 px-6 border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Cost Per Beneficiary ({summary.year})</h2>
              <p className="text-gray-400 text-sm">
                How much does each program spend per actual recipient?
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Bar chart */}
              <div className="card p-6 h-[400px]">
                <h3 className="text-lg font-semibold mb-4">Total Spending Per Person</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={cost_per_beneficiary.filter(c => c.total_per_beneficiary > 100)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      type="number" 
                      stroke="#9CA3AF" 
                      tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}K`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#9CA3AF" 
                      width={100} 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.split(' ')[0]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        if (value === undefined) return ['N/A', ''];
                        const label = name === 'total_per_beneficiary' ? 'Total/person' : 'Admin/person';
                        return [`€${value.toLocaleString()}`, label];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total_per_beneficiary" name="Total/person" fill="#3B82F6" />
                    <Bar dataKey="admin_per_beneficiary" name="Admin/person" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Data cards */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {cost_per_beneficiary.filter(c => c.total_per_beneficiary > 100).map((cpb) => (
                  <div key={cpb.code} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: SUBCATEGORY_COLORS[cpb.code] }}
                        />
                        <span className="font-medium text-sm">{cpb.name}</span>
                      </div>
                      <span className="text-gray-500 text-xs">{cpb.beneficiary_label}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-xs text-gray-500">Recipients</div>
                        <div className="font-mono text-sm text-white">
                          {cpb.beneficiary_count >= 1000000 
                            ? `${(cpb.beneficiary_count / 1000000).toFixed(1)}M` 
                            : `${(cpb.beneficiary_count / 1000).toFixed(0)}K`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">€/person</div>
                        <div className="font-mono text-sm text-blue-400">
                          €{cpb.total_per_beneficiary.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Admin/person</div>
                        <div className="font-mono text-sm text-red-400">
                          €{cpb.admin_per_beneficiary.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 card p-4 border-blue-900/30">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">Interpretation</h4>
              <p className="text-gray-400 text-sm">
                <strong className="text-white">Unemployment</strong> spends €20K/recipient because benefits are substantial but recipient count fluctuates.
                <strong className="text-white"> Pensions</strong> at €31K/person reflect lifetime contributions.
                <strong className="text-white"> Family</strong> at €10K/child includes expensive services like daycare.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* International Benchmarking */}
      {oecd_benchmark && (
        <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">International Comparison</h2>
              <p className="text-gray-400 text-sm">
                Finland vs Nordic peers and OECD average (2023 data)
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Total social spending */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Social Spending (% of GDP)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(oecd_benchmark).map(([key, c]) => ({
                      name: c.name,
                      spending: c.social_spending_gdp,
                      isFinland: key === 'finland',
                    }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        type="number" 
                        domain={[0, 35]} 
                        stroke="#9CA3AF" 
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={80} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(1)}% GDP`, 'Social spending'] : ['N/A', '']}
                      />
                      <Bar dataKey="spending">
                        {Object.entries(oecd_benchmark).map(([key]) => (
                          <Cell 
                            key={key}
                            fill={key === 'finland' ? '#10B981' : key === 'oecd_avg' ? '#6B7280' : '#3B82F6'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Admin overhead comparison */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Administrative Overhead (%)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(oecd_benchmark).map(([key, c]) => ({
                      name: c.name,
                      overhead: c.admin_overhead_pct,
                      isFinland: key === 'finland',
                    }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        type="number" 
                        domain={[0, 20]} 
                        stroke="#9CA3AF" 
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={80} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(0)}%`, 'Admin overhead'] : ['N/A', '']}
                      />
                      <Bar dataKey="overhead">
                        {Object.entries(oecd_benchmark).map(([key]) => (
                          <Cell 
                            key={key}
                            fill={key === 'finland' ? '#EF4444' : key === 'oecd_avg' ? '#6B7280' : '#F59E0B'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="mt-6 grid md:grid-cols-3 gap-6">
              <div className="card p-4 border-emerald-900/30">
                <h4 className="text-sm font-semibold text-emerald-400 mb-2">Finland&apos;s Spending</h4>
                <div className="text-2xl font-bold mono-data">{oecd_benchmark.finland?.social_spending_gdp}%</div>
                <p className="text-gray-500 text-xs">of GDP on social protection</p>
              </div>
              <div className="card p-4 border-amber-900/30">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Higher Than OECD</h4>
                <div className="text-2xl font-bold mono-data">
                  +{((oecd_benchmark.finland?.social_spending_gdp || 0) - (oecd_benchmark.oecd_avg?.social_spending_gdp || 0)).toFixed(1)}pp
                </div>
                <p className="text-gray-500 text-xs">above OECD average ({oecd_benchmark.oecd_avg?.social_spending_gdp}%)</p>
              </div>
              <div className="card p-4 border-red-900/30">
                <h4 className="text-sm font-semibold text-red-400 mb-2">Admin Overhead</h4>
                <div className="text-2xl font-bold mono-data">{oecd_benchmark.finland?.admin_overhead_pct}%</div>
                <p className="text-gray-500 text-xs">
                  {(oecd_benchmark.finland?.admin_overhead_pct || 0) > (oecd_benchmark.sweden?.admin_overhead_pct || 0) 
                    ? `Higher than Sweden (${oecd_benchmark.sweden?.admin_overhead_pct}%)`
                    : `Lower than Sweden (${oecd_benchmark.sweden?.admin_overhead_pct}%)`}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Decomposition Analysis */}
      {decomposition && decomposition.length > 0 && (
        <section className="py-8 px-6 border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Spending Growth Decomposition ({decomposition_base_year || 2000}-{summary.year})
                </h2>
                <p className="text-gray-400 text-sm max-w-3xl">
                  Breaking down total spending growth into two components: changes in the <span className="text-blue-400">number of beneficiaries</span> (demographic/economic shifts) 
                  vs changes in <span className="text-amber-400">spending per beneficiary</span> (policy decisions like benefit levels, inflation adjustments, scope expansion).
                </p>
              </div>
              
              {/* Mode toggle */}
              <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setDecompMode('nominal')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    decompMode === 'nominal' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Nominal €
                </button>
                <button
                  onClick={() => setDecompMode('real')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    decompMode === 'real' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Real € (inflation-adj)
                </button>
                <button
                  onClick={() => setDecompMode('gdp_share')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    decompMode === 'gdp_share' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  % of GDP
                </button>
              </div>
            </div>

            {/* Inflation info banner for real mode */}
            {decompMode === 'real' && inflation_data && (
              <div className="mb-4 p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg text-sm">
                <span className="text-purple-400 font-medium">Inflation Adjustment:</span>
                <span className="text-gray-400 ml-2">
                  {decomposition_base_year || 2001} values adjusted to {summary.year} prices 
                  (CPI: {inflation_data.cpi_base_value} → {inflation_data.cpi_latest_value}, 
                  cumulative inflation: +{inflation_data.cumulative_inflation_pct}%)
                </span>
              </div>
            )}

            {/* Two charts side by side: Absolute and Relative % */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Absolute chart (€ or % GDP) */}
              <div className="card p-6 h-[400px]">
                <h3 className="text-lg font-semibold mb-2">
                  {decompMode === 'gdp_share' ? 'GDP Share Change (pp)' : 
                   decompMode === 'real' ? 'Real Growth (€ Billions, 2024 prices)' : 
                   'Nominal Growth (€ Billions)'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {decompMode === 'gdp_share' 
                    ? 'Percentage point change in GDP share'
                    : decompMode === 'real'
                    ? 'Inflation-adjusted € added from baseline'
                    : 'Current € added from baseline (not inflation-adjusted)'}
                </p>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart 
                    data={decomposition.map(d => {
                      if (decompMode === 'gdp_share') {
                        return {
                          name: d.name.split(' ')[0],
                          beneficiary_effect: d.gdp_share?.demographic_effect_pp || 0,
                          cost_effect: d.gdp_share?.policy_effect_pp || 0,
                        };
                      } else if (decompMode === 'real') {
                        return {
                          name: d.name.split(' ')[0],
                          beneficiary_effect: (d.real?.demographic_effect_million || 0) / 1000,
                          cost_effect: (d.real?.policy_effect_million || 0) / 1000,
                        };
                      } else {
                        return {
                          name: d.name.split(' ')[0],
                          beneficiary_effect: (d.nominal?.demographic_effect_million || d.demographic_effect_million) / 1000,
                          cost_effect: (d.nominal?.policy_effect_million || d.policy_effect_million) / 1000,
                        };
                      }
                    })}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      type="number" 
                      stroke="#9CA3AF" 
                      tickFormatter={(v: number) => 
                        decompMode === 'gdp_share' ? `${v.toFixed(1)}pp` : `€${v.toFixed(0)}B`
                      }
                    />
                    <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        if (value === undefined) return ['N/A', ''];
                        const label = name === 'beneficiary_effect' ? 'Δ Beneficiaries' : 'Δ Cost/Person';
                        const sign = value >= 0 ? '+' : '';
                        const unit = decompMode === 'gdp_share' ? 'pp' : 'B';
                        const prefix = decompMode === 'gdp_share' ? '' : '€';
                        return [`${sign}${prefix}${value.toFixed(2)}${unit}`, label];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="beneficiary_effect" name="Δ Beneficiaries" fill="#3B82F6" />
                    <Bar dataKey="cost_effect" name="Δ Cost/Person" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Relative % chart */}
              <div className="card p-6 h-[400px]">
                <h3 className="text-lg font-semibold mb-2">Relative Growth (% of Total Change)</h3>
                <p className="text-xs text-gray-500 mb-4">
                  What share of each program&apos;s growth came from each factor?
                </p>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart 
                    data={decomposition.map(d => {
                      const data = decompMode === 'gdp_share' ? d.gdp_share : 
                                   decompMode === 'real' ? d.real : d.nominal;
                      return {
                        name: d.name.split(' ')[0],
                        beneficiary_pct: data?.demographic_pct || d.demographic_pct,
                        cost_pct: data?.policy_pct || d.policy_pct,
                      };
                    })}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      type="number" 
                      domain={[-100, 200]}
                      stroke="#9CA3AF" 
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        if (value === undefined) return ['N/A', ''];
                        const label = name === 'beneficiary_pct' ? 'Δ Beneficiaries' : 'Δ Cost/Person';
                        const sign = value >= 0 ? '+' : '';
                        return [`${sign}${value.toFixed(0)}%`, label];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="beneficiary_pct" name="Δ Beneficiaries" fill="#3B82F6" />
                    <Bar dataKey="cost_pct" name="Δ Cost/Person" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detail cards with €/person focus */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {decomposition.map((dec) => {
                // Get the appropriate data based on mode
                const nominalData = dec.nominal;
                const realData = dec.real;
                const gdpData = dec.gdp_share;
                
                const costBase = decompMode === 'real' ? realData?.cost_per_ben_base : nominalData?.cost_per_ben_base || dec.cost_per_ben_base;
                const costLatest = decompMode === 'real' ? realData?.cost_per_ben_latest : nominalData?.cost_per_ben_latest || dec.cost_per_ben_latest;
                const costChangePct = decompMode === 'real' ? realData?.cost_per_ben_change_pct : nominalData?.cost_per_ben_change_pct || dec.cost_per_ben_change_pct;
                
                const demoEffect = decompMode === 'gdp_share' 
                  ? gdpData?.demographic_effect_pp || 0
                  : decompMode === 'real' 
                    ? realData?.demographic_effect_million || 0 
                    : nominalData?.demographic_effect_million || dec.demographic_effect_million;
                    
                const policyEffect = decompMode === 'gdp_share'
                  ? gdpData?.policy_effect_pp || 0
                  : decompMode === 'real'
                    ? realData?.policy_effect_million || 0
                    : nominalData?.policy_effect_million || dec.policy_effect_million;
                    
                const totalChange = decompMode === 'gdp_share'
                  ? gdpData?.total_change_pp || 0
                  : decompMode === 'real'
                    ? realData?.total_change_million || 0
                    : nominalData?.total_change_million || dec.total_change_million;
                
                return (
                  <div key={dec.code} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: SUBCATEGORY_COLORS[dec.code] }}
                      />
                      <span className="font-medium text-sm">{dec.name}</span>
                    </div>
                    
                    {/* Cost per person visualization */}
                    {decompMode !== 'gdp_share' && costBase && costLatest && (
                      <div className="bg-gray-800/50 rounded p-3 mb-3">
                        <div className="text-xs text-gray-500 mb-2">
                          Cost per Beneficiary {decompMode === 'real' ? '(real)' : '(nominal)'}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="text-xs text-gray-600">{dec.base_year}</div>
                            <div className="font-mono text-sm text-gray-400">
                              €{(costBase / 1000).toFixed(1)}K
                            </div>
                          </div>
                          <div className="flex-1 mx-3">
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-gray-500 to-amber-500 rounded-full"
                                style={{ width: '100%' }}
                              />
                            </div>
                            <div className="text-center text-xs text-amber-400 mt-1">
                              {costChangePct !== undefined && costChangePct >= 0 ? '+' : ''}{costChangePct?.toFixed(0) || 0}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600">{dec.latest_year}</div>
                            <div className="font-mono text-sm text-amber-400">
                              €{(costLatest / 1000).toFixed(1)}K
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* GDP share view */}
                    {decompMode === 'gdp_share' && gdpData && (
                      <div className="bg-gray-800/50 rounded p-3 mb-3">
                        <div className="text-xs text-gray-500 mb-2">GDP Share</div>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="text-xs text-gray-600">{dec.base_year}</div>
                            <div className="font-mono text-sm text-gray-400">
                              {gdpData.base_pct.toFixed(1)}%
                            </div>
                          </div>
                          <div className="flex-1 mx-3 text-center">
                            <div className={`text-sm font-mono ${gdpData.total_change_pp >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {gdpData.total_change_pp >= 0 ? '+' : ''}{gdpData.total_change_pp.toFixed(2)}pp
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600">{dec.latest_year}</div>
                            <div className="font-mono text-sm text-amber-400">
                              {gdpData.latest_pct.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Growth breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`rounded p-2 ${demoEffect >= 0 ? 'bg-blue-900/20' : 'bg-emerald-900/20'}`}>
                        <div className="text-gray-500">Δ Beneficiaries</div>
                        <div className={`font-mono ${demoEffect >= 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                          {decompMode === 'gdp_share' 
                            ? `${demoEffect >= 0 ? '+' : ''}${demoEffect.toFixed(2)}pp`
                            : `${demoEffect >= 0 ? '+' : ''}€${(demoEffect / 1000).toFixed(1)}B`
                          }
                        </div>
                        <div className="text-gray-600">
                          ({dec.beneficiary_change_pct >= 0 ? '+' : ''}{dec.beneficiary_change_pct.toFixed(0)}% recipients)
                        </div>
                      </div>
                      <div className="bg-amber-900/20 rounded p-2">
                        <div className="text-gray-500">Δ Cost/Person</div>
                        <div className="font-mono text-amber-400">
                          {decompMode === 'gdp_share'
                            ? `${policyEffect >= 0 ? '+' : ''}${policyEffect.toFixed(2)}pp`
                            : `+€${(policyEffect / 1000).toFixed(1)}B`
                          }
                        </div>
                        <div className="text-gray-600">
                          ({decompMode === 'real' ? 'real' : decompMode === 'gdp_share' ? 'GDP-norm' : 'nominal'})
                        </div>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="mt-2 pt-2 border-t border-gray-800 text-center">
                      <span className="text-xs text-gray-500">Total growth: </span>
                      <span className="font-mono text-sm text-emerald-400">
                        {decompMode === 'gdp_share'
                          ? `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}pp`
                          : `+€${(totalChange / 1000).toFixed(1)}B`
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Methodology explanation */}
            <div className="mt-6 card p-6 border-gray-700">
              <h4 className="text-sm font-semibold text-white mb-3">Methodology: What do these terms mean?</h4>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span className="font-medium text-blue-400">Δ Beneficiaries</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Spending change due to <strong className="text-white">more or fewer people</strong> receiving benefits.
                    Formula: (Δ recipient count) × (original cost per person).
                  </p>
                  <ul className="text-gray-500 text-xs mt-2 space-y-1 list-disc list-inside">
                    <li>Old age: More retirees = demographic</li>
                    <li>Unemployment: Economic cycle, not policy</li>
                    <li>Family: Birth rate changes</li>
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-sm bg-amber-500" />
                    <span className="font-medium text-amber-400">Δ Cost/Person</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Spending change due to <strong className="text-white">higher spending per recipient</strong>.
                    Formula: (Δ cost per person) × (current recipient count).
                  </p>
                  <ul className="text-gray-500 text-xs mt-2 space-y-1 list-disc list-inside">
                    <li>Benefit increases (policy decision)</li>
                    <li>Inflation adjustments</li>
                    <li>Scope expansion</li>
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-sm bg-purple-500" />
                    <span className="font-medium text-purple-400">View Modes</span>
                  </div>
                  <ul className="text-gray-400 text-xs space-y-2">
                    <li><strong className="text-white">Nominal €:</strong> Current prices (includes inflation)</li>
                    <li><strong className="text-white">Real €:</strong> Adjusted to {summary.year} prices — shows true purchasing power growth</li>
                    <li><strong className="text-white">% of GDP:</strong> Relative to economy size — shows fiscal burden change</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Key insights */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div className="card p-4 border-blue-900/30">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Beneficiary Changes</h4>
                <p className="text-gray-400 text-sm">
                  <strong className="text-white">Old age</strong>: Aging population drives spending — 80% more retirees since 2001.
                  <strong className="text-white"> Unemployment</strong>: Fewer unemployed reduces costs — but this reflects economic cycles, not policy success.
                  <strong className="text-white"> Family</strong>: Declining birth rate = fewer children needing support.
                </p>
              </div>
              <div className="card p-4 border-amber-900/30">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Policy-Driven Cost Increases</h4>
                <p className="text-gray-400 text-sm">
                  {decompMode === 'real' 
                    ? 'Even after removing inflation, cost per person grew significantly. This is real policy expansion.'
                    : decompMode === 'gdp_share'
                    ? 'Social spending as % of GDP has grown, meaning these programs take a larger share of the economy.'
                    : 'All programs show significant cost-per-person increases. Use "Real €" mode to separate policy changes from inflation.'
                  }
                </p>
              </div>
            </div>

            {/* Future Analysis Note */}
            <div className="mt-6 card p-5 border-rose-900/30 bg-rose-950/10">
              <div className="flex items-start gap-3">
                <div className="text-rose-400 text-xl">🔍</div>
                <div>
                  <h4 className="text-sm font-semibold text-rose-400 mb-2">
                    Future Deep Dive: Why Did Family Benefits Cost/Person Grow &gt;100%?
                  </h4>
                  <p className="text-gray-400 text-sm mb-3">
                    Family &amp; children spending per child has more than doubled since 2001, even as the number of children declined.
                    This is the most dramatic per-capita increase of any social program and warrants deeper investigation.
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="font-medium text-gray-400 mb-1">Potential factors to investigate:</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Expansion of subsidized daycare (päivähoito) — costs shifted from parents to state</li>
                      <li>Introduction/expansion of home care allowance (kotihoidon tuki)</li>
                      <li>Private daycare subsidies (yksityisen hoidon tuki) growth</li>
                      <li>Increased parental leave benefits and duration</li>
                      <li>Child benefit (lapsilisä) increases vs inflation</li>
                      <li>Quality improvements in early childhood education (staff ratios, training)</li>
                      <li>Special needs support and inclusion programs</li>
                    </ul>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600">
                    <strong className="text-gray-500">Data needed:</strong> Breakdown of G1004 by sub-transaction, 
                    daycare enrollment rates, benefit take-up rates, cost per daycare place over time
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Methodology */}
      <section className="py-8 px-6 bg-gray-950/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Methodology</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Efficiency Formula</div>
              <div className="text-gray-300 font-mono text-xs bg-gray-800/50 p-2 rounded">
                Efficiency = (D62K + D632K) / Total
              </div>
              <div className="text-gray-500 mt-2">
                D62K = Cash benefits | D632K = In-kind via private providers
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Bureaucracy Formula</div>
              <div className="text-gray-300 font-mono text-xs bg-gray-800/50 p-2 rounded">
                Bureaucracy = D1K / Total
              </div>
              <div className="text-gray-500 mt-2">
                D1K = Employee compensation (wages + employer contributions)
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Source</div>
              <div className="text-gray-300">Statistics Finland</div>
              <div className="text-gray-500">Table: statfin_jmete_pxt_12a6</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Scope</div>
              <div className="text-gray-300">Social Protection (G10) only</div>
              <div className="text-gray-500">Other categories excluded - efficiency metric not applicable</div>
            </div>
          </div>

          {/* Future Analyses */}
          <div className="mt-8 pt-6 border-t border-gray-800">
            <h4 className="text-md font-semibold mb-4 text-gray-400">Planned Future Analyses</h4>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="card p-4 border-purple-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400 font-semibold">Omicron</span>
                  <span className="text-gray-500 text-xs">• Public vs Private Delivery</span>
                </div>
                <p className="text-gray-400 text-xs mb-2">
                  Compare efficiency when same services are delivered publicly vs privately:
                </p>
                <ul className="text-gray-500 text-xs space-y-1 list-disc list-inside">
                  <li>Daycare: Municipal vs private with Kela subsidy</li>
                  <li>Healthcare: Public hospitals vs private with Kela reimbursement</li>
                  <li>Elderly care: Municipal vs private facilities</li>
                </ul>
                <div className="text-gray-600 text-xs mt-2">
                  Data: statfin_vaka, Regional councils, Kela statistics
                </div>
              </div>
              <div className="card p-4 border-cyan-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-cyan-400 font-semibold">Pi</span>
                  <span className="text-gray-500 text-xs">• Regional Variation</span>
                </div>
                <p className="text-gray-400 text-xs mb-2">
                  Compare spending efficiency across municipalities/regions:
                </p>
                <ul className="text-gray-500 text-xs space-y-1 list-disc list-inside">
                  <li>Same programs, different local administration</li>
                  <li>Control for demographics (age structure, unemployment)</li>
                  <li>Identify best practices (most efficient municipalities)</li>
                </ul>
                <div className="text-gray-600 text-xs mt-2">
                  Data: Municipal finance (Ponzi index), Regional population data
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
