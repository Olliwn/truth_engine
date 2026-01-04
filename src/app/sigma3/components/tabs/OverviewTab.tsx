'use client';

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { LegacyAnnualPopulationResult as AnnualPopulationResult } from '@/lib/simulation/index';
import type { PopulationSimulationResult } from '@/lib/simulation/adapter';

type PopulationSimulationSummary = PopulationSimulationResult['summary'];

// ===========================================
// Formatting
// ===========================================

const formatMillions = (n: number) => {
  if (!isFinite(n)) return '€--';
  const billions = n / 1000;
  if (Math.abs(billions) >= 1000) return `€${(billions / 1000).toFixed(1)}T`;
  if (Math.abs(billions) >= 1) return `€${billions.toFixed(1)}B`;
  return `€${n.toFixed(0)}M`;
};

// ===========================================
// Summary Card Component
// ===========================================

interface SummaryCardProps {
  label: string;
  value: string;
  sublabel?: string;
  color?: 'green' | 'amber' | 'red' | 'purple' | 'gray';
  highlight?: boolean;
}

function SummaryCard({ label, value, sublabel, color = 'gray', highlight }: SummaryCardProps) {
  const colorClasses = {
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    gray: 'text-gray-300',
  };

  return (
    <div className={`p-4 rounded-lg text-center ${highlight ? 'bg-purple-950/30 border border-purple-800/30' : 'bg-gray-900/50'}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      {sublabel && <div className="text-xs text-gray-600 mt-1">{sublabel}</div>}
    </div>
  );
}

// ===========================================
// Main OverviewTab Component
// ===========================================

interface OverviewTabProps {
  selectedYear: number;
  annualResults: AnnualPopulationResult[];
  currentYearData: AnnualPopulationResult;
  summary: PopulationSimulationSummary;
  effectiveGrowthRate: number;
}

export function OverviewTab({
  selectedYear,
  annualResults,
  currentYearData,
  summary,
  effectiveGrowthRate,
}: OverviewTabProps) {
  // Prepare chart data
  const chartData = annualResults.map(r => ({
    year: r.year,
    contributions: r.totalContributions,
    costs: r.totalStateCosts,
    balance: r.netFiscalBalance,
    gdpAdjustedBalance: r.gdpAdjustedBalance,
    tfr: r.tfr,
    unemploymentRate: r.unemploymentRate * 100, // Convert to percentage for display
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Peak Surplus"
          value={String(summary.peakSurplusYear)}
          sublabel={formatMillions(summary.peakSurplusAmount)}
          color="green"
        />
        <SummaryCard
          label="First Deficit"
          value={summary.firstDeficitYear ? String(summary.firstDeficitYear) : 'N/A'}
          sublabel="costs > contributions"
          color="red"
        />
        <SummaryCard
          label="Cumulative (base)"
          value={formatMillions(summary.cumulativeBalance)}
          sublabel="1990-2060"
          color={summary.cumulativeBalance >= 0 ? 'green' : 'red'}
        />
        <SummaryCard
          label="Realistic (Cost Growth)"
          value={formatMillions(summary.gdpAdjustedCumulativeBalance)}
          sublabel={`${(effectiveGrowthRate * 100).toFixed(1)}%/yr`}
          color={summary.gdpAdjustedCumulativeBalance >= 0 ? 'green' : 'amber'}
          highlight
        />
      </div>

      {/* Main Overview Chart */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          Fiscal Balance Overview (1990-2060)
        </h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}B`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#F59E0B"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(1)}
                domain={[0, 3]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  if (name === 'TFR') return [(value as number).toFixed(2), name];
                  return [`€${((value as number) / 1000).toFixed(1)}B`, name];
                }}
              />
              <Legend />
              <ReferenceLine yAxisId="left" y={0} stroke="#6B7280" strokeDasharray="3 3" />
              <ReferenceLine yAxisId="right" y={2.1} stroke="#22C55E" strokeDasharray="3 3" />
              <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
              <ReferenceLine x={2024} stroke="#A855F7" strokeDasharray="3 3" />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="contributions"
                name="Contributions"
                fill="#22C55E"
                fillOpacity={0.2}
                stroke="#22C55E"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="costs"
                name="State Costs"
                fill="#EF4444"
                fillOpacity={0.2}
                stroke="#EF4444"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="balance"
                name="Optimistic (Costs Frozen)"
                stroke="#A855F7"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="gdpAdjustedBalance"
                name="Realistic (Cost Growth)"
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tfr"
                name="TFR"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakeven Analysis */}
      <div className="bg-gradient-to-r from-purple-950/30 to-transparent rounded-lg p-4 border border-purple-800/30">
        <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
          🎯 GDP Growth Required to Balance Budget
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">Breakeven growth (by 2060)</div>
            <div className="text-2xl font-bold text-gray-300">
              {summary.breakevenGrowthRate
                ? `${(summary.breakevenGrowthRate * 100).toFixed(1)}%`
                : 'N/A'}/year
            </div>
            <div className="text-xs text-gray-600">Required to close cumulative deficit gap</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Your scenario</div>
            <div className={`text-2xl font-bold ${
              effectiveGrowthRate >= (summary.breakevenGrowthRate || 0)
                ? 'text-green-400'
                : 'text-amber-400'
            }`}>
              {(effectiveGrowthRate * 100).toFixed(1)}%/year
            </div>
            <div className="text-xs text-gray-600">
              {effectiveGrowthRate >= (summary.breakevenGrowthRate || 0)
                ? '✓ Above breakeven threshold'
                : '⚠ Below breakeven threshold'}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          <strong>Note:</strong> Finland&apos;s historical real GDP growth averaged ~1.5%/year.
          With shrinking working-age population, achieving this growth requires higher productivity gains.
        </p>
      </div>

      {/* Current Year Details */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Population ({selectedYear})</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="text-white font-medium">
                {(currentYearData.totalPopulation / 1000000).toFixed(2)}M
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Working Age</span>
              <span className="text-green-400">
                {(currentYearData.workingAge / 1000000).toFixed(2)}M
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Elderly (65+)</span>
              <span className="text-amber-400">
                {(currentYearData.elderly / 1000000).toFixed(2)}M
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Workers/Retiree</span>
              <span className="text-white font-medium">
                {(currentYearData.workingAge / currentYearData.elderly).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-800">
              <span className="text-gray-500">Unemployment</span>
              <span className={currentYearData.unemploymentRate < 0.06 ? 'text-green-400' : currentYearData.unemploymentRate > 0.08 ? 'text-amber-400' : 'text-white'}>
                {(currentYearData.unemploymentRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Fiscal ({selectedYear})</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Contributions</span>
              <span className="text-green-400">{formatMillions(currentYearData.totalContributions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">State Costs</span>
              <span className="text-red-400">{formatMillions(currentYearData.totalStateCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500" title="Wages grow with GDP, costs frozen at 2024 levels">Optimistic</span>
              <span className={currentYearData.netFiscalBalance >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatMillions(currentYearData.netFiscalBalance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500" title="Includes healthcare/pension cost growth above GDP">Realistic</span>
              <span className={currentYearData.gdpAdjustedBalance >= 0 ? 'text-green-400' : 'text-amber-400'}>
                {formatMillions(currentYearData.gdpAdjustedBalance)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Debt ({selectedYear})</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Debt Stock</span>
              <span className="text-rose-400">€{currentYearData.debtStock.toFixed(0)}B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Debt/GDP</span>
              <span className={currentYearData.debtToGDP < 60 ? 'text-green-400' : 'text-rose-400'}>
                {currentYearData.debtToGDP.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interest/Year</span>
              <span className="text-amber-400">{formatMillions(currentYearData.interestExpense)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">GDP</span>
              <span className="text-purple-400">€{currentYearData.gdp.toFixed(0)}B</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

