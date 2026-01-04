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
import { HISTORICAL_DEBT } from '@/lib/populationSimulator';
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
// Main DebtTab Component
// ===========================================

interface DebtTabProps {
  selectedYear: number;
  annualResults: AnnualPopulationResult[];
  currentYearData: AnnualPopulationResult;
  summary: PopulationSimulationSummary;
  effectiveInterestRate: number;
}

export function DebtTab({
  selectedYear,
  annualResults,
  currentYearData,
  summary,
  effectiveInterestRate,
}: DebtTabProps) {
  // Prepare debt chart data
  const debtChartData = annualResults.map(r => ({
    year: r.year,
    debtToGDP: r.debtToGDP,
    debtStock: r.debtStock,
    interestExpense: r.interestExpense,
    primaryBalance: r.primaryBalance,
    gdp: r.gdp,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Current Debt (2024)</div>
          <div className="text-xl font-bold text-gray-300">€{HISTORICAL_DEBT[2024]}B</div>
          <div className="text-xs text-gray-600">~60% of GDP</div>
        </div>
        <div className="bg-red-950/30 rounded-lg p-4 text-center border border-red-800/30">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Projected Debt (2060)</div>
          <div className="text-xl font-bold text-red-400">€{summary.finalDebtStock.toFixed(0)}B</div>
          <div className="text-xs text-gray-600">{summary.finalDebtToGDP.toFixed(0)}% of GDP</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Peak Debt/GDP</div>
          <div className="text-xl font-bold text-amber-400">{summary.peakDebtToGDP.toFixed(0)}%</div>
          <div className="text-xs text-gray-600">in {summary.peakDebtYear}</div>
        </div>
        <div className="bg-rose-950/30 rounded-lg p-4 text-center border border-rose-800/30">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total Interest</div>
          <div className="text-xl font-bold text-rose-400">{formatMillions(summary.totalInterestPaid)}</div>
          <div className="text-xs text-gray-600">1990-2060 cumulative</div>
        </div>
      </div>

      {/* Main Debt/GDP Chart */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          💳 Debt Sustainability (1990-2060)
        </h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={debtChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="pct"
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                label={{ value: 'Debt/GDP %', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 10 }}
              />
              <YAxis
                yAxisId="eur"
                orientation="right"
                stroke="#F59E0B"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `€${(v / 1000).toFixed(1)}B`}
                label={{ value: 'Interest (€B)', angle: 90, position: 'insideRight', fill: '#F59E0B', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  if (name === 'Debt/GDP %') return [`${(value as number).toFixed(1)}%`, name];
                  if (name === 'Interest Expense') return [`€${((value as number) / 1000).toFixed(2)}B/year`, name];
                  if (name === 'Primary Balance') return [`€${((value as number) / 1000).toFixed(2)}B`, name];
                  if (name === 'Debt Stock') return [`€${(value as number).toFixed(0)}B`, name];
                  return [value, name];
                }}
              />
              <Legend />
              <ReferenceLine yAxisId="pct" y={60} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Maastricht 60%', fontSize: 10, fill: '#F59E0B' }} />
              <ReferenceLine yAxisId="pct" y={100} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '100%', fontSize: 10, fill: '#EF4444' }} />
              <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
              <ReferenceLine x={2024} stroke="#A855F7" strokeDasharray="3 3" />

              <Area
                yAxisId="pct"
                type="monotone"
                dataKey="debtToGDP"
                name="Debt/GDP %"
                fill="#DC2626"
                fillOpacity={0.4}
                stroke="#DC2626"
                strokeWidth={2}
              />
              <Line
                yAxisId="eur"
                type="monotone"
                dataKey="interestExpense"
                name="Interest Expense"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Current Year Details */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Debt Metrics */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            📊 Debt Metrics ({selectedYear})
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Debt Stock</span>
              <span className="text-rose-400 font-bold text-lg">€{currentYearData.debtStock.toFixed(0)}B</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Debt/GDP Ratio</span>
              <span className={`font-bold text-lg ${currentYearData.debtToGDP < 60 ? 'text-green-400' : currentYearData.debtToGDP < 100 ? 'text-amber-400' : 'text-red-400'}`}>
                {currentYearData.debtToGDP.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Annual Interest</span>
              <span className="text-amber-400 font-bold text-lg">{formatMillions(currentYearData.interestExpense)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Interest Rate</span>
              <span className="text-gray-300 font-semibold">{(effectiveInterestRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">GDP</span>
              <span className="text-purple-400 font-semibold">€{currentYearData.gdp.toFixed(0)}B</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-800">
              <span className="text-gray-400">Primary Balance</span>
              <span className={`font-semibold ${currentYearData.primaryBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatMillions(currentYearData.primaryBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Sustainability Analysis */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            ⚠️ Sustainability Analysis
          </h3>
          <div className="space-y-3 text-sm">
            {/* Maastricht Check */}
            <div className={`p-3 rounded-lg ${currentYearData.debtToGDP <= 60 ? 'bg-green-950/30 border border-green-800/30' : 'bg-red-950/30 border border-red-800/30'}`}>
              <div className="flex items-center gap-2">
                <span>{currentYearData.debtToGDP <= 60 ? '✅' : '❌'}</span>
                <span className="font-medium">Maastricht Criterion (60%)</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {currentYearData.debtToGDP <= 60
                  ? 'Debt below EU stability threshold'
                  : `Debt ${(currentYearData.debtToGDP - 60).toFixed(0)}pp above threshold`}
              </p>
            </div>

            {/* 100% Check */}
            <div className={`p-3 rounded-lg ${currentYearData.debtToGDP <= 100 ? 'bg-amber-950/30 border border-amber-800/30' : 'bg-red-950/30 border border-red-800/30'}`}>
              <div className="flex items-center gap-2">
                <span>{currentYearData.debtToGDP <= 100 ? '⚠️' : '🚨'}</span>
                <span className="font-medium">Debt/GDP 100%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {currentYearData.debtToGDP <= 100
                  ? 'Below critical threshold, but monitoring needed'
                  : 'CRITICAL: Debt exceeds annual economic output'}
              </p>
            </div>

            {/* Interest Burden */}
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2">
                <span>💰</span>
                <span className="font-medium">Interest Burden</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Interest costs {((currentYearData.interestExpense / (currentYearData.totalStateCosts + currentYearData.interestExpense)) * 100).toFixed(1)}% of total government spending
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Understanding Debt Dynamics</h4>
        <p className="text-xs text-gray-500">
          <span className="text-rose-400 font-semibold">Interest expense</span> compounds over time as debt
          accumulates. At {(effectiveInterestRate * 100).toFixed(1)}% interest rate, the annual burden reaches
          <span className="text-amber-400 font-semibold"> €{(currentYearData.interestExpense / 1000).toFixed(1)}B </span>
          in {selectedYear}. The <span className="text-amber-400 font-semibold">Maastricht criterion</span> (60% debt/GDP)
          is the EU benchmark for fiscal sustainability.
          {currentYearData.debtToGDP > 100 && (
            <span className="text-red-400"> ⚠️ Debt exceeds 100% of GDP — potential debt sustainability risk.</span>
          )}
        </p>
      </div>

      {/* Fiscal Multiplier Warning */}
      {summary.secondOrderEffects && (
        <div className="bg-amber-950/30 rounded-lg p-4 border border-amber-800/30">
          <h4 className="text-amber-400 font-semibold text-sm mb-2 flex items-center gap-2">
            ⚠️ Fiscal Multiplier Warning
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Government deficit spending is part of GDP. Eliminating the deficit would cause a
            <strong> one-time level drop</strong> in GDP (not a permanent reduction in growth rate).
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Current deficit</div>
              <div className="text-red-400 font-semibold">
                {summary.secondOrderEffects.deficitAsPercentOfGDP.toFixed(1)}% of GDP
              </div>
            </div>
            <div>
              <div className="text-gray-500">One-time GDP drop if balanced</div>
              <div className="text-amber-400 font-semibold">
                ~{summary.secondOrderEffects.gdpReductionIfBalanced.toFixed(1)}%
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-3">
            * Fiscal multiplier ~0.8 (conservative). This is a one-time shock, not an annual effect.
          </p>
        </div>
      )}
    </div>
  );
}

