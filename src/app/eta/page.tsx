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
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { TradeBalanceData } from '@/lib/types';

export default function EtaPage() {
  const [data, setData] = useState<TradeBalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/data/trade_balance.json`);
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
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading trade data...</p>
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

  const { summary, time_series } = data;
  const first = time_series[0];
  const last = time_series[time_series.length - 1];

  // Find Nokia peak year
  const peakYear = time_series.find((y) => y.year === summary.peak_year);

  // Prepare chart data
  const chartData = time_series.map((entry) => ({
    year: entry.year,
    exports: entry.exports_total / 1000, // Convert to billions
    imports: entry.imports_total / 1000,
    balance: entry.trade_balance / 1000,
    goods_balance: entry.goods_balance / 1000,
    services_balance: entry.services_balance / 1000,
    current_account: entry.current_account / 1000,
    services_share: entry.services_share_pct,
  }));

  // Calculate deficit years
  const deficitYears = time_series.filter((y) => y.trade_balance < 0);
  const surplusYears = time_series.filter((y) => y.trade_balance > 0);

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
            <span className="text-teal-500">Eta</span> | Trade Reality
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-teal-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The <span className="text-teal-400">Trade</span> Reality
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            A country that imports more than it exports is borrowing against its future
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Current Balance
              </div>
              <div
                className={`text-4xl font-bold mono-data ${
                  last.trade_balance >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                €{(last.trade_balance / 1000).toFixed(1)}B
              </div>
              <div className="text-sm text-gray-500 mt-1">{last.year}</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Peak Surplus (Nokia Era)
              </div>
              <div className="text-4xl font-bold text-teal-400 mono-data">
                €{summary.peak_balance_billion.toFixed(1)}B
              </div>
              <div className="text-sm text-gray-500 mt-1">{summary.peak_year}</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Export Coverage
              </div>
              <div className="text-4xl font-bold text-blue-400 mono-data">
                {last.export_coverage_pct?.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {last.export_coverage_pct && last.export_coverage_pct >= 100
                  ? 'Exports cover imports'
                  : 'Imports exceed exports'}
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard
              label="Exports"
              value={`€${(last.exports_total / 1000).toFixed(0)}B`}
              subtext={`goods + services`}
              color="text-green-400"
            />
            <StatCard
              label="Imports"
              value={`€${(last.imports_total / 1000).toFixed(0)}B`}
              subtext={`goods + services`}
              color="text-red-400"
            />
            <StatCard
              label="Surplus Years"
              value={surplusYears.length.toString()}
              subtext={`of ${time_series.length} years`}
              color="text-green-400"
            />
            <StatCard
              label="Deficit Years"
              value={deficitYears.length.toString()}
              subtext={`of ${time_series.length} years`}
              color="text-red-400"
            />
          </div>
        </div>
      </section>

      {/* Key Insight */}
      <section className="py-8 px-6 bg-teal-950/10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <blockquote className="text-lg md:text-xl text-gray-300 italic text-center">
            &ldquo;{summary.key_insight}&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Trade Balance Chart */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Trade Balance Over Time</h2>
            <p className="text-gray-400 text-sm">
              Exports minus imports (positive = surplus, negative = deficit)
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `€${Number(value).toFixed(1)}B`}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#14B8A6"
                  fill="#14B8A6"
                  fillOpacity={0.3}
                  name="Trade Balance"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Exports vs Imports Chart */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Exports vs Imports</h2>
            <p className="text-gray-400 text-sm">Total goods and services trade flows</p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `€${Number(value).toFixed(1)}B`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="exports"
                  stroke="#22C55E"
                  strokeWidth={2}
                  name="Exports"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="imports"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Imports"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Goods vs Services Breakdown */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Goods vs Services Balance</h2>
            <p className="text-gray-400 text-sm">
              Breaking down the trade balance by category
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `€${Number(value).toFixed(1)}B`}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="goods_balance"
                  stroke="#F97316"
                  strokeWidth={2}
                  name="Goods Balance"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="services_balance"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Services Balance"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="current_account"
                  stroke="#14B8A6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Current Account"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* The Nokia Story */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The Nokia Effect</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card p-6 border-teal-900/30">
              <h3 className="text-lg font-semibold text-teal-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">📱</span> Peak Era ({summary.peak_year})
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex justify-between">
                  <span>Trade surplus:</span>
                  <span className="text-teal-400 font-semibold mono-data">
                    €{summary.peak_balance_billion.toFixed(1)}B
                  </span>
                </li>
                {peakYear && (
                  <>
                    <li className="flex justify-between">
                      <span>Exports:</span>
                      <span className="text-white font-semibold mono-data">
                        €{(peakYear.exports_total / 1000).toFixed(1)}B
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Export coverage:</span>
                      <span className="text-green-400 font-semibold mono-data">
                        {peakYear.export_coverage_pct?.toFixed(0)}%
                      </span>
                    </li>
                  </>
                )}
              </ul>
              <p className="text-gray-500 text-sm mt-4">
                Nokia at its peak made Finland a net exporter with healthy surpluses.
              </p>
            </div>

            <div className="card p-6 border-gray-700/30">
              <h3 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">📉</span> Current Reality ({last.year})
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex justify-between">
                  <span>Trade balance:</span>
                  <span
                    className={`font-semibold mono-data ${
                      last.trade_balance >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    €{(last.trade_balance / 1000).toFixed(1)}B
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Exports:</span>
                  <span className="text-white font-semibold mono-data">
                    €{(last.exports_total / 1000).toFixed(1)}B
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Export coverage:</span>
                  <span className="text-white font-semibold mono-data">
                    {last.export_coverage_pct?.toFixed(0)}%
                  </span>
                </li>
              </ul>
              <p className="text-gray-500 text-sm mt-4">
                Without Nokia, Finland struggles to maintain trade balance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Why Trade Balance Matters</h2>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-teal-400 mb-3">
                Deficits Must Be Financed
              </h3>
              <p className="text-gray-400">
                When a country imports more than it exports, the difference must be paid for somehow
                &mdash; either by selling assets to foreigners, borrowing from abroad, or drawing
                down reserves. This is not sustainable indefinitely.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-teal-400 mb-3">
                Export Capacity = Prosperity
              </h3>
              <p className="text-gray-400">
                A country&apos;s standard of living ultimately depends on its ability to produce
                goods and services that other countries want to buy. Without export capacity,
                Finland cannot afford the imports it needs for raw materials, energy, and consumer
                goods.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-teal-400 mb-3">The Services Gap</h3>
              <p className="text-gray-400">
                Finland&apos;s services balance shows how services exports (like software, design,
                gaming) partially compensate for goods trade swings. Services exports share changed
                by {summary.services_share_change > 0 ? '+' : ''}
                {summary.services_share_change.toFixed(1)}pp over the period.
              </p>
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
              <div className="text-gray-500 mb-1">Balance of Payments</div>
              <div className="text-gray-300">Statistics Finland, Table 12gf</div>
              <div className="text-gray-500">Current account and capital account ({summary.period})</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Components</div>
              <div className="text-gray-300">
                G: Goods, S: Services, CA: Current Account
              </div>
              <div className="text-gray-500">Monthly data aggregated to yearly</div>
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

