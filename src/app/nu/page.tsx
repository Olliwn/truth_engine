'use client';

import { useState, useEffect } from 'react';
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
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Treemap,
} from 'recharts';
import { PublicSpendingData, SpendingCategory } from '@/lib/types';

// COFOG category colors
const COFOG_COLORS: Record<string, string> = {
  G10: '#EF4444', // Social protection - red
  G07: '#3B82F6', // Health - blue
  G01: '#6B7280', // General public services - gray
  G09: '#8B5CF6', // Education - purple
  G04: '#F59E0B', // Economic affairs - amber
  G08: '#EC4899', // Recreation, culture - pink
  G02: '#10B981', // Defence - green
  G03: '#06B6D4', // Public order - cyan
  G06: '#F97316', // Housing - orange
  G05: '#22C55E', // Environment - emerald
};

export default function NuPage() {
  const [data, setData] = useState<PublicSpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<SpendingCategory | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/data/public_spending.json`);
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
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading spending data...</p>
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

  const { summary, by_function, by_sector, time_series } = data;

  // Prepare stacked area chart data (absolute EUR billions)
  const areaChartData = time_series.map((entry) => {
    const row: Record<string, number> = { year: entry.year };
    Object.entries(entry.categories).forEach(([code, cat]) => {
      row[code] = cat.amount_million / 1000; // Convert to billions
    });
    return row;
  });

  // Prepare stacked area chart data (% of GDP)
  const areaChartDataPctGdp = time_series.map((entry) => {
    const row: Record<string, number> = { year: entry.year, total: entry.total_pct_gdp };
    Object.entries(entry.categories).forEach(([code, cat]) => {
      row[code] = cat.pct_of_gdp;
    });
    return row;
  });

  // Prepare treemap data
  const treemapData = by_function.map((cat) => ({
    name: cat.name,
    code: cat.code,
    size: cat.amount_million,
    pct: Math.round(cat.amount_million / (summary.total_spending_billion * 1000) * 100),
    fill: COFOG_COLORS[cat.code] || '#6B7280',
  }));

  // Prepare pie chart data for sector breakdown
  const sectorData = [
    { name: 'Central Govt', value: by_sector.central.amount_million, fill: '#3B82F6' },
    { name: 'Local Govt', value: by_sector.local.amount_million, fill: '#10B981' },
    { name: 'Social Security', value: by_sector.social_security.amount_million, fill: '#F59E0B' },
  ];

  // Custom treemap content
  const TreemapContent = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    pct?: number;
    fill?: string;
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, name, pct, fill } = props;
    
    if (width < 50 || height < 30) return null;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          fillOpacity={0.85}
          stroke="#1F2937"
          strokeWidth={2}
        />
        {width > 80 && height > 40 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 8}
              textAnchor="middle"
              fill="white"
              fontSize={12}
              fontWeight="bold"
            >
              {name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="white"
              fontSize={14}
              fontWeight="bold"
            >
              {pct}%
            </text>
          </>
        )}
      </g>
    );
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
            <span className="text-indigo-500">Nu</span> | Public Spending Structure
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-indigo-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Where Your <span className="text-indigo-400">€{summary.per_capita.toLocaleString()}</span> Goes
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Finnish government spends €{summary.total_spending_billion}B annually —{' '}
            {summary.pct_of_gdp}% of GDP. Here&apos;s the breakdown.
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Total Spending ({summary.year})
              </div>
              <div className="text-3xl font-bold text-indigo-400 mono-data">
                €{summary.total_spending_billion}B
              </div>
              <div className="text-sm text-gray-500 mt-1">{summary.pct_of_gdp}% of GDP</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Per Capita
              </div>
              <div className="text-3xl font-bold text-green-400 mono-data">
                €{summary.per_capita.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-1">per person annually</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Largest Category
              </div>
              <div className="text-2xl font-bold text-red-400">
                {summary.largest_category}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                €{summary.largest_category_billion}B ({summary.largest_category_pct}%)
              </div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Fastest Growing
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {summary.fastest_growing}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                +{summary.fastest_growing_pct}% since {summary.comparison_year}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Treemap Section */}
      <section className="py-8 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Budget Breakdown by Function</h2>
            <p className="text-gray-400 text-sm">
              COFOG classification — area proportional to spending amount
            </p>
          </div>

          <div className="card p-6 h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#1F2937"
                content={<TreemapContent />}
              />
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            {by_function.map((cat) => (
              <button
                key={cat.code}
                onClick={() => setSelectedCategory(selectedCategory?.code === cat.code ? null : cat)}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  selectedCategory?.code === cat.code
                    ? 'bg-gray-700 ring-2 ring-white/30'
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: COFOG_COLORS[cat.code] || '#6B7280' }}
                />
                <span className="text-xs text-gray-300 truncate">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category Detail (if selected) */}
      {selectedCategory && (
        <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: COFOG_COLORS[selectedCategory.code] }}>
                  {selectedCategory.name}
                </h2>
                <p className="text-gray-400 text-sm">
                  €{(selectedCategory.amount_million / 1000).toFixed(1)}B total |{' '}
                  {selectedCategory.pct_of_gdp}% of GDP |{' '}
                  €{selectedCategory.per_capita.toLocaleString()} per capita
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            {selectedCategory.subcategories && selectedCategory.subcategories.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedCategory.subcategories.map((sub) => (
                  <div key={sub.code} className="card p-4">
                    <div className="text-sm text-gray-400 mb-1">{sub.name}</div>
                    <div className="text-xl font-bold text-white">
                      €{(sub.amount_million / 1000).toFixed(2)}B
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {sub.pct_of_gdp}% of GDP • €{sub.per_capita.toLocaleString()}/capita
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Stacked Area Chart */}
      <section className="py-8 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Spending Evolution (1990-{summary.year})</h2>
            <p className="text-gray-400 text-sm">
              How each category&apos;s share has changed over time (€ billions, current prices)
            </p>
          </div>

          <div className="card p-6 h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData}>
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
                    const catName = name ? (data.cofog_names[name] || name) : '';
                    return value !== undefined ? [`€${value.toFixed(1)}B`, catName] : ['N/A', catName];
                  }}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <Legend
                  formatter={(value: string | undefined) => value ? (data.cofog_names[value] || value) : ''}
                />
                {/* Stack areas from largest to smallest */}
                <Area type="monotone" dataKey="G10" stackId="1" fill={COFOG_COLORS.G10} stroke={COFOG_COLORS.G10} name="G10" />
                <Area type="monotone" dataKey="G07" stackId="1" fill={COFOG_COLORS.G07} stroke={COFOG_COLORS.G07} name="G07" />
                <Area type="monotone" dataKey="G01" stackId="1" fill={COFOG_COLORS.G01} stroke={COFOG_COLORS.G01} name="G01" />
                <Area type="monotone" dataKey="G09" stackId="1" fill={COFOG_COLORS.G09} stroke={COFOG_COLORS.G09} name="G09" />
                <Area type="monotone" dataKey="G04" stackId="1" fill={COFOG_COLORS.G04} stroke={COFOG_COLORS.G04} name="G04" />
                <Area type="monotone" dataKey="G08" stackId="1" fill={COFOG_COLORS.G08} stroke={COFOG_COLORS.G08} name="G08" />
                <Area type="monotone" dataKey="G02" stackId="1" fill={COFOG_COLORS.G02} stroke={COFOG_COLORS.G02} name="G02" />
                <Area type="monotone" dataKey="G03" stackId="1" fill={COFOG_COLORS.G03} stroke={COFOG_COLORS.G03} name="G03" />
                <Area type="monotone" dataKey="G06" stackId="1" fill={COFOG_COLORS.G06} stroke={COFOG_COLORS.G06} name="G06" />
                <Area type="monotone" dataKey="G05" stackId="1" fill={COFOG_COLORS.G05} stroke={COFOG_COLORS.G05} name="G05" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Note: Values in current prices (not inflation-adjusted). See GDP share chart below for real burden.
          </p>
        </div>
      </section>

      {/* Stacked Area Chart - % of GDP */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Spending as % of GDP (1990-{summary.year})</h2>
            <p className="text-gray-400 text-sm">
              Real burden on the economy — inflation-adjusted view of government spending share
            </p>
          </div>

          <div className="card p-6 h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartDataPctGdp}>
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
                  tickFormatter={(v: number) => `${v}%`}
                  domain={[0, 70]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    const catName = name ? (data.cofog_names[name] || name) : '';
                    return value !== undefined ? [`${value.toFixed(1)}%`, catName] : ['N/A', catName];
                  }}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <Legend
                  formatter={(value: string | undefined) => value ? (data.cofog_names[value] || value) : ''}
                />
                {/* Stack areas from largest to smallest */}
                <Area type="monotone" dataKey="G10" stackId="1" fill={COFOG_COLORS.G10} stroke={COFOG_COLORS.G10} name="G10" />
                <Area type="monotone" dataKey="G07" stackId="1" fill={COFOG_COLORS.G07} stroke={COFOG_COLORS.G07} name="G07" />
                <Area type="monotone" dataKey="G01" stackId="1" fill={COFOG_COLORS.G01} stroke={COFOG_COLORS.G01} name="G01" />
                <Area type="monotone" dataKey="G09" stackId="1" fill={COFOG_COLORS.G09} stroke={COFOG_COLORS.G09} name="G09" />
                <Area type="monotone" dataKey="G04" stackId="1" fill={COFOG_COLORS.G04} stroke={COFOG_COLORS.G04} name="G04" />
                <Area type="monotone" dataKey="G08" stackId="1" fill={COFOG_COLORS.G08} stroke={COFOG_COLORS.G08} name="G08" />
                <Area type="monotone" dataKey="G02" stackId="1" fill={COFOG_COLORS.G02} stroke={COFOG_COLORS.G02} name="G02" />
                <Area type="monotone" dataKey="G03" stackId="1" fill={COFOG_COLORS.G03} stroke={COFOG_COLORS.G03} name="G03" />
                <Area type="monotone" dataKey="G06" stackId="1" fill={COFOG_COLORS.G06} stroke={COFOG_COLORS.G06} name="G06" />
                <Area type="monotone" dataKey="G05" stackId="1" fill={COFOG_COLORS.G05} stroke={COFOG_COLORS.G05} name="G05" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Total: {areaChartDataPctGdp[0]?.total.toFixed(1)}% (1990) → {areaChartDataPctGdp[areaChartDataPctGdp.length - 1]?.total.toFixed(1)}% ({summary.year})
          </p>
        </div>
      </section>

      {/* Sector Breakdown */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Who Spends It?</h2>
            <p className="text-gray-400 text-sm">
              Breakdown by government sector
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <div className="card p-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => 
                      `${name || ''}: ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`
                    }
                    labelLine={false}
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined) =>
                      value !== undefined ? `€${(value / 1000).toFixed(1)}B` : 'N/A'
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Sector Cards */}
            <div className="space-y-4">
              <div className="card p-6 border-blue-900/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  <h3 className="text-lg font-semibold text-blue-400">Central Government</h3>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  €{(by_sector.central.amount_million / 1000).toFixed(1)}B
                </div>
                <p className="text-gray-400 text-sm">
                  Ministries, agencies, national programs. {by_sector.central.pct_of_gdp}% of GDP.
                </p>
              </div>

              <div className="card p-6 border-green-900/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <h3 className="text-lg font-semibold text-green-400">Local Government</h3>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  €{(by_sector.local.amount_million / 1000).toFixed(1)}B
                </div>
                <p className="text-gray-400 text-sm">
                  Municipalities, wellbeing services counties. {by_sector.local.pct_of_gdp}% of GDP.
                </p>
              </div>

              <div className="card p-6 border-amber-900/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-4 h-4 bg-amber-500 rounded" />
                  <h3 className="text-lg font-semibold text-amber-400">Social Security Funds</h3>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  €{(by_sector.social_security.amount_million / 1000).toFixed(1)}B
                </div>
                <p className="text-gray-400 text-sm">
                  Kela, pension funds, unemployment insurance. {by_sector.social_security.pct_of_gdp}% of GDP.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Bar Chart */}
      <section className="py-8 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Spending by Category ({summary.year})</h2>
            <p className="text-gray-400 text-sm">
              COFOG functional classification — € billions
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_function} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}B`}
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
                    value !== undefined ? [`€${(value / 1000).toFixed(1)}B`, 'Amount'] : ['N/A', 'Amount']
                  }
                />
                <Bar dataKey="amount_million" name="Spending">
                  {by_function.map((entry) => (
                    <Cell key={entry.code} fill={COFOG_COLORS[entry.code] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Key Insights */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Key Insights</h2>

          <div className="space-y-6">
            <div className="card p-6 border-red-900/30">
              <h3 className="text-lg font-semibold text-red-400 mb-3">
                Social Protection Dominates
              </h3>
              <p className="text-gray-400">
                Nearly half ({summary.largest_category_pct}%) of all government spending goes to{' '}
                <strong className="text-white">social protection</strong> — pensions, unemployment benefits,
                family support, and disability. This share has grown as the population ages.
              </p>
            </div>

            <div className="card p-6 border-blue-900/30">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">
                Health + Education = Public Services Core
              </h3>
              <p className="text-gray-400">
                Combined, health (€{(by_function.find(c => c.code === 'G07')?.amount_million || 0) / 1000}B)
                and education (€{(by_function.find(c => c.code === 'G09')?.amount_million || 0) / 1000}B)
                represent about a quarter of spending — the backbone of the Nordic welfare model.
              </p>
            </div>

            <div className="card p-6 border-amber-900/30">
              <h3 className="text-lg font-semibold text-amber-400 mb-3">
                Per Capita Perspective
              </h3>
              <p className="text-gray-400">
                At <strong className="text-white">€{summary.per_capita.toLocaleString()}</strong> per person,
                Finland ranks among the highest spenders in Europe. This includes all levels of government
                and social security. For a family of four, that&apos;s ~€{(summary.per_capita * 4).toLocaleString()} annually.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-8 px-6 bg-gray-950/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Data Sources & Methodology</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Source</div>
              <div className="text-gray-300">Statistics Finland</div>
              <div className="text-gray-500">Table: statfin_jmete_pxt_12a6</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Classification</div>
              <div className="text-gray-300">COFOG (Classification of Functions of Government)</div>
              <div className="text-gray-500">UN standard for government expenditure</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Coverage</div>
              <div className="text-gray-300">General government (S13)</div>
              <div className="text-gray-500">Central + Local + Social Security</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Values</div>
              <div className="text-gray-300">Current prices (EUR millions)</div>
              <div className="text-gray-500">Consolidated expenditure (OTES)</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

