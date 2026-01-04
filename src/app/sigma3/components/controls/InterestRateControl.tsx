'use client';

import { INTEREST_RATE_SCENARIOS, HISTORICAL_DEBT, type AnnualPopulationResult } from '@/lib/populationSimulator';

// ===========================================
// Formatting
// ===========================================

const formatMillions = (n: number) => {
  if (!isFinite(n)) return '€--';
  const billions = n / 1000;
  if (Math.abs(billions) >= 1) return `€${billions.toFixed(1)}B`;
  return `€${n.toFixed(0)}M`;
};

interface InterestRateControlProps {
  scenarioId: string;
  useCustomRate: boolean;
  customRate: number;
  onScenarioChange: (id: string) => void;
  onUseCustomChange: (value: boolean) => void;
  onCustomRateChange: (value: number) => void;
  currentYearData: AnnualPopulationResult;
}

export function InterestRateControl({
  scenarioId,
  useCustomRate,
  customRate,
  onScenarioChange,
  onUseCustomChange,
  onCustomRateChange,
  currentYearData,
}: InterestRateControlProps) {
  const activeScenario = INTEREST_RATE_SCENARIOS[scenarioId];
  const effectiveRate = useCustomRate ? customRate : activeScenario?.rate || 0.025;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <span>💳</span> Interest Rate
        </h4>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={useCustomRate}
            onChange={(e) => onUseCustomChange(e.target.checked)}
            className="rounded bg-gray-800 border-gray-700 w-3.5 h-3.5"
          />
          Custom
        </label>
      </div>

      {/* Scenario Buttons */}
      <div className="flex flex-wrap gap-1 mb-3">
        {Object.values(INTEREST_RATE_SCENARIOS).map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => {
              onScenarioChange(scenario.id);
              onUseCustomChange(false);
            }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              scenarioId === scenario.id && !useCustomRate
                ? 'bg-rose-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={{ borderLeft: `3px solid ${scenario.color}` }}
          >
            {(scenario.rate * 100).toFixed(1)}%
          </button>
        ))}
      </div>

      {/* Custom Slider */}
      {useCustomRate && (
        <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800 mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Custom Rate</span>
            <span className="text-rose-400 font-semibold">{(customRate * 100).toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={0.005}
            max={0.10}
            step={0.005}
            value={customRate}
            onChange={(e) => onCustomRateChange(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>0.5%</span>
            <span>3.5%</span>
            <span>10%</span>
          </div>
        </div>
      )}

      {/* Current debt stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 bg-gray-900/50 rounded text-center">
          <div className="text-[10px] text-gray-500">Current Debt</div>
          <div className="text-sm font-semibold text-gray-300">€{HISTORICAL_DEBT[2024]}B</div>
        </div>
        <div className="p-2 bg-gray-900/50 rounded text-center">
          <div className="text-[10px] text-gray-500">Interest/yr</div>
          <div className="text-sm font-semibold text-rose-400">
            {formatMillions(currentYearData.interestExpense)}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[10px] text-gray-600">
        {useCustomRate
          ? `Custom: ${(customRate * 100).toFixed(1)}% annual interest on government debt.`
          : activeScenario?.description || 'Select an interest rate scenario.'}
      </p>
    </div>
  );
}

