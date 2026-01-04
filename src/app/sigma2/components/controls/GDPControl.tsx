'use client';

import { GDP_SCENARIOS, type AnnualPopulationResult } from '@/lib/populationSimulator';

interface GDPControlProps {
  scenarioId: string;
  useCustomGrowth: boolean;
  customGrowthRate: number;
  onScenarioChange: (id: string) => void;
  onUseCustomChange: (value: boolean) => void;
  onCustomGrowthRateChange: (value: number) => void;
  currentYearData: AnnualPopulationResult;
}

export function GDPControl({
  scenarioId,
  useCustomGrowth,
  customGrowthRate,
  onScenarioChange,
  onUseCustomChange,
  onCustomGrowthRateChange,
  currentYearData,
}: GDPControlProps) {
  const activeScenario = GDP_SCENARIOS[scenarioId];
  const effectiveRate = useCustomGrowth ? customGrowthRate : currentYearData.effectiveGdpGrowthRate;
  const isWorkforceAdjusted = currentYearData.isWorkforceAdjusted && !useCustomGrowth;

  // Group scenarios into fixed and workforce-adjusted
  const fixedScenarios = Object.values(GDP_SCENARIOS).filter(s => !s.adjustForWorkforce);
  const adjustedScenarios = Object.values(GDP_SCENARIOS).filter(s => s.adjustForWorkforce);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <span>📈</span> GDP Growth
        </h4>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={useCustomGrowth}
            onChange={(e) => onUseCustomChange(e.target.checked)}
            className="rounded bg-gray-800 border-gray-700 w-3.5 h-3.5"
          />
          Custom
        </label>
      </div>

      {/* Scenario Buttons - Workforce Adjusted */}
      <div className="mb-2">
        <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Workforce-adjusted</div>
        <div className="flex flex-wrap gap-1">
          {adjustedScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                onScenarioChange(scenario.id);
                onUseCustomChange(false);
              }}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                scenarioId === scenario.id && !useCustomGrowth
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              style={{ borderLeft: `3px solid ${scenario.color}` }}
            >
              {scenario.productivityGrowthRate * 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Buttons - Fixed */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Fixed rate</div>
        <div className="flex flex-wrap gap-1">
          {fixedScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                onScenarioChange(scenario.id);
                onUseCustomChange(false);
              }}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                scenarioId === scenario.id && !useCustomGrowth
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              style={{ borderLeft: `3px solid ${scenario.color}` }}
            >
              {scenario.realGrowthRate * 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Custom Slider */}
      {useCustomGrowth && (
        <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800 mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Custom Rate</span>
            <span className="text-purple-400 font-semibold">{(customGrowthRate * 100).toFixed(1)}%/yr</span>
          </div>
          <input
            type="range"
            min={-0.02}
            max={0.05}
            step={0.001}
            value={customGrowthRate}
            onChange={(e) => onCustomGrowthRateChange(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>-2%</span>
            <span>1.5% hist.</span>
            <span>5%</span>
          </div>
        </div>
      )}

      {/* Workforce breakdown (when applicable) */}
      {isWorkforceAdjusted && (
        <div className="p-2 bg-purple-950/30 border border-purple-800/30 rounded text-xs mb-3">
          <div className="grid grid-cols-3 text-center">
            <div>
              <div className="text-gray-500">Prod.</div>
              <div className="text-purple-300 font-semibold">
                {currentYearData.productivityGrowthRate >= 0 ? '+' : ''}
                {(currentYearData.productivityGrowthRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-500">Work Δ</div>
              <div className="text-purple-300 font-semibold">
                {currentYearData.workforceChangeRate >= 0 ? '+' : ''}
                {(currentYearData.workforceChangeRate * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-gray-500">= GDP</div>
              <div className="text-purple-400 font-bold">
                {effectiveRate >= 0 ? '+' : ''}
                {(effectiveRate * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-[10px] text-gray-600">
        {useCustomGrowth
          ? `Custom: ${(customGrowthRate * 100).toFixed(1)}% real GDP growth/year`
          : activeScenario?.description || 'Select a GDP growth scenario.'}
      </p>
    </div>
  );
}

