'use client';

import Link from 'next/link';

/**
 * OMICRON PAGE: Public vs Private Service Delivery Efficiency
 * 
 * PLANNED ANALYSIS:
 * Compare efficiency when same services are delivered publicly vs privately:
 * 
 * 1. DAYCARE
 *    - Municipal daycare: cost per child, quality metrics
 *    - Private daycare with Kela subsidy: cost per child, quality metrics
 *    - Compare administrative overhead, parent satisfaction
 * 
 * 2. HEALTHCARE  
 *    - Public hospitals: cost per treatment, wait times
 *    - Private with Kela reimbursement: cost per treatment, efficiency
 *    - Compare outcomes for same procedures
 * 
 * 3. ELDERLY CARE
 *    - Municipal care facilities: cost per resident
 *    - Private care facilities: cost per resident  
 *    - Compare quality scores, staffing ratios
 * 
 * DATA SOURCES:
 * - statfin_vaka - Early childhood education statistics
 * - Regional council data on service providers
 * - Kela reimbursement statistics
 * - THL quality registers
 * 
 * KEY QUESTIONS:
 * - Does privatization reduce costs without harming outcomes?
 * - Where does private delivery excel? Where does it fail?
 * - What's the optimal public/private mix for each service?
 */

export default function OmicronPage() {
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
            <span className="text-purple-500">Omicron</span> | Public vs Private Delivery
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Coming Soon */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-6xl mb-6">🏗️</div>
          <h2 className="text-4xl font-bold mb-4">Coming Soon</h2>
          <p className="text-xl text-gray-400 mb-8">
            Public vs Private Service Delivery Analysis
          </p>
          
          <div className="card p-8 text-left">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Planned Analysis</h3>
            <div className="space-y-4 text-gray-400">
              <div>
                <div className="font-medium text-white mb-1">Daycare Comparison</div>
                <p className="text-sm">Municipal vs private (Kela-subsidized) costs and outcomes</p>
              </div>
              <div>
                <div className="font-medium text-white mb-1">Healthcare Efficiency</div>
                <p className="text-sm">Public hospitals vs private providers with Kela reimbursement</p>
              </div>
              <div>
                <div className="font-medium text-white mb-1">Elderly Care</div>
                <p className="text-sm">Municipal facilities vs private care homes</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="text-sm text-gray-500">Data sources under investigation:</div>
              <div className="text-xs text-gray-600 mt-1">
                statfin_vaka, Regional councils, Kela statistics, THL registers
              </div>
            </div>
          </div>

          <Link
            href="/xi"
            className="inline-flex items-center gap-2 mt-8 text-purple-400 hover:text-purple-300"
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

