'use client';

import { useState } from 'react';
import type { ScenarioState, ScenarioActions } from '../page';
import type { LegacyAnnualPopulationResult as AnnualPopulationResult } from '@/lib/simulation/index';
import type { YearlySpending } from '@/lib/simulation/spending';
import { BirthRateControl } from './controls/BirthRateControl';
import { ImmigrationControl } from './controls/ImmigrationControl';
import { GDPControl } from './controls/GDPControl';
import { InterestRateControl } from './controls/InterestRateControl';
import { UnemploymentControl } from './controls/UnemploymentControl';
import { SpendingControl } from './controls/SpendingControl';

// ===========================================
// Formatting Helpers
// ===========================================

const formatMillions = (n: number) => {
  if (!isFinite(n)) return '€--';
  const billions = n / 1000;
  if (Math.abs(billions) >= 1000) return `€${(billions / 1000).toFixed(1)}T`;
  if (Math.abs(billions) >= 1) return `€${billions.toFixed(1)}B`;
  return `€${n.toFixed(0)}M`;
};

const formatCompact = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
};

// ===========================================
// Accordion Component
// ===========================================

interface AccordionProps {
  title: string;
  emoji: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

function Accordion({ title, emoji, isOpen, onToggle, children, badge, badgeColor = 'amber' }: AccordionProps) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-600/20 text-amber-400',
    emerald: 'bg-emerald-600/20 text-emerald-400',
    purple: 'bg-purple-600/20 text-purple-400',
    blue: 'bg-blue-600/20 text-blue-400',
  };
  
  return (
    <div className="border-b border-gray-800">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="font-medium text-gray-200">{title}</span>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${colorClasses[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Scenario Summary Component
// ===========================================

interface ScenarioSummaryProps {
  state: ScenarioState;
  currentYearData: AnnualPopulationResult;
  currentYearSpending: YearlySpending | null;
  effectiveGrowthRate: number;
  effectiveInterestRate: number;
}

function ScenarioSummary({ state, currentYearData, currentYearSpending, effectiveGrowthRate, effectiveInterestRate }: ScenarioSummaryProps) {
  const totalImmigration = state.workBasedImmigration + state.familyImmigration + state.humanitarianImmigration;
  
  return (
    <div className="px-4 py-3 bg-gradient-to-r from-emerald-950/30 to-transparent border-b border-gray-800">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Current Scenario</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">TFR:</span>{' '}
          <span className="text-amber-400 font-semibold">{currentYearData.tfr.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500">Imm:</span>{' '}
          <span className="text-blue-400 font-semibold">{formatCompact(totalImmigration)}/yr</span>
        </div>
        <div>
          <span className="text-gray-500">GDP:</span>{' '}
          <span className="text-purple-400 font-semibold">{(effectiveGrowthRate * 100).toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-500">Rate:</span>{' '}
          <span className="text-rose-400 font-semibold">{(effectiveInterestRate * 100).toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-500">Unemp:</span>{' '}
          <span className="text-amber-400 font-semibold">{(currentYearData.unemploymentRate * 100).toFixed(1)}%</span>
        </div>
        {currentYearSpending && (
          <>
            <div className="col-span-2 border-t border-gray-800 pt-2 mt-1">
              <span className="text-gray-500">Spending:</span>{' '}
              <span className="text-emerald-400 font-semibold">
                €{(currentYearSpending.totalMillion / 1000).toFixed(0)}B
              </span>
              <span className="text-gray-500 text-xs ml-1">
                ({currentYearSpending.totalPctGDP.toFixed(1)}% GDP)
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Main ScenarioPanel Component
// ===========================================

interface ScenarioPanelProps {
  state: ScenarioState;
  actions: ScenarioActions;
  currentYearData: AnnualPopulationResult;
  currentYearSpending: YearlySpending | null;
  effectiveGrowthRate: number;
  effectiveInterestRate: number;
}

export function ScenarioPanel({ 
  state, 
  actions, 
  currentYearData, 
  currentYearSpending, 
  effectiveGrowthRate, 
  effectiveInterestRate 
}: ScenarioPanelProps) {
  const [demographicsOpen, setDemographicsOpen] = useState(true);
  const [economyOpen, setEconomyOpen] = useState(true);
  const [spendingOpen, setSpendingOpen] = useState(true);

  return (
    <aside className="w-80 flex-shrink-0 bg-gray-900/50 border-r border-gray-800 overflow-y-auto">
      {/* Scenario Summary */}
      <ScenarioSummary
        state={state}
        currentYearData={currentYearData}
        currentYearSpending={currentYearSpending}
        effectiveGrowthRate={effectiveGrowthRate}
        effectiveInterestRate={effectiveInterestRate}
      />

      {/* Demographics Accordion */}
      <Accordion
        title="Demographics"
        emoji="👥"
        isOpen={demographicsOpen}
        onToggle={() => setDemographicsOpen(!demographicsOpen)}
        badge={`TFR ${currentYearData.tfr.toFixed(1)}`}
        badgeColor="amber"
      >
        <div className="space-y-6">
          <BirthRateControl
            birthRatePreset={state.birthRatePreset}
            customTFR={state.customTFR}
            transitionYear={state.transitionYear}
            useCustomBirthRate={state.useCustomBirthRate}
            onPresetSelect={actions.handleBirthRatePresetSelect}
            onCustomTFRChange={actions.setCustomTFR}
            onTransitionYearChange={actions.setTransitionYear}
            onUseCustomChange={actions.setUseCustomBirthRate}
          />

          <ImmigrationControl
            workBased={state.workBasedImmigration}
            family={state.familyImmigration}
            humanitarian={state.humanitarianImmigration}
            onWorkBasedChange={actions.setWorkBasedImmigration}
            onFamilyChange={actions.setFamilyImmigration}
            onHumanitarianChange={actions.setHumanitarianImmigration}
            currentYearData={currentYearData}
          />
        </div>
      </Accordion>

      {/* Economy Accordion */}
      <Accordion
        title="Economy"
        emoji="📈"
        isOpen={economyOpen}
        onToggle={() => setEconomyOpen(!economyOpen)}
        badge={`${(effectiveGrowthRate * 100).toFixed(1)}% GDP`}
        badgeColor="purple"
      >
        <div className="space-y-6">
          <GDPControl
            scenarioId={state.gdpScenarioId}
            useCustomGrowth={state.useCustomGrowth}
            customGrowthRate={state.customGrowthRate}
            onScenarioChange={actions.setGdpScenarioId}
            onUseCustomChange={actions.setUseCustomGrowth}
            onCustomGrowthRateChange={actions.setCustomGrowthRate}
            currentYearData={currentYearData}
          />

          <InterestRateControl
            scenarioId={state.interestRateScenarioId}
            useCustomRate={state.useCustomInterestRate}
            customRate={state.customInterestRate}
            onScenarioChange={actions.setInterestRateScenarioId}
            onUseCustomChange={actions.setUseCustomInterestRate}
            onCustomRateChange={actions.setCustomInterestRate}
            currentYearData={currentYearData}
          />

          <UnemploymentControl
            scenarioId={state.unemploymentScenarioId}
            useCustomUnemployment={state.useCustomUnemployment}
            customUnemploymentRate={state.customUnemploymentRate}
            onScenarioChange={actions.setUnemploymentScenarioId}
            onUseCustomChange={actions.setUseCustomUnemployment}
            onCustomRateChange={actions.setCustomUnemploymentRate}
            currentYearData={currentYearData}
          />
        </div>
      </Accordion>

      {/* Spending Scenarios Accordion (NEW) */}
      <Accordion
        title="Spending Scenarios"
        emoji="💸"
        isOpen={spendingOpen}
        onToggle={() => setSpendingOpen(!spendingOpen)}
        badge={currentYearSpending ? `${currentYearSpending.totalPctGDP.toFixed(0)}% GDP` : '--'}
        badgeColor="emerald"
      >
        <SpendingControl
          preset={state.spendingPreset}
          scenario={state.spendingScenario}
          useCustom={state.useCustomSpending}
          currentYearSpending={currentYearSpending}
          onPresetSelect={actions.setSpendingPreset}
          onGroupChange={actions.updateSpendingGroup}
          onUseCustomChange={actions.setUseCustomSpending}
        />
      </Accordion>

      {/* Footer Info */}
      <div className="px-4 py-3 text-xs text-gray-500 border-t border-gray-800">
        <p className="mb-1">
          <span className="font-semibold">Simulation:</span> 1990–2060
        </p>
        <p>
          Model includes birth rates, mortality, immigration, COFOG spending projections, GDP growth, and debt accumulation.
        </p>
      </div>
    </aside>
  );
}

