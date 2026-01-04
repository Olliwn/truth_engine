'use client';

import { useState } from 'react';
import type { PopulationSimulationResult, AnnualPopulationResult } from '@/lib/populationSimulator';
import type { ScenarioState } from '../page';
import { OverviewTab } from './tabs/OverviewTab';
import { PopulationTab } from './tabs/PopulationTab';
import { FiscalTab } from './tabs/FiscalTab';
import { DebtTab } from './tabs/DebtTab';
import { DebugTab } from './tabs/DebugTab';

// ===========================================
// Types
// ===========================================

type TabId = 'overview' | 'population' | 'fiscal' | 'debt' | 'debug';

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', emoji: '📊' },
  { id: 'population', label: 'Population', emoji: '👥' },
  { id: 'fiscal', label: 'Fiscal', emoji: '💰' },
  { id: 'debt', label: 'Debt', emoji: '💳' },
  { id: 'debug', label: 'Debug', emoji: '🔬' },
];

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

// ===========================================
// Quick Stats Bar
// ===========================================

interface QuickStatsProps {
  currentYearData: AnnualPopulationResult;
  effectiveGrowthRate: number;
  effectiveInterestRate: number;
}

function QuickStats({ currentYearData, effectiveGrowthRate, effectiveInterestRate }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-5 gap-2 mb-4">
      <QuickStat
        label="TFR"
        value={currentYearData.tfr.toFixed(2)}
        color={currentYearData.tfr >= 1.6 ? 'green' : currentYearData.tfr >= 1.3 ? 'amber' : 'red'}
      />
      <QuickStat
        label="Dependency"
        value={`${currentYearData.oldAgeDependencyRatio.toFixed(0)}%`}
        color={currentYearData.oldAgeDependencyRatio > 50 ? 'red' : 'amber'}
      />
      <QuickStat
        label="Balance"
        value={formatMillions(currentYearData.netFiscalBalance)}
        color={currentYearData.netFiscalBalance >= 0 ? 'green' : 'red'}
      />
      <QuickStat
        label="Debt/GDP"
        value={`${currentYearData.debtToGDP.toFixed(0)}%`}
        color={currentYearData.debtToGDP < 60 ? 'green' : currentYearData.debtToGDP < 100 ? 'amber' : 'red'}
      />
      <QuickStat
        label="GDP"
        value={`€${currentYearData.gdp.toFixed(0)}B`}
        color="purple"
        subtext={`${(effectiveGrowthRate * 100).toFixed(1)}%/yr`}
      />
    </div>
  );
}

interface QuickStatProps {
  label: string;
  value: string;
  color: 'green' | 'amber' | 'red' | 'blue' | 'purple';
  subtext?: string;
}

function QuickStat({ label, value, color, subtext }: QuickStatProps) {
  const colorClasses = {
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-2 text-center">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold ${colorClasses[color]}`}>{value}</div>
      {subtext && <div className="text-[10px] text-gray-600">{subtext}</div>}
    </div>
  );
}

// ===========================================
// Year Slider
// ===========================================

interface YearSliderProps {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

function YearSlider({ selectedYear, setSelectedYear, isPlaying, setIsPlaying }: YearSliderProps) {
  return (
    <div className="flex items-center gap-4 mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
          isPlaying
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-amber-600 hover:bg-amber-700 text-white'
        }`}
      >
        {isPlaying ? '⏹ Stop' : '▶ Play'}
      </button>

      <div className="flex-1">
        <input
          type="range"
          min={1990}
          max={2060}
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1990</span>
          <span className="text-lg font-bold text-amber-400">{selectedYear}</span>
          <span>2060</span>
        </div>
      </div>

      {/* Quick year buttons */}
      <div className="flex gap-1">
        {[2000, 2024, 2040, 2060].map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedYear === year
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Tab Navigation
// ===========================================

interface TabNavProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

function TabNav({ activeTab, setActiveTab }: TabNavProps) {
  return (
    <div className="flex gap-1 mb-4 border-b border-gray-800 pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === tab.id
              ? 'bg-gray-800 text-white border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <span>{tab.emoji}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ===========================================
// Main ResultsArea Component
// ===========================================

interface ResultsAreaProps {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  simulationResult: PopulationSimulationResult;
  currentYearData: AnnualPopulationResult;
  pyramidData: { age: number; male: number; female: number }[];
  effectiveGrowthRate: number;
  effectiveInterestRate: number;
  scenarioState: ScenarioState;
}

export function ResultsArea({
  selectedYear,
  setSelectedYear,
  isPlaying,
  setIsPlaying,
  simulationResult,
  currentYearData,
  pyramidData,
  effectiveGrowthRate,
  effectiveInterestRate,
  scenarioState,
}: ResultsAreaProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { annualResults, summary } = simulationResult;

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
      {/* Year Slider */}
      <YearSlider
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />

      {/* Quick Stats */}
      <QuickStats
        currentYearData={currentYearData}
        effectiveGrowthRate={effectiveGrowthRate}
        effectiveInterestRate={effectiveInterestRate}
      />

      {/* Tab Navigation */}
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <OverviewTab
            selectedYear={selectedYear}
            annualResults={annualResults}
            currentYearData={currentYearData}
            summary={summary}
            effectiveGrowthRate={effectiveGrowthRate}
          />
        )}
        {activeTab === 'population' && (
          <PopulationTab
            selectedYear={selectedYear}
            annualResults={annualResults}
            currentYearData={currentYearData}
            pyramidData={pyramidData}
          />
        )}
        {activeTab === 'fiscal' && (
          <FiscalTab
            selectedYear={selectedYear}
            annualResults={annualResults}
            currentYearData={currentYearData}
            summary={summary}
            effectiveGrowthRate={effectiveGrowthRate}
          />
        )}
        {activeTab === 'debt' && (
          <DebtTab
            selectedYear={selectedYear}
            annualResults={annualResults}
            currentYearData={currentYearData}
            summary={summary}
            effectiveInterestRate={effectiveInterestRate}
          />
        )}
        {activeTab === 'debug' && (
          <DebugTab
            selectedYear={selectedYear}
            annualResults={annualResults}
            currentYearData={currentYearData}
          />
        )}
      </div>
    </div>
  );
}

