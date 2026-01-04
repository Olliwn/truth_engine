'use client';

import { BIRTH_RATE_PRESETS } from '@/lib/populationSimulator';

interface BirthRateControlProps {
  birthRatePreset: string;
  customTFR: number;
  transitionYear: number;
  useCustomBirthRate: boolean;
  onPresetSelect: (presetId: string) => void;
  onCustomTFRChange: (value: number) => void;
  onTransitionYearChange: (value: number) => void;
  onUseCustomChange: (value: boolean) => void;
}

export function BirthRateControl({
  birthRatePreset,
  customTFR,
  transitionYear,
  useCustomBirthRate,
  onPresetSelect,
  onCustomTFRChange,
  onTransitionYearChange,
  onUseCustomChange,
}: BirthRateControlProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <span>👶</span> Birth Rate
        </h4>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={useCustomBirthRate}
            onChange={(e) => onUseCustomChange(e.target.checked)}
            className="rounded bg-gray-800 border-gray-700 w-3.5 h-3.5"
          />
          Custom
        </label>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.values(BIRTH_RATE_PRESETS).map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetSelect(preset.id)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              birthRatePreset === preset.id && !useCustomBirthRate
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
            style={{
              borderLeft: `3px solid ${preset.color}`,
            }}
          >
            {preset.name.replace(' Rate', '')}
          </button>
        ))}
      </div>

      {/* Custom Sliders */}
      {useCustomBirthRate && (
        <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Target TFR</span>
              <span className="text-amber-400 font-semibold">{customTFR.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.8}
              max={2.5}
              step={0.05}
              value={customTFR}
              onChange={(e) => onCustomTFRChange(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>0.8</span>
              <span className="text-green-600">2.1 replacement</span>
              <span>2.5</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Target Year</span>
              <span className="text-amber-400 font-semibold">{transitionYear}</span>
            </div>
            <input
              type="range"
              min={2025}
              max={2060}
              step={1}
              value={transitionYear}
              onChange={(e) => onTransitionYearChange(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>2025</span>
              <span>2060</span>
            </div>
          </div>
        </div>
      )}

      {/* Current preset description */}
      {!useCustomBirthRate && (
        <p className="text-[11px] text-gray-600 mt-2">
          {BIRTH_RATE_PRESETS[birthRatePreset]?.description || 'Select a birth rate scenario.'}
        </p>
      )}
    </div>
  );
}

