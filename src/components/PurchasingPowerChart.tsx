'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { IncomeYearEntry, WealthYearEntry, DECILE_COLORS } from '@/lib/types';

interface PurchasingPowerChartProps {
  incomeData: IncomeYearEntry[];
  wealthData: WealthYearEntry[];
  decileLabels: Record<string, string>;
}

type ViewMode = 'income' | 'wealth' | 'index';

const DEFAULT_DECILES = ['1', '5', '10'];

export default function PurchasingPowerChart({
  incomeData,
  wealthData,
  decileLabels,
}: PurchasingPowerChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('index');
  const [activeDeciles, setActiveDeciles] = useState<Set<string>>(new Set(DEFAULT_DECILES));

  const toggleDecile = (decile: string) => {
    const newSet = new Set(activeDeciles);
    if (newSet.has(decile)) {
      newSet.delete(decile);
    } else {
      newSet.add(decile);
    }
    setActiveDeciles(newSet);
  };

  // Prepare chart data based on view mode
  const chartData = useMemo(() => {
    if (viewMode === 'income' || viewMode === 'index') {
      return incomeData.map(entry => {
        const dataPoint: Record<string, number | null> = { year: entry.year };
        
        for (const decile of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']) {
          const decileData = entry.deciles[decile];
          if (viewMode === 'income') {
            dataPoint[`d${decile}`] = decileData?.real_income || null;
          } else {
            dataPoint[`d${decile}`] = decileData?.real_income_index || null;
          }
        }
        
        return dataPoint;
      });
    } else {
      // Wealth view - only available years
      return wealthData.map(entry => {
        const dataPoint: Record<string, number | null> = { year: entry.year };
        
        for (const decile of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']) {
          const decileData = entry.deciles[decile];
          dataPoint[`d${decile}`] = decileData?.median?.nettoae_DN3001 || null;
        }
        
        return dataPoint;
      });
    }
  }, [incomeData, wealthData, viewMode]);

  const formatValue = (value: number | null) => {
    if (value === null) return 'N/A';
    if (viewMode === 'index') return `${value.toFixed(1)}`;
    return `€${value.toLocaleString('fi-FI', { maximumFractionDigits: 0 })}`;
  };

  const yAxisLabel = viewMode === 'index' 
    ? 'Index (2015=100)' 
    : viewMode === 'income' 
    ? 'Real Income (EUR)' 
    : 'Net Wealth (EUR)';

  return (
    <div className="card p-6">
      {/* View mode toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold">Purchasing Power by Income Decile</h3>
        <div className="flex gap-2">
          {[
            { value: 'index', label: 'Real Income Index' },
            { value: 'income', label: 'Real Income (EUR)' },
            { value: 'wealth', label: 'Net Wealth' },
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value as ViewMode)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === mode.value
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Decile toggles */}
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-800">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((decile) => (
          <button
            key={decile}
            onClick={() => toggleDecile(decile)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              activeDeciles.has(decile)
                ? 'bg-gray-800 text-white'
                : 'bg-gray-900/50 text-gray-500 hover:text-gray-300'
            }`}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: activeDeciles.has(decile) ? DECILE_COLORS[decile] : '#374151' }}
            />
            {decileLabels[decile] || `Decile ${decile}`}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="year" 
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => {
              if (viewMode === 'index') return `${value}`;
              if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`;
              return `€${value}`;
            }}
            label={{ 
              value: yAxisLabel, 
              angle: -90, 
              position: 'insideLeft',
              fill: '#9ca3af',
              style: { textAnchor: 'middle' }
            }}
          />
          {viewMode === 'index' && (
            <ReferenceLine y={100} stroke="#6b7280" strokeDasharray="5 5" />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            formatter={(value: number | null, name: string) => {
              const decile = name.replace('d', '');
              const label = decileLabels[decile] || `Decile ${decile}`;
              return [formatValue(value), label];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value: string) => {
              const decile = value.replace('d', '');
              return <span style={{ color: '#d1d5db' }}>{decileLabels[decile] || `Decile ${decile}`}</span>;
            }}
          />
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((decile) => (
            activeDeciles.has(decile) && (
              <Line
                key={decile}
                type="monotone"
                dataKey={`d${decile}`}
                stroke={DECILE_COLORS[decile]}
                strokeWidth={decile === '1' || decile === '10' ? 3 : 2}
                dot={{ r: decile === '1' || decile === '10' ? 4 : 3, fill: DECILE_COLORS[decile] }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded mt-1" style={{ backgroundColor: DECILE_COLORS['1'] }} />
            <div>
              <div className="font-medium text-white">Bottom 10%</div>
              <div className="text-gray-500">Lowest-income households</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded mt-1" style={{ backgroundColor: DECILE_COLORS['5'] }} />
            <div>
              <div className="font-medium text-white">Middle (Decile V)</div>
              <div className="text-gray-500">Median household</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded mt-1" style={{ backgroundColor: DECILE_COLORS['10'] }} />
            <div>
              <div className="font-medium text-white">Top 10%</div>
              <div className="text-gray-500">Highest-income households</div>
            </div>
          </div>
        </div>
        {viewMode === 'index' && (
          <p className="text-gray-500 text-xs mt-4">
            Real income index adjusted for Maslow CPI (essentials inflation). Values below 100 indicate loss of purchasing power since 2015.
          </p>
        )}
        {viewMode === 'wealth' && (
          <p className="text-gray-500 text-xs mt-4">
            Wealth survey data available for years: 2004, 2009, 2013, 2016, 2019, 2023. Values in real 2023 euros.
          </p>
        )}
      </div>
    </div>
  );
}

