'use client';

import Link from 'next/link';

/**
 * PI PAGE: Regional Spending Efficiency Variation
 * 
 * PLANNED ANALYSIS:
 * Compare spending efficiency across municipalities/regions:
 * 
 * 1. SAME PROGRAMS, DIFFERENT ADMINISTRATION
 *    - How do identical social programs vary in cost by municipality?
 *    - Which municipalities deliver more efficiently?
 *    - What administrative practices drive efficiency?
 * 
 * 2. DEMOGRAPHIC CONTROLS
 *    - Adjust for age structure (more elderly = higher costs)
 *    - Adjust for unemployment rates
 *    - Adjust for population density (rural vs urban)
 *    - Identify true efficiency vs demographic effects
 * 
 * 3. BEST PRACTICES IDENTIFICATION
 *    - Which municipalities are most efficient?
 *    - What do efficient municipalities do differently?
 *    - Potential savings if all matched best performers
 * 
 * DATA SOURCES:
 * - Municipal financial data (already have via Ponzi index)
 * - Regional population data (age structure, density)
 * - Cross-reference spending by region
 * - Employment/unemployment by municipality
 * 
 * KEY METRICS:
 * - Cost per capita by program type
 * - Administrative overhead as % of total
 * - Efficiency-adjusted for demographics
 * - Variance across municipalities
 * 
 * KEY QUESTIONS:
 * - How much variation exists in program delivery costs?
 * - What explains the variation?
 * - How much could be saved with uniform efficiency?
 */

export default function PiPage() {
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
            <span className="text-cyan-500">Pi</span> | Regional Spending Variation
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Coming Soon */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-6xl mb-6">🗺️</div>
          <h2 className="text-4xl font-bold mb-4">Coming Soon</h2>
          <p className="text-xl text-gray-400 mb-8">
            Regional Spending Efficiency Analysis
          </p>
          
          <div className="card p-8 text-left">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">Planned Analysis</h3>
            <div className="space-y-4 text-gray-400">
              <div>
                <div className="font-medium text-white mb-1">Municipal Comparison</div>
                <p className="text-sm">Same programs, different costs across 309 municipalities</p>
              </div>
              <div>
                <div className="font-medium text-white mb-1">Demographic Adjustment</div>
                <p className="text-sm">Control for age structure, unemployment, and population density</p>
              </div>
              <div>
                <div className="font-medium text-white mb-1">Best Practices</div>
                <p className="text-sm">Identify most efficient municipalities and potential nationwide savings</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="text-sm text-gray-500">Data sources under investigation:</div>
              <div className="text-xs text-gray-600 mt-1">
                Municipal financial data (Ponzi index), Regional demographics, Employment statistics
              </div>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-4 text-sm">
            <div className="card p-4">
              <div className="text-2xl font-bold text-cyan-400">309</div>
              <div className="text-gray-500">Municipalities</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-cyan-400">?%</div>
              <div className="text-gray-500">Efficiency variance</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-cyan-400">€?B</div>
              <div className="text-gray-500">Potential savings</div>
            </div>
          </div>

          <Link
            href="/xi"
            className="inline-flex items-center gap-2 mt-8 text-cyan-400 hover:text-cyan-300"
          >
            <span>View current spending efficiency analysis</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}

