'use client';

import { IMMIGRATION_PROFILES, type AnnualPopulationResult } from '@/lib/populationSimulator';
import {
  IMMIGRATION_REFERENCE_PERIODS,
} from '@/lib/constants/demographicScenarios';

// ===========================================
// Formatting
// ===========================================

const formatCompact = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
};

const formatMillions = (n: number) => {
  if (!isFinite(n)) return '€--';
  const billions = n / 1000;
  if (Math.abs(billions) >= 1) return `€${billions.toFixed(1)}B`;
  return `€${n.toFixed(0)}M`;
};

// ===========================================
// Single Immigration Slider
// ===========================================

interface ImmigrationSliderProps {
  label: string;
  emoji: string;
  value: number;
  max: number;
  color: string;
  fiscalImpact: number;
  onChange: (value: number) => void;
}

function ImmigrationSlider({ label, emoji, value, max, color, fiscalImpact, onChange }: ImmigrationSliderProps) {
  const impactColor = fiscalImpact >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <span>{emoji}</span> {label}
        </span>
        <span className={`text-xs font-medium ${impactColor}`}>
          {formatMillions(fiscalImpact)}/yr
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={max}
          step={500}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: color }}
        />
        <span className="text-xs text-gray-300 w-12 text-right font-mono">
          {formatCompact(value)}
        </span>
      </div>
    </div>
  );
}

// ===========================================
// Main Immigration Control
// ===========================================

interface ImmigrationControlProps {
  workBased: number;
  family: number;
  humanitarian: number;
  onWorkBasedChange: (value: number) => void;
  onFamilyChange: (value: number) => void;
  onHumanitarianChange: (value: number) => void;
  currentYearData: AnnualPopulationResult;
}

export function ImmigrationControl({
  workBased,
  family,
  humanitarian,
  onWorkBasedChange,
  onFamilyChange,
  onHumanitarianChange,
  currentYearData,
}: ImmigrationControlProps) {
  const totalImmigration = workBased + family + humanitarian;
  const totalImpact = currentYearData.immigrationFiscalImpact;

  // Get fiscal impacts by type from current year data
  const workBasedImpact = currentYearData.immigrationByType.workBased.fiscalImpact;
  const familyImpact = currentYearData.immigrationByType.family.fiscalImpact;
  const humanitarianImpact = currentYearData.immigrationByType.humanitarian.fiscalImpact;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
        <span>✈️</span> Immigration
      </h4>

      <div className="space-y-3">
        <ImmigrationSlider
          label="Work-based"
          emoji="💼"
          value={workBased}
          max={30000}
          color="#22C55E"
          fiscalImpact={workBasedImpact}
          onChange={onWorkBasedChange}
        />

        <ImmigrationSlider
          label="Family"
          emoji="👨‍👩‍👧"
          value={family}
          max={30000}
          color="#F59E0B"
          fiscalImpact={familyImpact}
          onChange={onFamilyChange}
        />

        <ImmigrationSlider
          label="Humanitarian"
          emoji="🏥"
          value={humanitarian}
          max={30000}
          color="#EF4444"
          fiscalImpact={humanitarianImpact}
          onChange={onHumanitarianChange}
        />
      </div>

      {/* Total */}
      <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center text-sm">
        <span className="text-gray-400">
          Total: <span className="text-white font-medium">{formatCompact(totalImmigration)}/yr</span>
        </span>
        <span className={`font-semibold ${totalImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          Net: {formatMillions(totalImpact)}/yr
        </span>
      </div>

      {/* Historical Reference (compact) */}
      <div className="mt-3 p-2 bg-gray-900/50 rounded text-[10px] text-gray-500">
        <div className="flex justify-between mb-1">
          <span>Historical reference:</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-gray-400">2010s avg</div>
            <div className="text-gray-300">{formatCompact(IMMIGRATION_REFERENCE_PERIODS['2010s_average'].total)}</div>
          </div>
          <div>
            <div className="text-gray-400">2022-24</div>
            <div className="text-gray-300">{formatCompact(IMMIGRATION_REFERENCE_PERIODS['2022_2024_average'].total)}</div>
          </div>
          <div>
            <div className="text-gray-400">Peak &apos;23</div>
            <div className="text-amber-400">{formatCompact(IMMIGRATION_REFERENCE_PERIODS['peak_2023'].total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

