'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  Bar,
} from 'recharts';
import { MaslowTimeSeriesEntry } from '@/lib/types';

interface InflationChartProps {
  data: MaslowTimeSeriesEntry[];
}

type ViewMode = 'index' | 'yoy' | 'gap';

// Series configuration
const SERIES_CONFIG = {
  maslow: { color: '#ef4444', label: 'Maslow CPI (Essentials)', default: true },
  official: { color: '#3b82f6', label: 'Official CPI', default: true },
  real_wage: { color: '#f59e0b', label: 'Real Wages', default: true },
  nominal_wage: { color: '#fbbf24', label: 'Nominal Wages', default: false },
  gdp: { color: '#22c55e', label: 'GDP per Capita', default: false },
  sp500: { color: '#a855f7', label: 'S&P 500 (US)', default: true },
  omx: { color: '#14b8a6', label: 'OMX Helsinki', default: false },
  asset: { color: '#6b7280', label: 'Finnish Assets', default: false },
};

type SeriesKey = keyof typeof SERIES_CONFIG;

export default function InflationChart({ data }: InflationChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('index');
  const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(
    new Set(Object.entries(SERIES_CONFIG).filter(([, v]) => v.default).map(([k]) => k as SeriesKey))
  );

  const toggleSeries = (key: SeriesKey) => {
    const newSet = new Set(activeSeries);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setActiveSeries(newSet);
  };

  const chartData = data.map(entry => ({
    year: entry.year,
    // Index values
    maslow: entry.maslow_cpi.index,
    official: entry.official_cpi.index,
    asset: entry.asset_index.index,
    gdp: entry.gdp_per_capita.index,
    nominal_wage: entry.nominal_wage.index,
    real_wage: entry.real_wage.index,
    sp500: entry.sp500.index,
    omx: entry.omx_helsinki.index,
    // YoY changes
    maslowYoY: entry.maslow_cpi.yoy_change,
    officialYoY: entry.official_cpi.yoy_change,
    real_wageYoY: entry.real_wage.yoy_change,
    sp500YoY: entry.sp500.yoy_change,
    // Gaps
    inflationGap: entry.inflation_gap,
    wealthGap: entry.wealth_gap,
  }));

  const renderChart = () => {
    if (viewMode === 'index') {
      return (
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
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              formatter={(value, name) => {
                const key = name as string;
                const label = SERIES_CONFIG[key as SeriesKey]?.label || key;
                return [`${Number(value).toFixed(1)}`, label];
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                const key = value as SeriesKey;
                return <span style={{ color: '#d1d5db' }}>{SERIES_CONFIG[key]?.label || value}</span>;
              }}
            />
            {activeSeries.has('maslow') && (
              <Line
                type="monotone"
                dataKey="maslow"
                stroke={SERIES_CONFIG.maslow.color}
                strokeWidth={3}
                dot={{ r: 4, fill: SERIES_CONFIG.maslow.color }}
                activeDot={{ r: 6 }}
              />
            )}
            {activeSeries.has('official') && (
              <Line
                type="monotone"
                dataKey="official"
                stroke={SERIES_CONFIG.official.color}
                strokeWidth={2}
                dot={{ r: 3, fill: SERIES_CONFIG.official.color }}
                strokeDasharray="5 5"
              />
            )}
            {activeSeries.has('real_wage') && (
              <Line
                type="monotone"
                dataKey="real_wage"
                stroke={SERIES_CONFIG.real_wage.color}
                strokeWidth={2}
                dot={{ r: 3, fill: SERIES_CONFIG.real_wage.color }}
              />
            )}
            {activeSeries.has('nominal_wage') && (
              <Line
                type="monotone"
                dataKey="nominal_wage"
                stroke={SERIES_CONFIG.nominal_wage.color}
                strokeWidth={2}
                dot={{ r: 3, fill: SERIES_CONFIG.nominal_wage.color }}
                strokeDasharray="3 3"
              />
            )}
            {activeSeries.has('gdp') && (
              <Line
                type="monotone"
                dataKey="gdp"
                stroke={SERIES_CONFIG.gdp.color}
                strokeWidth={2}
                dot={{ r: 3, fill: SERIES_CONFIG.gdp.color }}
              />
            )}
            {activeSeries.has('sp500') && (
              <Line
                type="monotone"
                dataKey="sp500"
                stroke={SERIES_CONFIG.sp500.color}
                strokeWidth={2}
                dot={{ r: 3, fill: SERIES_CONFIG.sp500.color }}
              />
            )}
            {activeSeries.has('omx') && (
              <Line
                type="monotone"
                dataKey="omx"
                stroke={SERIES_CONFIG.omx.color}
                strokeWidth={2}
                dot={{ r: 3, fill: SERIES_CONFIG.omx.color }}
              />
            )}
            {activeSeries.has('asset') && (
              <Line
                type="monotone"
                dataKey="asset"
                stroke={SERIES_CONFIG.asset.color}
                strokeWidth={2}
                dot={{ r: 3, fill: SERIES_CONFIG.asset.color }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (viewMode === 'yoy') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="year" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  maslowYoY: 'Maslow CPI',
                  officialYoY: 'Official CPI',
                  real_wageYoY: 'Real Wages',
                  sp500YoY: 'S&P 500',
                };
                return [`${Number(value).toFixed(1)}%`, labels[String(name)] || String(name)];
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  maslowYoY: 'Maslow CPI YoY',
                  officialYoY: 'Official CPI YoY',
                  real_wageYoY: 'Real Wages YoY',
                  sp500YoY: 'S&P 500 YoY',
                };
                return <span style={{ color: '#d1d5db' }}>{labels[value] || value}</span>;
              }}
            />
            <Bar dataKey="maslowYoY" fill={SERIES_CONFIG.maslow.color} opacity={0.8} />
            <Line
              type="monotone"
              dataKey="officialYoY"
              stroke={SERIES_CONFIG.official.color}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="real_wageYoY"
              stroke={SERIES_CONFIG.real_wage.color}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="sp500YoY"
              stroke={SERIES_CONFIG.sp500.color}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // Gap view
    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="year" 
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                inflationGap: 'Inflation Gap (Maslow - Official)',
                wealthGap: 'Wealth Gap (Assets - Maslow)',
              };
              const numVal = Number(value);
              return [`${numVal > 0 ? '+' : ''}${numVal.toFixed(1)} pts`, labels[String(name)] || String(name)];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                inflationGap: 'Hidden Inflation Gap',
                wealthGap: 'Wealth Gap',
              };
              return <span style={{ color: '#d1d5db' }}>{labels[value] || value}</span>;
            }}
          />
          <Area
            type="monotone"
            dataKey="inflationGap"
            stroke={SERIES_CONFIG.maslow.color}
            fill={SERIES_CONFIG.maslow.color}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="wealthGap"
            stroke={SERIES_CONFIG.gdp.color}
            fill={SERIES_CONFIG.gdp.color}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="card p-6">
      {/* View mode toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold">Economic Indicators Comparison</h3>
        <div className="flex gap-2">
          {[
            { value: 'index', label: 'Index (2015=100)' },
            { value: 'yoy', label: 'Year-over-Year' },
            { value: 'gap', label: 'Gap Analysis' },
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value as ViewMode)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === mode.value
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Series toggles - only show for index view */}
      {viewMode === 'index' && (
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-800">
          {(Object.entries(SERIES_CONFIG) as [SeriesKey, typeof SERIES_CONFIG[SeriesKey]][]).map(([key, config]) => (
            <button
              key={key}
              onClick={() => toggleSeries(key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                activeSeries.has(key)
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-900/50 text-gray-500 hover:text-gray-300'
              }`}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: activeSeries.has(key) ? config.color : '#374151' }}
              />
              {config.label}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      {renderChart()}

      {/* Legend explanation */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded mt-1" style={{ backgroundColor: SERIES_CONFIG.maslow.color }} />
            <div>
              <div className="font-medium text-white">Maslow CPI</div>
              <div className="text-gray-500">Essential goods inflation</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded mt-1" style={{ backgroundColor: SERIES_CONFIG.real_wage.color }} />
            <div>
              <div className="font-medium text-white">Real Wages</div>
              <div className="text-gray-500">Inflation-adjusted earnings</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded mt-1" style={{ backgroundColor: SERIES_CONFIG.sp500.color }} />
            <div>
              <div className="font-medium text-white">S&P 500</div>
              <div className="text-gray-500">US stock market</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded mt-1" style={{ backgroundColor: SERIES_CONFIG.official.color }} />
            <div>
              <div className="font-medium text-white">Official CPI</div>
              <div className="text-gray-500">Statistics Finland</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
