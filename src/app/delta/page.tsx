'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PurchasingPowerChart from '@/components/PurchasingPowerChart';
import DecileComparison from '@/components/DecileComparison';
import { PurchasingPowerData } from '@/lib/types';

export default function DeltaPage() {
  const [data, setData] = useState<PurchasingPowerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/purchasing-power');
        if (response.ok) {
          const ppData = await response.json();
          setData(ppData);
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
          <p className="text-gray-400">Loading purchasing power data...</p>
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

  const { summary, income_time_series, wealth_data, decile_labels } = data;
  
  const bottomIncomeChange = summary.decile_changes['1']?.real_income_change_pct || 0;
  const topIncomeChange = summary.decile_changes['10']?.real_income_change_pct || 0;
  const wealthGap = summary.gaps.wealth_gap_widened;

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
            <span className="text-purple-500">Delta</span> | Purchasing Power
          </h1>

          <ShareButton summary={summary} />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-purple-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The <span className="text-purple-400">Divergence</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            How purchasing power has split between income groups since 2015
          </p>

          {/* Key stat cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Bottom 10% Real Income
              </div>
              <div className="text-4xl font-bold text-red-400 mono-data">
                {bottomIncomeChange.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Since 2015</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Top 10% Real Income
              </div>
              <div className="text-4xl font-bold text-purple-400 mono-data">
                {topIncomeChange.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Since 2015</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Wealth Gap Widened
              </div>
              <div className="text-4xl font-bold text-amber-400 mono-data">
                +{wealthGap.toFixed(1)}pp
              </div>
              <div className="text-sm text-gray-500 mt-1">2016-2023</div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Insight */}
      <section className="py-8 px-6 bg-purple-950/10 border-b border-gray-800">
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
            <h2 className="text-2xl font-bold mb-2">Income & Wealth by Decile</h2>
            <p className="text-gray-400 text-sm">
              Track how different income groups have fared. Toggle deciles to compare.
            </p>
          </div>

          <PurchasingPowerChart 
            incomeData={income_time_series}
            wealthData={wealth_data.time_series}
            decileLabels={decile_labels}
          />
        </div>
      </section>

      {/* Decile Comparison */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">The Growing Divide</h2>
            <p className="text-gray-400 text-sm">
              Comparing how the bottom and top have diverged
            </p>
          </div>

          <DecileComparison 
            summary={summary}
            decileLabels={decile_labels}
          />
        </div>
      </section>

      {/* Explanation */}
      <section className="py-8 px-6 border-t border-gray-800 bg-gray-950/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Understanding the Data</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-3">What is Real Income?</h3>
              <p className="text-gray-400 text-sm mb-4">
                Disposable income after taxes and transfers, adjusted for the Maslow CPI 
                (essentials inflation). This shows actual purchasing power for necessities, 
                not just nominal income growth.
              </p>
              <p className="text-gray-400 text-sm">
                When real income is negative, households can afford less essential goods 
                (food, housing, energy) than before — even if their paychecks grew in 
                nominal terms.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-3">What are Income Deciles?</h3>
              <p className="text-gray-400 text-sm mb-4">
                The population is divided into 10 equal groups based on income:
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li><strong className="text-red-400">Decile I:</strong> Lowest-earning 10%</li>
                <li><strong className="text-gray-300">Decile V:</strong> Middle (median)</li>
                <li><strong className="text-purple-400">Decile X:</strong> Highest-earning 10%</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Methodology</h4>
            <p className="text-sm text-gray-400">
              Income data: Statistics Finland Table 128c (yearly 1995-2024). 
              Wealth data: Statistics Finland Table 151u (survey years: 2016, 2019, 2023).
              Real values adjusted using the Maslow CPI for income, and 2023 prices for wealth.
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
              <div className="text-gray-500 mb-1">Income Distribution</div>
              <div className="text-gray-300">Statistics Finland, Table 128c</div>
              <div className="text-gray-500">Disposable income by decile (1995-2024)</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Household Wealth</div>
              <div className="text-gray-300">Statistics Finland, Table 151u</div>
              <div className="text-gray-500">Assets & liabilities by decile (survey years)</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Inflation Adjustment</div>
              <div className="text-gray-300">Maslow CPI</div>
              <div className="text-gray-500">Essentials-weighted inflation (2015=100)</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Share Button Component
function ShareButton({ summary }: { summary: PurchasingPowerData['summary'] }) {
  const bottomChange = summary.decile_changes['1']?.real_income_change_pct || 0;
  const topChange = summary.decile_changes['10']?.real_income_change_pct || 0;
  const wealthGap = summary.gaps.wealth_gap_widened;

  const shareText = `🇫🇮 Finland's Purchasing Power Divide (2015-2024)

📉 Bottom 10%: ${bottomChange.toFixed(1)}% real income
📈 Top 10%: ${topChange.toFixed(1)}% real income
💰 Wealth gap widened: ${wealthGap.toFixed(1)}pp

The poor got poorer, the rich stayed ahead.

See the data →`;

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

