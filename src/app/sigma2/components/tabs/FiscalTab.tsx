'use client';

import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { AnnualPopulationResult, PopulationSimulationResult } from '@/lib/populationSimulator';

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
// Main FiscalTab Component
// ===========================================

interface FiscalTabProps {
  selectedYear: number;
  annualResults: AnnualPopulationResult[];
  currentYearData: AnnualPopulationResult;
  summary: PopulationSimulationSummary;
  effectiveGrowthRate: number;
}

export function FiscalTab({
  selectedYear,
  annualResults,
  currentYearData,
  summary,
  effectiveGrowthRate,
}: FiscalTabProps) {
  // Prepare fiscal balance chart data
  const fiscalChartData = annualResults.map(r => ({
    year: r.year,
    contributions: r.totalContributions,
    costs: r.totalStateCosts,
    balance: r.netFiscalBalance,
    gdpAdjustedBalance: r.gdpAdjustedBalance,
    dependencyRatio: r.oldAgeDependencyRatio,
  }));

  // Prepare cost breakdown data
  const costBreakdownData = annualResults.map(r => ({
    year: r.year,
    education: r.educationCosts,
    healthcare: r.healthcareCosts,
    pensions: r.pensionCosts,
    benefits: r.benefitCosts,
    interest: r.interestExpense,
  }));

  // Immigration fiscal impact data
  const immigrationChartData = annualResults.map(r => ({
    year: r.year,
    workBased: r.immigrationByType.workBased.fiscalImpact,
    family: r.immigrationByType.family.fiscalImpact,
    humanitarian: r.immigrationByType.humanitarian.fiscalImpact,
    total: r.immigrationFiscalImpact,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Contributions</div>
          <div className="text-xl font-bold text-green-400">
            {formatMillions(currentYearData.totalContributions)}
          </div>
          <div className="text-xs text-gray-600">in {selectedYear}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wide">State Costs</div>
          <div className="text-xl font-bold text-red-400">
            {formatMillions(currentYearData.totalStateCosts)}
          </div>
          <div className="text-xs text-gray-600">in {selectedYear}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Net Balance</div>
          <div className={`text-xl font-bold ${currentYearData.netFiscalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatMillions(currentYearData.netFiscalBalance)}
          </div>
          <div className="text-xs text-gray-600">primary balance</div>
        </div>
        <div className="bg-purple-950/30 rounded-lg p-4 text-center border border-purple-800/30">
          <div className="text-xs text-gray-500 uppercase tracking-wide">With GDP Growth</div>
          <div className={`text-xl font-bold ${currentYearData.gdpAdjustedBalance >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
            {formatMillions(currentYearData.gdpAdjustedBalance)}
          </div>
          <div className="text-xs text-gray-600">{(effectiveGrowthRate * 100).toFixed(1)}%/yr</div>
        </div>
      </div>

      {/* Fiscal Balance Timeline */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          📊 Fiscal Balance Timeline (1990-2060)
        </h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fiscalChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}B`}
                label={{ value: 'Billions EUR', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6B7280"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                domain={[0, 80]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  if (name === 'Dependency %') return [`${(value as number).toFixed(1)}%`, name];
                  return [`€${((value as number) / 1000).toFixed(1)}B`, name];
                }}
              />
              <Legend />
              <ReferenceLine yAxisId="left" y={0} stroke="#6B7280" strokeDasharray="3 3" />
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
                name="Net Balance"
                stroke="#A855F7"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="gdpAdjustedBalance"
                name={`With GDP Growth`}
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dependencyRatio"
                name="Dependency %"
                stroke="#6B7280"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          💰 State Cost Breakdown
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={costBreakdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}B`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => `€${((value as number) / 1000).toFixed(1)}B`}
              />
              <Legend />
              <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
              <Area
                type="monotone"
                dataKey="education"
                name="Education"
                stackId="1"
                fill="#3B82F6"
                stroke="#3B82F6"
              />
              <Area
                type="monotone"
                dataKey="healthcare"
                name="Healthcare"
                stackId="1"
                fill="#10B981"
                stroke="#10B981"
              />
              <Area
                type="monotone"
                dataKey="pensions"
                name="Pensions"
                stackId="1"
                fill="#F59E0B"
                stroke="#F59E0B"
              />
              <Area
                type="monotone"
                dataKey="benefits"
                name="Benefits"
                stackId="1"
                fill="#EF4444"
                stroke="#EF4444"
              />
              <Area
                type="monotone"
                dataKey="interest"
                name="Debt Interest"
                stackId="1"
                fill="#DC2626"
                stroke="#DC2626"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cost breakdown for current year */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          <div className="text-center p-2 bg-blue-950/30 rounded">
            <div className="text-[10px] text-gray-500">Education</div>
            <div className="text-sm font-semibold text-blue-400">
              {formatMillions(currentYearData.educationCosts)}
            </div>
          </div>
          <div className="text-center p-2 bg-emerald-950/30 rounded">
            <div className="text-[10px] text-gray-500">Healthcare</div>
            <div className="text-sm font-semibold text-emerald-400">
              {formatMillions(currentYearData.healthcareCosts)}
            </div>
          </div>
          <div className="text-center p-2 bg-amber-950/30 rounded">
            <div className="text-[10px] text-gray-500">Pensions</div>
            <div className="text-sm font-semibold text-amber-400">
              {formatMillions(currentYearData.pensionCosts)}
            </div>
          </div>
          <div className="text-center p-2 bg-red-950/30 rounded">
            <div className="text-[10px] text-gray-500">Benefits</div>
            <div className="text-sm font-semibold text-red-400">
              {formatMillions(currentYearData.benefitCosts)}
            </div>
          </div>
          <div className="text-center p-2 bg-rose-950/30 rounded">
            <div className="text-[10px] text-gray-500">Interest</div>
            <div className="text-sm font-semibold text-rose-400">
              {formatMillions(currentYearData.interestExpense)}
            </div>
          </div>
        </div>
      </div>

      {/* Immigration Fiscal Impact */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          ✈️ Immigration Fiscal Impact
        </h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={immigrationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `€${(v / 1000).toFixed(1)}B`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => formatMillions(value as number)}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
              <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
              <Area
                type="monotone"
                dataKey="workBased"
                name="Work-based"
                stackId="1"
                fill="#22C55E"
                stroke="#22C55E"
              />
              <Area
                type="monotone"
                dataKey="family"
                name="Family"
                stackId="1"
                fill="#F59E0B"
                stroke="#F59E0B"
              />
              <Area
                type="monotone"
                dataKey="humanitarian"
                name="Humanitarian"
                stackId="1"
                fill="#EF4444"
                stroke="#EF4444"
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Net Impact"
                stroke="#A855F7"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          <span className="text-green-400 font-semibold">Work-based</span> immigration typically yields
          positive fiscal returns. <span className="text-amber-400 font-semibold">Family</span> reunification
          is mixed. <span className="text-red-400 font-semibold">Humanitarian</span> immigration shows initial
          costs but improves over 7-10 year integration period.
        </p>
      </div>
    </div>
  );
}

