'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';
import type { YearlySpending } from '@/lib/simulation/spending';
import type { AnnualPopulationResult } from '@/lib/populationSimulator';
import {
  COFOG_CATEGORIES,
  COFOG_STACK_ORDER,
  SPENDING_GROUPS,
  SPENDING_BASE_YEAR,
  type COFOGCode,
  type SpendingGroupId,
} from '@/lib/constants/governmentSpending';

// ===========================================
// Formatting Helpers
// ===========================================

const formatBillions = (n: number) => `€${(n / 1000).toFixed(1)}B`;
const formatPct = (n: number) => `${n.toFixed(1)}%`;

// ===========================================
// Chart Data Preparation
// ===========================================

function prepareStackedAreaData(timeline: YearlySpending[], mode: 'absolute' | 'pct_gdp') {
  return timeline.map((year) => {
    const row: Record<string, number | boolean> = { 
      year: year.year,
      isHistorical: year.isHistorical,
    };
    
    for (const code of COFOG_STACK_ORDER) {
      const category = year.byCategory[code];
      if (category) {
        row[code] = mode === 'absolute' 
          ? category.amountMillion / 1000  // Convert to billions
          : category.pctOfGDP;
      } else {
        row[code] = 0;
      }
    }
    
    row.total = mode === 'absolute' 
      ? year.totalMillion / 1000 
      : year.totalPctGDP;
    
    return row;
  });
}

function prepareGroupComparisonData(timeline: YearlySpending[]) {
  return timeline.map((year) => {
    const row: Record<string, number | boolean> = { 
      year: year.year,
      isHistorical: year.isHistorical,
    };
    
    for (const groupId of Object.keys(SPENDING_GROUPS) as SpendingGroupId[]) {
      const group = year.byGroup[groupId];
      if (group) {
        row[groupId] = group.amountMillion / 1000;  // Convert to billions
      }
    }
    
    return row;
  });
}

// ===========================================
// Custom Tooltip
// ===========================================

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload: Record<string, number | boolean>;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
  mode: 'absolute' | 'pct_gdp';
}

