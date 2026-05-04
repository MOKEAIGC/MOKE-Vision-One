import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTextShortcuts } from './useTextShortcuts';

// Base Styles
const getBaseStyles = (isDark: boolean) => ({
  textPrimary: isDark ? 'text-white' : 'text-black',
  textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
  border: isDark ? 'border-gray-800' : 'border-gray-300',
  bgInput: isDark ? 'bg-[#111]' : 'bg-gray-100',
  accent: 'text-moke-red',
  borderAccent: 'border-moke-red',
  tickMain: isDark ? 'bg-gray-500' : 'bg-gray-400',
  tickSub: isDark ? 'bg-gray-800' : 'bg-gray-300',
});

// Quantum Slider - Redesigned with Ticks & Toggle Input
export const QuantumSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  editable?: boolean;
}> = ({ label, value, min, max, step = 1, unit = '', onChange, editable = false }) => {
  const { isDark } = useTheme();
  const s = getBaseStyles(isDark);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  // Generate ticks
  const totalTicks = 41; // Increased density for ruler look
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2 w-full font-mono select-none group"
         onMouseEnter={() => setIsHovering(true)}
         onMouseLeave={() => setIsHovering(false)}>
      
      {/* Header Label & Value */}
      <div className="flex justify-between items-end mb-1">
        <span className={`${s.textSecondary} uppercase tracking-widest text-xs font-bold`}>{label}</span>
        
        {editable && isEditing ? (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
            <input
              ref={inputRef}
              type="number"
              value={value}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              className={`w-24 ${s.bgInput} ${s.border} border ${s.accent} text-right px-2 py-0.5 focus:outline-none focus:border-moke-red rounded-sm text-sm font-bold shadow-lg`}
            />
            <span className={`${s.accent} text-[10px] font-bold w-4`}>{unit}</span>
          </div>
        ) : (
          <div 
             onClick={() => editable && setIsEditing(true)}
             className={`flex items-baseline cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded transition-colors ${editable ? 'hover:text-moke-red' : ''}`}
             title={editable ? "Click to edit manually" : ""}
          >
            <span className={`${s.accent} font-bold text-lg`}>{Number(value).toFixed(step < 1 ? 1 : 0)}</span>
            <span className={`${s.accent} text-xs ml-1 font-bold`}>{unit}</span>
          </div>
        )}
      </div>
      
      {/* Slider Track Area */}
      <div className="relative w-full h-10 flex flex-col justify-center">
        
        {/* Floating Tooltip (Visible on Hover/Drag) */}
        <div 
          className={`absolute -top-4 transform -translate-x-1/2 transition-opacity duration-200 pointer-events-none z-20 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
          style={{ left: `${Math.min(Math.max(percent, 0), 100)}%` }}
        >
           <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-moke-red text-white shadow-md whitespace-nowrap`}>
              {value}{unit}
           </div>
           <div className="w-1 h-1 bg-moke-red rotate-45 mx-auto -mt-0.5"></div>
        </div>

        {/* The Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative z-10 w-full h-2 bg-transparent appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-1 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-moke-red [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(208,0,0,0.5)] [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent"
        />

        {/* Ruler / Ticks Container */}
        <div className="absolute top-1/2 left-0 w-full h-2 flex justify-between items-center px-1 pointer-events-none transform -translate-y-1/2 mt-0">
           {/* Center Line for Track */}
           <div className={`absolute left-0 right-0 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-300'} top-1/2 -translate-y-1/2`}></div>
           
           {/* Ticks */}
           {Array.from({ length: totalTicks }).map((_, i) => {
             const isMajor = i % 10 === 0; 
             const isMedium = i % 5 === 0;
             return (
               <div 
                 key={i} 
                 className={`z-0 w-px ${isMajor ? `h-3 ${s.tickMain}` : isMedium ? `h-2 ${s.tickSub}` : `h-1 ${s.tickSub} opacity-50`}`} 
               />
             );
           })}
        </div>
      </div>
    </div>
  );
};

// Quantum Selector - Redesigned
export const QuantumSelector: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  optionLabels?: Record<string, string>;
}> = ({ label, value, options, onChange, optionLabels }) => {
  const { isDark } = useTheme();
  const s = getBaseStyles(isDark);

  return (
    <div className="flex flex-col gap-3 w-full font-mono">
      <div className="flex justify-between">
        <span className={`${s.textSecondary} uppercase tracking-widest text-sm font-bold`}>{label}</span>
      </div>
      <div className={`flex w-full ${s.bgInput} ${s.border} border rounded-md overflow-hidden`}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              value === opt 
                ? 'bg-moke-red text-white shadow-inner' 
                : `${s.textSecondary} hover:${s.textPrimary} hover:bg-opacity-10`
            } ${s.border} border-r last:border-none px-2`}
          >
            {optionLabels ? optionLabels[opt] : opt}
          </button>
        ))}
      </div>
    </div>
  );
};

// Quantum Input - Redesigned
export const QuantumInput: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => {
  const { isDark } = useTheme();
  const s = getBaseStyles(isDark);
  const inputShortcuts = useTextShortcuts();

  return (
    <div className="flex flex-col gap-3 w-full font-mono">
       <div className="flex justify-between">
        <span className={`${s.textSecondary} uppercase tracking-widest text-sm font-bold`}>{label}</span>
      </div>
      <input 
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={inputShortcuts.onKeyDown}
        placeholder={placeholder}
        className={`w-full ${s.bgInput} ${s.border} border ${s.accent} px-4 py-3 rounded focus:outline-none focus:border-moke-red text-base font-bold placeholder-gray-600`}
      />
    </div>
  )
}

// Status Badge - Redesigned
export const StatusBadge: React.FC<{
  label: string;
  active: boolean;
}> = ({ label, active }) => {
  const { isDark } = useTheme();
  return (
    <div className={`flex items-center gap-2 font-mono text-xs font-black uppercase border-l-2 px-3 py-1 ${active ? 'border-moke-red text-moke-red bg-moke-red/5' : 'border-gray-500 text-gray-500'}`}>
      <div className={`w-1.5 h-1.5 rounded-sm ${active ? 'bg-moke-red animate-pulse' : 'bg-gray-500'}`}></div>
      {label}
    </div>
  );
};