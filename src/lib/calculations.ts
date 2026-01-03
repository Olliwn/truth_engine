import { MunicipalityData, RiskCategory, RISK_COLORS } from './types';

/**
 * Get color for a Ponzi Index value using a gradient scale
 */
export function getPonziColor(ponziIndex: number, min: number, max: number): string {
  // Normalize to 0-1 range
  const normalized = Math.min(1, Math.max(0, (ponziIndex - min) / (max - min)));
  
  // Color stops: green -> yellow -> orange -> red
  if (normalized < 0.25) {
    return interpolateColor('#22c55e', '#eab308', normalized * 4);
  } else if (normalized < 0.5) {
    return interpolateColor('#eab308', '#f97316', (normalized - 0.25) * 4);
  } else if (normalized < 0.75) {
    return interpolateColor('#f97316', '#ef4444', (normalized - 0.5) * 4);
  } else {
    return interpolateColor('#ef4444', '#7f1d1d', (normalized - 0.75) * 4);
  }
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get risk category color
 */
export function getRiskColor(category: RiskCategory): string {
  return RISK_COLORS[category];
}

/**
 * Format large numbers with thousand separators
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('fi-FI', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency (EUR)
 */
export function formatCurrency(value: number): string {
  return `€${formatNumber(value)}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format ratio
 */
export function formatRatio(value: number): string {
  return value.toFixed(2);
}

/**
 * Calculate the "financial sustainability score" (inverse of ponzi index, normalized)
 */
export function calculateSustainabilityScore(ponziIndex: number, min: number, max: number): number {
  const normalized = (ponziIndex - min) / (max - min);
  return Math.round((1 - normalized) * 100);
}

/**
 * Get summary text for a municipality
 */
export function getMunicipalitySummary(data: MunicipalityData): string {
  const riskText = {
    critical: 'faces severe fiscal challenges',
    high: 'shows significant warning signs',
    elevated: 'has elevated risk indicators',
    moderate: 'maintains moderate stability',
    low: 'demonstrates fiscal resilience',
  };
  
  return `${data.municipality_name} ${riskText[data.risk_category]} with a Ponzi Index of ${formatNumber(data.ponzi_index)}. ` +
    `Each future worker (age 20-64 in 2035) will carry €${formatNumber(data.debt_per_worker_eur)} in municipal debt ` +
    `while supporting ${formatRatio(data.dependency_ratio)} dependents.`;
}

/**
 * Generate share text for social media
 */
export function generateShareText(data: MunicipalityData): string {
  return `🇫🇮 ${data.municipality_name} ranks #${data.rank} in Finland's Municipal "Ponzi" Index\n\n` +
    `📊 Debt per future worker: €${formatNumber(data.debt_per_worker_eur)}\n` +
    `👥 Dependency ratio (2035): ${formatRatio(data.dependency_ratio)}\n` +
    `⚠️ Risk level: ${data.risk_category.toUpperCase()}\n\n` +
    `Explore the full map →`;
}

