'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MunicipalityData, GeoJSONData, GeoJSONFeature } from '@/lib/types';
import { getPonziColor, formatNumber } from '@/lib/calculations';

interface PonziMapProps {
  data: MunicipalityData[];
  geoJson: GeoJSONData;
  onMunicipalitySelect?: (municipality: MunicipalityData | null) => void;
  selectedMunicipality?: MunicipalityData | null;
}

// Component to fit bounds to Finland
function FitBounds({ geoJson }: { geoJson: GeoJSONData }) {
  const map = useMap();
  
  useEffect(() => {
    if (geoJson.features.length > 0) {
      // Finland bounds
      map.fitBounds([
        [59.5, 19.0],
        [70.5, 32.0],
      ]);
    }
  }, [map, geoJson]);
  
  return null;
}

export default function PonziMap({ 
  data, 
  geoJson, 
  onMunicipalitySelect,
  selectedMunicipality 
}: PonziMapProps) {
  
  // Create a lookup map for municipality data - memoize it
  const dataMap = useMemo(() => {
    const map = new Map<string, MunicipalityData>();
    data.forEach(d => {
      // Store with both padded and unpadded keys for flexibility
      map.set(d.municipality_code, d);
      map.set(d.municipality_code.padStart(3, '0'), d);
    });
    return map;
  }, [data]);
  
  // Get min/max for color scaling
  const { minPonzi, maxPonzi } = useMemo(() => {
    const ponziValues = data.map(d => d.ponzi_index);
    return {
      minPonzi: Math.min(...ponziValues),
      maxPonzi: Math.max(...ponziValues),
    };
  }, [data]);
  
  // Style function for GeoJSON features
  const style = useCallback((feature: GeoJSON.Feature | undefined): PathOptions => {
    if (!feature || !feature.properties) {
      return {
        fillColor: '#374151',
        weight: 1,
        opacity: 0.5,
        color: '#1f2937',
        fillOpacity: 0.3,
      };
    }
    
    const muniCode = feature.properties.kunta as string;
    const muniData = dataMap.get(muniCode);
    const isSelected = selectedMunicipality?.municipality_code === muniCode || 
                       selectedMunicipality?.municipality_code.padStart(3, '0') === muniCode;
    
    if (!muniData) {
      return {
        fillColor: '#374151',
        weight: 1,
        opacity: 0.5,
        color: '#1f2937',
        fillOpacity: 0.3,
      };
    }
    
    const fillColor = getPonziColor(muniData.ponzi_index, minPonzi, maxPonzi);
    
    return {
      fillColor,
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#ffffff' : '#0f172a',
      fillOpacity: 0.8,
    };
  }, [dataMap, minPonzi, maxPonzi, selectedMunicipality]);
  
  // Event handlers for each feature
  const onEachFeature = useCallback((feature: GeoJSON.Feature, layer: Layer) => {
    const muniCode = feature.properties?.kunta as string;
    const muniData = dataMap.get(muniCode);
    
    // Cast to path layer to access setStyle
    const pathLayer = layer as L.Path;
    
    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target as L.Path;
        target.setStyle({
          weight: 3,
          color: '#ffffff',
          fillOpacity: 0.95,
        });
        target.bringToFront();
      },
      mouseout: () => {
        // Reset to original style
        const muniData = dataMap.get(muniCode);
        const isSelected = selectedMunicipality?.municipality_code === muniCode ||
                          selectedMunicipality?.municipality_code.padStart(3, '0') === muniCode;
        
        if (muniData) {
          const fillColor = getPonziColor(muniData.ponzi_index, minPonzi, maxPonzi);
          pathLayer.setStyle({
            fillColor,
            weight: isSelected ? 3 : 1,
            color: isSelected ? '#ffffff' : '#0f172a',
            fillOpacity: 0.8,
          });
        } else {
          pathLayer.setStyle({
            fillColor: '#374151',
            weight: 1,
            color: '#1f2937',
            fillOpacity: 0.3,
          });
        }
      },
      click: () => {
        if (muniData && onMunicipalitySelect) {
          onMunicipalitySelect(muniData);
        }
      },
    });
    
    // Bind tooltip
    if (muniData) {
      layer.bindTooltip(
        `<div style="padding: 8px; background: #111827; border-radius: 8px; border: 1px solid #374151;">
          <div style="font-weight: 600; color: white;">${muniData.municipality_name}</div>
          <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Ponzi Index: <span style="color: ${getPonziColor(muniData.ponzi_index, minPonzi, maxPonzi)}; font-weight: 600;">${formatNumber(muniData.ponzi_index)}</span></div>
          <div style="font-size: 12px; color: #9ca3af;">Rank: #${muniData.rank}</div>
        </div>`,
        { 
          sticky: true,
          direction: 'top',
          offset: [0, -10],
          className: 'custom-tooltip'
        }
      );
    } else {
      layer.bindTooltip(
        `<div style="padding: 8px; background: #111827; border-radius: 8px; border: 1px solid #374151;">
          <div style="font-weight: 600; color: white;">${feature.properties?.nimi || 'Unknown'}</div>
          <div style="font-size: 12px; color: #6b7280;">No data available</div>
        </div>`,
        { 
          sticky: true,
          direction: 'top',
          offset: [0, -10],
          className: 'custom-tooltip'
        }
      );
    }
  }, [dataMap, minPonzi, maxPonzi, onMunicipalitySelect, selectedMunicipality]);
  
  // Create a unique key that forces complete re-render when data changes
  const geoJsonKeyValue = `geojson-${data.length}-${minPonzi}-${maxPonzi}-${selectedMunicipality?.municipality_code || 'none'}`;
  
  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-gray-800">
      <MapContainer
        center={[64.5, 26.0]}
        zoom={5}
        className="w-full h-full"
        zoomControl={true}
        attributionControl={false}
        style={{ background: '#0a0f1c' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />
        <GeoJSON
          key={geoJsonKeyValue}
          data={geoJson as GeoJSON.GeoJsonObject}
          style={style}
          onEachFeature={onEachFeature}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution=''
        />
        <FitBounds geoJson={geoJson} />
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 border border-gray-800 z-[1000]">
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Ponzi Index</div>
        <div className="flex items-center gap-1">
          <div className="w-32 h-4 rounded" style={{
            background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7f1d1d)'
          }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatNumber(minPonzi)}</span>
          <span>{formatNumber(maxPonzi)}</span>
        </div>
      </div>
      
      {/* Custom tooltip styles */}
      <style jsx global>{`
        .custom-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-tooltip .leaflet-tooltip-content {
          margin: 0;
        }
        .leaflet-tooltip-left::before,
        .leaflet-tooltip-right::before,
        .leaflet-tooltip-top::before,
        .leaflet-tooltip-bottom::before {
          display: none;
        }
      `}</style>
    </div>
  );
}
