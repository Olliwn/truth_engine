'use client';

import type { YearlySpending } from '@/lib/simulation/spending';
import {
  SPENDING_GROUPS,
  SPENDING_SCENARIO_PRESETS,
  DEMOGRAPHIC_SCENARIOS,
  POPULATION_SCENARIOS,
  GDP_SCENARIOS_SPENDING,
  DISCRETIONARY_SCENARIOS,
  GOVERNMENT_SCENARIOS,
  type SpendingScenario,
  type SpendingGroupId,
} from '@/lib/constants/governmentSpending';

// ===========================================
// Helpers
// ===========================================

const formatBillions = (n: number) => `€${(n / 1000).toFixed(1)}B`;

function getScenarioOptionsForGroup(groupId: SpendingGroupId): Array<{ id: string; name: string; description: string }> {
  const group = SPENDING_GROUPS[groupId];
  if (!group) return [];
  
  let options: Record<string, { id: string; name: string; description: string }>;
  
  switch (group.driver) {
    case 'demographic':
      options = DEMOGRAPHIC_SCENARIOS;
      break;
    case 'population':
      options = POPULATION_SCENARIOS;
      break;
    case 'gdp':
      options = GDP_SCENARIOS_SPENDING;
      break;
    case 'discretionary':
      options = DISCRETIONARY_SCENARIOS;
      break;
    case 'mixed':
      options = GOVERNMENT_SCENARIOS;
      break;
    default:
      return [];
  }
  
  return Object.values(options);
}

function getScenarioIdForGroup(groupId: SpendingGroupId, scenario: SpendingScenario): string {
  switch (groupId) {
    case 'healthcare_aging': return scenario.healthcareAging;
    case 'education_youth': return scenario.educationYouth;
    case 'security': return scenario.security;
    case 'infrastructure': return scenario.infrastructure;
    case 'government': return scenario.government;
    case 'culture': return scenario.culture;
    default: return 'baseline';
  }
}

function getScenarioKey(groupId: SpendingGroupId): keyof SpendingScenario {
  switch (groupId) {
    case 'healthcare_aging': return 'healthcareAging';
    case 'education_youth': return 'educationYouth';
    case 'security': return 'security';
    case 'infrastructure': return 'infrastructure';
    case 'government': return 'government';
    case 'culture': return 'culture';
    default: return 'healthcareAging';
  }
}

// ===========================================
// Spending Control Component
// ===========================================

interface SpendingControlProps {
  preset: string;
  scenario: SpendingScenario;
  useCustom: boolean;
  currentYearSpending: YearlySpending | null;
  onPresetSelect: (presetId: string) => void;
  onGroupChange: (groupId: keyof SpendingScenario, scenarioId: string) => void;
  onUseCustomChange: (useCustom: boolean) => void;
}

export function SpendingControl({
  preset,
  scenario,
  useCustom,
  currentYearSpending,
  onPresetSelect,
  onGroupChange,
  onUseCustomChange,
}: SpendingControlProps) {
  const handlePresetClick = (presetId: string) => {
    onPresetSelect(presetId);
  };

  const handleGroupSelectChange = (groupId: SpendingGroupId, scenarioId: string) => {
    const key = getScenarioKey(groupId);
    onGroupChange(key, scenarioId);
  };

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-300">
            💸 Spending Presets
          </h4>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => onUseCustomChange(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
            />
            Custom
          </label>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SPENDING_SCENARIO_PRESETS).map(([id, presetConfig]) => (
            <button
              key={id}
              onClick={() => handlePresetClick(id)}
              disabled={useCustom}
              className={`
                px-3 py-2 rounded-lg text-xs font-medium transition-all text-left
                ${!useCustom && preset === id 
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-500' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
                ${useCustom ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="block">{presetConfig.emoji} {presetConfig.name}</span>
              <span className="text-[10px] text-gray-400 line-clamp-1">
                {presetConfig.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Spending Summary */}
      {currentYearSpending && (
        <div className="bg-gray-800/50 rounded-lg p-3 text-xs">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Total Spending</span>
            <span className="font-semibold text-emerald-400">
              {formatBillions(currentYearSpending.totalMillion)}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">% of GDP</span>
            <span className="font-semibold text-emerald-400">
              {currentYearSpending.totalPctGDP.toFixed(1)}%
            </span>
          </div>
          <div className="pt-2 border-t border-gray-700">
            <span className="text-gray-500 text-[10px] uppercase tracking-wide">
              {currentYearSpending.isHistorical ? '📊 Historical Data' : '🔮 Projected'}
            </span>
          </div>
        </div>
      )}

      {/* Group-level Controls (when custom is enabled) */}
      {useCustom && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">
            Customize projection method for each spending group:
          </div>
          
          {(Object.keys(SPENDING_GROUPS) as SpendingGroupId[]).map((groupId) => {
            const group = SPENDING_GROUPS[groupId];
            const options = getScenarioOptionsForGroup(groupId);
            const currentValue = getScenarioIdForGroup(groupId, scenario);
            
            return (
              <div key={groupId} className="flex items-center gap-2">
                <span className="text-sm w-8" title={group.name}>{group.emoji}</span>
                <select
                  value={currentValue}
                  onChange={(e) => handleGroupSelectChange(groupId, e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          
          {/* Driver Legend */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-[10px] text-gray-500 space-y-1">
              <div><span className="inline-block w-6">🏥</span> Healthcare & Aging - Demographic-driven</div>
              <div><span className="inline-block w-6">📚</span> Education - Youth population</div>
              <div><span className="inline-block w-6">🛡️</span> Security - Total population</div>
              <div><span className="inline-block w-6">🏗️</span> Infrastructure - GDP-linked</div>
              <div><span className="inline-block w-6">🏛️</span> Government - Mixed (admin + debt)</div>
              <div><span className="inline-block w-6">🎭</span> Culture - Discretionary</div>
            </div>
          </div>
        </div>
      )}

      {/* Group Breakdown Preview */}
      {currentYearSpending && !useCustom && (
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Spending by Group</div>
          {(Object.keys(currentYearSpending.byGroup) as SpendingGroupId[]).map((groupId) => {
            const groupData = currentYearSpending.byGroup[groupId];
            const config = SPENDING_GROUPS[groupId];
            if (!groupData || !config) return null;
            
            const pctOfTotal = (groupData.amountMillion / currentYearSpending.totalMillion) * 100;
            
            return (
              <div key={groupId} className="flex items-center gap-2 text-xs">
                <span className="w-6">{config.emoji}</span>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{config.name}</span>
                    <span className="text-gray-300">{formatBillions(groupData.amountMillion)}</span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500/50 rounded-full"
                      style={{ width: `${Math.min(pctOfTotal, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

