'use client';

import dynamic from 'next/dynamic';
import { MunicipalityData, GeoJSONData } from '@/lib/types';

// Dynamically import the map component with no SSR
const PonziMap = dynamic(() => import('./PonziMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Loading map...</p>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  data: MunicipalityData[];
  geoJson: GeoJSONData;
  onMunicipalitySelect?: (municipality: MunicipalityData | null) => void;
  selectedMunicipality?: MunicipalityData | null;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <PonziMap {...props} />;
}

