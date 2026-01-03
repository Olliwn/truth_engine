'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MaslowCategoryData } from '@/lib/types';

interface CategoryBreakdownProps {
  categories: Record<string, MaslowCategoryData>;
  weights: {
    food: number;
    housing: number;
    energy: number;
    fuel: number;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  '011': '#f97316',   // Food - Orange
  '0411': '#3b82f6',  // Housing - Blue
  '045': '#eab308',   // Energy - Yellow
  '0722': '#8b5cf6',  // Fuel - Purple
  '0': '#6b7280',     // Official CPI - Gray
};

const CATEGORY_ICONS: Record<string, string> = {
  '011': '🍞',
  '0411': '🏠',
  '045': '⚡',
  '0722': '⛽',
  '0': '📊',
};

export default function CategoryBreakdown({ categories, weights }: CategoryBreakdownProps) {
  // Get the latest year's data for each category
  const categoryData = Object.entries(categories)
    .filter(([code]) => code !== '0') // Exclude overall CPI
    .map(([code, data]) => {
      const latestValue = data.values[data.values.length - 1];
      const firstValue = data.values[0];
      const change = latestValue ? ((latestValue.index - firstValue.index) / firstValue.index) * 100 : 0;
      
      return {
        code,
        name: data.name,
        weight: data.weight,
        currentIndex: latestValue?.index || 100,
        change,
        color: CATEGORY_COLORS[code] || '#6b7280',
        icon: CATEGORY_ICONS[code] || '📊',
      };
    })
    .sort((a, b) => b.change - a.change);

  // Build chart data for cumulative change
  const chartData = categoryData.map(cat => ({
    name: cat.name.split(' ')[0], // Shortened name
    change: cat.change,
    color: cat.color,
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-6">Category Breakdown</h3>
      
      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {categoryData.map((cat) => (
          <div
            key={cat.code}
            className="bg-gray-900/50 rounded-lg p-4 border border-gray-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{cat.icon}</span>
              <span className="text-sm text-gray-400 font-medium">{cat.name}</span>
            </div>
            <div className="text-2xl font-bold mono-data" style={{ color: cat.color }}>
              {cat.currentIndex.toFixed(1)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                Weight: {(cat.weight * 100).toFixed(0)}%
              </span>
              <span className={`text-sm font-medium ${cat.change > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {cat.change > 0 ? '+' : ''}{cat.change.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Cumulative change bar chart */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Cumulative Change Since 2015</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Change']}
            />
            <Bar dataKey="change" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weight explanation */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Maslow CPI Weighting</h4>
        <div className="flex gap-2 h-4 rounded-full overflow-hidden">
          <div 
            className="h-full" 
            style={{ width: `${weights.housing * 100}%`, backgroundColor: CATEGORY_COLORS['0411'] }}
            title={`Housing: ${weights.housing * 100}%`}
          />
          <div 
            className="h-full" 
            style={{ width: `${weights.food * 100}%`, backgroundColor: CATEGORY_COLORS['011'] }}
            title={`Food: ${weights.food * 100}%`}
          />
          <div 
            className="h-full" 
            style={{ width: `${weights.energy * 100}%`, backgroundColor: CATEGORY_COLORS['045'] }}
            title={`Energy: ${weights.energy * 100}%`}
          />
          <div 
            className="h-full" 
            style={{ width: `${weights.fuel * 100}%`, backgroundColor: CATEGORY_COLORS['0722'] }}
            title={`Fuel: ${weights.fuel * 100}%`}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>🏠 40%</span>
          <span>🍞 35%</span>
          <span>⚡ 15%</span>
          <span>⛽ 10%</span>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Weights based on typical low-income household budget allocation for essential needs.
        </p>
      </div>
    </div>
  );
}

