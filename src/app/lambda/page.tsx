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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { EmploymentSectorsData, PublicSubsidiesData } from '@/lib/types';

// Estimated data for non-working voters (these would ideally come from Kela/Statistics Finland)
const ELECTORATE_ESTIMATES = {
  pensioners: 1_500_000, // ~1.5M pension recipients
  unemployed: 200_000, // ~200k unemployed
  students_adult: 250_000, // ~250k adult students (voting age)
  total_electorate: 4_300_000, // Total eligible voters in Finland
};

// Average salary estimates for transfer-dependent job calculation
const AVG_HEALTHCARE_SALARY = 45_000; // EUR/year
const AVG_SOCIAL_CARE_SALARY = 38_000; // EUR/year

export default function LambdaPage() {
  const [employmentData, setEmploymentData] = useState<EmploymentSectorsData | null>(null);
  const [subsidiesData, setSubsidiesData] = useState<PublicSubsidiesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const [empResponse, subsidiesResponse] = await Promise.all([
          fetch(`${basePath}/data/employment_sectors.json`),
          fetch(`${basePath}/data/public_subsidies.json`),
        ]);

        if (empResponse.ok) {
          setEmploymentData(await empResponse.json());
        }
        if (subsidiesResponse.ok) {
          setSubsidiesData(await subsidiesResponse.json());
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
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading voting incentives data...</p>
        </div>
      </div>
    );
  }

  if (!employmentData) {
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

  const empFirst = employmentData.time_series[0];
  const empLast = employmentData.time_series[employmentData.time_series.length - 1];

  // Estimate transfer-dependent private jobs from D632K spending
  const latestSubsidies = subsidiesData?.time_series[subsidiesData.time_series.length - 1];
  const transferDependentJobs = latestSubsidies
    ? Math.round(
        (latestSubsidies.purchased_health_million * 1_000_000) / AVG_HEALTHCARE_SALARY +
        (latestSubsidies.purchased_social_million * 1_000_000) / AVG_SOCIAL_CARE_SALARY
      )
    : 0;

  // Calculate voting blocs
  const proBigGovtWorkers = empLast.public_sector + transferDependentJobs;
  const proSmallGovtWorkers = empLast.private_sector - transferDependentJobs;

  // Full electorate calculation
  const proBigGovtTotal = 
    proBigGovtWorkers + 
    ELECTORATE_ESTIMATES.pensioners + 
    ELECTORATE_ESTIMATES.unemployed + 
    ELECTORATE_ESTIMATES.students_adult;
  
  const proSmallGovtTotal = proSmallGovtWorkers;

  const totalElectorate = ELECTORATE_ESTIMATES.total_electorate;
  const proBigGovtPct = Math.round((proBigGovtTotal / totalElectorate) * 100);

  // Prepare workforce dependency time series
  const workforceDependencyData = employmentData.time_series.map((entry) => {
    // Estimate transfer-dependent for each year (proportional to 2024 estimate)
    const subsidyYear = subsidiesData?.time_series.find(s => s.year === entry.year);
    const transferDependent = subsidyYear
      ? Math.round(
          (subsidyYear.purchased_health_million * 1_000_000) / AVG_HEALTHCARE_SALARY +
          (subsidyYear.purchased_social_million * 1_000_000) / AVG_SOCIAL_CARE_SALARY
        )
      : 0;

    const govtDependentWorkers = entry.public_sector + transferDependent;
    const marketWorkers = entry.private_sector - transferDependent;

    return {
      year: entry.year,
      public_sector: entry.public_sector / 1000,
      transfer_dependent: transferDependent / 1000,
      private_market: Math.max(0, marketWorkers) / 1000,
      govt_dependent_pct: Math.round((govtDependentWorkers / entry.total_employed) * 100),
      total: entry.total_employed / 1000,
    };
  });

  // Filter to years with subsidies data (2015+)
  const recentDependencyData = workforceDependencyData.filter(d => d.year >= 2015);

  // Electorate pie chart data
  const electoratePieData = [
    { name: 'Public Sector Workers', value: empLast.public_sector, color: '#EF4444' },
    { name: 'Transfer-Dependent Private', value: transferDependentJobs, color: '#F97316' },
    { name: 'Pensioners', value: ELECTORATE_ESTIMATES.pensioners, color: '#FBBF24' },
    { name: 'Unemployed/Students', value: ELECTORATE_ESTIMATES.unemployed + ELECTORATE_ESTIMATES.students_adult, color: '#A3E635' },
    { name: 'Market-Funded Workers', value: proSmallGovtWorkers, color: '#22C55E' },
    { name: 'Other (non-working)', value: totalElectorate - proBigGovtTotal - proSmallGovtWorkers, color: '#6B7280' },
  ];

  // Dependency ratio over time
  const dependencyRatioData = workforceDependencyData.map((d) => ({
    year: d.year,
    ratio: d.private_market > 0 ? (d.public_sector + d.transfer_dependent) / d.private_market : 0,
    govt_dependent_pct: d.govt_dependent_pct,
  }));

  // Calculate the "tipping point" 
  const currentWorkforceSplit = {
    govtDependent: Math.round(((empLast.public_sector + transferDependentJobs) / empLast.total_employed) * 100),
    marketFunded: Math.round(((empLast.private_sector - transferDependentJobs) / empLast.total_employed) * 100),
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
            <span className="text-purple-500">Lambda</span> | Voting Incentives
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-purple-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The <span className="text-purple-400">Democracy Dilemma</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            What percentage of Finnish voters have a rational self-interest in voting for bigger government?
          </p>

          {/* Key headline stat */}
          <div className="max-w-md mx-auto mb-8">
            <div className="card p-8 border-purple-900/50 bg-purple-950/20">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Pro-Big-Government Electorate
              </div>
              <div className="text-6xl font-bold text-purple-400 mono-data">
                ~{proBigGovtPct}%
              </div>
              <div className="text-gray-400 mt-2">
                benefit from government expansion
              </div>
            </div>
          </div>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <StatCard
              label="Public Sector Workers"
              value={`${Math.round(empLast.public_sector / 1000)}k`}
              subtext={`${empLast.public_pct.toFixed(1)}% of workforce`}
              color="text-red-400"
            />
            <StatCard
              label="Transfer-Dependent"
              value={`~${Math.round(transferDependentJobs / 1000)}k`}
              subtext="private jobs, public money"
              color="text-orange-400"
            />
            <StatCard
              label="Pensioners"
              value={`${(ELECTORATE_ESTIMATES.pensioners / 1_000_000).toFixed(1)}M`}
              subtext="largest voting bloc"
              color="text-amber-400"
            />
            <StatCard
              label="Net Taxpayers"
              value={`~${Math.round(proSmallGovtWorkers / 1000)}k`}
              subtext="market-funded workers"
              color="text-green-400"
            />
          </div>
        </div>
      </section>

      {/* The Core Insight */}
      <section className="py-8 px-6 bg-purple-950/10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <blockquote className="text-lg md:text-xl text-gray-300 italic text-center">
            &ldquo;When {proBigGovtPct}% of voters benefit from government expansion, 
            what political force can ever shrink it? Democracy becomes a one-way ratchet 
            toward bigger government.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Electorate Breakdown */}
      <section className="py-12 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              The Finnish <span className="text-purple-400">Electorate</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Breaking down ~4.3 million eligible voters by their economic relationship to government
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <div className="card p-6">
              <h3 className="text-xl font-bold mb-4 text-center">Electorate by Dependency Status</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={electoratePieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      innerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ percent }) => percent ? `${(percent * 100).toFixed(0)}%` : ''}
                    >
                      {electoratePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined) => value !== undefined ? [`${Math.round(value / 1000)}k`, ''] : ['', '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                {electoratePieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-400">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Voting Bloc Summary */}
            <div className="space-y-6">
              <div className="card p-6 border-red-900/30 bg-red-950/10">
                <h4 className="text-lg font-semibold text-red-400 mb-4">
                  Pro-Big-Government Voters
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Public sector workers</span>
                    <span className="text-white mono-data">{Math.round(empLast.public_sector / 1000)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transfer-dependent private</span>
                    <span className="text-white mono-data">~{Math.round(transferDependentJobs / 1000)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pensioners</span>
                    <span className="text-white mono-data">{(ELECTORATE_ESTIMATES.pensioners / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Unemployed + Adult students</span>
                    <span className="text-white mono-data">{((ELECTORATE_ESTIMATES.unemployed + ELECTORATE_ESTIMATES.students_adult) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-800">
                    <span className="text-gray-300 font-semibold">Total</span>
                    <span className="text-red-400 font-bold mono-data">~{(proBigGovtTotal / 1_000_000).toFixed(1)}M</span>
                  </div>
                </div>
              </div>

              <div className="card p-6 border-green-900/30 bg-green-950/10">
                <h4 className="text-lg font-semibold text-green-400 mb-4">
                  Pro-Small-Government Voters
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Market-funded private workers</span>
                    <span className="text-white mono-data">~{Math.round(proSmallGovtWorkers / 1000)}k</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-800">
                    <span className="text-gray-300 font-semibold">Total</span>
                    <span className="text-green-400 font-bold mono-data">~{(proSmallGovtWorkers / 1_000_000).toFixed(1)}M</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Note: Some private workers may still favor government programs they benefit from. 
                  This is a simplification based on economic self-interest.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workforce Dependency Trend */}
      <section className="py-12 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Workforce Dependency Trend</h2>
            <p className="text-gray-400 text-sm">
              How the share of government-dependent workers has grown over time
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recentDependencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(v) => `${v}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(0)}k`, ''] : ['', '']}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="private_market"
                  stackId="1"
                  stroke="#22C55E"
                  fill="#22C55E"
                  fillOpacity={0.7}
                  name="Market-Funded Private"
                />
                <Area
                  type="monotone"
                  dataKey="transfer_dependent"
                  stackId="1"
                  stroke="#F97316"
                  fill="#F97316"
                  fillOpacity={0.7}
                  name="Transfer-Dependent Private"
                />
                <Area
                  type="monotone"
                  dataKey="public_sector"
                  stackId="1"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.7}
                  name="Public Sector"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">2007 Workforce Split</div>
              <div className="text-2xl font-bold">
                <span className="text-green-400">{100 - Math.round(empFirst.public_pct)}%</span>
                <span className="text-gray-500 mx-2">/</span>
                <span className="text-red-400">{Math.round(empFirst.public_pct)}%</span>
              </div>
              <div className="text-xs text-gray-500">private / public</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">2023 Workforce Split</div>
              <div className="text-2xl font-bold">
                <span className="text-green-400">{currentWorkforceSplit.marketFunded}%</span>
                <span className="text-gray-500 mx-2">/</span>
                <span className="text-red-400">{currentWorkforceSplit.govtDependent}%</span>
              </div>
              <div className="text-xs text-gray-500">market / govt-dependent</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">Shift Since 2007</div>
              <div className="text-2xl font-bold text-purple-400">
                +{currentWorkforceSplit.govtDependent - Math.round(empFirst.public_pct)}%
              </div>
              <div className="text-xs text-gray-500">toward govt dependency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Loop Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-purple-950/10 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              The <span className="text-purple-400">Feedback Loop</span>
            </h2>
            <p className="text-gray-400">
              How government growth becomes self-reinforcing through democratic incentives
            </p>
          </div>

          {/* Visual feedback loop */}
          <div className="card p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center">
              <div className="card p-4 border-purple-900/50 bg-purple-950/20 w-48">
                <div className="text-3xl mb-2">🏛️</div>
                <div className="text-sm font-semibold text-purple-400">Government Grows</div>
                <div className="text-xs text-gray-500">More spending & jobs</div>
              </div>
              
              <div className="text-2xl text-gray-600">→</div>
              
              <div className="card p-4 border-orange-900/50 bg-orange-950/20 w-48">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-sm font-semibold text-orange-400">More Dependents</div>
                <div className="text-xs text-gray-500">Workers & benefit recipients</div>
              </div>
              
              <div className="text-2xl text-gray-600">→</div>
              
              <div className="card p-4 border-red-900/50 bg-red-950/20 w-48">
                <div className="text-3xl mb-2">🗳️</div>
                <div className="text-sm font-semibold text-red-400">More Votes for Growth</div>
                <div className="text-xs text-gray-500">Self-interest voting</div>
              </div>
              
              <div className="text-2xl text-gray-600 md:hidden">↓</div>
              <div className="hidden md:block text-2xl text-gray-600">→</div>
              
              <div className="card p-4 border-purple-900/50 bg-purple-950/20 w-48">
                <div className="text-3xl mb-2">🔄</div>
                <div className="text-sm font-semibold text-purple-400">Repeat</div>
                <div className="text-xs text-gray-500">Until fiscal crisis</div>
              </div>
            </div>
          </div>

          {/* Historical Evidence */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">The Math Since 2007</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">📈</div>
                  <div>
                    <div className="text-gray-300">Public sector jobs added</div>
                    <div className="text-red-400 font-bold text-lg mono-data">+{Math.round((empLast.public_sector - empFirst.public_sector) / 1000)}k</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-3xl">📉</div>
                  <div>
                    <div className="text-gray-300">Manufacturing jobs lost</div>
                    <div className="text-orange-400 font-bold text-lg mono-data">{Math.round((empLast.manufacturing - empFirst.manufacturing) / 1000)}k</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-3xl">⚖️</div>
                  <div>
                    <div className="text-gray-300">Net shift to government dependency</div>
                    <div className="text-purple-400 font-bold text-lg mono-data">+{Math.round(((empLast.public_sector - empFirst.public_sector) + Math.abs(empLast.manufacturing - empFirst.manufacturing)) / 1000)}k workers</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">The Political Implication</h3>
              <div className="space-y-4 text-sm text-gray-400">
                <p>
                  <strong className="text-white">Every new government job</strong> creates a voter 
                  with a personal stake in government expansion.
                </p>
                <p>
                  <strong className="text-white">Every new benefit recipient</strong> has a rational 
                  reason to vote for parties promising more benefits.
                </p>
                <p>
                  <strong className="text-white">The aging population</strong> shifts the electorate 
                  toward pensioners, who depend on government transfers.
                </p>
                <p className="pt-4 border-t border-gray-800 text-amber-400">
                  <strong>Result:</strong> Structural majority for government expansion, 
                  regardless of fiscal sustainability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Ratio */}
      <section className="py-12 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">The Shrinking Tax Base</h2>
            <p className="text-gray-400 text-sm">
              How many market-funded workers support each government-dependent worker?
            </p>
          </div>

          <div className="card p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dependencyRatioData.filter(d => d.year >= 2007)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={[0, 3]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined, name?: string) => value !== undefined ? [
                    name === 'ratio' 
                      ? `${value.toFixed(2)} dependents per market worker` 
                      : `${value}%`,
                    name === 'ratio' ? 'Dependency Ratio' : 'Govt-Dependent %'
                  ] : ['', '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  stroke="#9333EA"
                  strokeWidth={3}
                  name="Dependents per Market Worker"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="card p-6 border-green-900/30">
              <div className="text-sm text-gray-500 uppercase mb-2">2007</div>
              <div className="text-3xl font-bold text-green-400 mono-data">
                {(empFirst.public_sector / (empFirst.private_sector)).toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">
                govt-dependent workers per market worker
              </div>
            </div>
            <div className="card p-6 border-red-900/30">
              <div className="text-sm text-gray-500 uppercase mb-2">2023</div>
              <div className="text-3xl font-bold text-red-400 mono-data">
                {((empLast.public_sector + transferDependentJobs) / (empLast.private_sector - transferDependentJobs)).toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">
                govt-dependent workers per market worker
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Methodology & Caveats</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Data Sources</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• Employment by sector: Statistics Finland, Table 115v</li>
                <li>• D632K purchased services: Statistics Finland, Table 12a6</li>
                <li>• Pensioners: Estimated ~1.5M (ETK/Kela data)</li>
                <li>• Unemployed/Students: Estimated from labor statistics</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Assumptions</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• Voters act in economic self-interest</li>
                <li>• Transfer-dependent jobs estimated from D632K spending / avg wage</li>
                <li>• Not all private workers oppose government programs</li>
                <li>• This is a simplification for illustrative purposes</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Key Insight</h4>
            <p className="text-sm text-gray-400">
              The analysis does not claim all public sector workers or benefit recipients vote 
              for larger government. However, the structural incentives favor parties promising 
              more spending and jobs. When a majority of voters personally benefit from government 
              expansion, democratic pressure becomes one-directional—until fiscal constraints force 
              a crisis.
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
              <div className="text-gray-500 mb-1">Employment by Industry</div>
              <div className="text-gray-300">Statistics Finland, Table 115v</div>
              <div className="text-gray-500">Employed labour force by industry (2007-2023)</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Government Expenditure</div>
              <div className="text-gray-300">Statistics Finland, Table 12a6</div>
              <div className="text-gray-500">D632K purchased market production</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Electorate Estimates</div>
              <div className="text-gray-300">Kela, ETK, Statistics Finland</div>
              <div className="text-gray-500">Pension recipients, unemployed, students</div>
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

