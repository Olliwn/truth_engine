'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MapWrapper from '@/components/MapWrapper';
import MunicipalityCard from '@/components/MunicipalityCard';
import RankingTable from '@/components/RankingTable';
import StatCard from '@/components/StatCard';
import { MunicipalityData, GeoJSONData, PonziStatistics } from '@/lib/types';
import { formatNumber } from '@/lib/calculations';

export default function BetaPage() {
  const [data, setData] = useState<MunicipalityData[]>([]);
  const [stats, setStats] = useState<PonziStatistics | null>(null);
  const [geoJson, setGeoJson] = useState<GeoJSONData | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState('2035');
  
  useEffect(() => {
    async function loadData() {
      try {
        // Load Ponzi data
        const ponziRes = await fetch('/api/ponzi-data');
        if (ponziRes.ok) {
          const ponziData = await ponziRes.json();
          const yearData = ponziData[activeYear];
          if (yearData) {
            setData(yearData.municipalities);
            setStats(yearData.statistics);
          }
        }
        
        // Load GeoJSON (WGS84 converted)
        const geoRes = await fetch('/finland_municipalities_wgs84.geojson');
        if (geoRes.ok) {
          const geo = await geoRes.json();
          setGeoJson(geo);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [activeYear]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading municipal data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back</span>
          </Link>
          
          <h1 className="text-lg font-semibold">
            <span className="text-red-500">Beta</span> | Demographic Ponzi Map
          </h1>
          
          {/* Year selector */}
          <div className="flex items-center gap-2">
            {['2024', '2035', '2040'].map((year) => (
              <button
                key={year}
                onClick={() => setActiveYear(year)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeYear === year 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      {/* Hero Stats */}
      {stats && (
        <section className="py-8 px-6 border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard
                label="Total Municipalities"
                value={stats.total_municipalities}
              />
              <StatCard
                label="Critical Risk"
                value={stats.risk_distribution.critical}
                color="text-red-500"
              />
              <StatCard
                label="High Risk"
                value={stats.risk_distribution.high}
                color="text-orange-500"
              />
              <StatCard
                label="Median Ponzi Index"
                value={formatNumber(stats.ponzi_index.median)}
              />
              <StatCard
                label="Max Ponzi Index"
                value={formatNumber(stats.ponzi_index.max)}
                color="text-red-400"
              />
            </div>
          </div>
        </section>
      )}
      
      {/* Main Content */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Map */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2">Municipal Risk Heatmap</h2>
                <p className="text-gray-400 text-sm">
                  Click on a municipality to see detailed metrics. Color intensity indicates Ponzi Index severity.
                </p>
              </div>
              
              {geoJson && data.length > 0 ? (
                <div className="h-[600px]">
                  <MapWrapper
                    data={data}
                    geoJson={geoJson}
                    onMunicipalitySelect={setSelectedMunicipality}
                    selectedMunicipality={selectedMunicipality}
                  />
                </div>
              ) : (
                <div className="h-[600px] card flex items-center justify-center">
                  <p className="text-gray-500">Unable to load map data</p>
                </div>
              )}
            </div>
            
            {/* Sidebar - Selected Municipality or Instructions */}
            <div className="lg:col-span-1">
              {selectedMunicipality ? (
                <MunicipalityCard
                  data={selectedMunicipality}
                  onClose={() => setSelectedMunicipality(null)}
                />
              ) : (
                <div className="card p-6">
                  <h3 className="text-xl font-bold mb-4">Understanding the Ponzi Index</h3>
                  <div className="space-y-4 text-gray-400 text-sm">
                    <p>
                      The <span className="text-white font-semibold">Ponzi Index</span> measures 
                      the unsustainability of municipal finances based on demographic projections.
                    </p>
                    <div className="bg-gray-900/50 p-4 rounded-lg mono-data text-xs">
                      <div className="text-gray-500 mb-2">Formula:</div>
                      <div className="text-white">
                        (Debt ÷ Workers<sub>2035</sub>) × (Dependents<sub>2035</sub> ÷ Workers<sub>2035</sub>)
                      </div>
                    </div>
                    <p>
                      Higher values indicate municipalities where each future worker carries 
                      more debt while supporting more dependents.
                    </p>
                    <div className="pt-4 border-t border-gray-800">
                      <div className="text-gray-500 text-xs mb-3 uppercase tracking-wide">Risk Levels</div>
                      <div className="space-y-2">
                        <RiskLevel color="#dc2626" label="Critical" range="> 30,000" />
                        <RiskLevel color="#f97316" label="High" range="20,000 - 30,000" />
                        <RiskLevel color="#eab308" label="Elevated" range="10,000 - 20,000" />
                        <RiskLevel color="#3b82f6" label="Moderate" range="5,000 - 10,000" />
                        <RiskLevel color="#22c55e" label="Low" range="< 5,000" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Rankings Table */}
      <section className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Municipality Rankings</h2>
            <p className="text-gray-400 text-sm">
              Sorted by Ponzi Index. Click a row to view on the map.
            </p>
          </div>
          
          <RankingTable
            data={data}
            onSelect={(muni) => {
              setSelectedMunicipality(muni);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            selectedCode={selectedMunicipality?.municipality_code}
          />
        </div>
      </section>
      
      {/* Data Sources */}
      <section className="py-8 px-6 bg-gray-950/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Data Sources</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Population Projections</div>
              <div className="text-gray-300">Statistics Finland, Table 14wx</div>
              <div className="text-gray-500">Population projection 2024</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Municipal Debt</div>
              <div className="text-gray-300">Statistics Finland, Municipal Key Figures</div>
              <div className="text-gray-500">Consolidated loan stock 2020</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Geographic Boundaries</div>
              <div className="text-gray-300">Statistics Finland GeoServer</div>
              <div className="text-gray-500">Municipality boundaries 2024</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function RiskLevel({ color, label, range }: { color: string; label: string; range: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
      <div className="flex-1 text-white">{label}</div>
      <div className="text-gray-500 mono-data text-xs">{range}</div>
    </div>
  );
}

