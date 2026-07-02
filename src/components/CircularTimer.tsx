import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VolumeX, AlertOctagon } from 'lucide-react';
import { TimerStatus } from '../types';

interface CircularTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  status: TimerStatus;
  onPlayPause: () => void;
  onStopReset: () => void;
  onMuteAlarm: () => void;
  isRinging: boolean;
  hoursInput: number;
  minutesInput: number;
  secondsInput: number;
  setHoursInput: (val: number) => void;
  setMinutesInput: (val: number) => void;
  setSecondsInput: (val: number) => void;
  isDisplayMode?: boolean;
}

export default function CircularTimer({
  remainingSeconds,
  totalSeconds,
  status,
  onPlayPause,
  onStopReset,
  onMuteAlarm,
  isRinging,
  hoursInput,
  minutesInput,
  secondsInput,
  setHoursInput,
  setMinutesInput,
  setSecondsInput,
  isDisplayMode = false,
}: CircularTimerProps) {
  
  // Format seconds to H:M:S strings
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return {
      hrs: String(hrs).padStart(2, '0'),
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0'),
    };
  };

  const isIdle = status === 'idle';

  // Current values to show on hands
  const hVal = isIdle ? hoursInput : Math.floor(remainingSeconds / 3600);
  const mVal = isIdle ? minutesInput : Math.floor((remainingSeconds % 3600) / 60);
  const sVal = isIdle ? secondsInput : remainingSeconds % 60;

  const { hrs, mins, secs } = formatTime(isIdle ? totalSeconds : remainingSeconds);

  // SVG dimensions
  const size = isDisplayMode ? 560 : 310;
  const strokeWidth = isDisplayMode ? 14 : 8;
  const radius = (size - strokeWidth * 2) / 2;

  // Percentage remaining for the outer subtle gauge ring
  const percentage = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

  // Define clock hands angles
  const secondAngle = sVal * 6; // 6 degrees per second
  const minuteAngle = mVal * 6 + sVal * 0.1; // 6 degrees per minute + smooth seconds addition
  const hourAngle = (hVal % 12) * 30 + mVal * 0.5; // 30 degrees per hour + smooth minutes addition

  // Determine current theme glow based on state
  let pulseGlow = 'rgba(20, 184, 166, 0.15)'; // Teal (Running)
  let textClass = 'text-teal-600 dark:text-teal-400';

  if (status === 'warning') {
    pulseGlow = 'rgba(245, 158, 11, 0.3)'; // Amber
    textClass = 'text-amber-500 dark:text-amber-400';
  } else if (status === 'completed' || isRinging) {
    pulseGlow = 'rgba(239, 68, 68, 0.4)'; // Red / Rose
    textClass = 'text-rose-500 dark:text-rose-400';
  } else if (status === 'paused') {
    pulseGlow = 'rgba(148, 163, 184, 0.1)'; // Slate
    textClass = 'text-slate-500 dark:text-slate-400';
  } else if (isIdle) {
    pulseGlow = 'rgba(15, 118, 110, 0.05)'; // Soft teal idle
    textClass = 'text-teal-600 dark:text-teal-500';
  }

  // Calculate visual sector wedge for countdown selection background
  const currentSecs = isIdle ? totalSeconds : remainingSeconds;
  let targetAngle = 0;
  if (currentSecs > 0) {
    const minutesPart = currentSecs % 3600;
    if (minutesPart === 0 && currentSecs > 0) {
      targetAngle = 360; // Full 60 minutes
    } else {
      targetAngle = (minutesPart / 3600) * 360;
    }
  }
  targetAngle = Math.max(0, Math.min(360, targetAngle));

  let sectorClass = 'fill-teal-500/10 dark:fill-teal-500/15 stroke-teal-500/20 dark:stroke-teal-500/30';
  if (status === 'warning') {
    sectorClass = 'fill-amber-500/15 dark:fill-amber-500/20 stroke-amber-500/25 dark:stroke-amber-500/30';
  } else if (status === 'completed' || isRinging) {
    sectorClass = 'fill-rose-500/15 dark:fill-rose-500/20 stroke-rose-500/25 dark:stroke-rose-500/30';
  } else if (status === 'paused') {
    sectorClass = 'fill-slate-400/10 dark:fill-slate-400/15 stroke-slate-400/20 dark:stroke-slate-400/25';
  } else if (isIdle) {
    sectorClass = 'fill-teal-500/10 dark:fill-teal-500/15 stroke-teal-500/25 dark:stroke-teal-500/20';
  }

  const getSectorPath = (cx: number, cy: number, r: number, angle: number) => {
    if (angle <= 0 || angle >= 359.9) return '';
    const startAngle = 0;
    const endAngle = angle;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArcFlag = angle <= 180 ? 0 : 1;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Draw 60 classic clock ticks around the perimeter
  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i < 60; i++) {
      const angle = i * 6;
      const isMajor = i % 5 === 0;
      const tickLength = isMajor ? (isDisplayMode ? 12 : 9) : (isDisplayMode ? 6 : 4);
      const tickStroke = isMajor ? (isDisplayMode ? 2.5 : 1.8) : (isDisplayMode ? 1.2 : 0.8);

      let tickColor = 'stroke-slate-300 dark:stroke-slate-700';
      if (isMajor) {
        tickColor = 'stroke-slate-500 dark:stroke-slate-400';
      }

      ticks.push(
        <line
          key={i}
          x1={size / 2}
          y1={strokeWidth + 6}
          x2={size / 2}
          y2={strokeWidth + 6 + tickLength}
          strokeWidth={tickStroke}
          className={`${tickColor} transition-colors duration-300`}
          transform={`rotate(${angle} ${size / 2} ${size / 2})`}
        />
      );
    }
    return ticks;
  };

  const renderNumerals = () => {
    const numerals = [];
    const rLabel = radius - (isDisplayMode ? 38 : 28);
    for (let i = 1; i <= 12; i++) {
      const angleRad = (i * 30 * Math.PI) / 180;
      const x = size / 2 + rLabel * Math.sin(angleRad);
      const y = size / 2 - rLabel * Math.cos(angleRad);

      numerals.push(
        <text
          key={i}
          x={x}
          y={y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-sans font-bold text-slate-800 dark:text-slate-200 select-none"
          style={{ fontSize: isDisplayMode ? '1.15rem' : '0.85rem' }}
        >
          {i * 5}
        </text>
      );
    }
    return numerals;
  };

  const handleInputChange = (
    val: string,
    max: number,
    setter: (v: number) => void
  ) => {
    const num = parseInt(val.replace(/\D/g, '')) || 0;
    setter(Math.min(num, max));
  };

  return (
    <div className="flex flex-col items-center gap-6" id="classic-analog-clock-container">
      
      {/* 1. Classic Analog Clock Dial Face */}
      <div className="relative select-none" style={{ width: size, height: size }}>
        
        {/* Pulsing ambient glow reflection */}
        <div
          className="absolute inset-4 rounded-full blur-2xl transition-all duration-1000 -z-10"
          style={{
            background: pulseGlow,
            transform: status === 'completed' || isRinging ? 'scale(1.15)' : 'scale(1)',
          }}
        />

        {/* Clock SVG Canvas */}
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            {/* Soft inner dial shadow for realistic watch plate depth */}
            <radialGradient id="dialGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
            </radialGradient>

            {/* Premium glass reflect gradient */}
            <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.15" />
              <stop offset="35%" stopColor="white" stopOpacity="0.06" />
              <stop offset="35.5%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Bronze/Gold metallic bezel bezel ring */}
            <linearGradient id="metallicBezel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" /> {/* Amber/gold */}
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" /> {/* Warm bronze */}
            </linearGradient>
          </defs>

          {/* Outer Bezel Shadow */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 4}
            className="fill-transparent stroke-slate-200/50 dark:stroke-slate-950/80"
            strokeWidth={isDisplayMode ? 10 : 8}
          />

          {/* Metallic Gold/Bronze Bezel Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 1}
            fill="transparent"
            stroke="url(#metallicBezel)"
            strokeWidth={isDisplayMode ? 5 : 4}
          />

          {/* Clock Dial Main Plate */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-slate-50 dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={1.5}
          />

          {/* Radial depth gradient overlay */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 1}
            fill="url(#dialGrad)"
            className="pointer-events-none"
          />

          {/* Visual Countdown Sector Wedge (Vùng nền biểu thị thời gian đếm ngược) */}
          {targetAngle > 0 && (
            targetAngle >= 359.9 ? (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius - 1}
                className={`${sectorClass} transition-all duration-300`}
                strokeWidth={1}
              />
            ) : (
              <path
                d={getSectorPath(size / 2, size / 2, radius - 1, targetAngle)}
                className={`${sectorClass} transition-all duration-300`}
                strokeWidth={1}
              />
            )
          )}

          {/* Railway Minute Track (Vòng xích phút xe lửa cổ điển) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 1}
            className="stroke-slate-300 dark:stroke-slate-800 fill-transparent"
            strokeWidth={1}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 12}
            className="stroke-slate-200 dark:stroke-slate-850 fill-transparent"
            strokeWidth={1}
          />

          {/* Dial Markers / Ticks */}
          {renderTicks()}

          {/* Roman Numerals */}
          {renderNumerals()}

          {/* Dynamic Digital LED Window (Date window style complication) */}
          <g transform={`translate(${size / 2}, ${size / 2 + radius * 0.38})`}>
            {/* Frame shadow */}
            <rect
              x={isDisplayMode ? -60 : -45}
              y={isDisplayMode ? -14 : -10}
              width={isDisplayMode ? 120 : 90}
              height={isDisplayMode ? 28 : 20}
              rx={4}
              className="fill-slate-100/90 dark:fill-slate-950/90 stroke-slate-300/80 dark:stroke-slate-800/80"
              strokeWidth={1.2}
            />
            {/* LED Text */}
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              className={`font-mono font-bold select-none ${textClass}`}
              style={{ fontSize: isDisplayMode ? '0.95rem' : '0.75rem' }}
            >
              {hrs}:{mins}:{secs}
            </text>
          </g>

          {/* ================= CLOCK HANDS ================= */}

          {/* 1. Hour Hand (Vintage Cathedral/Spade style) */}
          <g transform={`rotate(${hourAngle} ${size / 2} ${size / 2})`}>
            <line
              x1={size / 2}
              y1={size / 2 + 12}
              x2={size / 2}
              y2={size / 2 - radius * 0.48}
              stroke="currentColor"
              strokeWidth={isDisplayMode ? 5.5 : 4}
              strokeLinecap="round"
              className="text-slate-800 dark:text-slate-200"
            />
            {/* Spade diamond accent */}
            <path
              d={`M ${size / 2} ${size / 2 - radius * 0.35} L ${size / 2 - (isDisplayMode ? 5.5 : 4)} ${size / 2 - radius * 0.4} L ${size / 2} ${size / 2 - radius * 0.48} L ${size / 2 + (isDisplayMode ? 5.5 : 4)} ${size / 2 - radius * 0.4} Z`}
              fill="currentColor"
              className="text-slate-800 dark:text-slate-200"
            />
          </g>

          {/* 2. Minute Hand (Sleek elongated diamond hand) */}
          <g transform={`rotate(${minuteAngle} ${size / 2} ${size / 2})`}>
            <line
              x1={size / 2}
              y1={size / 2 + 18}
              x2={size / 2}
              y2={size / 2 - radius * 0.72}
              stroke="currentColor"
              strokeWidth={isDisplayMode ? 3.8 : 2.6}
              strokeLinecap="round"
              className="text-slate-700 dark:text-slate-300"
            />
            <path
              d={`M ${size / 2} ${size / 2 - radius * 0.58} L ${size / 2 - (isDisplayMode ? 4 : 3)} ${size / 2 - radius * 0.64} L ${size / 2} ${size / 2 - radius * 0.72} L ${size / 2 + (isDisplayMode ? 4 : 3)} ${size / 2 - radius * 0.64} Z`}
              fill="currentColor"
              className="text-slate-700 dark:text-slate-300"
            />
          </g>

          {/* 3. Second Hand (Delicate sweeping needle in bright crimson red) */}
          <g transform={`rotate(${secondAngle} ${size / 2} ${size / 2})`}>
            <line
              x1={size / 2}
              y1={size / 2 + 25}
              x2={size / 2}
              y2={size / 2 - radius * 0.82}
              stroke="#f43f5e" // Vivid rose-500 / crimson
              strokeWidth={isDisplayMode ? 1.5 : 1}
              strokeLinecap="round"
            />
            {/* Classic rear circular counter-weight */}
            <circle
              cx={size / 2}
              cy={size / 2 + 15}
              r={isDisplayMode ? 4.5 : 3}
              className="fill-rose-500"
            />
          </g>

          {/* 4. Glass Face Shine Reflection Overlay */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 1}
            fill="url(#glassReflection)"
            className="pointer-events-none"
          />

          {/* 5. Center Hub Pin (Metallic pivot caps) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={isDisplayMode ? 7.5 : 5.5}
            className="fill-slate-900 dark:fill-slate-100 shadow-md"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={isDisplayMode ? 3.5 : 2.5}
            className="fill-amber-500"
          />
        </svg>
      </div>

      {/* 2. Setup Inputs and Control Details below the clock face */}
      <div className="w-full flex flex-col items-center justify-center">
        
        {/* DIGITAL TIMER STATE SUMMARY AND ALERTS */}
        {!isDisplayMode ? (
          <div className="flex flex-col items-center text-center justify-center">
            <AnimatePresence mode="wait">
              {isRinging ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white text-[10px] font-bold rounded-full shadow-lg shadow-rose-500/20 animate-bounce mb-2"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>HẾT GIỜ! PHÁT CHUÔNG BÁO</span>
                </motion.div>
              ) : status === 'warning' ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-amber-500/25 mb-2"
                >
                  <AlertOctagon className="w-3 h-3 animate-pulse" />
                  <span>SẮP HẾT THỜI GIAN!</span>
                </motion.div>
              ) : status === 'paused' ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200/40 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 mb-2"
                >
                  ĐÃ TẠM DỪNG ĐỒNG HỒ
                </motion.div>
              ) : isIdle ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="text-slate-400 dark:text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200/20 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/20 mb-2"
                >
                  ĐỒNG HỒ ĐANG CHỜ KHỜI ĐỘNG
                </motion.div>
              ) : (
                <div className="h-6" /> // Layout Spacer
              )}
            </AnimatePresence>

            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono flex items-center gap-1">
              <span>{isIdle ? '100' : Math.round(percentage * 100)}% {isIdle ? 'bắt đầu' : 'còn lại'}</span>
              <span>•</span>
              <span>Tổng: {totalSeconds}s</span>
            </div>
          </div>
        ) : (
          isRinging && (
            <div className="flex flex-col items-center text-center justify-center">
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                onClick={onMuteAlarm}
                className="mt-3 flex items-center gap-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-rose-500/30 transition-all cursor-pointer z-50"
                id="btn-display-mute"
              >
                <VolumeX className="w-4 h-4 animate-pulse" />
                <span>Tắt Chuông Báo</span>
              </motion.button>
            </div>
          )
        )}

      </div>

    </div>
  );
}
