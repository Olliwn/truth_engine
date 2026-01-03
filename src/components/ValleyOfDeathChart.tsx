'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { WageTrapDataPoint, getEMTRColor } from '@/lib/types';

interface ValleyOfDeathChartProps {
  data: WageTrapDataPoint[];
  currentGrossIncome: number;
  valleyStart: number;
  valleyEnd: number;
  escapeVelocity: number;
  zeroWorkIncome: number;
}

export default function ValleyOfDeathChart({
  data,
  currentGrossIncome,
  valleyStart,
  valleyEnd,
  escapeVelocity,
  zeroWorkIncome,
}: ValleyOfDeathChartProps) {
  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Transform data for chart
  const chartData = useMemo(() => {
    return data.map((point) => ({
      gross: point.grossMonthlyIncome,
      netDisposable: point.netDisposableIncome,
      netAfterTax: point.netIncomeAfterTax,
      benefits: point.totalBenefits,
      emtr: point.effectiveMarginalTaxRate * 100,
      keepPerEuro: point.keepPerEuro * 100,
    }));
  }, [data]);

  // Find current data point
  const currentPoint = useMemo(() => {
    return data.find(p => p.grossMonthlyIncome === currentGrossIncome) || data[0];
  }, [data, currentGrossIncome]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const gross = label;
    const point = data.find(p => p.grossMonthlyIncome === gross);
    if (!point) return null;

    const emtrColor = getEMTRColor(point.effectiveMarginalTaxRate);

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl">
        <div className="text-lg font-bold text-white mb-3">
          Gross: {formatEuro(gross)}/mo
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-8">
            <span className="text-gray-400">Net after tax:</span>
            <span className="text-white font-mono">{formatEuro(point.netIncomeAfterTax)}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-gray-400">+ Benefits:</span>
            <span className="text-green-400 font-mono">+{formatEuro(point.totalBenefits)}</span>
          </div>
          <div className="flex justify-between gap-8 pt-2 border-t border-gray-700">
            <span className="text-gray-300 font-medium">Net disposable:</span>
            <span className="text-amber-400 font-bold font-mono">{formatEuro(point.netDisposableIncome)}</span>
          </div>
          
          <div className="pt-3 mt-3 border-t border-gray-700">
            <div className="flex justify-between gap-8">
              <span className="text-gray-400">Marginal tax + clawback:</span>
              <span className="font-bold font-mono" style={{ color: emtrColor }}>
                {(point.effectiveMarginalTaxRate * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-gray-400">You keep per €1:</span>
              <span className="font-bold font-mono" style={{ color: emtrColor }}>
                €{point.keepPerEuro.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="card p-4">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              
              {/* Valley of Death zone */}
              {valleyStart > 0 && valleyEnd > valleyStart && (
                <ReferenceArea
                  x1={valleyStart}
                  x2={valleyEnd}
                  fill="#dc2626"
                  fillOpacity={0.1}
                  label={{ value: 'Valley of Death', position: 'top', fill: '#dc2626', fontSize: 12 }}
                />
              )}
              
              {/* Zero work income line */}
              <ReferenceLine
                y={zeroWorkIncome}
                stroke="#eab308"
                strokeDasharray="5 5"
                label={{ value: `Zero work: ${formatEuro(zeroWorkIncome)}`, position: 'right', fill: '#eab308', fontSize: 11 }}
              />
              
              {/* Current income marker */}
              <ReferenceLine
                x={currentGrossIncome}
                stroke="#f59e0b"
                strokeWidth={2}
                label={{ value: 'Current', position: 'top', fill: '#f59e0b', fontSize: 11 }}
              />
              
              <XAxis
                dataKey="gross"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(v) => `€${v / 1000}k`}
                label={{ value: 'Gross Monthly Income', position: 'bottom', fill: '#9ca3af', offset: -5 }}
              />
              
              <YAxis
                yAxisId="income"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
                label={{ value: 'Net Income (€/mo)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
              />
              
              <YAxis
                yAxisId="rate"
                orientation="right"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                label={{ value: 'EMTR (%)', angle: 90, position: 'insideRight', fill: '#9ca3af' }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
              />
              
              {/* Benefits area (stacked underneath) */}
              <Area
                yAxisId="income"
                type="monotone"
                dataKey="benefits"
                name="Benefits"
                fill="#22c55e"
                fillOpacity={0.3}
                stroke="#22c55e"
                strokeWidth={0}
              />
              
              {/* Net disposable income line */}
              <Line
                yAxisId="income"
                type="monotone"
                dataKey="netDisposable"
                name="Net Disposable"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#f59e0b' }}
              />
              
              {/* Net after tax line */}
              <Line
                yAxisId="income"
                type="monotone"
                dataKey="netAfterTax"
                name="Net After Tax"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
              
              {/* EMTR line */}
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="emtr"
                name="Marginal Rate (EMTR)"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EMTR Gauge for current income */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Current EMTR */}
        <div className="card p-4 text-center">
          <div className="text-sm text-gray-500 mb-2">Effective Marginal Rate</div>
          <div
            className="text-4xl font-bold font-mono"
            style={{ color: getEMTRColor(currentPoint.effectiveMarginalTaxRate) }}
          >
            {(currentPoint.effectiveMarginalTaxRate * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Of each additional €1 earned
          </div>
        </div>

        {/* Keep per Euro */}
        <div className="card p-4 text-center">
          <div className="text-sm text-gray-500 mb-2">You Keep Per €1</div>
          <div
            className="text-4xl font-bold font-mono"
            style={{ color: getEMTRColor(currentPoint.effectiveMarginalTaxRate) }}
          >
            €{currentPoint.keepPerEuro.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            After taxes & benefit clawbacks
          </div>
        </div>

        {/* Escape Velocity */}
        <div className="card p-4 text-center">
          <div className="text-sm text-gray-500 mb-2">Escape Velocity</div>
          <div className="text-4xl font-bold font-mono text-amber-400">
            {formatEuro(escapeVelocity)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Gross income to beat zero work
          </div>
        </div>
      </div>

      {/* Legend explanation */}
      <div className="card p-4 bg-gray-900/50">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Understanding the Chart</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded bg-amber-500 mt-0.5" />
            <div>
              <div className="font-medium text-white">Net Disposable</div>
              <div className="text-gray-500">What you actually have to spend after all taxes and benefits</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded bg-green-500 mt-0.5" />
            <div>
              <div className="font-medium text-white">Benefits</div>
              <div className="text-gray-500">Housing allowance + social assistance + other benefits</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded bg-red-500 mt-0.5" />
            <div>
              <div className="font-medium text-white">EMTR Line</div>
              <div className="text-gray-500">How much of each extra €1 is lost to taxes + benefit clawbacks</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded mt-0.5" style={{ background: 'repeating-linear-gradient(90deg, #eab308, #eab308 5px, transparent 5px, transparent 10px)' }} />
            <div>
              <div className="font-medium text-white">Zero Work Line</div>
              <div className="text-gray-500">Income with €0 gross (just benefits)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

