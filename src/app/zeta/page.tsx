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
} from 'recharts';
import { EmploymentSectorsData } from '@/lib/types';

export default function ZetaPage() {
  const [data, setData] = useState<EmploymentSectorsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/data/employment_sectors.json`);
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
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading employment data...</p>
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

  // Prepare chart data - stacked area showing employment shift
  const stackedData = time_series.map((entry) => ({
    year: entry.year,
    Manufacturing: entry.manufacturing / 1000,
    Construction: entry.construction / 1000,
    Primary: entry.primary / 1000,
    ICT: entry.ict / 1000,
    Public: entry.public_sector / 1000,
    OtherPrivate:
      (entry.private_sector - entry.manufacturing - entry.construction - entry.primary - entry.ict) /
      1000,
  }));

  // Bar chart data for comparison
  const comparisonData = [
    {
      name: first.year.toString(),
      Manufacturing: first.manufacturing_pct,
      Public: first.public_pct,
      ICT: first.ict_pct,
    },
    {
      name: last.year.toString(),
      Manufacturing: last.manufacturing_pct,
      Public: last.public_pct,
      ICT: last.ict_pct,
    },
  ];

  // Calculate job shifts
  const manufacturingLoss = Math.round((last.manufacturing - first.manufacturing) / 1000);
  const publicGain = Math.round((last.public_sector - first.public_sector) / 1000);
  const ictChange = Math.round((last.ict - first.ict) / 1000);

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
            <span className="text-orange-500">Zeta</span> | Deindustrialization
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-orange-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Where Jobs Go to <span className="text-orange-400">Die</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Finland&apos;s structural shift from export-generating manufacturing to domestic
            services
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Manufacturing Jobs Lost
              </div>
              <div className="text-4xl font-bold text-red-400 mono-data">{manufacturingLoss}k</div>
              <div className="text-sm text-gray-500 mt-1">
                since {first.year} ({((manufacturingLoss / (first.manufacturing / 1000)) * 100).toFixed(0)}%)
              </div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Public Jobs Added
              </div>
              <div className="text-4xl font-bold text-purple-400 mono-data">+{publicGain}k</div>
              <div className="text-sm text-gray-500 mt-1">
                since {first.year} ({((publicGain / (first.public_sector / 1000)) * 100).toFixed(0)}%)
              </div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Manufacturing Share
              </div>
              <div className="text-4xl font-bold text-orange-400 mono-data">
                {last.manufacturing_pct.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                down from {first.manufacturing_pct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard
              label="Total Employed"
              value={`${(last.total_employed / 1_000_000).toFixed(2)}M`}
              color="text-white"
            />
            <StatCard
              label="Public Sector"
              value={`${last.public_pct.toFixed(1)}%`}
              subtext={`was ${first.public_pct.toFixed(1)}%`}
              color="text-purple-400"
            />
            <StatCard
              label="ICT Jobs"
              value={`${ictChange > 0 ? '+' : ''}${ictChange}k`}
              subtext={`${first.year}-${last.year}`}
              color="text-cyan-400"
            />
            <StatCard
              label="Private/Public Ratio"
              value={last.private_per_public?.toFixed(1) || 'N/A'}
              subtext={`was ${first.private_per_public?.toFixed(1)}`}
              color="text-blue-400"
            />
          </div>
        </div>
      </section>

      {/* Key Insight */}
      <section className="py-8 px-6 bg-orange-950/10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <blockquote className="text-lg md:text-xl text-gray-300 italic text-center">
            &ldquo;Every manufacturing job lost was a job that brought foreign currency into
            Finland. Every public sector job added is funded by taxes on the remaining private
            economy.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Employment Structure Chart */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Employment by Sector (Thousands)</h2>
            <p className="text-gray-400 text-sm">
              Watch how manufacturing shrinks while public sector and services expand
            </p>
          </div>

          <div className="card p-6 h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stackedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `${Number(value).toFixed(0)}k`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Manufacturing"
                  stackId="1"
                  stroke="#F97316"
                  fill="#F97316"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="Construction"
                  stackId="1"
                  stroke="#EAB308"
                  fill="#EAB308"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="Primary"
                  stackId="1"
                  stroke="#84CC16"
                  fill="#84CC16"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="ICT"
                  stackId="1"
                  stroke="#06B6D4"
                  fill="#06B6D4"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="OtherPrivate"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="Other Private"
                />
                <Area
                  type="monotone"
                  dataKey="Public"
                  stackId="1"
                  stroke="#A855F7"
                  fill="#A855F7"
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Before/After Comparison */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Sector Share Comparison</h2>
            <p className="text-gray-400 text-sm">
              {first.year} vs {last.year} - the structural shift in percentage points
            </p>
          </div>

          <div className="card p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" domain={[0, 35]} />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
                <Legend />
                <Bar dataKey="Manufacturing" fill="#F97316" name="Manufacturing" />
                <Bar dataKey="Public" fill="#A855F7" name="Public Sector" />
                <Bar dataKey="ICT" fill="#06B6D4" name="ICT" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* The Story */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The Structural Shift</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card p-6 border-red-900/30">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏭</span> What We Lost
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>
                    <strong className="text-white">{Math.abs(manufacturingLoss)}k</strong>{' '}
                    manufacturing jobs that generated export revenue
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>High-productivity industrial base</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>Skills and know-how in paper, metals, electronics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">→</span>
                  <span>Foreign currency earning capacity</span>
                </li>
              </ul>
            </div>

            <div className="card p-6 border-purple-900/30">
              <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏛️</span> What We Gained
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">→</span>
                  <span>
                    <strong className="text-white">+{publicGain}k</strong> public sector jobs
                    (funded by taxes)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">→</span>
                  <span>Larger healthcare and education sectors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">→</span>
                  <span>More administration and bureaucracy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">→</span>
                  <span>Jobs that consume rather than generate tax revenue</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Why This Matters</h2>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">
                Export Jobs = Foreign Currency
              </h3>
              <p className="text-gray-400">
                Manufacturing jobs, particularly in paper, metals, and machinery, generate export
                revenue. When these jobs disappear, Finland must rely more on imports without the
                corresponding export capacity to pay for them.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">
                Public Jobs = Tax Burden
              </h3>
              <p className="text-gray-400">
                Every public sector job must be funded by taxes on the private sector. As the ratio
                of private to public workers declines (from {first.private_per_public?.toFixed(1)} to{' '}
                {last.private_per_public?.toFixed(1)}), each private worker carries a larger burden.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">
                The Productivity Gap
              </h3>
              <p className="text-gray-400">
                Manufacturing typically has higher productivity growth than services. Shifting
                employment toward lower-productivity sectors constrains overall economic growth and
                wage increases.
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
              <div className="text-gray-500 mb-1">Employment by Industry</div>
              <div className="text-gray-300">Statistics Finland, Table 115i</div>
              <div className="text-gray-500">TOL 2008 industry classification ({summary.period})</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Sector Classification</div>
              <div className="text-gray-300">
                Public: O (Admin), P (Education), Q (Health)
              </div>
              <div className="text-gray-500">Manufacturing: C, ICT: J, Construction: F</div>
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

