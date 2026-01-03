'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import InflationChart from '@/components/InflationChart';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import { MaslowData } from '@/lib/types';

export default function GammaPage() {
  const [data, setData] = useState<MaslowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/data/maslow_cpi.json`);
        if (response.ok) {
          const maslowData = await response.json();
          setData(maslowData);
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
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading inflation data...</p>
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

  const { summary, time_series, category_breakdown, weights } = data;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back</span>
          </Link>

          <h1 className="text-lg font-semibold">
            <span className="text-amber-500">Gamma</span> | The Hidden Inflation
          </h1>

          <ShareButton summary={summary} />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-amber-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The <span className="text-amber-400">Maslow CPI</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            What inflation looks like when you can only afford the essentials
          </p>

          {/* Key stat cards - primary */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Working Class Inflation
              </div>
              <div className="text-4xl font-bold text-red-400 mono-data">
                +{summary.maslow_cpi.total_change_pct}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Since 2015</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Real Wages
              </div>
              <div className="text-4xl font-bold text-amber-400 mono-data">
                {summary.real_wage.total_change_pct > 0 ? '+' : ''}{summary.real_wage.total_change_pct}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Purchasing power</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                S&P 500 (US)
              </div>
              <div className="text-4xl font-bold text-purple-400 mono-data">
                +{summary.sp500.total_change_pct}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Capital gains</div>
            </div>
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard
              label="Official CPI"
              value={`+${summary.official_cpi.total_change_pct}%`}
              color="text-blue-400"
            />
            <StatCard
              label="Nominal Wages"
              value={`+${summary.nominal_wage.total_change_pct}%`}
              color="text-yellow-400"
            />
            <StatCard
              label="GDP per Capita"
              value={`+${summary.gdp_per_capita.total_change_pct}%`}
              color="text-green-400"
            />
            <StatCard
              label="Hidden Gap"
              value={`+${(summary.maslow_cpi.total_change_pct - summary.official_cpi.total_change_pct).toFixed(1)}pp`}
              color="text-red-500"
            />
          </div>
        </div>
      </section>

      {/* Key Insight */}
      <section className="py-8 px-6 bg-amber-950/10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <blockquote className="text-lg md:text-xl text-gray-300 italic text-center">
            &ldquo;{summary.key_insight}&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Main Chart */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Economic Indicators Comparison</h2>
            <p className="text-gray-400 text-sm">
              Toggle different indicators to compare inflation, wages, GDP, and stock market performance
            </p>
          </div>

          <InflationChart data={time_series} />
        </div>
      </section>

      {/* Category Breakdown */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">What&apos;s Driving the Gap?</h2>
            <p className="text-gray-400 text-sm">
              Breakdown of essential categories that make up the Maslow CPI
            </p>
          </div>

          <CategoryBreakdown categories={category_breakdown} weights={weights} />
        </div>
      </section>

      {/* The Story */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The Two Economies</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card p-6 border-red-900/30">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">👷</span> The Worker&apos;s Economy
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex justify-between">
                  <span>Essential costs (Maslow CPI):</span>
                  <span className="text-red-400 font-semibold mono-data">+{summary.maslow_cpi.total_change_pct}%</span>
                </li>
                <li className="flex justify-between">
                  <span>Real wage growth:</span>
                  <span className={`font-semibold mono-data ${summary.real_wage.total_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {summary.real_wage.total_change_pct > 0 ? '+' : ''}{summary.real_wage.total_change_pct}%
                  </span>
                </li>
                <li className="flex justify-between pt-2 border-t border-gray-800">
                  <span>Net purchasing power:</span>
                  <span className="text-red-500 font-bold mono-data">
                    {(summary.real_wage.total_change_pct - (summary.maslow_cpi.total_change_pct - summary.official_cpi.total_change_pct)).toFixed(1)}%
                  </span>
                </li>
              </ul>
            </div>

            <div className="card p-6 border-purple-900/30">
              <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">💰</span> The Investor&apos;s Economy
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex justify-between">
                  <span>S&P 500 (US stocks):</span>
                  <span className="text-purple-400 font-semibold mono-data">+{summary.sp500.total_change_pct}%</span>
                </li>
                <li className="flex justify-between">
                  <span>Finnish assets (housing+stocks):</span>
                  <span className="text-purple-400 font-semibold mono-data">+{summary.asset_index.total_change_pct}%</span>
                </li>
                <li className="flex justify-between pt-2 border-t border-gray-800">
                  <span>Wealth vs wages gap:</span>
                  <span className="text-purple-500 font-bold mono-data">
                    +{(summary.sp500.total_change_pct - summary.nominal_wage.total_change_pct).toFixed(0)}%
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
              <h3 className="text-lg font-semibold text-amber-400 mb-3">What is the Maslow CPI?</h3>
              <p className="text-gray-400 text-sm mb-4">
                Named after Maslow&apos;s hierarchy of needs, this index measures inflation 
                in categories essential for basic survival: food, housing, energy, and fuel.
              </p>
              <p className="text-gray-400 text-sm">
                Unlike the official CPI which includes electronics, recreation, and other 
                discretionary items that can dilute the impact of essential cost increases, 
                the Maslow CPI reflects what lower-income households actually experience.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">Why It Matters</h3>
              <p className="text-gray-400 text-sm mb-4">
                When energy prices spike 47% but official inflation shows only 22%, 
                workers whose budgets are dominated by necessities feel the squeeze 
                far more than statistics suggest.
              </p>
              <p className="text-gray-400 text-sm">
                Meanwhile, those with investment portfolios (particularly in US stocks) 
                have seen wealth grow {summary.sp500.total_change_pct}% — creating a 
                divergence between economic realities.
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Formula</h4>
            <code className="text-sm text-amber-400 font-mono">
              Maslow CPI = (Food × 35%) + (Housing × 40%) + (Energy × 15%) + (Fuel × 10%)
            </code>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-8 px-6 bg-gray-950/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Data Sources</h3>
          <div className="grid md:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Consumer Price Index</div>
              <div className="text-gray-300">Statistics Finland, Table 11xc</div>
              <div className="text-gray-500">CPI by commodity group (2015=100)</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Wages & GDP</div>
              <div className="text-gray-300">Statistics Finland</div>
              <div className="text-gray-500">Tables 14un, 123x (2015=100)</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Housing & Finnish Stocks</div>
              <div className="text-gray-300">Statistics Finland, Nasdaq Nordic</div>
              <div className="text-gray-500">Tables 13mz, OMXH25</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">US Stock Market</div>
              <div className="text-gray-300">S&P 500 Index</div>
              <div className="text-gray-500">Normalized to 2015=100</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Small stat card component
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-bold mono-data ${color}`}>{value}</div>
    </div>
  );
}

// Share Button Component
function ShareButton({ summary }: { summary: MaslowData['summary'] }) {
  const shareText = `🇫🇮 Finland's Hidden Inflation (2015-2024)

📊 Essential costs: +${summary.maslow_cpi.total_change_pct}%
💰 Real wages: ${summary.real_wage.total_change_pct > 0 ? '+' : ''}${summary.real_wage.total_change_pct}%
📈 S&P 500: +${summary.sp500.total_change_pct}%

Workers fall behind while capital owners prosper.

The Maslow CPI reveals what statistics hide →`;

  const handleShare = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      Share
    </button>
  );
}
