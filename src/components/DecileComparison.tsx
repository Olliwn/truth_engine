'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { PurchasingPowerSummary, DECILE_COLORS } from '@/lib/types';

interface DecileComparisonProps {
  summary: PurchasingPowerSummary;
  decileLabels: Record<string, string>;
}

export default function DecileComparison({ summary, decileLabels }: DecileComparisonProps) {
  // Prepare income change data
  const incomeChangeData = Object.entries(summary.decile_changes)
    .map(([decile, data]) => ({
      decile,
      label: decileLabels[decile] || `D${decile}`,
      shortLabel: decile === '1' ? 'Bottom' : decile === '10' ? 'Top' : `D${decile}`,
      change: data.real_income_change_pct || 0,
      color: DECILE_COLORS[decile],
    }))
    .sort((a, b) => parseInt(a.decile) - parseInt(b.decile));

  // Prepare wealth change data
  const wealthChangeData = Object.entries(summary.decile_changes)
    .filter(([, data]) => data.wealth_change_pct !== undefined)
    .map(([decile, data]) => ({
      decile,
      label: decileLabels[decile] || `D${decile}`,
      shortLabel: decile === '1' ? 'Bottom' : decile === '10' ? 'Top' : `D${decile}`,
      change: data.wealth_change_pct || 0,
      color: DECILE_COLORS[decile],
    }))
    .sort((a, b) => parseInt(a.decile) - parseInt(b.decile));

  const bottomIncome = summary.decile_changes['1']?.real_income_change_pct || 0;
  const topIncome = summary.decile_changes['10']?.real_income_change_pct || 0;
  const bottomWealth = summary.decile_changes['1']?.wealth_change_pct || 0;
  const topWealth = summary.decile_changes['10']?.wealth_change_pct || 0;

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Income gap card */}
        <div className="card p-6 border-red-900/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📉</span> Real Income Change
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Bottom 10%:</span>
              <span className={`text-2xl font-bold mono-data ${bottomIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {bottomIncome >= 0 ? '+' : ''}{bottomIncome.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Top 10%:</span>
              <span className={`text-2xl font-bold mono-data ${topIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {topIncome >= 0 ? '+' : ''}{topIncome.toFixed(1)}%
              </span>
            </div>
            <div className="pt-3 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Gap widened:</span>
                <span className="text-xl font-bold text-amber-400 mono-data">
                  {summary.gaps.income_gap_widened.toFixed(1)}pp
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Wealth gap card */}
        <div className="card p-6 border-purple-900/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">💰</span> Net Wealth Change
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Bottom 10%:</span>
              <span className={`text-2xl font-bold mono-data ${bottomWealth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {bottomWealth >= 0 ? '+' : ''}{bottomWealth.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Top 10%:</span>
              <span className={`text-2xl font-bold mono-data ${topWealth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {topWealth >= 0 ? '+' : ''}{topWealth.toFixed(1)}%
              </span>
            </div>
            <div className="pt-3 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Gap widened:</span>
                <span className="text-xl font-bold text-amber-400 mono-data">
                  {summary.gaps.wealth_gap_widened.toFixed(1)}pp
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income change bar chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Real Purchasing Power Change by Decile</h3>
        <p className="text-gray-400 text-sm mb-6">
          Change in disposable income adjusted for essentials inflation (Maslow CPI)
        </p>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={incomeChangeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="shortLabel" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine y={0} stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Change']}
              labelFormatter={(label) => {
                const item = incomeChangeData.find(d => d.shortLabel === label);
                return item?.label || label;
              }}
            />
            <Bar dataKey="change" radius={[4, 4, 0, 0]}>
              {incomeChangeData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.change >= 0 ? '#22c55e' : entry.color}
                  opacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <p className="text-gray-500 text-xs mt-4 text-center">
          Period: {summary.income_period} | All deciles show negative real income growth when adjusted for essentials inflation
        </p>
      </div>

      {/* Wealth change bar chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Net Wealth Change by Decile</h3>
        <p className="text-gray-400 text-sm mb-6">
          Change in median net wealth (assets minus liabilities) in real terms
        </p>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={wealthChangeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="shortLabel" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine y={0} stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Change']}
              labelFormatter={(label) => {
                const item = wealthChangeData.find(d => d.shortLabel === label);
                return item?.label || label;
              }}
            />
            <Bar dataKey="change" radius={[4, 4, 0, 0]}>
              {wealthChangeData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.change >= 0 ? '#22c55e' : entry.color}
                  opacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <p className="text-gray-500 text-xs mt-4 text-center">
          Period: {summary.wealth_period} | Data from Statistics Finland Household Wealth Survey
        </p>
      </div>
    </div>
  );
}

