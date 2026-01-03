'use client';

import { 
  WageTrapHouseholdProfile, 
  WageTrapMunicipality, 
  WageTrapEmploymentStatus,
  HOUSEHOLD_PROFILE_LABELS,
  MUNICIPALITY_LABELS,
  EMPLOYMENT_STATUS_LABELS,
} from '@/lib/types';

interface ProfileSelectorProps {
  householdProfile: WageTrapHouseholdProfile;
  municipality: WageTrapMunicipality;
  employmentStatus: WageTrapEmploymentStatus;
  monthlyRent: number;
  hasDaycare: boolean;
  onHouseholdChange: (profile: WageTrapHouseholdProfile) => void;
  onMunicipalityChange: (municipality: WageTrapMunicipality) => void;
  onEmploymentChange: (status: WageTrapEmploymentStatus) => void;
  onRentChange: (rent: number) => void;
  onDaycareChange: (hasDaycare: boolean) => void;
}

// Icons for household types
const HouseholdIcon = ({ profile }: { profile: WageTrapHouseholdProfile }) => {
  switch (profile) {
    case 'single':
      return <span className="text-xl">👤</span>;
    case 'single_1child':
      return <span className="text-xl">👤👶</span>;
    case 'single_2children':
      return <span className="text-xl">👤👶👶</span>;
    case 'couple':
      return <span className="text-xl">👫</span>;
    case 'couple_1child':
      return <span className="text-xl">👫👶</span>;
    case 'couple_2children':
      return <span className="text-xl">👫👶👶</span>;
    case 'student':
      return <span className="text-xl">🎓</span>;
    default:
      return <span className="text-xl">👤</span>;
  }
};

export default function ProfileSelector({
  householdProfile,
  municipality,
  employmentStatus,
  monthlyRent,
  hasDaycare,
  onHouseholdChange,
  onMunicipalityChange,
  onEmploymentChange,
  onRentChange,
  onDaycareChange,
}: ProfileSelectorProps) {
  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const householdProfiles: WageTrapHouseholdProfile[] = [
    'single',
    'single_1child',
    'single_2children',
    'couple',
    'couple_1child',
    'couple_2children',
    'student',
  ];

  const municipalities: WageTrapMunicipality[] = [
    'helsinki',
    'espoo',
    'tampere',
    'turku',
    'oulu',
    'other',
  ];

  const employmentStatuses: WageTrapEmploymentStatus[] = [
    'employed',
    'unemployed',
    'student',
  ];

  return (
    <div className="space-y-6">
      {/* Household Profile */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">
          Household Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {householdProfiles.map((profile) => (
            <button
              key={profile}
              onClick={() => onHouseholdChange(profile)}
              className={`p-3 rounded-lg border text-left transition-all ${
                householdProfile === profile
                  ? 'bg-amber-500/20 border-amber-500/50 text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <HouseholdIcon profile={profile} />
              </div>
              <div className="text-xs leading-tight">
                {HOUSEHOLD_PROFILE_LABELS[profile]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Municipality */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">
          Municipality
        </label>
        <div className="flex flex-wrap gap-2">
          {municipalities.map((mun) => (
            <button
              key={mun}
              onClick={() => onMunicipalityChange(mun)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                municipality === mun
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {MUNICIPALITY_LABELS[mun]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Affects municipal tax rate (17-22%) and housing allowance limits
        </p>
      </div>

      {/* Employment Status */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">
          Employment Status
        </label>
        <div className="flex flex-wrap gap-2">
          {employmentStatuses.map((status) => (
            <button
              key={status}
              onClick={() => onEmploymentChange(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                employmentStatus === status
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {EMPLOYMENT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Affects available benefits (unemployment benefits, student aid)
        </p>
      </div>

      {/* Monthly Rent */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">
          Monthly Rent
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={monthlyRent}
            onChange={(e) => onRentChange(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={monthlyRent}
              onChange={(e) => onRentChange(Math.max(0, Math.min(2000, Number(e.target.value))))}
              className="w-20 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-right text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            />
            <span className="text-gray-400 text-sm">€</span>
          </div>
        </div>
        
        {/* Rent presets */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {[400, 600, 800, 1000, 1200, 1500].map((preset) => (
            <button
              key={preset}
              onClick={() => onRentChange(preset)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                monthlyRent === preset
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-500 hover:text-white'
              }`}
            >
              {formatEuro(preset)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Housing allowance covers up to 80% of accepted costs (max varies by municipality)
        </p>
      </div>

      {/* Daycare Toggle - only show for households with children */}
      {(householdProfile.includes('child') || householdProfile.includes('children')) && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">
            Daycare (Varhaiskasvatus)
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onDaycareChange(!hasDaycare)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                hasDaycare ? 'bg-amber-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hasDaycare ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${hasDaycare ? 'text-white' : 'text-gray-500'}`}>
              {hasDaycare ? 'Using municipal daycare' : 'No daycare / private care'}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Municipal daycare fees are income-based (0-295€/child). This significantly affects EMTR for families.
            {hasDaycare && (
              <span className="text-amber-400"> Fee increases by ~10.7% of income above threshold.</span>
            )}
          </p>
        </div>
      )}

      {/* Summary of selected profile */}
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Selected Profile</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Household:</span>{' '}
            <span className="text-white">{HOUSEHOLD_PROFILE_LABELS[householdProfile]}</span>
          </div>
          <div>
            <span className="text-gray-500">Location:</span>{' '}
            <span className="text-white">{MUNICIPALITY_LABELS[municipality]}</span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            <span className="text-white">{EMPLOYMENT_STATUS_LABELS[employmentStatus]}</span>
          </div>
          <div>
            <span className="text-gray-500">Rent:</span>{' '}
            <span className="text-white">{formatEuro(monthlyRent)}/mo</span>
          </div>
          {(householdProfile.includes('child') || householdProfile.includes('children')) && (
            <div className="col-span-2">
              <span className="text-gray-500">Daycare:</span>{' '}
              <span className={hasDaycare ? 'text-amber-400' : 'text-gray-400'}>
                {hasDaycare ? '🏫 Municipal daycare' : 'No daycare'}
              </span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          border: 2px solid white;
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          border: 2px solid white;
        }
      `}</style>
    </div>
  );
}

