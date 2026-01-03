'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface IncomeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export default function IncomeSlider({
  value,
  onChange,
  min = 0,
  max = 10000,
  step = 50,
  disabled = false,
}: IncomeSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  // Format currency
  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Calculate percentage for fill
  const percentage = ((value - min) / (max - min)) * 100;
  
  // Handle slider interaction
  const handleInteraction = useCallback((clientX: number) => {
    if (!sliderRef.current || disabled) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    const rawValue = (x / width) * (max - min) + min;
    
    // Snap to step
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    onChange(clampedValue);
  }, [min, max, step, onChange, disabled]);
  
  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX);
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleInteraction(e.clientX);
    }
  }, [isDragging, handleInteraction]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleInteraction(e.touches[0].clientX);
  };
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) {
      handleInteraction(e.touches[0].clientX);
    }
  }, [isDragging, handleInteraction]);
  
  // Global listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);
  
  // Tick marks for scale
  const ticks = [];
  for (let i = min; i <= max; i += 1000) {
    ticks.push(i);
  }
  
  return (
    <div className="space-y-4">
      {/* Value display */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400">Gross Monthly Income</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
            className="w-24 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-right text-white font-mono focus:outline-none focus:border-amber-500"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
          />
          <span className="text-gray-400">€/month</span>
        </div>
      </div>
      
      {/* Slider track */}
      <div
        ref={sliderRef}
        className={`relative h-8 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          {/* Fill gradient based on EMTR zones */}
          <div 
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, #22c55e 0%, #eab308 30%, #f97316 50%, #dc2626 70%, #22c55e 100%)',
            }}
          />
        </div>
        
        {/* Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-amber-500 rounded-full shadow-lg border-2 border-white transition-transform ${isDragging ? 'scale-110' : 'hover:scale-105'}`}
          style={{ left: `${percentage}%` }}
        />
        
        {/* Value tooltip on drag */}
        {isDragging && (
          <div
            className="absolute -top-10 -translate-x-1/2 px-2 py-1 bg-amber-500 text-black text-sm font-bold rounded shadow-lg"
            style={{ left: `${percentage}%` }}
          >
            {formatEuro(value)}
          </div>
        )}
      </div>
      
      {/* Tick marks */}
      <div className="relative h-6 -mt-2">
        {ticks.map((tick) => {
          const tickPercent = ((tick - min) / (max - min)) * 100;
          return (
            <div
              key={tick}
              className="absolute flex flex-col items-center"
              style={{ left: `${tickPercent}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-0.5 h-2 bg-gray-600" />
              <span className="text-xs text-gray-500 mt-1">
                {tick === 0 ? '€0' : `€${tick / 1000}k`}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Quick select buttons */}
      <div className="flex gap-2 flex-wrap">
        {[0, 1000, 2000, 3000, 5000, 7000, 10000].map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            disabled={disabled}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              value === preset
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {formatEuro(preset)}
          </button>
        ))}
      </div>
    </div>
  );
}

