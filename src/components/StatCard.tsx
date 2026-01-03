interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  large?: boolean;
}

export default function StatCard({ 
  label, 
  value, 
  sublabel, 
  trend, 
  color = 'text-white',
  large = false 
}: StatCardProps) {
  const trendIcon = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };
  
  const trendColor = {
    up: 'text-red-500',
    down: 'text-green-500',
    neutral: 'text-gray-500',
  };
  
  return (
    <div className="card p-6">
      <div className="text-gray-400 text-sm mb-2 uppercase tracking-wide">
        {label}
      </div>
      <div className={`font-bold mono-data ${color} ${large ? 'text-4xl' : 'text-2xl'}`}>
        {value}
        {trend && (
          <span className={`ml-2 text-lg ${trendColor[trend]}`}>
            {trendIcon[trend]}
          </span>
        )}
      </div>
      {sublabel && (
        <div className="text-gray-500 text-sm mt-2">
          {sublabel}
        </div>
      )}
    </div>
  );
}

