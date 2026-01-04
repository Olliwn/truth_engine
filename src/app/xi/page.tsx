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
import { SpendingEfficiencyData, SocialProtectionSubcategory } from '@/lib/types';

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

  const { summary, g10_time_series, subcategories } = data;

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
        </div>
      </section>
    </main>
  );
}
