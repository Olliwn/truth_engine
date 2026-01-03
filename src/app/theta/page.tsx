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
  BarChart,
  Bar,
} from 'recharts';
import { GovernmentDebtData } from '@/lib/types';

export default function ThetaPage() {
  const [data, setData] = useState<GovernmentDebtData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/data/government_debt.json`);
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
          <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading debt data...</p>
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

  // Finland's approximate working-age population (~3.3M)
  const workingAgePop = 3_300_000;
  const debtPerWorker = Math.round((last.total_debt_million * 1_000_000) / workingAgePop);

  // Prepare chart data
  const chartData = time_series.map((entry) => ({
    year: entry.year,
    total: entry.total_debt_million / 1000, // Convert to billions
    central: entry.central_debt_million / 1000,
    local: entry.local_debt_million / 1000,
    social: entry.social_security_debt_million / 1000,
  }));

  // Calculate annual growth rates
  const growthData = time_series.slice(1).map((entry, idx) => {
    const prev = time_series[idx];
    const growth =
      prev.total_debt_million > 0
        ? ((entry.total_debt_million - prev.total_debt_million) / prev.total_debt_million) * 100
        : 0;
    return {
      year: entry.year,
      growth,
    };
  });

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
            <span className="text-rose-500">Theta</span> | The Balance Sheet
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-rose-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Finland&apos;s <span className="text-rose-400">Debt</span> Reality
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Government debt growth: From €{Math.round(first.total_debt_million / 1000)}B to €
            {Math.round(last.total_debt_million / 1000)}B in {last.year - first.year} years
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Total Government Debt
              </div>
              <div className="text-4xl font-bold text-rose-400 mono-data">
                €{summary.current_debt_billion.toFixed(0)}B
              </div>
              <div className="text-sm text-gray-500 mt-1">{last.year} (consolidated)</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Debt Growth
              </div>
              <div className="text-4xl font-bold text-red-400 mono-data">
                +{summary.debt_growth_pct?.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                since {first.year} (+€{summary.debt_change_billion.toFixed(0)}B)
              </div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Debt per Worker
              </div>
              <div className="text-4xl font-bold text-amber-400 mono-data">
                €{Math.round(debtPerWorker / 1000)}k
              </div>
              <div className="text-sm text-gray-500 mt-1">per working-age person</div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard
              label="Central Govt"
              value={`€${summary.central_debt_billion.toFixed(0)}B`}
              subtext={`${last.central_share_pct?.toFixed(0)}% of total`}
              color="text-rose-400"
            />
            <StatCard
              label="Local Govt"
              value={`€${summary.local_debt_billion.toFixed(0)}B`}
              subtext={`${last.local_share_pct?.toFixed(0)}% of total`}
              color="text-orange-400"
            />
            <StatCard
              label="Starting Debt"
              value={`€${Math.round(first.total_debt_million / 1000)}B`}
              subtext={first.year.toString()}
              color="text-gray-400"
            />
            <StatCard
              label="Annual Avg Growth"
              value={`${(Math.pow(last.total_debt_million / first.total_debt_million, 1 / (last.year - first.year)) * 100 - 100).toFixed(1)}%`}
              subtext="compound rate"
              color="text-red-400"
            />
          </div>
        </div>
      </section>

      {/* Key Insight */}
      <section className="py-8 px-6 bg-rose-950/10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <blockquote className="text-lg md:text-xl text-gray-300 italic text-center">
            &ldquo;Since {first.year}, Finland&apos;s government debt has grown by €
            {summary.debt_change_billion.toFixed(0)}B &mdash; that&apos;s €
            {Math.round(debtPerWorker).toLocaleString()} for every working-age person to
            eventually repay.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Total Debt Chart */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Government Debt Over Time</h2>
            <p className="text-gray-400 text-sm">
              General government EDP debt by sector (year-end values)
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
                  formatter={(value) => `€${Number(value).toFixed(0)}B`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="central"
                  stackId="1"
                  stroke="#F43F5E"
                  fill="#F43F5E"
                  fillOpacity={0.8}
                  name="Central Government"
                />
                <Area
                  type="monotone"
                  dataKey="local"
                  stackId="1"
                  stroke="#F97316"
                  fill="#F97316"
                  fillOpacity={0.8}
                  name="Local Government"
                />
                <Area
                  type="monotone"
                  dataKey="social"
                  stackId="1"
                  stroke="#A855F7"
                  fill="#A855F7"
                  fillOpacity={0.8}
                  name="Social Security Funds"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Annual Growth Chart */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Annual Debt Growth Rate</h2>
            <p className="text-gray-400 text-sm">Year-over-year change in total government debt</p>
          </div>

          <div className="card p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
                <Bar
                  dataKey="growth"
                  fill="#F43F5E"
                  name="YoY Growth %"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Debt Breakdown */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Debt Composition ({last.year})</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-6 border-rose-900/30">
              <h3 className="text-lg font-semibold text-rose-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏛️</span> Central Government
              </h3>
              <div className="text-3xl font-bold mono-data mb-2">
                €{Math.round(last.central_debt_million / 1000)}B
              </div>
              <div className="text-gray-400 text-sm">
                {last.central_share_pct?.toFixed(1)}% of total debt
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Direct government borrowing, mainly through bonds. This is what&apos;s typically
                reported as &quot;national debt.&quot;
              </p>
            </div>

            <div className="card p-6 border-orange-900/30">
              <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏘️</span> Local Government
              </h3>
              <div className="text-3xl font-bold mono-data mb-2">
                €{Math.round(last.local_debt_million / 1000)}B
              </div>
              <div className="text-gray-400 text-sm">
                {last.local_share_pct?.toFixed(1)}% of total debt
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Municipal borrowing for infrastructure, schools, and local services. Often
                overlooked in debt discussions.
              </p>
            </div>

            <div className="card p-6 border-purple-900/30">
              <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏥</span> Social Security
              </h3>
              <div className="text-3xl font-bold mono-data mb-2">
                €{Math.round(last.social_security_debt_million / 1000)}B
              </div>
              <div className="text-gray-400 text-sm">
                Social security fund debt
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Debt held by pension and social insurance funds. Note: This excludes unfunded
                pension liabilities!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hidden Liabilities */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">What&apos;s Not in the Numbers</h2>

          <div className="space-y-6">
            <div className="card p-6 border-red-900/30">
              <h3 className="text-lg font-semibold text-red-400 mb-3">
                🚨 Unfunded Pension Liabilities
              </h3>
              <p className="text-gray-400">
                The official debt figures do NOT include future pension promises. Finland&apos;s
                pension system is partially funded, but there&apos;s a significant gap between
                promised benefits and assets set aside. Estimates suggest this implicit debt could
                be €100-200B+.
              </p>
            </div>

            <div className="card p-6 border-amber-900/30">
              <h3 className="text-lg font-semibold text-amber-400 mb-3">
                ⚠️ Government Guarantees
              </h3>
              <p className="text-gray-400">
                The government guarantees various loans and obligations that don&apos;t appear as
                direct debt but represent contingent liabilities. These include housing finance,
                export guarantees, and financial sector backstops.
              </p>
            </div>

            <div className="card p-6 border-blue-900/30">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">
                💰 What About Assets?
              </h3>
              <p className="text-gray-400">
                Finland does have significant state-owned assets (Solidium holdings, state
                forests, railways, etc.) worth perhaps €40-60B. However, these are largely
                illiquid and selling them would have other consequences. Net debt is still
                substantially positive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Math */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The Burden Calculation</h2>

          <div className="card p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-rose-400 mb-3">Debt per Person</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex justify-between">
                    <span>Total debt:</span>
                    <span className="text-white mono-data">€{summary.current_debt_billion.toFixed(0)}B</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Population (~5.5M):</span>
                    <span className="text-white mono-data">
                      €{Math.round(last.total_debt_million * 1_000_000 / 5_500_000).toLocaleString()}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Per working-age (~3.3M):</span>
                    <span className="text-rose-400 font-semibold mono-data">
                      €{debtPerWorker.toLocaleString()}
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-rose-400 mb-3">Growth Trajectory</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex justify-between">
                    <span>Starting ({first.year}):</span>
                    <span className="text-white mono-data">€{Math.round(first.total_debt_million / 1000)}B</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Current ({last.year}):</span>
                    <span className="text-white mono-data">€{summary.current_debt_billion.toFixed(0)}B</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Total increase:</span>
                    <span className="text-red-400 font-semibold mono-data">
                      +{summary.debt_growth_pct?.toFixed(0)}%
                    </span>
                  </li>
                </ul>
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
              <div className="text-gray-500 mb-1">Government Debt</div>
              <div className="text-gray-300">Statistics Finland, Table 11yv</div>
              <div className="text-gray-500">General government EDP debt ({summary.period})</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Definition</div>
              <div className="text-gray-300">EDP = Excessive Deficit Procedure</div>
              <div className="text-gray-500">EU-harmonized debt measure (consolidated)</div>
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

