'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
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
  PieChart,
  Pie,
  Sankey,
  Layer,
  Rectangle,
} from 'recharts';
import { SpendingEfficiencyData, EfficiencyCategory } from '@/lib/types';

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  G10: '#EF4444', // Social protection - red
  G01: '#6B7280', // General public services - gray
  G04: '#F59E0B', // Economic affairs - amber
};

// Flow colors for efficiency breakdown
const FLOW_COLORS = {
  benefits: '#10B981',    // green - goes to citizens
  bureaucracy: '#EF4444', // red - wages
  overhead: '#F59E0B',    // amber - overhead
  subsidies: '#3B82F6',   // blue - subsidies
  investment: '#8B5CF6',  // purple - capital
  other: '#6B7280',       // gray - other
};

export default function XiPage() {
  const [data, setData] = useState<SpendingEfficiencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<EfficiencyCategory | null>(null);

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

  const { summary, categories, time_series } = data;

  // Prepare stacked bar data for category comparison
  const stackedBarData = categories.map((cat) => ({
    name: cat.name.replace(' protection', '').replace(' public services', ''),
    code: cat.code,
    benefits: cat.benefits_million / 1000,
    bureaucracy: cat.bureaucracy_million / 1000,
    overhead: cat.overhead_million / 1000,
    subsidies: cat.subsidies_million / 1000,
    investment: cat.investment_million / 1000,
    other: cat.other_million / 1000,
    total: cat.total_million / 1000,
    efficiency_pct: cat.efficiency_pct,
  }));

  // Prepare efficiency comparison data
  const efficiencyCompareData = categories.map((cat) => ({
    name: cat.name.split(' ')[0],
    code: cat.code,
    'Benefits to Citizens': cat.efficiency_pct,
    'Bureaucracy': cat.bureaucracy_pct,
    'Overhead': cat.overhead_pct,
    total: cat.total_million / 1000,
  }));

  // Prepare time series data for efficiency trend
  const trendData = time_series.map((entry) => {
    const row: Record<string, number> = { year: entry.year as number };
    categories.forEach((cat) => {
      const catData = entry[cat.code];
      if (catData && typeof catData === 'object' && 'efficiency_pct' in catData) {
        row[`${cat.code}_eff`] = catData.efficiency_pct;
        row[`${cat.code}_bur`] = catData.bureaucracy_pct;
      }
    });
    return row;
  });

  // Prepare waterfall/flow data for selected category or total
  const flowCategory = selectedCategory || categories[0]; // Default to Social Protection
  const flowData = [
    { name: 'Total', value: flowCategory.total_million / 1000, fill: '#1F2937' },
    { name: 'Benefits', value: flowCategory.benefits_million / 1000, fill: FLOW_COLORS.benefits },
    { name: 'Bureaucracy', value: flowCategory.bureaucracy_million / 1000, fill: FLOW_COLORS.bureaucracy },
    { name: 'Overhead', value: flowCategory.overhead_million / 1000, fill: FLOW_COLORS.overhead },
    { name: 'Subsidies', value: flowCategory.subsidies_million / 1000, fill: FLOW_COLORS.subsidies },
    { name: 'Investment', value: flowCategory.investment_million / 1000, fill: FLOW_COLORS.investment },
    { name: 'Other', value: flowCategory.other_million / 1000, fill: FLOW_COLORS.other },
  ].filter(d => d.value > 0);

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
            <span className="text-emerald-500">Xi</span> | Spending Efficiency
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Where Does Your <span className="text-emerald-400">€{summary.total_analyzed_billion}B</span> Go?
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Breaking down government spending by transaction type.{' '}
            <span className="text-emerald-400">{summary.overall_efficiency_pct}%</span> reaches citizens directly,
            while <span className="text-red-400">{summary.overall_bureaucracy_pct}%</span> goes to bureaucracy.
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Analyzed ({summary.year})
              </div>
              <div className="text-3xl font-bold text-white mono-data">
                €{summary.total_analyzed_billion}B
              </div>
              <div className="text-sm text-gray-500 mt-1">3 main categories</div>
            </div>

            <div className="card p-6 border-emerald-900/30">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Direct Benefits
              </div>
              <div className="text-3xl font-bold text-emerald-400 mono-data">
                €{summary.total_benefits_billion}B
              </div>
              <div className="text-sm text-gray-500 mt-1">{summary.overall_efficiency_pct}% of total</div>
            </div>

            <div className="card p-6 border-red-900/30">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Bureaucracy
              </div>
              <div className="text-3xl font-bold text-red-400 mono-data">
                €{summary.total_bureaucracy_billion}B
              </div>
              <div className="text-sm text-gray-500 mt-1">{summary.overall_bureaucracy_pct}% wages</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Most Efficient
              </div>
              <div className="text-xl font-bold text-white">
                {summary.most_efficient?.name || 'N/A'}
              </div>
              <div className="text-sm text-emerald-400 mt-1">
                {summary.most_efficient?.efficiency_pct}% to citizens
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Comparison */}
      <section className="py-8 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Efficiency by Category</h2>
            <p className="text-gray-400 text-sm">
              What percentage of spending reaches citizens vs goes to administration?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Efficiency Comparison Bar Chart */}
            <div className="card p-6 h-[400px]">
              <h3 className="text-lg font-semibold mb-4">Efficiency Breakdown (%)</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={efficiencyCompareData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(1)}%` : 'N/A'}
                  />
                  <Legend />
                  <Bar dataKey="Benefits to Citizens" fill={FLOW_COLORS.benefits} stackId="a" />
                  <Bar dataKey="Bureaucracy" fill={FLOW_COLORS.bureaucracy} stackId="a" />
                  <Bar dataKey="Overhead" fill={FLOW_COLORS.overhead} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Cards */}
            <div className="space-y-4">
              {categories.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => setSelectedCategory(selectedCategory?.code === cat.code ? null : cat)}
                  className={`w-full card p-4 text-left transition-all ${
                    selectedCategory?.code === cat.code
                      ? 'ring-2 ring-emerald-500/50 border-emerald-900/30'
                      : 'hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: CATEGORY_COLORS[cat.code] }}
                      />
                      <span className="font-semibold">{cat.name}</span>
                    </div>
                    <span className="text-gray-400">€{(cat.total_million / 1000).toFixed(1)}B</span>
                  </div>
                  
                  {/* Progress bars */}
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20">Benefits</span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${cat.efficiency_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-emerald-400 w-12 text-right">{cat.efficiency_pct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20">Bureaucracy</span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${cat.bureaucracy_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-red-400 w-12 text-right">{cat.bureaucracy_pct}%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Flow Breakdown for Selected Category */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              Money Flow: {flowCategory.name}
            </h2>
            <p className="text-gray-400 text-sm">
              How €{(flowCategory.total_million / 1000).toFixed(1)}B is allocated across transaction types
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Horizontal Bar Chart showing flow */}
            <div className="card p-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" tickFormatter={(v) => `€${v}B`} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined) => 
                      value !== undefined ? [`€${value.toFixed(1)}B`, 'Amount'] : ['N/A', 'Amount']
                    }
                  />
                  <Bar dataKey="value">
                    {flowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="card p-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={flowData.filter(d => d.name !== 'Total')}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => 
                      `${name || ''}: ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`
                    }
                    labelLine={false}
                  >
                    {flowData.filter(d => d.name !== 'Total').map((entry, index) => (
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
                      value !== undefined ? `€${value.toFixed(1)}B` : 'N/A'
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Subcategory Deep Dive */}
      {flowCategory.subcategories && flowCategory.subcategories.length > 0 && (
        <section className="py-8 px-6 border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{flowCategory.name} Subcategories</h2>
              <p className="text-gray-400 text-sm">
                Comparing efficiency across different programs
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flowCategory.subcategories.map((sub) => (
                <div key={sub.code} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">{sub.name}</span>
                    <span className="text-gray-400 text-sm">€{(sub.total_million / 1000).toFixed(1)}B</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Benefits to citizens</span>
                        <span className={sub.efficiency_pct > 50 ? 'text-emerald-400' : 'text-amber-400'}>
                          {sub.efficiency_pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sub.efficiency_pct > 70 ? 'bg-emerald-500' : 
                            sub.efficiency_pct > 30 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sub.efficiency_pct}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Bureaucracy</span>
                        <span className={sub.bureaucracy_pct < 20 ? 'text-emerald-400' : 'text-red-400'}>
                          {sub.bureaucracy_pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sub.bureaucracy_pct < 15 ? 'bg-emerald-500' : 
                            sub.bureaucracy_pct < 30 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sub.bureaucracy_pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Efficiency Trend Over Time */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gray-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Efficiency Trend (1990-{summary.year})</h2>
            <p className="text-gray-400 text-sm">
              Has spending efficiency improved over time?
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
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
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (value === undefined) return ['N/A', name || ''];
                    const label = name?.includes('eff') ? 'Benefits %' : 'Bureaucracy %';
                    return [`${value.toFixed(1)}%`, label];
                  }}
                />
                <Legend
                  formatter={(value: string) => {
                    if (value.includes('G10')) return 'Social Protection';
                    if (value.includes('G01')) return 'General Public';
                    if (value.includes('G04')) return 'Economic Affairs';
                    return value;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="G10_eff"
                  stroke={CATEGORY_COLORS.G10}
                  strokeWidth={2}
                  dot={false}
                  name="G10_eff"
                />
                <Line
                  type="monotone"
                  dataKey="G01_bur"
                  stroke={CATEGORY_COLORS.G01}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="G01_bur"
                />
                <Line
                  type="monotone"
                  dataKey="G04_bur"
                  stroke={CATEGORY_COLORS.G04}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="G04_bur"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Solid lines = % reaching citizens | Dashed = bureaucracy %
          </p>
        </div>
      </section>

      {/* Key Insights */}
      <section className="py-8 px-6 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Key Insights</h2>

          <div className="space-y-6">
            <div className="card p-6 border-emerald-900/30">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">
                Pensions Are Highly Efficient
              </h3>
              <p className="text-gray-400">
                Old age pensions (G1002) deliver <strong className="text-white">87% directly to citizens</strong> with only 
                7.6% going to administration. This is the gold standard — automated payments with minimal overhead.
              </p>
            </div>

            <div className="card p-6 border-amber-900/30">
              <h3 className="text-lg font-semibold text-amber-400 mb-3">
                Family Benefits: Room for Improvement
              </h3>
              <p className="text-gray-400">
                Family and children programs (G1004) show only <strong className="text-white">48% reaching citizens</strong> 
                with 34% going to wages. This likely reflects daycare services where staff costs dominate, 
                but raises questions about cash transfer alternatives.
              </p>
            </div>

            <div className="card p-6 border-red-900/30">
              <h3 className="text-lg font-semibold text-red-400 mb-3">
                General Administration: Pure Cost Center
              </h3>
              <p className="text-gray-400">
                General public services (G01) have <strong className="text-white">0% going to citizens</strong> — by definition. 
                The €19.7B includes public debt interest (€4.6B), executive/legislative functions, 
                and general administration. The question is: is €8B for &quot;general services&quot; justified?
              </p>
            </div>

            <div className="card p-6 border-blue-900/30">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">
                Economic Affairs: Investment vs Overhead
              </h3>
              <p className="text-gray-400">
                Economic affairs (G04) spending is mostly infrastructure (transport €7.7B) and subsidies.
                The efficiency metric doesn&apos;t apply well here — the goal is investment returns, not direct transfers.
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
                D62K = Cash benefits | D632K = In-kind via private
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Bureaucracy Formula</div>
              <div className="text-gray-300 font-mono text-xs bg-gray-800/50 p-2 rounded">
                Bureaucracy = D1K / Total
              </div>
              <div className="text-gray-500 mt-2">
                D1K = Employee compensation (wages + social contributions)
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Source</div>
              <div className="text-gray-300">Statistics Finland</div>
              <div className="text-gray-500">Table: statfin_jmete_pxt_12a6</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Limitation</div>
              <div className="text-gray-300">Efficiency metric best applies to transfer programs</div>
              <div className="text-gray-500">Not meaningful for pure service delivery or administration</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

