'use client';

import { useState } from 'react';
import { MunicipalityData, RISK_LABELS } from '@/lib/types';
import { formatNumber, formatCurrency, formatRatio, getRiskColor } from '@/lib/calculations';

interface RankingTableProps {
  data: MunicipalityData[];
  onSelect?: (municipality: MunicipalityData) => void;
  selectedCode?: string;
  limit?: number;
}

type SortKey = 'rank' | 'ponzi_index' | 'debt_per_worker_eur' | 'dependency_ratio' | 'total_population';

export default function RankingTable({ data, onSelect, selectedCode, limit = 20 }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'rank');
    }
  };
  
  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    return sortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });
  
  const displayData = showAll ? sortedData : sortedData.slice(0, limit);
  
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead className="bg-gray-900/50">
            <tr>
              <SortHeader 
                label="Rank" 
                sortKey="rank" 
                currentSort={sortKey} 
                sortAsc={sortAsc} 
                onSort={handleSort} 
              />
              <th className="min-w-[180px]">Municipality</th>
              <th>Risk</th>
              <SortHeader 
                label="Ponzi Index" 
                sortKey="ponzi_index" 
                currentSort={sortKey} 
                sortAsc={sortAsc} 
                onSort={handleSort} 
              />
              <SortHeader 
                label="Debt/Worker" 
                sortKey="debt_per_worker_eur" 
                currentSort={sortKey} 
                sortAsc={sortAsc} 
                onSort={handleSort} 
              />
              <SortHeader 
                label="Dep. Ratio" 
                sortKey="dependency_ratio" 
                currentSort={sortKey} 
                sortAsc={sortAsc} 
                onSort={handleSort} 
              />
              <SortHeader 
                label="Population" 
                sortKey="total_population" 
                currentSort={sortKey} 
                sortAsc={sortAsc} 
                onSort={handleSort} 
              />
            </tr>
          </thead>
          <tbody>
            {displayData.map((muni) => {
              const riskColor = getRiskColor(muni.risk_category);
              const isSelected = selectedCode === muni.municipality_code;
              
              return (
                <tr 
                  key={muni.municipality_code}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-gray-800' : ''
                  }`}
                  onClick={() => onSelect?.(muni)}
                >
                  <td className="mono-data text-gray-400">#{muni.rank}</td>
                  <td className="font-medium">{muni.municipality_name}</td>
                  <td>
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: `${riskColor}20`,
                        color: riskColor
                      }}
                    >
                      {RISK_LABELS[muni.risk_category]}
                    </span>
                  </td>
                  <td className="mono-data font-semibold" style={{ color: riskColor }}>
                    {formatNumber(muni.ponzi_index)}
                  </td>
                  <td className="mono-data">€{formatNumber(muni.debt_per_worker_eur)}</td>
                  <td className="mono-data">{formatRatio(muni.dependency_ratio)}</td>
                  <td className="mono-data text-gray-400">{formatNumber(muni.total_population)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {data.length > limit && (
        <div className="p-4 border-t border-gray-800 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="btn-secondary text-sm"
          >
            {showAll ? 'Show Less' : `Show All ${data.length} Municipalities`}
          </button>
        </div>
      )}
    </div>
  );
}

function SortHeader({ 
  label, 
  sortKey, 
  currentSort, 
  sortAsc, 
  onSort 
}: { 
  label: string; 
  sortKey: SortKey; 
  currentSort: SortKey; 
  sortAsc: boolean; 
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  
  return (
    <th 
      className="cursor-pointer hover:text-white transition-colors select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-xs">
            {sortAsc ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
}

