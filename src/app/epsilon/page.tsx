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
  Area,
  AreaChart,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { GDPSectorsData, EmploymentSectorsData, PublicSubsidiesData } from '@/lib/types';

export default function EpsilonPage() {
  const [gdpData, setGdpData] = useState<GDPSectorsData | null>(null);
  const [employmentData, setEmploymentData] = useState<EmploymentSectorsData | null>(null);
  const [subsidiesData, setSubsidiesData] = useState<PublicSubsidiesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const [gdpResponse, empResponse, subsidiesResponse] = await Promise.all([
          fetch(`${basePath}/data/gdp_sectors.json`),
          fetch(`${basePath}/data/employment_sectors.json`),
          fetch(`${basePath}/data/public_subsidies.json`),
        ]);

        if (gdpResponse.ok) {
          setGdpData(await gdpResponse.json());
        }
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
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading economic data...</p>
        </div>
      </div>
    );
  }

  if (!gdpData || !employmentData) {
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

  // Calculate key metrics
  const gdpFirst = gdpData.time_series[0];
  const gdpLast = gdpData.time_series[gdpData.time_series.length - 1];
  const empFirst = employmentData.time_series[0];
  const empLast = employmentData.time_series[employmentData.time_series.length - 1];

  // Tax burden per private worker (simplified: public sector GDP / private workers)
  const taxBurdenFirst = Math.round(
    (gdpFirst.public_sector_gdp * 1_000_000) / empFirst.private_sector
  );
  const taxBurdenLast = Math.round(
    (gdpLast.public_sector_gdp * 1_000_000) / empLast.private_sector
  );

  // Get latest subsidies data if available
  const latestSubsidies = subsidiesData?.time_series[subsidiesData.time_series.length - 1];
  const subsidiesSummary = subsidiesData?.summary;

  // Adjusted tax burden including all public funding (D3K + D62K + D632K)
  const totalPublicFundingPerWorker = latestSubsidies && empLast
    ? Math.round((latestSubsidies.total_public_funding_million * 1_000_000) / empLast.private_sector)
    : 0;
  const adjustedTaxBurden = taxBurdenLast + totalPublicFundingPerWorker;

  // Direct public to private (D3K + D632K only)
  const directPublicFundingPerWorker = latestSubsidies && empLast
    ? Math.round((latestSubsidies.direct_public_to_private_million * 1_000_000) / empLast.private_sector)
    : 0;

  // Prepare chart data - merge GDP and employment data
  const gdpChartData = gdpData.time_series.map((entry) => ({
    year: entry.year,
    total_gdp: entry.total_gdp / 1000, // Convert to billions
    public_gdp: entry.public_sector_gdp / 1000,
    private_gdp: entry.private_sector_gdp / 1000,
    public_share: entry.public_share_pct,
    manufacturing_share: entry.manufacturing_share_pct,
  }));

  const employmentChartData = employmentData.time_series.map((entry) => ({
    year: entry.year,
    total: entry.total_employed / 1000, // Convert to thousands
    public: entry.public_sector / 1000,
    private: entry.private_sector / 1000,
    manufacturing: entry.manufacturing / 1000,
    public_pct: entry.public_pct,
    manufacturing_pct: entry.manufacturing_pct,
    private_per_public: entry.private_per_public,
  }));

  // Prepare FOUR-WAY GDP split chart (Pure Private / Benefits-Funded / Subsidies+Purchased / Pure Public)
  const fourWayGdpData = gdpData.time_series
    .filter(gdp => gdp.year >= 2015) // Only years with subsidies data
    .map((gdp) => {
      const subsidyYear = subsidiesData?.time_series.find(s => s.year === gdp.year);
      
      // Direct public flows (D3K + D632K)
      const directPublic = subsidyYear ? subsidyYear.direct_public_to_private_million / 1000 : 0;
      // Benefits (D62K) - cash transfers that fund private consumption
      const benefits = subsidyYear ? subsidyYear.benefits_total_million / 1000 : 0;
      // Pure public (O, P, Q sectors)
      const purePublic = gdp.public_sector_gdp / 1000;
      // Total GDP
      const totalGdp = gdp.total_gdp / 1000;
      // Pure private = total - public - direct flows - benefits
      const purePrivate = Math.max(0, totalGdp - purePublic - directPublic - benefits);
      
      return {
        year: gdp.year,
        pure_private: purePrivate,
        benefits_funded: benefits,
        direct_public: directPublic,
        pure_public: purePublic,
        total: totalGdp,
      };
    });

  // Breakdown chart for all public funding
  const fundingBreakdownData = latestSubsidies ? [
    { name: 'Pensions & Benefits', value: latestSubsidies.benefits_total_million / 1000, color: '#84CC16' },
    { name: 'Social Care (purchased)', value: latestSubsidies.purchased_social_million / 1000, color: '#ef4444' },
    { name: 'Healthcare (purchased)', value: latestSubsidies.purchased_health_million / 1000, color: '#f97316' },
    { name: 'Business Subsidies', value: (latestSubsidies.subsidies_economic_million - latestSubsidies.subsidies_agriculture_million) / 1000, color: '#22c55e' },
    { name: 'Agriculture', value: latestSubsidies.subsidies_agriculture_million / 1000, color: '#06b6d4' },
    { name: 'Housing', value: latestSubsidies.subsidies_housing_million / 1000, color: '#8b5cf6' },
  ] : [];

  // Time series for all public funding categories
  const publicFundingTimeSeries = subsidiesData?.time_series.map(entry => ({
    year: entry.year,
    subsidies: entry.subsidies_total_million / 1000,
    benefits: entry.benefits_total_million / 1000,
    purchased: entry.purchased_total_million / 1000,
    total: entry.total_public_funding_million / 1000,
  })) || [];

  // Calculate government footprint percentage
  const latestFourWay = fourWayGdpData[fourWayGdpData.length - 1];
  const govtFootprintPct = latestFourWay 
    ? Math.round((latestFourWay.pure_public + latestFourWay.direct_public + latestFourWay.benefits_funded) / latestFourWay.total * 100)
    : 0;

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
            <span className="text-blue-500">Epsilon</span> | The Tax Burden Atlas
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-blue-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Who Funds the <span className="text-blue-400">State</span>?
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            {govtFootprintPct}% of Finland&apos;s GDP is government-dependent. How does this impact private workers?
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Government Footprint
              </div>
              <div className="text-4xl font-bold text-red-400 mono-data">
                {govtFootprintPct}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                of GDP is publicly funded
              </div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Private Workers per Public
              </div>
              <div className="text-4xl font-bold text-amber-400 mono-data">
                {empLast.private_per_public?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                down from {empFirst.private_per_public?.toFixed(1)} in {empFirst.year}
              </div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                True Burden / Worker
              </div>
              <div className="text-4xl font-bold text-purple-400 mono-data">
                €{Math.round(adjustedTaxBurden / 1000)}k
              </div>
              <div className="text-sm text-gray-500 mt-1">
                including all public funding
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard
              label="Public Employment"
              value={`${empLast.public_pct.toFixed(1)}%`}
              subtext={`up from ${empFirst.public_pct.toFixed(1)}%`}
              color="text-red-400"
            />
            <StatCard
              label="Manufacturing Lost"
              value={`${Math.round((empLast.manufacturing - empFirst.manufacturing) / 1000)}k`}
              subtext={`${empFirst.year}-${empLast.year}`}
              color="text-orange-500"
            />
            <StatCard
              label="Public Jobs Added"
              value={`+${Math.round((empLast.public_sector - empFirst.public_sector) / 1000)}k`}
              subtext={`${empFirst.year}-${empLast.year}`}
              color="text-purple-400"
            />
            <StatCard
              label="Total GDP"
              value={`€${Math.round(gdpLast.total_gdp / 1000)}B`}
              subtext={`was €${Math.round(gdpFirst.total_gdp / 1000)}B`}
              color="text-green-400"
            />
          </div>
        </div>
      </section>

      {/* Government Footprint Section */}
      {subsidiesData && latestSubsidies && (
        <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-amber-950/10 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                The True <span className="text-amber-400">Government Footprint</span>
              </h2>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                Beyond direct public sector GDP, €{subsidiesSummary?.current_total_billion}B ({subsidiesSummary?.total_pct_of_gdp}% of GDP) 
                flows from government to private sector through subsidies, benefits, and purchased services.
              </p>
            </div>

            {/* Key Stats - Four categories */}
            <div className="grid md:grid-cols-5 gap-4 max-w-6xl mx-auto mb-10">
              <div className="card p-5 border-red-900/30">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Pure Public (O,P,Q)
                </div>
                <div className="text-3xl font-bold text-red-400 mono-data">
                  €{Math.round(gdpLast.public_sector_gdp / 1000)}B
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ~{Math.round(gdpLast.public_share_pct)}% of GDP
                </div>
              </div>

              <div className="card p-5 border-lime-900/30">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Social Benefits
                </div>
                <div className="text-3xl font-bold text-lime-400 mono-data">
                  €{subsidiesSummary?.current_benefits_billion}B
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {subsidiesSummary?.benefits_pct_of_gdp}% of GDP
                </div>
              </div>

              <div className="card p-5 border-orange-900/30">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Business Subsidies
                </div>
                <div className="text-3xl font-bold text-orange-400 mono-data">
                  €{subsidiesSummary?.current_subsidies_billion}B
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  grants, R&D, agriculture
                </div>
              </div>

              <div className="card p-5 border-amber-900/30">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Purchased Services
                </div>
                <div className="text-3xl font-bold text-amber-400 mono-data">
                  €{subsidiesSummary?.current_purchased_billion}B
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  healthcare, social care
                </div>
              </div>

              <div className="card p-5 border-green-900/30">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Pure Private
                </div>
                <div className="text-3xl font-bold text-green-400 mono-data">
                  ~{100 - govtFootprintPct}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  market-funded only
                </div>
              </div>
            </div>

            {/* Key Insight */}
            <div className="max-w-4xl mx-auto mb-10">
              <blockquote className="text-lg md:text-xl text-gray-300 italic text-center p-6 bg-amber-950/20 rounded-lg border border-amber-900/30">
                &ldquo;Finland&apos;s government controls ~{govtFootprintPct}% of GDP through direct spending, benefits, 
                and purchased services. Each private worker effectively funds €{Math.round(adjustedTaxBurden / 1000)}k 
                of government activity annually.&rdquo;
              </blockquote>
            </div>

            {/* Four-Way GDP Split Chart */}
            <div className="mb-10">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">True GDP Composition</h3>
                <p className="text-gray-400 text-sm">
                  Four-way split showing public sector, social benefits, direct subsidies, and pure private activity
                </p>
              </div>

              <div className="card p-6 h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fourWayGdpData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(v) => `€${v}B`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined) => value !== undefined ? `€${value.toFixed(1)}B` : 'N/A'}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="pure_private"
                      stackId="1"
                      stroke="#22C55E"
                      fill="#22C55E"
                      fillOpacity={0.7}
                      name="Pure Private (market-funded)"
                    />
                    <Area
                      type="monotone"
                      dataKey="benefits_funded"
                      stackId="1"
                      stroke="#84CC16"
                      fill="#84CC16"
                      fillOpacity={0.7}
                      name="Benefits-Funded (D62K)"
                    />
                    <Area
                      type="monotone"
                      dataKey="direct_public"
                      stackId="1"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      fillOpacity={0.7}
                      name="Direct Public (D3K+D632K)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pure_public"
                      stackId="1"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.7}
                      name="Pure Public (O,P,Q sectors)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Funding Breakdown */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Bar chart of breakdown */}
              <div>
                <h3 className="text-xl font-bold mb-4">Public Funding Breakdown ({latestSubsidies.year})</h3>
                <div className="card p-6 h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fundingBreakdownData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" tickFormatter={(v) => `€${v}B`} />
                      <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={140} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number | undefined) => value !== undefined ? `€${value.toFixed(1)}B` : 'N/A'}
                      />
                      <Bar dataKey="value" name="Amount">
                        {fundingBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Time series of all public funding */}
              <div>
                <h3 className="text-xl font-bold mb-4">Growth Over Time</h3>
                <div className="card p-6 h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={publicFundingTimeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" tickFormatter={(v) => `€${v}B`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number | undefined) => value !== undefined ? `€${value.toFixed(1)}B` : 'N/A'}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="subsidies"
                        stackId="1"
                        stroke="#F97316"
                        fill="#F97316"
                        fillOpacity={0.6}
                        name="Subsidies (D3K)"
                      />
                      <Area
                        type="monotone"
                        dataKey="purchased"
                        stackId="1"
                        stroke="#F59E0B"
                        fill="#F59E0B"
                        fillOpacity={0.6}
                        name="Purchased (D632K)"
                      />
                      <Area
                        type="monotone"
                        dataKey="benefits"
                        stackId="1"
                        stroke="#84CC16"
                        fill="#84CC16"
                        fillOpacity={0.6}
                        name="Benefits (D62K)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Total growth: +{subsidiesSummary?.growth_since_start_pct}% since {subsidiesSummary?.start_year}
                </p>
              </div>
            </div>

            {/* Category explanations */}
            <div className="grid md:grid-cols-3 gap-6 mt-10">
              <div className="card p-6 border-lime-900/30">
                <h4 className="text-lg font-semibold text-lime-400 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💶</span> D62K: Social Benefits
                </h4>
                <p className="text-gray-400 text-sm mb-3">
                  Cash transfers that flow to households and get spent in the private economy
                </p>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex justify-between">
                    <span>Pensions, unemployment, etc.:</span>
                    <span className="text-white mono-data">€{(latestSubsidies.benefits_total_million / 1000).toFixed(1)}B</span>
                  </li>
                </ul>
              </div>

              <div className="card p-6 border-orange-900/30">
                <h4 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💰</span> D3K: Subsidies
                </h4>
                <p className="text-gray-400 text-sm mb-3">
                  Direct grants to businesses and households
                </p>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex justify-between">
                    <span>Agricultural (CAP):</span>
                    <span className="text-white mono-data">€{(latestSubsidies.subsidies_agriculture_million / 1000).toFixed(1)}B</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Business R&D:</span>
                    <span className="text-white mono-data">€{((latestSubsidies.subsidies_economic_million - latestSubsidies.subsidies_agriculture_million) / 1000).toFixed(1)}B</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Housing:</span>
                    <span className="text-white mono-data">€{(latestSubsidies.subsidies_housing_million / 1000).toFixed(1)}B</span>
                  </li>
                </ul>
              </div>

              <div className="card p-6 border-amber-900/30">
                <h4 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏥</span> D632K: Purchased Services
                </h4>
                <p className="text-gray-400 text-sm mb-3">
                  Government buying services from private providers
                </p>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex justify-between">
                    <span>Healthcare (Kela):</span>
                    <span className="text-white mono-data">€{(latestSubsidies.purchased_health_million / 1000).toFixed(1)}B</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Social care:</span>
                    <span className="text-white mono-data">€{(latestSubsidies.purchased_social_million / 1000).toFixed(1)}B</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Education:</span>
                    <span className="text-white mono-data">€{(latestSubsidies.purchased_education_million / 1000).toFixed(1)}B</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Key Insight */}
      <section className="py-8 px-6 bg-blue-950/10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <blockquote className="text-lg md:text-xl text-gray-300 italic text-center">
            &ldquo;Since {empFirst.year}, Finland lost {Math.abs(Math.round((empLast.manufacturing - empFirst.manufacturing) / 1000))}k manufacturing jobs 
            while adding {Math.round((empLast.public_sector - empFirst.public_sector) / 1000)}k public sector jobs. 
            Each private worker now supports {(1 / (empLast.private_per_public || 1)).toFixed(2)} public workers.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* GDP Composition Chart */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">GDP by Sector (Traditional View)</h2>
            <p className="text-gray-400 text-sm">
              Public sector includes education, healthcare, and public administration (O, P, Q)
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gdpChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? `€${value.toFixed(0)}B` : 'N/A'}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="private_gdp"
                  stackId="1"
                  stroke="#22C55E"
                  fill="#22C55E"
                  fillOpacity={0.6}
                  name="Private Sector"
                />
                <Area
                  type="monotone"
                  dataKey="public_gdp"
                  stackId="1"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.6}
                  name="Public Sector"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Employment Structure Chart */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Employment Structure</h2>
            <p className="text-gray-400 text-sm">
              Private workers per public sector employee - the &quot;support ratio&quot;
            </p>
          </div>

          <div className="card p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={employmentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" domain={[0, 35]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="public_pct"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Public Sector %"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="manufacturing_pct"
                  stroke="#F97316"
                  strokeWidth={2}
                  name="Manufacturing %"
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="private_per_public"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Private/Public Ratio"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* The Math */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The Tax Burden Math</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card p-6 border-red-900/30">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏛️</span> Growing Public Sector
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex justify-between">
                  <span>Public employment ({empFirst.year}):</span>
                  <span className="text-white font-semibold mono-data">
                    {(empFirst.public_sector / 1000).toFixed(0)}k
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Public employment ({empLast.year}):</span>
                  <span className="text-white font-semibold mono-data">
                    {(empLast.public_sector / 1000).toFixed(0)}k
                  </span>
                </li>
                <li className="flex justify-between pt-2 border-t border-gray-800">
                  <span>Change:</span>
                  <span className="text-red-400 font-bold mono-data">
                    +{Math.round((empLast.public_sector - empFirst.public_sector) / 1000)}k (+
                    {(
                      ((empLast.public_sector - empFirst.public_sector) / empFirst.public_sector) *
                      100
                    ).toFixed(0)}
                    %)
                  </span>
                </li>
              </ul>
            </div>

            <div className="card p-6 border-orange-900/30">
              <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏭</span> Shrinking Industry
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex justify-between">
                  <span>Manufacturing ({empFirst.year}):</span>
                  <span className="text-white font-semibold mono-data">
                    {(empFirst.manufacturing / 1000).toFixed(0)}k
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Manufacturing ({empLast.year}):</span>
                  <span className="text-white font-semibold mono-data">
                    {(empLast.manufacturing / 1000).toFixed(0)}k
                  </span>
                </li>
                <li className="flex justify-between pt-2 border-t border-gray-800">
                  <span>Change:</span>
                  <span className="text-orange-400 font-bold mono-data">
                    {Math.round((empLast.manufacturing - empFirst.manufacturing) / 1000)}k (
                    {(
                      ((empLast.manufacturing - empFirst.manufacturing) / empFirst.manufacturing) *
                      100
                    ).toFixed(0)}
                    %)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Methodology</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Government Footprint</h3>
              <p className="text-gray-400 text-sm mb-4">
                We calculate the total government footprint as the sum of: (1) Pure public sector GDP (O, P, Q industries), 
                (2) D62K social benefits flowing to private consumption, and (3) D3K subsidies + D632K purchased services.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-3">The Support Ratio</h3>
              <p className="text-gray-400 text-sm mb-4">
                The &quot;Private per Public&quot; ratio shows how many private sector workers exist
                for each public sector worker. A declining ratio means each private worker must fund
                more government services.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-6">
            <div>
              <h3 className="text-lg font-semibold text-lime-400 mb-3">D62K: Social Benefits</h3>
              <p className="text-gray-400 text-sm mb-4">
                Cash transfers (pensions, unemployment benefits, child benefits) that flow to households 
                and are spent in the private economy. While this doesn&apos;t directly fund private businesses, 
                it represents government-controlled consumption that appears as private sector activity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">D3K + D632K: Direct Flows</h3>
              <p className="text-gray-400 text-sm mb-4">
                D3K subsidies (business grants, agricultural support) and D632K purchased services 
                (Kela reimbursements, outsourced care) represent taxpayer money flowing directly to 
                nominally private companies.
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">True Tax Burden Formula</h4>
            <code className="text-sm text-blue-400 font-mono block">
              True Burden = (Public Sector GDP + D3K + D62K + D632K) / Private Workers
            </code>
            <p className="text-xs text-gray-500 mt-2">
              Current: €{Math.round(adjustedTaxBurden / 1000)}k per private worker 
              (vs €{Math.round(taxBurdenLast / 1000)}k using only public sector GDP)
            </p>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-8 px-6 bg-gray-950/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Data Sources</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-gray-500 mb-1">GDP by Industry</div>
              <div className="text-gray-300">Statistics Finland, Table 123h</div>
              <div className="text-gray-500">Income and production by sector (1975-2024)</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Employment by Industry</div>
              <div className="text-gray-300">Statistics Finland, Table 115i</div>
              <div className="text-gray-500">Employed labour force by industry (2007-2023)</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Government Expenditure</div>
              <div className="text-gray-300">Statistics Finland, Table 12a6</div>
              <div className="text-gray-500">D3K, D62K, D632K by function (2015-2024)</div>
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
