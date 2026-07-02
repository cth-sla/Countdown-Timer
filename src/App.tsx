import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Volume2, ShieldAlert, Award, AlertCircle, Sparkles, VolumeX, Moon, Sun, Tv, ExternalLink, ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react';
import { AlarmConfig, TimerStatus } from './types';
import { playSound } from './utils/audio';
import CircularTimer from './components/CircularTimer';
import PresetButtons from './components/PresetButtons';
import AlarmSettings from './components/AlarmSettings';

const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  warningTime: 10,
  warningSound: 'ticking-tension',
  warningEnabled: true,
  warningVolume: 0.7,
  endSound: 'soothing-bell',
  endVolume: 0.9,
  loopEndAlarm: true,
  endAlarmDuration: 30, // 30s auto stop
};

export default function App() {
  // Load config from localStorage or fallback to default
  const [config, setConfig] = useState<AlarmConfig>(() => {
    try {
      const saved = localStorage.getItem('countdown_alarm_config');
      if (saved) {
        return { ...DEFAULT_ALARM_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading config', e);
    }
    return DEFAULT_ALARM_CONFIG;
  });

  // Presentation view vs. management console view mode state
  const [viewMode, setViewMode] = useState<'display' | 'manage'>('manage');
  const [showDisplayOptions, setShowDisplayOptions] = useState<boolean>(false);

  // Theme support
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('theme_dark') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Save config on changes and broadcast
  const handleConfigChange = (newConfig: AlarmConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('countdown_alarm_config', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Error saving config', e);
    }
    broadcastRef.current?.postMessage({ type: 'CONFIG_CHANGE', config: newConfig });
  };

  // Timer values and states
  const [hoursInput, setHoursInput] = useState<number>(0);
  const [minutesInput, setMinutesInput] = useState<number>(5); // default to 5 minutes
  const [secondsInput, setSecondsInput] = useState<number>(0);

  const [totalSeconds, setTotalSeconds] = useState<number>(300);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [isRinging, setIsRinging] = useState<boolean>(false);

  // Time stamp tracking (bulletproof against background tab throttling)
  const timerIntervalRef = useRef<any>(null);
  const endTimeRef = useRef<number | null>(null);
  const timeLeftOnPauseRef = useRef<number | null>(null);

  // Sound play handles
  const activeWarningHandleRef = useRef<{ stop: () => void } | null>(null);
  const activeEndHandleRef = useRef<{ stop: () => void } | null>(null);
  
  // Guard rails to prevent duplicate alerts within same trigger seconds
  const hasTriggeredWarningRef = useRef<boolean>(false);
  const autoStopEndTimeoutRef = useRef<any>(null);

  // Maintain reference to configuration for intervals to avoid stale closures
  const configRef = useRef<AlarmConfig>(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Keep tick in a ref to avoid stale closures in setInterval
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = tick;
  });

  // Keep stateRef up to date for BroadcastChannel synchronization
  const stateRef = useRef({
    totalSeconds,
    remainingSeconds,
    status,
    isRinging,
    config,
    hoursInput,
    minutesInput,
    secondsInput,
  });

  useEffect(() => {
    stateRef.current = {
      totalSeconds,
      remainingSeconds,
      status,
      isRinging,
      config,
      hoursInput,
      minutesInput,
      secondsInput,
    };
  }, [totalSeconds, remainingSeconds, status, isRinging, config, hoursInput, minutesInput, secondsInput]);

  // Establish BroadcastChannel for real-time synchronization between manager and projector/viewer tabs
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('countdown_sync_channel');
    broadcastRef.current = channel;

    const handleMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg) return;

      if (msg.type === 'START') {
        clearInterval(timerIntervalRef.current);
        endTimeRef.current = msg.endTime;
        setTotalSeconds(msg.totalSeconds);
        setRemainingSeconds(msg.remainingSeconds);
        hasTriggeredWarningRef.current = false;
        setStatus(msg.status);
        timerIntervalRef.current = setInterval(() => {
          tickRef.current();
        }, 200);
      } else if (msg.type === 'PAUSE') {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        timeLeftOnPauseRef.current = msg.remainingSeconds;
        setRemainingSeconds(msg.remainingSeconds);
        setStatus('paused');
        
        if (activeWarningHandleRef.current) {
          activeWarningHandleRef.current.stop();
          activeWarningHandleRef.current = null;
        }
      } else if (msg.type === 'RESET') {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        stopAllAlarms();
        setStatus('idle');
        setRemainingSeconds(msg.totalSeconds);
        setTotalSeconds(msg.totalSeconds);
        hasTriggeredWarningRef.current = false;
      } else if (msg.type === 'MUTE_ALARM') {
        muteAlarm(false);
      } else if (msg.type === 'CONFIG_CHANGE') {
        setConfig(msg.config);
      } else if (msg.type === 'PRESET_SELECT') {
        stopAllAlarms();
        setStatus('idle');
        setHoursInput(msg.hrs);
        setMinutesInput(msg.mins);
        setSecondsInput(msg.secs);
        setTotalSeconds(msg.totalSeconds);
        setRemainingSeconds(msg.totalSeconds);
        hasTriggeredWarningRef.current = false;
      } else if (msg.type === 'INPUT_CHANGE') {
        setHoursInput(msg.hrs);
        setMinutesInput(msg.mins);
        setSecondsInput(msg.secs);
      } else if (msg.type === 'REQUEST_INITIAL_STATE') {
        channel.postMessage({
          type: 'INITIAL_STATE',
          state: {
            totalSeconds: stateRef.current.totalSeconds,
            remainingSeconds: stateRef.current.remainingSeconds,
            status: stateRef.current.status,
            isRinging: stateRef.current.isRinging,
            config: stateRef.current.config,
            hoursInput: stateRef.current.hoursInput,
            minutesInput: stateRef.current.minutesInput,
            secondsInput: stateRef.current.secondsInput,
            endTime: endTimeRef.current,
          }
        });
      } else if (msg.type === 'INITIAL_STATE') {
        const s = msg.state;
        setTotalSeconds(s.totalSeconds);
        setRemainingSeconds(s.remainingSeconds);
        setStatus(s.status);
        setIsRinging(s.isRinging);
        setConfig(s.config);
        setHoursInput(s.hoursInput);
        setMinutesInput(s.minutesInput);
        setSecondsInput(s.secondsInput);
        endTimeRef.current = s.endTime;
        
        if ((s.status === 'running' || s.status === 'warning') && s.endTime) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = setInterval(() => {
            tickRef.current();
          }, 200);
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    // Request initial state on load in case a manager tab is already active
    channel.postMessage({ type: 'REQUEST_INITIAL_STATE' });

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  // Sync inputs to totalSeconds when in idle state
  useEffect(() => {
    if (status === 'idle') {
      const total = hoursInput * 3600 + minutesInput * 60 + secondsInput;
      setTotalSeconds(total);
      setRemainingSeconds(total);
    }
  }, [hoursInput, minutesInput, secondsInput, status]);

  // Broadcast input changes to keep both tabs synced in real-time (only from manager)
  useEffect(() => {
    if (status === 'idle' && viewMode === 'manage') {
      broadcastRef.current?.postMessage({
        type: 'INPUT_CHANGE',
        hrs: hoursInput,
        mins: minutesInput,
        secs: secondsInput,
      });
    }
  }, [hoursInput, minutesInput, secondsInput, status, viewMode]);

  // Write state to localStorage on the manager tab to support seamless cross-tab iframe sync fallback
  useEffect(() => {
    if (viewMode === 'manage') {
      try {
        const syncObj = {
          totalSeconds,
          remainingSeconds,
          status,
          isRinging,
          config,
          hoursInput,
          minutesInput,
          secondsInput,
          endTime: endTimeRef.current,
          timestamp: Date.now(),
        };
        localStorage.setItem('countdown_timer_sync_state', JSON.stringify(syncObj));
      } catch (err) {
        console.error('Error writing sync state to localStorage:', err);
      }
    }
  }, [
    totalSeconds,
    remainingSeconds,
    status,
    isRinging,
    config,
    hoursInput,
    minutesInput,
    secondsInput,
    viewMode
  ]);

  // Read state and listen to localStorage changes on the display tab to handle sandboxed cross-tab fallback
  useEffect(() => {
    if (viewMode === 'display') {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'countdown_timer_sync_state' && e.newValue) {
          try {
            const s = JSON.parse(e.newValue);
            
            // Apply standard non-status state updates
            setTotalSeconds(s.totalSeconds);
            setRemainingSeconds(s.remainingSeconds);
            setIsRinging(s.isRinging);
            setConfig(s.config);
            setHoursInput(s.hoursInput);
            setMinutesInput(s.minutesInput);
            setSecondsInput(s.secondsInput);
            endTimeRef.current = s.endTime;

            // Handle status transitions and corresponding interval setups
            if (s.status !== status) {
              setStatus(s.status);
              
              if (s.status === 'running' || s.status === 'warning') {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = setInterval(() => {
                  tickRef.current();
                }, 200);
              } else {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
                
                if (s.status === 'idle') {
                  stopAllAlarms();
                  hasTriggeredWarningRef.current = false;
                } else if (s.status === 'paused') {
                  if (activeWarningHandleRef.current) {
                    activeWarningHandleRef.current.stop();
                    activeWarningHandleRef.current = null;
                  }
                }
              }
            } else {
              // Same status, make sure interval is in correct state
              if ((s.status === 'running' || s.status === 'warning') && !timerIntervalRef.current) {
                timerIntervalRef.current = setInterval(() => {
                  tickRef.current();
                }, 200);
              }
            }
          } catch (err) {
            console.error('Error parsing sync state from localStorage:', err);
          }
        }
      };

      window.addEventListener('storage', handleStorage);

      // Load initial state immediately on mount if manager is active
      const initial = localStorage.getItem('countdown_timer_sync_state');
      if (initial) {
        try {
          const s = JSON.parse(initial);
          setTotalSeconds(s.totalSeconds);
          setRemainingSeconds(s.remainingSeconds);
          setStatus(s.status);
          setIsRinging(s.isRinging);
          setConfig(s.config);
          setHoursInput(s.hoursInput);
          setMinutesInput(s.minutesInput);
          setSecondsInput(s.secondsInput);
          endTimeRef.current = s.endTime;

          if ((s.status === 'running' || s.status === 'warning') && s.endTime) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = setInterval(() => {
              tickRef.current();
            }, 200);
          }
        } catch (e) {
          console.error('Error reading initial sync state on mount:', e);
        }
      }

      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [viewMode, status]);

  // Check URL parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view === 'display' || view === 'dashboard') {
        setViewMode('display');
      }
    }
  }, []);

  // Toggle dark/light theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme_dark', String(darkMode));
  }, [darkMode]);

  // Clean up all running audio and timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      clearTimeout(autoStopEndTimeoutRef.current);
      if (activeWarningHandleRef.current) activeWarningHandleRef.current.stop();
      if (activeEndHandleRef.current) activeEndHandleRef.current.stop();
    };
  }, []);

  // Reactive Warning Alarm Audio Player
  useEffect(() => {
    if (status === 'warning') {
      if (!activeWarningHandleRef.current) {
        try {
          const handle = playSound(config.warningSound, config.warningVolume, true);
          activeWarningHandleRef.current = handle;
        } catch (err) {
          console.error('Failed to play warning sound:', err);
        }
      }
    } else {
      if (activeWarningHandleRef.current) {
        activeWarningHandleRef.current.stop();
        activeWarningHandleRef.current = null;
      }
    }
  }, [status, config.warningSound, config.warningVolume]);

  // Reactive End Alarm Audio Player
  useEffect(() => {
    if (status === 'completed' && isRinging) {
      if (!activeEndHandleRef.current) {
        try {
          const handle = playSound(config.endSound, config.endVolume, config.loopEndAlarm);
          activeEndHandleRef.current = handle;

          if (config.endAlarmDuration > 0) {
            autoStopEndTimeoutRef.current = setTimeout(() => {
              muteAlarm();
            }, config.endAlarmDuration * 1000);
          }
        } catch (err) {
          console.error('Failed to play end alarm sound:', err);
        }
      }
    } else {
      if (activeEndHandleRef.current) {
        activeEndHandleRef.current.stop();
        activeEndHandleRef.current = null;
      }
      clearTimeout(autoStopEndTimeoutRef.current);
    }
  }, [status, isRinging, config.endSound, config.endVolume, config.loopEndAlarm, config.endAlarmDuration]);

  // Stop any active alarms and clear flags
  const stopAllAlarms = () => {
    setIsRinging(false);
  };

  // Preset quick selections and broadcast
  const handleSelectPreset = (seconds: number) => {
    stopAllAlarms();
    setStatus('idle');
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    setHoursInput(hrs);
    setMinutesInput(mins);
    setSecondsInput(secs);
    
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    hasTriggeredWarningRef.current = false;

    broadcastRef.current?.postMessage({
      type: 'PRESET_SELECT',
      totalSeconds: seconds,
      hrs,
      mins,
      secs,
    });
  };

  // Primary loop tick logic
  const tick = () => {
    if (!endTimeRef.current) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.round((endTimeRef.current - now) / 1000));
    const currentConfig = configRef.current;

    setRemainingSeconds(remaining);

    // 1. WARNING STATE CHECK (Chuông báo sắp hết giờ)
    if (
      currentConfig.warningEnabled &&
      remaining <= currentConfig.warningTime &&
      remaining > 0 &&
      !hasTriggeredWarningRef.current
    ) {
      hasTriggeredWarningRef.current = true;
      setStatus('warning');
    }

    // 2. TIMEOUT / COMPLETED CHECK (Chuông báo hết giờ)
    if (remaining === 0) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      setStatus('completed');
      setIsRinging(true);
    }
  };

  // Play and Pause Trigger Toggle
  const handlePlayPause = (isLocalOrEvent: any = true) => {
    const isLocal = isLocalOrEvent === false ? false : true;
    const currentConfig = configRef.current;
    if (status === 'idle') {
      const duration = hoursInput * 3600 + minutesInput * 60 + secondsInput;
      if (duration === 0) return;

      stopAllAlarms();
      setTotalSeconds(duration);
      setRemainingSeconds(duration);
      hasTriggeredWarningRef.current = false;

      // Establish target timestamp
      const targetEndTime = Date.now() + duration * 1000;
      endTimeRef.current = targetEndTime;
      setStatus('running');

      timerIntervalRef.current = setInterval(() => {
        tickRef.current();
      }, 200);

      if (isLocal) {
        broadcastRef.current?.postMessage({
          type: 'START',
          endTime: targetEndTime,
          totalSeconds: duration,
          remainingSeconds: duration,
          status: 'running',
        });
      }
    } else if (status === 'running' || status === 'warning') {
      // Pause
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      
      timeLeftOnPauseRef.current = remainingSeconds;
      setStatus('paused');

      if (isLocal) {
        broadcastRef.current?.postMessage({
          type: 'PAUSE',
          remainingSeconds: remainingSeconds,
        });
      }
    } else if (status === 'paused') {
      // Resume
      const secsToRun = timeLeftOnPauseRef.current ?? remainingSeconds;
      const targetEndTime = Date.now() + secsToRun * 1000;
      endTimeRef.current = targetEndTime;

      // Keep warning state if we're already below the threshold
      if (currentConfig.warningEnabled && secsToRun <= currentConfig.warningTime && secsToRun > 0) {
        setStatus('warning');
      } else {
        setStatus('running');
      }

      timerIntervalRef.current = setInterval(() => {
        tickRef.current();
      }, 200);

      if (isLocal) {
        broadcastRef.current?.postMessage({
          type: 'START',
          endTime: targetEndTime,
          totalSeconds: totalSeconds,
          remainingSeconds: secsToRun,
          status: currentConfig.warningEnabled && secsToRun <= currentConfig.warningTime && secsToRun > 0 ? 'warning' : 'running',
        });
      }
    }
  };

  // Full reset or cancellation
  const handleStopReset = (isLocalOrEvent: any = true) => {
    const isLocal = isLocalOrEvent === false ? false : true;
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    
    stopAllAlarms();
    
    setStatus('idle');
    setRemainingSeconds(totalSeconds);
    hasTriggeredWarningRef.current = false;

    if (isLocal) {
      broadcastRef.current?.postMessage({
        type: 'RESET',
        totalSeconds: totalSeconds,
      });
    }
  };

  // Stop Ringing when alert is active
  const muteAlarm = (isLocalOrEvent: any = true) => {
    const isLocal = isLocalOrEvent === false ? false : true;
    setIsRinging(false);

    if (isLocal) {
      broadcastRef.current?.postMessage({
        type: 'MUTE_ALARM',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-teal-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Background Visual Alert Pulses */}
      <AnimatePresence>
        {isRinging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.2, 0] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="fixed inset-0 bg-red-600 pointer-events-none z-50 mix-blend-overlay"
          />
        )}
        {status === 'warning' && !isRinging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.08, 0] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2.0, ease: 'easeInOut' }}
            className="fixed inset-0 bg-amber-500 pointer-events-none z-50 mix-blend-overlay"
          />
        )}
      </AnimatePresence>

      {/* Main Container */}
      {viewMode === 'display' ? (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative select-none">
          {/* Subtle Hover Controller bar */}
          <div className="absolute top-4 right-4 flex items-center gap-2.5 opacity-10 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-md">
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                const view = params.get('view');
                if (view === 'display' || view === 'dashboard') {
                  window.open(window.location.origin, '_blank');
                } else {
                  setViewMode('manage');
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-400 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                {typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('view') === 'display' || new URLSearchParams(window.location.search).get('view') === 'dashboard')
                  ? 'Mở Bảng Quản Lý'
                  : 'Bảng Điều Khiển'
                }
              </span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              title="Đổi chủ đề"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="w-full max-w-2xl flex flex-col items-center justify-center p-6" id="presentation-timer-container">
            <CircularTimer
              remainingSeconds={remainingSeconds}
              totalSeconds={totalSeconds}
              status={status}
              onPlayPause={handlePlayPause}
              onStopReset={handleStopReset}
              onMuteAlarm={muteAlarm}
              isRinging={isRinging}
              hoursInput={hoursInput}
              minutesInput={minutesInput}
              secondsInput={secondsInput}
              setHoursInput={setHoursInput}
              setMinutesInput={setMinutesInput}
              setSecondsInput={setSecondsInput}
              isDisplayMode={true}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 flex flex-col min-h-screen">
          
          {/* Header Ribbon bar */}
          <header className="flex items-center justify-between mb-8 pb-5 border-b border-slate-200/50 dark:border-slate-800/60" id="app-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                  <span>Đồng Hồ Đếm Ngược Chuông Báo</span>
                </h1>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Báo hiệu sắp hết giờ & hết giờ thông minh</span>
              </div>
            </div>

            <div className="flex items-center gap-3 relative">
              {/* Presentation Mode Trigger Button */}
              <div className="relative">
                <button
                  onClick={() => setShowDisplayOptions(!showDisplayOptions)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                  id="btn-presentation-mode"
                >
                  <Tv className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard Đồng Hồ</span>
                </button>

                <AnimatePresence>
                  {showDisplayOptions && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowDisplayOptions(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-xl shadow-xl p-2 z-20 text-xs text-left text-slate-700 dark:text-slate-300"
                      >
                        <button
                          onClick={() => {
                            setShowDisplayOptions(false);
                            window.open(window.location.origin + '?view=dashboard', '_blank');
                          }}
                          className="flex items-center gap-3 w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          <div>
                            <p>Mở Dashboard riêng (Tab mới)</p>
                            <p className="text-[10px] font-normal text-slate-400">Chỉ hiển thị đồng hồ, tự động đồng bộ thời gian thực</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowDisplayOptions(false);
                            setViewMode('display');
                          }}
                          className="flex items-center gap-3 w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-t border-slate-100 dark:border-slate-850 mt-1 cursor-pointer"
                        >
                          <Tv className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          <div>
                            <p>Xem Dashboard tại tab này</p>
                            <p className="text-[10px] font-normal text-slate-400">Xem đồng hồ toàn màn hình ngay lập tức</p>
                          </div>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Dark mode button toggler */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
                title="Đổi chủ đề"
                id="theme-toggler"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* Dashboard Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
            
            {/* LEFT PANEL: Circular Timer display and Preset controllers (8 columns wide) */}
            <main className="lg:col-span-5 flex flex-col gap-6 justify-center">
              
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-md flex flex-col items-center justify-center">
                <CircularTimer
                  remainingSeconds={remainingSeconds}
                  totalSeconds={totalSeconds}
                  status={status}
                  onPlayPause={handlePlayPause}
                  onStopReset={handleStopReset}
                  onMuteAlarm={muteAlarm}
                  isRinging={isRinging}
                  hoursInput={hoursInput}
                  minutesInput={minutesInput}
                  secondsInput={secondsInput}
                  setHoursInput={setHoursInput}
                  setMinutesInput={setMinutesInput}
                  setSecondsInput={setSecondsInput}
                  isDisplayMode={false}
                />
              </div>

              {/* Tách riêng nút bấm điều khiển (Play / Pause / Reset) */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-md flex flex-col gap-4 transition-all duration-300" id="separated-controls-container">
                
                {status === 'idle' && (
                  /* MANUAL TIME CONFIGURATION INPUTS */
                  <div className="flex flex-col items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/50" id="manual-inputs-container">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                      Thiết Lập Thời Gian Đếm Ngược
                    </span>
                    
                    <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 shadow-sm">
                      {/* Hours input */}
                      <div className="flex flex-col items-center">
                        <input
                          type="text"
                          maxLength={2}
                          value={String(hoursInput).padStart(2, '0')}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const num = parseInt(val, 10) || 0;
                            setHoursInput(Math.min(num, 99));
                          }}
                          className="w-10 text-center font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 bg-transparent focus:outline-none"
                          id="input-hours"
                        />
                        <span className="text-[9px] font-semibold text-emerald-500/80 dark:text-emerald-400/80 uppercase tracking-tight mt-0.5">Giờ</span>
                      </div>
                      
                      <span className="text-xl font-mono text-emerald-400/80 dark:text-emerald-500/80 mb-4 animate-pulse">:</span>

                      {/* Minutes input */}
                      <div className="flex flex-col items-center">
                        <input
                          type="text"
                          maxLength={2}
                          value={String(minutesInput).padStart(2, '0')}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const num = parseInt(val, 10) || 0;
                            setMinutesInput(Math.min(num, 59));
                          }}
                          className="w-10 text-center font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 bg-transparent focus:outline-none"
                          id="input-minutes"
                        />
                        <span className="text-[9px] font-semibold text-emerald-500/80 dark:text-emerald-400/80 uppercase tracking-tight mt-0.5">Phút</span>
                      </div>

                      <span className="text-xl font-mono text-emerald-400/80 dark:text-emerald-500/80 mb-4 animate-pulse">:</span>

                      {/* Seconds input */}
                      <div className="flex flex-col items-center">
                        <input
                          type="text"
                          maxLength={2}
                          value={String(secondsInput).padStart(2, '0')}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const num = parseInt(val, 10) || 0;
                            setSecondsInput(Math.min(num, 59));
                          }}
                          className="w-10 text-center font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 bg-transparent focus:outline-none"
                          id="input-seconds"
                        />
                        <span className="text-[9px] font-semibold text-emerald-500/80 dark:text-emerald-400/80 uppercase tracking-tight mt-0.5">Giây</span>
                      </div>
                    </div>

                    <span className="text-[9px] text-slate-400 text-center mt-1 px-4 leading-normal">
                      Nhập số trực tiếp hoặc click nút Đặt Giờ Nhanh ở dưới
                    </span>
                  </div>
                )}

                <div className="flex justify-center items-center gap-4 w-full">
                  {isRinging ? (
                    <button
                      id="btn-stop-ringing"
                      onClick={muteAlarm}
                      className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-sm font-bold py-3 px-6 rounded-xl shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
                    >
                      <VolumeX className="w-5 h-5 animate-pulse" />
                      <span>Tắt Chuông Báo Ngay</span>
                    </button>
                  ) : (
                    <>
                      <button
                        id="btn-play-pause"
                        disabled={status === 'idle' && hoursInput === 0 && minutesInput === 0 && secondsInput === 0}
                        onClick={handlePlayPause}
                        className={`
                          flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-md
                          ${status === 'running' || status === 'warning'
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                            : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-95 shadow-teal-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100'
                          }
                        `}
                        title={status === 'running' || status === 'warning' ? 'Tạm Dừng' : 'Bắt Đầu'}
                      >
                        {status === 'running' || status === 'warning' ? (
                          <>
                            <Pause className="w-5 h-5 fill-current" />
                            <span>TẠM DỪNG ĐỒNG HỒ</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                            <span>BẮT ĐẦU ĐẾM NGƯỢC</span>
                          </>
                        )}
                      </button>

                      <button
                        id="btn-reset-timer"
                        onClick={handleStopReset}
                        disabled={status === 'idle'}
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 cursor-pointer border border-slate-200/40 dark:border-slate-800"
                        title={status === 'paused' ? 'Hủy Bỏ / Đặt Lại' : 'Đặt Lại'}
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <PresetButtons
                onSelectPreset={handleSelectPreset}
                activeSeconds={totalSeconds}
                disabled={status !== 'idle'}
              />

            </main>

            {/* RIGHT PANEL: Settings Configuration Console (4 columns wide) */}
            <aside className="lg:col-span-7">
              <AlarmSettings
                config={config}
                onChangeConfig={handleConfigChange}
              />
            </aside>

          </div>

          {/* Informative footer */}
          <footer className="mt-12 pt-5 border-t border-slate-200/40 dark:border-slate-800/40 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Đồng Hồ Đếm Ngược Chuông Báo. Được thiết kế tối ưu hóa Web Audio API.</p>
            <div className="flex items-center gap-2 text-[11px] text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider bg-teal-500/5 dark:bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Âm Thanh Synthesizer Kỹ Thuật Số</span>
            </div>
          </footer>

        </div>
      )}
    </div>
  );
}
