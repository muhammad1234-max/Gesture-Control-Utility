import React from 'react';

interface SettingsSliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export function SettingsSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  formatValue = (v) => v.toFixed(2)
}: SettingsSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-[13px] font-medium text-white">{label}</label>
        <span className="text-xs font-mono text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-[6px] border border-[var(--color-primary)]/20">
          {formatValue(value)}
        </span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--color-primary)] h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
      />
      <p className="text-caption">{description}</p>
    </div>
  );
}
