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
} from 'recharts';
import { FertilityData } from '@/lib/types';

export default function IotaPage() {
  const [data, setData] = useState<FertilityData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const { summary, time_series, metadata } = data;

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

      {/* Key Insight */}
      <section className="py-8 px-6 bg-pink-950/10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <blockquote className="text-lg md:text-xl text-gray-300 italic text-center">
            &ldquo;Despite having one of the world&apos;s best parental leave systems, Finland&apos;s
            fertility rate has fallen from {tfr1990.toFixed(2)} in 1990 to {currentTFR.toFixed(2)}{' '}
            today &mdash; a {Math.abs(((currentTFR - tfr1990) / tfr1990) * 100).toFixed(0)}% decline.
            More subsidies haven&apos;t meant more babies.&rdquo;
          </blockquote>
        </div>
      </section>

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

      {/* Possible Explanations */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">What Might Explain This?</h2>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-pink-400 mb-3">
                🏠 Housing Costs & Economic Uncertainty
              </h3>
              <p className="text-gray-400">
                Young people face high housing costs in urban areas, job insecurity, and delayed
                financial stability. Having children is expensive beyond what subsidies cover &mdash;
                especially opportunity costs of career interruption.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-pink-400 mb-3">
                👩‍💼 Changing Priorities & Values
              </h3>
              <p className="text-gray-400">
                With high female education and labor participation, many women prioritize careers
                and personal development. The &quot;opportunity cost&quot; of children has increased
                dramatically. Having children is increasingly seen as a choice, not an expectation.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-pink-400 mb-3">
                ⏰ Delayed Childbearing
              </h3>
              <p className="text-gray-400">
                Average age of first-time mothers has risen from ~26 (1990) to ~30+ today.
                Later starts mean fewer years of fertility, higher risk of infertility, and
                often fewer children total.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-pink-400 mb-3">
                🤔 The Subsidy Paradox
              </h3>
              <p className="text-gray-400">
                More subsidies may actually correlate with lower fertility by:
                (1) requiring higher taxes that hurt family formation,
                (2) pushing women into workforce, increasing opportunity costs,
                (3) creating expectations of &quot;perfect conditions&quot; that never arrive.
                Countries with less state support (like Israel) often have higher fertility.
              </p>
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
                  to maintain population &mdash; with unknown cultural consequences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-8 px-6 bg-gray-950/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Data Sources</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Fertility Rate</div>
              <div className="text-gray-300">Statistics Finland, Table 12dt</div>
              <div className="text-gray-500">
                Total fertility rate (1776-present)
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Definition</div>
              <div className="text-gray-300">
                TFR = Total Fertility Rate
              </div>
              <div className="text-gray-500">
                Average children per woman at current age-specific rates
              </div>
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

