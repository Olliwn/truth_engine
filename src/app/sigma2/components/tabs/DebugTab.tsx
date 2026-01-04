'use client';

import { useState, useMemo } from 'react';
import {
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
// Parameter Definition Types
// ===========================================

interface DebugParameter {
  id: string;
  label: string;
  accessor: (r: AnnualPopulationResult) => number;
  format: (v: number) => string;
  unit: string;
  color: string;
}

// ===========================================
// Hierarchical Parameter Structure
// ===========================================

const DEBUG_PARAMETERS: Record<string, DebugParameter[]> = {
  'Population': [
    {
      id: 'totalPopulation',
      label: 'Total Population',
      accessor: r => r.totalPopulation,
      format: v => `${(v / 1000000).toFixed(2)}M`,
      unit: 'M',
      color: '#A855F7',
    },
    {
      id: 'children',
      label: 'Children (0-14)',
      accessor: r => r.children,
      format: v => `${(v / 1000000).toFixed(2)}M`,
      unit: 'M',
      color: '#06B6D4',
    },
    {
      id: 'workingAge',
      label: 'Working Age (15-64)',
      accessor: r => r.workingAge,
      format: v => `${(v / 1000000).toFixed(2)}M`,
      unit: 'M',
      color: '#22C55E',
    },
    {
      id: 'elderly',
      label: 'Elderly (65+)',
      accessor: r => r.elderly,
      format: v => `${(v / 1000000).toFixed(2)}M`,
      unit: 'M',
      color: '#F59E0B',
    },
  ],
  'Demographics': [
    {
      id: 'dependencyRatio',
      label: 'Dependency Ratio',
      accessor: r => r.dependencyRatio,
      format: v => `${v.toFixed(1)}%`,
      unit: '%',
      color: '#EF4444',
    },
    {
      id: 'oldAgeDependencyRatio',
      label: 'Old-Age Dependency',
      accessor: r => r.oldAgeDependencyRatio,
      format: v => `${v.toFixed(1)}%`,
      unit: '%',
      color: '#F59E0B',
    },
    {
      id: 'tfr',
      label: 'Total Fertility Rate',
      accessor: r => r.tfr,
      format: v => v.toFixed(2),
      unit: '',
      color: '#EC4899',
    },
    {
      id: 'annualBirths',
      label: 'Annual Births',
      accessor: r => r.annualBirths,
      format: v => `${(v / 1000).toFixed(1)}k`,
      unit: 'k',
      color: '#8B5CF6',
    },
  ],
  'Fiscal (Base)': [
    {
      id: 'totalContributions',
      label: 'Total Contributions',
      accessor: r => r.totalContributions,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#22C55E',
    },
    {
      id: 'totalStateCosts',
      label: 'Total State Costs',
      accessor: r => r.totalStateCosts,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#EF4444',
    },
    {
      id: 'netFiscalBalance',
      label: 'Net Balance',
      accessor: r => r.netFiscalBalance,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#A855F7',
    },
  ],
  'Fiscal (GDP-Adjusted)': [
    {
      id: 'gdpAdjustedContributions',
      label: 'Adjusted Contributions',
      accessor: r => r.gdpAdjustedContributions,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#10B981',
    },
    {
      id: 'gdpAdjustedCosts',
      label: 'Adjusted Costs',
      accessor: r => r.gdpAdjustedCosts,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#F87171',
    },
    {
      id: 'gdpAdjustedBalance',
      label: 'Adjusted Balance',
      accessor: r => r.gdpAdjustedBalance,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#8B5CF6',
    },
  ],
  'Cost Breakdown': [
    {
      id: 'educationCosts',
      label: 'Education',
      accessor: r => r.educationCosts,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#3B82F6',
    },
    {
      id: 'healthcareCosts',
      label: 'Healthcare',
      accessor: r => r.healthcareCosts,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#10B981',
    },
    {
      id: 'pensionCosts',
      label: 'Pensions',
      accessor: r => r.pensionCosts,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#F59E0B',
    },
    {
      id: 'benefitCosts',
      label: 'Benefits',
      accessor: r => r.benefitCosts,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#EF4444',
    },
  ],
  'Revenue Breakdown': [
    {
      id: 'incomeTaxRevenue',
      label: 'Income Tax',
      accessor: r => r.incomeTaxRevenue,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#3B82F6',
    },
    {
      id: 'socialInsuranceRevenue',
      label: 'Social Insurance',
      accessor: r => r.socialInsuranceRevenue,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#22C55E',
    },
    {
      id: 'vatRevenue',
      label: 'VAT Revenue',
      accessor: r => r.vatRevenue,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#F59E0B',
    },
  ],
  'GDP & Growth': [
    {
      id: 'gdp',
      label: 'GDP (billions)',
      accessor: r => r.gdp,
      format: v => `€${v.toFixed(0)}B`,
      unit: '€B',
      color: '#A855F7',
    },
    {
      id: 'gdpGrowthRate',
      label: 'GDP Growth Rate (applied)',
      accessor: r => r.gdpGrowthRate * 100,
      format: v => `${v.toFixed(2)}%`,
      unit: '%',
      color: '#22C55E',
    },
    {
      id: 'productivityGrowthRate',
      label: 'Productivity Growth',
      accessor: r => r.productivityGrowthRate * 100,
      format: v => `${v.toFixed(2)}%`,
      unit: '%',
      color: '#3B82F6',
    },
    {
      id: 'workforceChangeRate',
      label: 'Workforce Change',
      accessor: r => r.workforceChangeRate * 100,
      format: v => `${v.toFixed(2)}%`,
      unit: '%',
      color: '#F59E0B',
    },
    {
      id: 'effectiveGdpGrowthRate',
      label: 'Effective GDP Growth',
      accessor: r => r.effectiveGdpGrowthRate * 100,
      format: v => `${v.toFixed(2)}%`,
      unit: '%',
      color: '#10B981',
    },
    {
      id: 'govtSpendingPctGDP',
      label: 'Govt Spending % GDP',
      accessor: r => r.govtSpendingPctGDP,
      format: v => `${v.toFixed(1)}%`,
      unit: '%',
      color: '#EF4444',
    },
    {
      id: 'deficitPctGDP',
      label: 'Deficit % GDP',
      accessor: r => r.deficitPctGDP,
      format: v => `${v.toFixed(1)}%`,
      unit: '%',
      color: '#DC2626',
    },
  ],
  'Debt': [
    {
      id: 'debtStock',
      label: 'Debt Stock',
      accessor: r => r.debtStock,
      format: v => `€${v.toFixed(0)}B`,
      unit: '€B',
      color: '#DC2626',
    },
    {
      id: 'debtToGDP',
      label: 'Debt/GDP Ratio',
      accessor: r => r.debtToGDP,
      format: v => `${v.toFixed(1)}%`,
      unit: '%',
      color: '#EF4444',
    },
    {
      id: 'interestExpense',
      label: 'Interest Expense',
      accessor: r => r.interestExpense,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#F59E0B',
    },
    {
      id: 'interestRate',
      label: 'Interest Rate',
      accessor: r => r.interestRate * 100,
      format: v => `${v.toFixed(1)}%`,
      unit: '%',
      color: '#F97316',
    },
    {
      id: 'primaryBalance',
      label: 'Primary Balance',
      accessor: r => r.primaryBalance,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#A855F7',
    },
  ],
  'Immigration': [
    {
      id: 'immigrationFiscalImpact',
      label: 'Total Fiscal Impact',
      accessor: r => r.immigrationFiscalImpact,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#8B5CF6',
    },
    {
      id: 'workBasedCount',
      label: 'Work-based Count',
      accessor: r => r.immigrationByType.workBased.count,
      format: v => `${(v / 1000).toFixed(1)}k`,
      unit: 'k',
      color: '#22C55E',
    },
    {
      id: 'workBasedImpact',
      label: 'Work-based Impact',
      accessor: r => r.immigrationByType.workBased.fiscalImpact,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#10B981',
    },
    {
      id: 'familyCount',
      label: 'Family Count',
      accessor: r => r.immigrationByType.family.count,
      format: v => `${(v / 1000).toFixed(1)}k`,
      unit: 'k',
      color: '#F59E0B',
    },
    {
      id: 'familyImpact',
      label: 'Family Impact',
      accessor: r => r.immigrationByType.family.fiscalImpact,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#EAB308',
    },
    {
      id: 'humanitarianCount',
      label: 'Humanitarian Count',
      accessor: r => r.immigrationByType.humanitarian.count,
      format: v => `${(v / 1000).toFixed(1)}k`,
      unit: 'k',
      color: '#EF4444',
    },
    {
      id: 'humanitarianImpact',
      label: 'Humanitarian Impact',
      accessor: r => r.immigrationByType.humanitarian.fiscalImpact,
      format: v => `€${(v / 1000).toFixed(1)}B`,
      unit: '€B',
      color: '#DC2626',
    },
  ],
  'Per Capita': [
    {
      id: 'avgContributionPerWorker',
      label: 'Avg Contribution/Worker',
      accessor: r => r.avgContributionPerWorker,
      format: v => `€${v.toFixed(0)}`,
      unit: '€',
      color: '#22C55E',
    },
    {
      id: 'avgCostPerPerson',
      label: 'Avg Cost/Person',
      accessor: r => r.avgCostPerPerson,
      format: v => `€${v.toFixed(0)}`,
      unit: '€',
      color: '#EF4444',
    },
  ],
};

const CATEGORIES = Object.keys(DEBUG_PARAMETERS);

// ===========================================
// Helper Functions
// ===========================================

function getParameter(category: string, paramId: string): DebugParameter | null {
  const params = DEBUG_PARAMETERS[category];
  if (!params) return null;
  return params.find(p => p.id === paramId) || null;
}

// ===========================================
// Main DebugTab Component
// ===========================================

interface DebugTabProps {
  selectedYear: number;
  annualResults: AnnualPopulationResult[];
  currentYearData: AnnualPopulationResult;
}

export function DebugTab({
  selectedYear,
  annualResults,
  currentYearData,
}: DebugTabProps) {
  // Primary parameter selection
  const [primaryCategory, setPrimaryCategory] = useState<string>('GDP & Growth');
  const [primaryParamId, setPrimaryParamId] = useState<string>('effectiveGdpGrowthRate');

  // Comparison parameter selection
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [compCategory, setCompCategory] = useState<string>('Fiscal (Base)');
  const [compParamId, setCompParamId] = useState<string>('netFiscalBalance');

  // Get selected parameters
  const primaryParam = getParameter(primaryCategory, primaryParamId);
  const compParam = showComparison ? getParameter(compCategory, compParamId) : null;

  // Prepare chart data
  const chartData = useMemo(() => {
    return annualResults.map(r => {
      const data: Record<string, number> = { year: r.year };
      if (primaryParam) {
        data.primary = primaryParam.accessor(r);
      }
      if (compParam) {
        data.comparison = compParam.accessor(r);
      }
      return data;
    });
  }, [annualResults, primaryParam, compParam]);

  // Get current values
  const primaryValue = primaryParam ? primaryParam.accessor(currentYearData) : 0;
  const compValue = compParam ? compParam.accessor(currentYearData) : 0;

  // Handle category change - reset param to first in category
  const handlePrimaryCategoryChange = (cat: string) => {
    setPrimaryCategory(cat);
    const params = DEBUG_PARAMETERS[cat];
    if (params && params.length > 0) {
      setPrimaryParamId(params[0].id);
    }
  };

  const handleCompCategoryChange = (cat: string) => {
    setCompCategory(cat);
    const params = DEBUG_PARAMETERS[cat];
    if (params && params.length > 0) {
      setCompParamId(params[0].id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <span>🔬</span> Debug Parameter Viewer
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Select any simulation parameter to visualize its timeline. Use comparison mode to overlay two parameters with independent Y-axes.
        </p>

        {/* Primary Parameter Selection */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={primaryCategory}
              onChange={(e) => handlePrimaryCategoryChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Parameter</label>
            <select
              value={primaryParamId}
              onChange={(e) => setPrimaryParamId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300"
            >
              {DEBUG_PARAMETERS[primaryCategory]?.map(param => (
                <option key={param.id} value={param.id}>{param.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Parameter Info */}
        {primaryParam && (
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg mb-4">
            <div>
              <span className="text-xs text-gray-500">Selected:</span>{' '}
              <span className="text-sm font-medium" style={{ color: primaryParam.color }}>
                {primaryCategory} → {primaryParam.label}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Value ({selectedYear}):</span>{' '}
              <span className="text-lg font-bold" style={{ color: primaryParam.color }}>
                {primaryParam.format(primaryValue)}
              </span>
            </div>
          </div>
        )}

        {/* Comparison Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="showComparison"
            checked={showComparison}
            onChange={(e) => setShowComparison(e.target.checked)}
            className="rounded bg-gray-800 border-gray-700"
          />
          <label htmlFor="showComparison" className="text-sm text-gray-400">
            Add comparison parameter (dual Y-axis)
          </label>
        </div>

        {/* Comparison Parameter Selection */}
        {showComparison && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comparison Category</label>
                <select
                  value={compCategory}
                  onChange={(e) => handleCompCategoryChange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comparison Parameter</label>
                <select
                  value={compParamId}
                  onChange={(e) => setCompParamId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300"
                >
                  {DEBUG_PARAMETERS[compCategory]?.map(param => (
                    <option key={param.id} value={param.id}>{param.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {compParam && (
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg mb-4">
                <div>
                  <span className="text-xs text-gray-500">Comparison:</span>{' '}
                  <span className="text-sm font-medium" style={{ color: compParam.color }}>
                    {compCategory} → {compParam.label}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Value ({selectedYear}):</span>{' '}
                  <span className="text-lg font-bold" style={{ color: compParam.color }}>
                    {compParam.format(compValue)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Chart */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-4">
          Timeline (1990-2060)
        </h4>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              
              {/* Primary Y-Axis */}
              <YAxis
                yAxisId="primary"
                stroke={primaryParam?.color || '#A855F7'}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => primaryParam?.format(v) || String(v)}
                label={{
                  value: primaryParam?.label || 'Primary',
                  angle: -90,
                  position: 'insideLeft',
                  fill: primaryParam?.color || '#A855F7',
                  fontSize: 10,
                }}
              />

              {/* Comparison Y-Axis */}
              {compParam && (
                <YAxis
                  yAxisId="comparison"
                  orientation="right"
                  stroke={compParam.color}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => compParam.format(v)}
                  label={{
                    value: compParam.label,
                    angle: 90,
                    position: 'insideRight',
                    fill: compParam.color,
                    fontSize: 10,
                  }}
                />
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  if (name === 'primary' && primaryParam) {
                    return [primaryParam.format(value as number), primaryParam.label];
                  }
                  if (name === 'comparison' && compParam) {
                    return [compParam.format(value as number), compParam.label];
                  }
                  return [value, name];
                }}
              />
              <Legend 
                formatter={(value) => {
                  if (value === 'primary') return primaryParam?.label || 'Primary';
                  if (value === 'comparison') return compParam?.label || 'Comparison';
                  return value;
                }}
              />

              {/* Reference Lines */}
              <ReferenceLine x={selectedYear} stroke="#F59E0B" strokeWidth={2} />
              <ReferenceLine x={2024} stroke="#A855F7" strokeDasharray="3 3" />

              {/* Primary Line */}
              {primaryParam && (
                <Line
                  yAxisId="primary"
                  type="monotone"
                  dataKey="primary"
                  name="primary"
                  stroke={primaryParam.color}
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {/* Comparison Line */}
              {compParam && (
                <Line
                  yAxisId="comparison"
                  type="monotone"
                  dataKey="comparison"
                  name="comparison"
                  stroke={compParam.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table - Current Year */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-4">
          All Values for {selectedYear}
        </h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
          {CATEGORIES.map(category => (
            <div key={category} className="bg-gray-800/50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                {category}
              </h5>
              <div className="space-y-1">
                {DEBUG_PARAMETERS[category].map(param => {
                  const value = param.accessor(currentYearData);
                  const isSelected = 
                    (param.id === primaryParamId && category === primaryCategory) ||
                    (showComparison && param.id === compParamId && category === compCategory);
                  
                  return (
                    <div
                      key={param.id}
                      className={`flex justify-between text-xs py-1 px-2 rounded ${
                        isSelected ? 'bg-purple-950/50 border border-purple-800/50' : ''
                      }`}
                    >
                      <span className="text-gray-500">{param.label}</span>
                      <span
                        className="font-mono font-medium"
                        style={{ color: isSelected ? param.color : '#9CA3AF' }}
                      >
                        {param.format(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Quick Presets</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setPrimaryCategory('GDP & Growth');
              setPrimaryParamId('effectiveGdpGrowthRate');
              setShowComparison(true);
              setCompCategory('Fiscal (Base)');
              setCompParamId('netFiscalBalance');
            }}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs"
          >
            GDP Growth vs Balance
          </button>
          <button
            onClick={() => {
              setPrimaryCategory('Population');
              setPrimaryParamId('workingAge');
              setShowComparison(true);
              setCompCategory('Demographics');
              setCompParamId('oldAgeDependencyRatio');
            }}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs"
          >
            Working Age vs Dependency
          </button>
          <button
            onClick={() => {
              setPrimaryCategory('Fiscal (Base)');
              setPrimaryParamId('totalContributions');
              setShowComparison(true);
              setCompCategory('Fiscal (GDP-Adjusted)');
              setCompParamId('gdpAdjustedContributions');
            }}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs"
          >
            Base vs Adjusted Contributions
          </button>
          <button
            onClick={() => {
              setPrimaryCategory('Debt');
              setPrimaryParamId('debtToGDP');
              setShowComparison(true);
              setCompCategory('Debt');
              setCompParamId('interestExpense');
            }}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs"
          >
            Debt/GDP vs Interest
          </button>
          <button
            onClick={() => {
              setPrimaryCategory('GDP & Growth');
              setPrimaryParamId('productivityGrowthRate');
              setShowComparison(true);
              setCompCategory('GDP & Growth');
              setCompParamId('workforceChangeRate');
            }}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs"
          >
            Productivity vs Workforce
          </button>
        </div>
      </div>
    </div>
  );
}

