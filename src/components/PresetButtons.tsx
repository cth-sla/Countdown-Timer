import React from 'react';
import { Timer, Zap } from 'lucide-react';

interface PresetButtonsProps {
  onSelectPreset: (seconds: number) => void;
  activeSeconds: number;
  disabled: boolean;
}

export default function PresetButtons({ onSelectPreset, activeSeconds, disabled }: PresetButtonsProps) {
  const presets = [
    { label: '5 giây (Thử)', value: 5, isQuick: true },
    { label: '30 giây', value: 30 },
    { label: '1 phút', value: 60 },
    { label: '2 phút', value: 120 },
    { label: '5 phút', value: 300 },
    { label: '10 phút', value: 600 },
    { label: '15 phút', value: 900 },
    { label: '30 phút', value: 1800 },
    { label: '45 phút', value: 2700 },
    { label: '60 phút', value: 3600 },
  ];

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/50 shadow-sm" id="preset-buttons-container">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Đặt Giờ Nhanh (Presets)
        </h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {presets.map((preset) => {
          const isActive = activeSeconds === preset.value;
          return (
            <button
              key={preset.value}
              id={`preset-btn-${preset.value}`}
              onClick={() => onSelectPreset(preset.value)}
              disabled={disabled}
              className={`
                px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive 
                  ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20 scale-95 border-transparent' 
                  : preset.isQuick
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/40'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:text-slate-300 border border-slate-200/40 dark:border-slate-800/40'
                }
              `}
            >
              <div className="flex items-center gap-1">
                {preset.isQuick && <Zap className="w-3 h-3 text-amber-500 animate-pulse" />}
                <span>{preset.label}</span>
              </div>
              <span className={`text-[10px] opacity-75 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {preset.value >= 60 ? `${Math.floor(preset.value / 60)} phút` : `${preset.value}s`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
