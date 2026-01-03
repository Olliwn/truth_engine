'use client';

import { MunicipalityData, RISK_LABELS } from '@/lib/types';
import { formatNumber, formatCurrency, formatRatio, getRiskColor } from '@/lib/calculations';
import ShareButton from './ShareButton';

interface MunicipalityCardProps {
  data: MunicipalityData;
  onClose?: () => void;
}

export default function MunicipalityCard({ data, onClose }: MunicipalityCardProps) {
  const riskColor = getRiskColor(data.risk_category);
  
  return (
    <div className="card p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-2xl font-bold">{data.municipality_name}</h3>
            <span 
              className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
              style={{ 
                backgroundColor: `${riskColor}20`,
                color: riskColor,
                border: `1px solid ${riskColor}40`
              }}
            >
              {RISK_LABELS[data.risk_category]}
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Rank #{data.rank} of 309 municipalities
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
      
      {/* Main Metric */}
      <div className="mb-6">
        <div className="text-gray-400 text-sm mb-1">Ponzi Index</div>
        <div 
          className="text-5xl font-bold mono-data text-glow"
          style={{ color: riskColor }}
        >
          {formatNumber(data.ponzi_index)}
        </div>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricBox
          label="Debt per Future Worker"
          value={formatCurrency(data.debt_per_worker_eur)}
          sublabel="EUR per working-age person (2035)"
        />
        <MetricBox
          label="Dependency Ratio"
          value={formatRatio(data.dependency_ratio)}
          sublabel="Dependents per worker (2035)"
        />
        <MetricBox
          label="Total Municipal Debt"
          value={formatCurrency(data.total_debt_eur)}
          sublabel={`As of ${data.debt_year}`}
        />
        <MetricBox
          label="Projected Population"
          value={formatNumber(data.total_population)}
          sublabel={`Projection for ${data.projection_year}`}
        />
      </div>
      
      {/* Population Breakdown */}
      <div className="mb-6">
        <div className="text-gray-400 text-sm mb-3">Population Breakdown ({data.projection_year})</div>
        <div className="flex gap-2 h-8 rounded-lg overflow-hidden">
          <PopulationBar 
            label="Youth (0-19)" 
            value={data.young_dependents_0_19} 
            total={data.total_population}
            color="#3b82f6"
          />
          <PopulationBar 
            label="Working Age (20-64)" 
            value={data.working_age_population} 
            total={data.total_population}
            color="#22c55e"
          />
          <PopulationBar 
            label="Elderly (65+)" 
            value={data.elderly_dependents_65_plus} 
            total={data.total_population}
            color="#f97316"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Youth: {formatNumber(data.young_dependents_0_19)}</span>
          <span>Working: {formatNumber(data.working_age_population)}</span>
          <span>Elderly: {formatNumber(data.elderly_dependents_65_plus)}</span>
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
        <div>
          <div className="text-gray-500 text-xs mb-1">Loan/Capita</div>
          <div className="mono-data text-sm">€{formatNumber(data.loan_per_capita_eur)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs mb-1">Rel. Indebtedness</div>
          <div className="mono-data text-sm">{data.relative_indebtedness_pct}%</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs mb-1">Equity Ratio</div>
          <div className="mono-data text-sm">{data.equity_ratio_pct}%</div>
        </div>
      </div>
      
      {/* Share Button */}
      <div className="pt-4 border-t border-gray-800 mt-4">
        <ShareButton municipality={data} />
      </div>
    </div>
  );
}

function MetricBox({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-4">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className="text-xl font-semibold mono-data">{value}</div>
      <div className="text-gray-600 text-xs mt-1">{sublabel}</div>
    </div>
  );
}

function PopulationBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = (value / total) * 100;
  
  return (
    <div 
      className="relative group cursor-help"
      style={{ width: `${percentage}%`, backgroundColor: color }}
      title={`${label}: ${formatNumber(value)} (${percentage.toFixed(1)}%)`}
    >
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
}

