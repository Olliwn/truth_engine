'use client';

import {
  BarChart,
  Bar,
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
import type { AnnualPopulationResult } from '@/lib/populationSimulator';

// ===========================================
// Formatting
// ===========================================

const formatNumber = (n: number) =>
  new Intl.NumberFormat('fi-FI').format(Math.round(n));

const formatCompact = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
};

// ===========================================
// Population Stat Bar
// ===========================================

interface StatBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function StatBar({ label, value, total, color }: StatBarProps) {
  const pct = (value / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-medium">
          {formatCompact(value)} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ===========================================
// Main PopulationTab Component
// ===========================================

interface PopulationTabProps {
  selectedYear: number;
  annualResults: AnnualPopulationResult[];
  currentYearData: AnnualPopulationResult;
  pyramidData: { age: number; male: number; female: number }[];
}

export function PopulationTab({
  selectedYear,
  annualResults,
  currentYearData,
  pyramidData,
}: PopulationTabProps) {
  // Prepare pyramid chart data
  const pyramidChartData = pyramidData
    .filter((_, i) => i % 5 === 0) // Every 5 years for readability
    .map(d => ({
      age: `${d.age}`,
      male: -d.male / 1000, // Negative for left side
      female: d.female / 1000,
    }));

  // Prepare demographics timeline data
  const demographicChartData = annualResults.map(r => ({
    year: r.year,
    children: r.children / 1000000,
    workingAge: r.workingAge / 1000000,
    elderly: r.elderly / 1000000,
    total: r.totalPopulation / 1000000,
  }));

  // Birth rate chart data
  const birthRateChartData = annualResults.map(r => ({
    year: r.year,
    tfr: r.tfr,
    births: r.annualBirths / 1000,
  }));

  return (
    <div className="space-y-6">
      {/* Population Pyramid and Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pyramid Chart */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            👥 Age Distribution — {selectedYear}
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pyramidChartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${Math.abs(v)}k`}
                  domain={[-60, 60]}
                />
                <YAxis
                  type="category"
                  dataKey="age"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 10 }}
                  width={25}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => formatNumber(Math.abs(value as number) * 1000)}
                />
                <Legend />
                <Bar dataKey="male" name="Male" fill="#3B82F6" stackId="a" />
                <Bar dataKey="female" name="Female" fill="#EC4899" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Population Breakdown */}
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Population Breakdown</h3>
            <div className="space-y-4">
              <StatBar
                label="Children (0-14)"
                value={currentYearData.children}
                total={currentYearData.totalPopulation}
                color="bg-cyan-500"
              />
              <StatBar
                label="Working Age (15-64)"
                value={currentYearData.workingAge}
                total={currentYearData.totalPopulation}
                color="bg-green-500"
              />
              <StatBar
                label="Elderly (65+)"
                value={currentYearData.elderly}
                total={currentYearData.totalPopulation}
                color="bg-amber-500"
              />
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">The Challenge</h3>
            <div className="text-gray-400 space-y-2">
              <p>
                <span className="text-amber-400 font-semibold text-xl">
                  {(currentYearData.workingAge / currentYearData.elderly).toFixed(1)}
                </span>{' '}
                workers per retiree in {selectedYear}
              </p>
              <p className="text-sm">
                {selectedYear < 2000 && 'The golden ratio — each retiree supported by 4+ workers.'}
                {selectedYear >= 2000 && selectedYear < 2020 && 'Baby boomers approaching retirement. Ratio declining.'}
                {selectedYear >= 2020 && selectedYear < 2040 && 'Baby boom retirement wave in full swing. Pressure mounting.'}
                {selectedYear >= 2040 && 'Post-transition: Fewer than 2 workers per retiree. New normal.'}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-950/30 to-transparent rounded-lg p-4 border border-amber-800/30">
            <h4 className="text-amber-400 font-semibold mb-2">
              Birth Rate: {currentYearData.tfr.toFixed(2)}
            </h4>
            <p className="text-gray-400 text-sm">
              {currentYearData.tfr >= 2.1 && 'At or above replacement level — population can grow naturally.'}
              {currentYearData.tfr >= 1.6 && currentYearData.tfr < 2.1 && 'Moderate fertility — slow population decline without immigration.'}
              {currentYearData.tfr >= 1.3 && currentYearData.tfr < 1.6 && 'Low fertility — significant population decline ahead.'}
              {currentYearData.tfr < 1.3 && 'Very low fertility — rapid population decline and aging.'}
              {' '}Projected {formatCompact(currentYearData.annualBirths)} births this year.
            </p>
          </div>
        </div>
      </div>

      {/* Population Timeline */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          📈 Population by Age Group (1990-2060)
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={demographicChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => `${(value as number).toFixed(2)}M`}
              />
              <Legend />
              <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
              <ReferenceLine x={2024} stroke="#A855F7" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="children"
                name="Children (0-14)"
                stackId="1"
                fill="#06B6D4"
                stroke="#06B6D4"
              />
              <Area
                type="monotone"
                dataKey="workingAge"
                name="Working Age (15-64)"
                stackId="1"
                fill="#22C55E"
                stroke="#22C55E"
              />
              <Area
                type="monotone"
                dataKey="elderly"
                name="Elderly (65+)"
                stackId="1"
                fill="#F59E0B"
                stroke="#F59E0B"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Birth Rate Timeline */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          👶 Birth Rate Trajectory
        </h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={birthRateChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                stroke="#F59E0B"
                tick={{ fontSize: 11 }}
                domain={[0, 3]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3B82F6"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <ReferenceLine yAxisId="left" y={2.1} stroke="#22C55E" strokeDasharray="3 3" label={{ value: 'Replacement', fontSize: 10, fill: '#22C55E' }} />
              <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tfr"
                name="TFR"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="births"
                name="Births (k)"
                fill="#3B82F6"
                fillOpacity={0.3}
                stroke="#3B82F6"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

