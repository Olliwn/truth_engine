'use client';

import { UNEMPLOYMENT_SCENARIOS } from '@/lib/constants/demographicScenarios';
import type { LegacyAnnualPopulationResult } from '@/lib/simulation/index';

interface UnemploymentControlProps {
  scenarioId: string;
  useCustomUnemployment: boolean;
  customUnemploymentRate: number;
  onScenarioChange: (id: string) => void;
  onUseCustomChange: (value: boolean) => void;
  onCustomRateChange: (value: number) => void;
  currentYearData: LegacyAnnualPopulationResult;
}

export function UnemploymentControl({
  scenarioId,
  useCustomUnemployment,
  customUnemploymentRate,
  onScenarioChange,
  onUseCustomChange,
  onCustomRateChange,
  currentYearData,
}: UnemploymentControlProps) {
  const activeScenario = UNEMPLOYMENT_SCENARIOS[scenarioId];
  const effectiveRate = useCustomUnemployment 
    ? customUnemploymentRate 
    : currentYearData.unemploymentRate;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <span>👷</span> Unemployment
        </h4>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={useCustomUnemployment}
            onChange={(e) => onUseCustomChange(e.target.checked)}
            className="rounded bg-gray-800 border-gray-700 w-3.5 h-3.5"
          />
          Custom
        </label>
      </div>

      {/* Scenario Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.values(UNEMPLOYMENT_SCENARIOS).map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => {
              onScenarioChange(scenario.id);
              onUseCustomChange(false);
            }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              scenarioId === scenario.id && !useCustomUnemployment
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={{ borderLeft: `3px solid ${scenario.color}` }}
          >
            {scenario.name}
          </button>
        ))}
      </div>

      {/* Custom Slider */}
      {useCustomUnemployment && (
        <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800 mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Custom Rate</span>
            <span className="text-amber-400 font-semibold">{(customUnemploymentRate * 100).toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={0.02}
            max={0.15}
            step={0.005}
            value={customUnemploymentRate}
            onChange={(e) => onCustomRateChange(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>2%</span>
            <span>~7% current</span>
            <span>15%</span>
          </div>
        </div>
      )}

      {/* Current Rate Display */}
      <div className="p-2 bg-amber-950/30 border border-amber-800/30 rounded text-xs mb-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">
            Effective Rate ({currentYearData.year})
          </span>
          <span className="text-amber-400 font-bold text-sm">
            {(effectiveRate * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[10px] text-gray-600">
        {useCustomUnemployment
          ? `Custom: ${(customUnemploymentRate * 100).toFixed(1)}% unemployment rate`
          : activeScenario?.description || 'Select an unemployment scenario.'}
      </p>
    </div>
  );
}