function CustomTooltip({ active, payload, label, mode }: TooltipProps) {
  if (!active || !payload || !label) return null;
  
  const isHistorical = payload[0]?.payload?.isHistorical;
  
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
        <span className="font-bold text-white">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isHistorical 
            ? 'bg-blue-600/20 text-blue-400' 
            : 'bg-purple-600/20 text-purple-400'
        }`}>
          {isHistorical ? '📊 Historical' : '🔮 Projected'}
        </span>
      </div>
      <div className="space-y-1 text-xs">
        {payload.slice().reverse().map((entry) => (
          <div key={entry.dataKey} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>
              {COFOG_CATEGORIES[entry.dataKey as COFOGCode]?.name || entry.name}
            </span>
            <span className="text-gray-300 font-mono">
              {mode === 'absolute' ? `€${entry.value.toFixed(1)}B` : `${entry.value.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Main SpendingTab Component
// ===========================================

interface SpendingTabProps {
  selectedYear: number;
  spendingTimeline: YearlySpending[];
  currentYearSpending: YearlySpending | null;
  currentYearData: AnnualPopulationResult;
}

export function SpendingTab({
  selectedYear,
  spendingTimeline,
  currentYearSpending,
  currentYearData,
}: SpendingTabProps) {
  const [viewMode, setViewMode] = useState<'absolute' | 'pct_gdp'>('absolute');
  const [chartType, setChartType] = useState<'categories' | 'groups'>('categories');
  
  // Prepare chart data
  const categoryChartData = useMemo(() => 
    prepareStackedAreaData(spendingTimeline, viewMode), 
    [spendingTimeline, viewMode]
  );
  
  const groupChartData = useMemo(() => 
    prepareGroupComparisonData(spendingTimeline), 
    [spendingTimeline]
  );
  
  if (!currentYearSpending) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading spending data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Total Spending"
          value={formatBillions(currentYearSpending.totalMillion)}
          sublabel={`${selectedYear}`}
          color="emerald"
        />
        <SummaryCard
          label="% of GDP"
          value={formatPct(currentYearSpending.totalPctGDP)}
          sublabel="Government size"
          color={currentYearSpending.totalPctGDP > 55 ? 'red' : currentYearSpending.totalPctGDP > 45 ? 'amber' : 'green'}
        />
        <SummaryCard
          label="GDP"
          value={`€${currentYearData.gdp.toFixed(0)}B`}
          sublabel="Economic output"
          color="purple"
        />
        <SummaryCard
          label="Data Source"
          value={currentYearSpending.isHistorical ? '📊 Historical' : '🔮 Projected'}
          sublabel={currentYearSpending.isHistorical ? 'Statistics Finland' : 'Scenario model'}
          color="blue"
        />
      </div>

      {/* Main Stacked Area Chart */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-200">
            Spending Evolution (1990-2060)
          </h3>
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('absolute')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'absolute' 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                € Billions
              </button>
              <button
                onClick={() => setViewMode('pct_gdp')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'pct_gdp' 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                % of GDP
              </button>
            </div>
            {/* Chart Type Toggle */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setChartType('categories')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  chartType === 'categories' 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                COFOG Categories
              </button>
              <button
                onClick={() => setChartType('groups')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  chartType === 'groups' 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Scenario Groups
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-2">
          {viewMode === 'absolute' 
            ? 'Values in current prices (€ billions). Vertical line marks transition from historical to projected data.'
            : 'Share of GDP allocated to each spending category.'
          }
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'categories' ? (
              <AreaChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(year) => year % 5 === 0 ? year : ''}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => viewMode === 'absolute' ? `€${v}B` : `${v}%`}
                />
                <Tooltip content={<CustomTooltip mode={viewMode} />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => COFOG_CATEGORIES[value as COFOGCode]?.name || value}
                />
                
                {/* Historical/Projected divider */}
                <ReferenceLine 
                  x={SPENDING_BASE_YEAR} 
                  stroke="#F59E0B" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  label={{ value: 'Projected →', position: 'top', fill: '#F59E0B', fontSize: 10 }}
                />
                
                {/* Current year indicator */}
                <ReferenceLine 
                  x={selectedYear} 
                  stroke="#10B981" 
                  strokeWidth={2}
                />
                
                {/* Stacked areas in reverse order (largest at bottom) */}
                {COFOG_STACK_ORDER.map((code) => (
                  <Area
                    key={code}
                    type="monotone"
                    dataKey={code}
                    stackId="1"
                    stroke={COFOG_CATEGORIES[code].color}
                    fill={COFOG_CATEGORIES[code].color}
                    fillOpacity={0.7}
                    name={code}
                  />
                ))}
              </AreaChart>
            ) : (
              <AreaChart data={groupChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(year) => year % 5 === 0 ? year : ''}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `€${v}B`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value, name) => [
                    `€${(value as number).toFixed(1)}B`,
                    SPENDING_GROUPS[name as SpendingGroupId]?.name || name
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => SPENDING_GROUPS[value as SpendingGroupId]?.name || value}
                />
                
                <ReferenceLine 
                  x={SPENDING_BASE_YEAR} 
                  stroke="#F59E0B" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                />
                <ReferenceLine 
                  x={selectedYear} 
                  stroke="#10B981" 
                  strokeWidth={2}
                />
                
                {(Object.keys(SPENDING_GROUPS) as SpendingGroupId[]).map((groupId, index) => {
                  const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#6B7280', '#EC4899'];
                  return (
                    <Area
                      key={groupId}
                      type="monotone"
                      dataKey={groupId}
                      stackId="1"
                      stroke={colors[index]}
                      fill={colors[index]}
                      fillOpacity={0.7}
                      name={groupId}
                    />
                  );
                })}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown for Selected Year */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* COFOG Breakdown */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            COFOG Breakdown ({selectedYear})
          </h3>
          <div className="space-y-2">
            {COFOG_STACK_ORDER.slice().reverse().map((code) => {
              const category = currentYearSpending.byCategory[code];
              if (!category) return null;
              
              const pctOfTotal = (category.amountMillion / currentYearSpending.totalMillion) * 100;
              
              return (
                <div key={code} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: COFOG_CATEGORIES[code].color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 truncate">{category.name}</span>
                      <span className="text-gray-400 ml-2">
                        {formatBillions(category.amountMillion)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${Math.min(pctOfTotal, 100)}%`,
                          backgroundColor: COFOG_CATEGORIES[code].color 
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {pctOfTotal.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Group Breakdown */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            Scenario Groups ({selectedYear})
          </h3>
          <div className="space-y-3">
            {(Object.keys(SPENDING_GROUPS) as SpendingGroupId[]).map((groupId) => {
              const config = SPENDING_GROUPS[groupId];
              const groupData = currentYearSpending.byGroup[groupId];
              if (!groupData) return null;
              
              const pctOfTotal = (groupData.amountMillion / currentYearSpending.totalMillion) * 100;
              
              return (
                <div key={groupId} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.emoji}</span>
                      <span className="text-sm font-medium text-gray-200">{config.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">
                        {formatBillions(groupData.amountMillion)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {groupData.pctOfGDP.toFixed(1)}% GDP
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500/70 rounded-full"
                      style={{ width: `${Math.min(pctOfTotal, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Driver: {config.driver} • {config.cofogCodes.join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800 text-xs text-gray-500">
        <h4 className="font-semibold text-gray-400 mb-2">📝 Methodology</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Historical data (1990-2024):</strong> Actual COFOG spending from Statistics Finland
          </li>
          <li>
            <strong>Projected data (2025-2060):</strong> Based on scenario settings with group-specific drivers
          </li>
          <li>
            <strong>Healthcare & Aging:</strong> Driven by elderly population (70%), children (10%), working age (20%)
          </li>
          <li>
            <strong>Education:</strong> Driven by youth population (80%), adult education (20%)
          </li>
          <li>
            <strong>Security:</strong> Scales with total population
          </li>
          <li>
            <strong>Infrastructure:</strong> Maintains constant GDP ratio or follows GDP growth
          </li>
          <li>
            <strong>Government:</strong> Mixed driver: admin follows GDP, debt service follows interest rates
          </li>
        </ul>
      </div>
    </div>
  );
}

// ===========================================
// Summary Card Component
// ===========================================

interface SummaryCardProps {
  label: string;
  value: string;
  sublabel: string;
  color: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'emerald';
}

function SummaryCard({ label, value, sublabel, color }: SummaryCardProps) {
  const colorClasses = {
    green: 'text-green-400 border-green-800/50 bg-green-950/30',
    amber: 'text-amber-400 border-amber-800/50 bg-amber-950/30',
    red: 'text-red-400 border-red-800/50 bg-red-950/30',
    blue: 'text-blue-400 border-blue-800/50 bg-blue-950/30',
    purple: 'text-purple-400 border-purple-800/50 bg-purple-950/30',
    emerald: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30',
  };

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color]}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>{value}</div>
      <div className="text-xs text-gray-500">{sublabel}</div>
    </div>
  );
}

